/* 경우의수 RPG — file:// 에서도 동작 (모듈 없음) */

(function () {
  "use strict";

  var JD = window.JOBS_DATA;
  var JOBS = JD.JOBS;
  var JOB_STARTERS = JD.STARTERS;
  var TIER_LABELS = JD.TIER_LABELS;

  function getJob(id) {
    return JOBS[id] || null;
  }

  function getActiveJob() {
    return getJob(state.jobId);
  }

  function setJob(id) {
    var job = getJob(id);
    if (!job) return;
    state.jobId = id;
    if (state.jobHistory.indexOf(id) < 0) state.jobHistory.push(id);
    state.role = job;
  }

  function getTierLabel(tier) {
    return TIER_LABELS[tier] || "???";
  }

  function getEvolutionTargets() {
    var job = getActiveJob();
    if (!job || !job.evolvesTo || !job.evolvesTo.length) return [];
    return job.evolvesTo.filter(function (id) {
      var next = getJob(id);
      if (!next) return false;
      if (next.requiresCorruption && !state.flags.corruption) return false;
      return true;
    });
  }

  function buildEvolutionSuccessRate(targetTier) {
    var base = 0.52;
    base += state.morale * 0.002;
    base += state.companions.length * 0.04;
    base -= (targetTier || 1) * 0.06;
    if (state.flags.corruption && targetTier >= 4) base += 0.05;
    return Math.max(0.15, Math.min(0.85, base));
  }

  function makeEvolutionChoices() {
    var targets = getEvolutionTargets();
    if (!targets.length) {
      return [{
        text: "이미 이 계열의 정점에 가깝습니다 — 수련으로 능력 강화",
        isEvolutionBuff: true,
        outcomes: [
          { text: "전직 없이 스탯이 강화된다.", probability: 0.6, hp: 10, morale: 8, tag: "good" },
          { text: "변화 없음.", probability: 0.4, hp: 0, morale: 0, tag: "neutral" },
        ],
      }];
    }
    return targets.map(function (id) {
      var next = getJob(id);
      var rate = buildEvolutionSuccessRate(next.tier);
      var fail = (1 - rate) * 0.7;
      var neutral = (1 - rate) * 0.3;
      var corruptNote = next.requiresCorruption ? " (타락 전용)" : "";
      return {
        text: next.icon + " " + next.name + " 으로 전직" + corruptNote + " [" + getTierLabel(next.tier) + "]",
        evolveTarget: id,
        isEvolution: true,
        outcomes: [
          {
            text: "전직 성공! " + next.name + " 이(가) 되었다.",
            probability: rate,
            hp: 5,
            morale: 10,
            tag: "good",
            evolve: id,
          },
          {
            text: "전직 실패, 부상과 좌절.",
            probability: fail,
            hp: -12,
            morale: -8,
            tag: "bad",
          },
          {
            text: "전직은 미뤄지지만 경험은 쌓인다.",
            probability: neutral,
            hp: 0,
            gold: 5,
            morale: 2,
            tag: "neutral",
          },
        ],
      };
    });
  }

  const COMPANIONS = {
    lyra: { id: "lyra", name: "리라", icon: "🗡️", luckBonus: { bad: -0.03, good: 0.02 } },
    orn: { id: "orn", name: "오른", icon: "🔨", luckBonus: { good: 0.04, neutral: 0.02 } },
    selene: { id: "selene", name: "셀레네", icon: "✨", luckBonus: { special: 0.05, bad: -0.02 } },
    kai: { id: "kai", name: "카이", icon: "📖", luckBonus: { neutral: 0.04, good: 0.02 } },
  };

  const MAX_COMPANIONS = 3;

  var ID = window.ITEMS_DATA;
  var ITEMS = ID.ITEMS;
  var RECIPES = ID.RECIPES;
  var LOOT_BY_TAG = ID.LOOT_BY_TAG;
  var LOOT_BY_EVENT = ID.LOOT_BY_EVENT;
  var ENEMIES = ID.ENEMIES;

  function getItem(id) {
    return ITEMS[id] || null;
  }

  function countItem(id) {
    return state.inventory[id] || 0;
  }

  function addItem(id, qty) {
    var it = getItem(id);
    if (!it || qty <= 0) return false;
    state.inventory[id] = (state.inventory[id] || 0) + qty;
    return true;
  }

  function removeItem(id, qty) {
    if (countItem(id) < qty) return false;
    state.inventory[id] -= qty;
    if (state.inventory[id] <= 0) delete state.inventory[id];
    return true;
  }

  function canAffordRecipe(recipe) {
    if (recipe.gold && state.gold < recipe.gold) return false;
    var keys = Object.keys(recipe.cost);
    for (var i = 0; i < keys.length; i++) {
      if (countItem(keys[i]) < recipe.cost[keys[i]]) return false;
    }
    return true;
  }

  function craftItem(recipeId) {
    var recipe = RECIPES.find(function (r) { return r.id === recipeId; });
    if (!recipe || !canAffordRecipe(recipe)) return false;
    var keys = Object.keys(recipe.cost);
    for (var i = 0; i < keys.length; i++) removeItem(keys[i], recipe.cost[keys[i]]);
    if (recipe.gold) state.gold -= recipe.gold;
    addItem(recipe.result, recipe.resultQty || 1);
    state.log.push("제작: " + getItem(recipe.result).icon + " " + recipe.name);
    return true;
  }

  function getEquipBonus() {
    if (!state.equippedId) return {};
    var it = getItem(state.equippedId);
    return (it && it.equipBonus) ? it.equipBonus : {};
  }

  function rollLootTables(result, eventId) {
    var dropped = [];
    function tryOne(entry) {
      if (Math.random() < entry.chance) {
        addItem(entry.id, entry.qty || 1);
        dropped.push(entry.id);
      }
    }
    if (result.loot) result.loot.forEach(tryOne);
    (LOOT_BY_TAG[result.tag] || []).forEach(tryOne);
    (LOOT_BY_EVENT[eventId] || []).forEach(tryOne);
    if (state.flags.divine_shard && Math.random() < 0.06) {
      addItem("mystic_dust", 1);
      dropped.push("mystic_dust");
    }
    return dropped;
  }

  function formatDroppedItems(ids) {
    if (!ids.length) return "";
    return ids.map(function (id) {
      var it = getItem(id);
      return it.icon + " " + it.name;
    }).join(", ");
  }

  function getLootHints(resultTag, eventId, explicitLoot) {
    var hints = [];
    function addHints(list) {
      list.forEach(function (entry) {
        var it = getItem(entry.id);
        if (it) hints.push(it.icon + " " + (entry.chance * 100).toFixed(0) + "%");
      });
    }
    if (explicitLoot) addHints(explicitLoot);
    addHints(LOOT_BY_TAG[resultTag] || []);
    addHints(LOOT_BY_EVENT[eventId] || []);
    return hints.length ? hints.join(" · ") : "";
  }

  function getEnemyLine(eventId) {
    var e = ENEMIES[eventId];
    if (!e || !e.mobs.length) return "";
    var mob = e.mobs[Math.floor(Math.random() * e.mobs.length)];
    var html = '⚔ <span class="enemy-tag">출몰: ' + mob + "</span>";
    if (e.boss) html += ' · <span class="enemy-tag">보스: ' + e.boss + "</span>";
    return html;
  }

  function updateInventoryQuick() {
    var keys = Object.keys(state.inventory);
    var el = $("#inventory-quick-list");
    if (!keys.length) {
      el.textContent = "비어 있음";
      return;
    }
    el.textContent = keys.map(function (id) {
      var it = getItem(id);
      return it.icon + it.name + "×" + state.inventory[id];
    }).join(" · ");
  }

  function openCamp(defaultTab) {
    state.campReturnScreen = "game";
    showScreen("camp");
    switchCampTab(defaultTab || "rest");
    renderCamp();
  }

  function switchCampTab(tab) {
    $$(".camp-tab").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });
    $$(".camp-panel").forEach(function (p) { p.classList.remove("active"); });
    var panel = $("#camp-panel-" + tab);
    if (panel) panel.classList.add("active");
  }

  function renderCamp() {
    var rested = state.restedChapter === state.chapter;
    $("#rest-status").textContent = rested
      ? "이번 구간에서는 이미 휴식했습니다."
      : "휴식 가능 (챕터당 1회)";
    $("#btn-rest").disabled = rested;

    var bag = $("#inventory-list");
    bag.innerHTML = "";
    var keys = Object.keys(state.inventory);
    if (!keys.length) {
      bag.innerHTML = "<li class=\"empty\">가방이 비어 있습니다. 선택 후 확률로 아이템을 얻습니다.</li>";
    } else {
      keys.forEach(function (id) {
        var it = getItem(id);
        var li = document.createElement("li");
        var actions = "";
        if (it.type === "consumable") {
          actions += '<button type="button" class="btn-small btn-use" data-id="' + id + '">사용</button>';
        }
        if (it.type === "equip") {
          var label = state.equippedId === id ? "해제" : "장착";
          actions += '<button type="button" class="btn-small btn-equip" data-id="' + id + '">' + label + "</button>";
        }
        li.innerHTML = "<span>" + it.icon + " " + it.name + " ×" + state.inventory[id] +
          "<br><small>" + it.desc + "</small></span><span class=\"item-actions\">" + actions + "</span>";
        bag.appendChild(li);
      });
    }
    var eq = state.equippedId ? getItem(state.equippedId) : null;
    $("#equipped-display").textContent = eq
      ? "장착: " + eq.icon + " " + eq.name
      : "장착: 없음";

    var craft = $("#craft-list");
    craft.innerHTML = "";
    RECIPES.forEach(function (recipe) {
      var li = document.createElement("li");
      var costParts = Object.keys(recipe.cost).map(function (k) {
        return getItem(k).icon + getItem(k).name + "×" + recipe.cost[k];
      });
      if (recipe.gold) costParts.push("금" + recipe.gold);
      var can = canAffordRecipe(recipe);
      li.innerHTML =
        "<span><strong>" + recipe.name + "</strong> → " +
        getItem(recipe.result).icon + " " + getItem(recipe.result).name +
        "<br><small>" + costParts.join(" + ") + "</small></span>" +
        '<button type="button" class="btn-small btn-craft' + (can ? "" : " btn-craft-unaffordable") +
        '" data-recipe="' + recipe.id + '"' +
        (can ? "" : " disabled") + ">" + (can ? "제작" : "제작 불가") + "</button>";
      craft.appendChild(li);
    });

    bag.querySelectorAll(".btn-use").forEach(function (btn) {
      btn.addEventListener("click", function () { useConsumable(btn.dataset.id); });
    });
    bag.querySelectorAll(".btn-equip").forEach(function (btn) {
      btn.addEventListener("click", function () { toggleEquip(btn.dataset.id); });
    });
    craft.querySelectorAll(".btn-craft").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (craftItem(btn.dataset.recipe)) renderCamp();
        updateStats();
      });
    });
    updateInventoryQuick();
  }

  function useConsumable(id) {
    var it = getItem(id);
    if (!it || it.type !== "consumable" || !countItem(id)) return;
    removeItem(id, 1);
    if (it.use.hp) state.hp = Math.min(state.maxHp, state.hp + it.use.hp);
    if (it.use.morale) state.morale = Math.min(100, state.morale + (it.use.morale || 0));
    if (it.use.buff === "smoke") {
      state.buffs.smoke = (state.buffs.smoke || 0) + (it.use.battles || 1);
    }
    state.log.push("사용: " + it.name);
    renderCamp();
    updateStats();
  }

  function toggleEquip(id) {
    if (state.equippedId === id) state.equippedId = null;
    else state.equippedId = id;
    renderCamp();
    updateStats();
  }

  function doRest() {
    if (state.restedChapter === state.chapter) return;
    state.restedChapter = state.chapter;
    state.hp = Math.min(state.maxHp, state.hp + 30);
    state.morale = Math.min(100, state.morale + 12);
    state.log.push("쉼터 휴식");
    renderCamp();
    updateStats();
  }

  const EVENTS = [
    {
      id: "forest_crossroad",
      title: "숲의 갈림길",
      narrative: "안개 낀 숲에서 길이 여러 갈래로 갈라집니다. 한 번 고른 길은 되돌릴 수 없고, 각 길의 결과는 확률표에 따릅니다.",
      hint: "5가지 선택 × 각 3~4가지 결과 = 이 이벤트만 17가지 경우의 수",
      choices: [
        { text: "왼쪽 — 희미한 불빛", outcomes: [
          { text: "친절한 여행자를 만나 회복한다.", probability: 0.35, hp: 15, gold: 0, morale: 5, tag: "good" },
          { text: "도적 무리 '침묵의 레인'에게 습격당한다.", probability: 0.4, hp: -22, gold: -10, morale: -5, tag: "bad", loot: [{ id: "monster_fang", chance: 0.25 }] },
          { text: "아무 일도 없다.", probability: 0.25, hp: 0, gold: 0, morale: 0, tag: "neutral" },
        ]},
        { text: "가운데 — 폐허로 이어지는 길", outcomes: [
          { text: "고대 유물을 발견한다!", probability: 0.12, hp: 0, gold: 35, morale: 10, tag: "special", loot: [{ id: "crystal_shard", chance: 0.4 }] },
          { text: "함정이 발동한다.", probability: 0.48, hp: -18, gold: -5, morale: 0, tag: "bad" },
          { text: "폐허를 무사히 통과한다.", probability: 0.28, hp: 0, gold: 5, morale: 0, tag: "neutral" },
          { text: "유령과 마주해 사기가 떨어진다.", probability: 0.12, hp: -5, gold: 0, morale: -12, tag: "bad" },
        ]},
        { text: "오른쪽 — 조용한 시냇가", outcomes: [
          { text: "맑은 물로 체력을 회복한다.", probability: 0.55, hp: 12, gold: 0, morale: 3, tag: "good" },
          { text: "독이 든 연못이었다.", probability: 0.28, hp: -14, gold: 0, morale: 0, tag: "bad" },
          { text: "길을 잃는다.", probability: 0.17, hp: 0, gold: 0, morale: -6, tag: "neutral" },
        ]},
        { text: "뒤로 돌아가 숲 가장자리를 돈다 (시간 소모)", outcomes: [
          { text: "안전하게 우회에 성공한다.", probability: 0.45, hp: 0, gold: 0, morale: 2, tag: "neutral" },
          { text: "야수에게 쫓긴다.", probability: 0.35, hp: -15, gold: 0, morale: -3, tag: "bad" },
          { text: "숨겨진 야영지를 발견한다.", probability: 0.2, hp: 8, gold: 12, morale: 5, tag: "good" },
        ]},
        { text: "나무 위로 올라 길을 본다", outcomes: [
          { text: "지형을 파악해 보너스를 얻는다.", probability: 0.3, hp: 0, gold: 0, morale: 10, tag: "good" },
          { text: "떨어져 부상당한다.", probability: 0.25, hp: -20, gold: 0, morale: 0, tag: "bad" },
          { text: "아무것도 보이지 않는다.", probability: 0.35, hp: 0, gold: 0, morale: -2, tag: "neutral" },
          { text: "드물게 보물 지도 조각을 찾는다.", probability: 0.1, hp: 0, gold: 25, morale: 8, tag: "special", setFlag: "divine_shard" },
        ]},
      ],
    },
    {
      id: "village_square",
      title: "마을 광장",
      narrative: "작은 마을 광장에 여러 사람이 모여 있습니다. 오늘은 한 가지 일만 더 할 수 있습니다 — 누구에게 말을 걸까요?",
      hint: "6명 중 1명 선택 × 각 분기 = 6 × (평균 3.5결과) ≈ 21가지 경우의 수",
      choices: [
        { text: "상인 — 물건 구매 (금 15)", outcomes: [
          { text: "희귀 회복약을 싸게 산다.", probability: 0.38, hp: 18, gold: -15, morale: 0, tag: "good" },
          { text: "가짜 약에 속는다.", probability: 0.32, hp: -10, gold: -15, morale: -3, tag: "bad" },
          { text: "평범한 물건만 산다.", probability: 0.3, hp: 0, gold: -15, morale: 0, tag: "neutral" },
        ]},
        { text: "병사 — 퀘스트 의뢰", outcomes: [
          { text: "의뢰 성공, 보상 28금.", probability: 0.32, hp: 0, gold: 28, morale: 6, tag: "good" },
          { text: "전투에서 부상.", probability: 0.45, hp: -20, gold: 0, morale: 0, tag: "bad" },
          { text: "의뢰 취소.", probability: 0.23, hp: 0, gold: 0, morale: -2, tag: "neutral" },
        ]},
        { text: "노인 — 수수께끼", outcomes: [
          { text: "전설의 축복.", probability: 0.08, hp: 22, gold: 18, morale: 14, tag: "special" },
          { text: "저주.", probability: 0.28, hp: -14, gold: 0, morale: -10, tag: "bad" },
          { text: "아무 일 없음.", probability: 0.64, hp: 0, gold: 0, morale: 0, tag: "neutral" },
        ]},
        { text: "음유시인 — 노래를 청한다 (금 5)", outcomes: [
          { text: "사기가 크게 오른다.", probability: 0.5, hp: 0, gold: -5, morale: 18, tag: "good" },
          { text: "시끄러워 쫓겨난다.", probability: 0.2, hp: 0, gold: -5, morale: -8, tag: "bad" },
          { text: "평범한 공연.", probability: 0.3, hp: 0, gold: -5, morale: 5, tag: "neutral" },
        ]},
        { text: "아이 — 잃어버린 물건 찾기", outcomes: [
          { text: "보상 15금과 호의.", probability: 0.4, hp: 0, gold: 15, morale: 8, tag: "good" },
          { text: "함정에 빠진다.", probability: 0.25, hp: -12, gold: 0, morale: 0, tag: "bad" },
          { text: "헛수고.", probability: 0.35, hp: -3, gold: 0, morale: -2, tag: "neutral" },
        ]},
        { text: "경비대 — 마을 지키기 참여", outcomes: [
          { text: "습격을 막아 큰 보상.", probability: 0.25, hp: -8, gold: 35, morale: 10, tag: "good" },
          { text: "심한 부상.", probability: 0.35, hp: -28, gold: 10, morale: 0, tag: "bad" },
          { text: "평화로운 하루.", probability: 0.4, hp: 0, gold: 5, morale: 3, tag: "neutral" },
        ]},
      ],
    },
    {
      id: "travelers_rest",
      title: "여행자의 쉼터",
      narrative: "황혼의 탑으로 향하는 모험가들이 모인 쉼터입니다. 동료는 최대 3명까지 맞이할 수 있으며, 각 동료는 던전에서 확률을 조금씩 바꿉니다.",
      hint: "동료 2명 이상 + 신의 파편(divine_shard) → 탑 정상에서 히든 선택 해금",
      choices: [
        { text: "리라 — 은둔 검사에게 동료를 부탁한다", recruitTarget: "lyra", outcomes: [
          { text: "리라가 동료가 된다.", probability: 0.58, hp: 0, gold: 0, morale: 8, tag: "good", recruit: "lyra" },
          { text: "고개만 끄덕이고 떠난다.", probability: 0.42, hp: 0, gold: 0, morale: -2, tag: "neutral" },
        ]},
        { text: "오른 — 대장장이 수행원을 돕는다", recruitTarget: "orn", outcomes: [
          { text: "오른이 망치를 들고 합류한다.", probability: 0.55, hp: 5, gold: 0, morale: 5, tag: "good", recruit: "orn" },
          { text: "일만 하고 동료는 되지 못한다.", probability: 0.45, hp: -3, gold: 5, morale: 0, tag: "neutral" },
        ]},
        { text: "셀레네 — 별을 읽는 점술가와 대화한다", recruitTarget: "selene", outcomes: [
          { text: "셀레네가 신비한 부적을 건넨다.", probability: 0.5, hp: 0, gold: 0, morale: 10, tag: "special", recruit: "selene" },
          { text: "불길한 예언만 듣는다.", probability: 0.5, hp: 0, gold: 0, morale: -8, tag: "bad" },
        ]},
        { text: "카이 — 기록관의 잃어버린 책을 찾아준다", recruitTarget: "kai", outcomes: [
          { text: "카이가 지식을 나누며 합류한다.", probability: 0.52, hp: 0, gold: 8, morale: 6, tag: "good", recruit: "kai" },
          { text: "책만 받고 혼자 간다.", probability: 0.48, hp: 0, gold: 12, morale: 0, tag: "neutral" },
        ]},
        { text: "혼자 출발한다 (동료 없이)", outcomes: [
          { text: "고독한 길을 선택했다.", probability: 1, hp: 0, gold: 0, morale: 5, tag: "neutral" },
        ]},
      ],
    },
    {
      id: "job_evolution_1",
      title: "전직의 제단 — 1차",
      narrative: "고대 제단에 직업의 길이 빛으로 새겨집니다. 한 갈래를 선택하면 확률에 따라 상위 직업으로 진화합니다.",
      hint: "1차 전직 — 선택 수 × 성공/실패/보류 = 경우의 수 폭발",
      isEvolution: true,
      choices: [],
    },
    {
      id: "cave_bridge",
      title: "동굴과 다리",
      narrative: "깊은 계곡 앞에 흔들리는 다리와 어두운 동굴 입구가 있습니다. 둘 다 위험하지만, 통과 방법은 여러 가지입니다.",
      hint: "4가지 접근법 × 각 3~4결과 = 15가지 경우의 수",
      choices: [
        { text: "다리를 조심히 건넌다", outcomes: [
          { text: "무사히 건넌다.", probability: 0.5, hp: 0, gold: 0, morale: 4, tag: "good" },
          { text: "판자가 부러져 다친다.", probability: 0.35, hp: -18, gold: 0, morale: 0, tag: "bad" },
          { text: "중간에서 멈춰 체력을 소모한다.", probability: 0.15, hp: -8, gold: 0, morale: -4, tag: "neutral" },
        ]},
        { text: "동굴 속으로 들어간다", outcomes: [
          { text: "지름길을 발견한다.", probability: 0.28, hp: 5, gold: 15, morale: 6, tag: "good" },
          { text: "박쥐 떼에 공격당한다.", probability: 0.42, hp: -16, gold: 0, morale: 0, tag: "bad" },
          { text: "어둠 속을 헤맨다.", probability: 0.2, hp: 0, gold: 0, morale: -5, tag: "neutral" },
          { text: "수정 광맥을 발견한다!", probability: 0.1, hp: 0, gold: 30, morale: 5, tag: "special" },
        ]},
        { text: "계곡 아래로 돌아 우회 (먼 길)", outcomes: [
          { text: "안전하게 도착.", probability: 0.55, hp: -5, gold: 0, morale: 0, tag: "neutral" },
          { text: "짐승의 영역에 들어선다.", probability: 0.3, hp: -20, gold: 0, morale: -5, tag: "bad" },
          { text: "약초를 채집한다.", probability: 0.15, hp: 15, gold: 0, morale: 3, tag: "good" },
        ]},
        { text: "로프를 이용해 다리 아래로 이동", outcomes: [
          { text: "완벽한 기동.", probability: 0.35, hp: 0, gold: 10, morale: 8, tag: "good" },
          { text: "로프가 끊어진다.", probability: 0.3, hp: -25, gold: 0, morale: 0, tag: "bad" },
          { text: "중간에 막힌다.", probability: 0.25, hp: -5, gold: 0, morale: -3, tag: "neutral" },
          { text: "숨겨진 상자.", probability: 0.1, hp: 0, gold: 40, morale: 0, tag: "special" },
        ]},
      ],
    },
    {
      id: "job_evolution_2",
      title: "전직의 제단 — 2차",
      narrative: "탑으로 가는 길목, 두 번째 제단이 빛납니다. 더 높은 직급(중급~고급)으로 뻗을 수 있습니다.",
      hint: "2차 전직 — 분기가 많을수록 경우의 수 증가",
      isEvolution: true,
      choices: [],
    },
    {
      id: "castle_trial",
      title: "성의 시험의 전당",
      narrative: "고대 성의 전당에서 네 가지 시험이 기다립니다. 하나만 통과하면 문이 열리고, 실패하면 대가를 치릅니다.",
      hint: "5가지 시험 중 1개 선택 — 각 시험은 독립 확률 변수",
      choices: [
        { text: "힘의 시험 — 거대 돌을 밀기", outcomes: [
          { text: "통과, 전투력 인정.", probability: 0.35, hp: -5, gold: 0, morale: 12, tag: "good" },
          { text: "돌에 깔린다.", probability: 0.4, hp: -22, gold: 0, morale: -5, tag: "bad" },
          { text: "간신히 무승부.", probability: 0.25, hp: -10, gold: 0, morale: 0, tag: "neutral" },
        ]},
        { text: "지혜의 시험 — 네 개의 문 중 하나", outcomes: [
          { text: "정답의 문.", probability: 0.2, hp: 0, gold: 25, morale: 15, tag: "special" },
          { text: "함정의 문.", probability: 0.45, hp: -15, gold: 0, morale: 0, tag: "bad" },
          { text: "빈 방.", probability: 0.2, hp: 0, gold: 0, morale: -3, tag: "neutral" },
          { text: "두 번째 시도에 성공.", probability: 0.15, hp: -5, gold: 10, morale: 5, tag: "good" },
        ]},
        { text: "인내의 시험 — 독가스 방", outcomes: [
          { text: "끝까지 버틴다.", probability: 0.4, hp: -8, gold: 0, morale: 10, tag: "good" },
          { text: "기절.", probability: 0.35, hp: -25, gold: -10, morale: -8, tag: "bad" },
          { text: "반쯤 포기.", probability: 0.25, hp: 0, gold: 0, morale: -5, tag: "neutral" },
        ]},
        { text: "운의 시험 — 세 개의 상자", outcomes: [
          { text: "황금 상자.", probability: 0.15, hp: 10, gold: 45, morale: 5, tag: "special" },
          { text: "빈 상자.", probability: 0.4, hp: 0, gold: 0, morale: -2, tag: "neutral" },
          { text: "저주 상자.", probability: 0.3, hp: -12, gold: 0, morale: -10, tag: "bad" },
          { text: "은 상자.", probability: 0.15, hp: 0, gold: 20, morale: 3, tag: "good" },
        ]},
        { text: "협상의 시험 — 성령과 대화", outcomes: [
          { text: "계약 성공.", probability: 0.3, hp: 0, gold: 0, morale: 20, tag: "good" },
          { text: "성령의 분노.", probability: 0.25, hp: -18, gold: 0, morale: -12, tag: "bad" },
          { text: "애매한 거래.", probability: 0.45, hp: 0, gold: 5, morale: 0, tag: "neutral" },
        ]},
        { text: "타락의 계약 — 어둠의 길 (이후 타락 전직 해금)", isCorruption: true, outcomes: [
          { text: "타락을 받아들인다.", probability: 0.4, hp: -10, morale: -15, tag: "bad", setFlag: "corruption" },
          { text: "거부하고 상처만 남는다.", probability: 0.35, hp: -8, morale: 5, tag: "neutral" },
          { text: "계약을 역이용한다.", probability: 0.25, hp: 0, gold: 20, tag: "special", setFlag: "corruption" },
        ]},
      ],
    },
    {
      id: "job_evolution_3",
      title: "전직의 제단 — 3차",
      narrative: "탑 입구 직전, 마지막 대제단입니다. 화경·신살급 직업이 눈앞에 있습니다. 성직 계열은 하급 신, 사냥꾼 계열은 신살자로 갈 수 있습니다.",
      hint: "3차 전직 — 최종 직급이 확률로 결정됨",
      isEvolution: true,
      choices: [],
    },
    {
      id: "tower_enter",
      title: "황혼의 탑 — 입구 (지상)",
      narrative: "하늘을 찌를 듯한 탑이 어둠 속에 서 있습니다. 이제부터 각 층이 하나의 던전입니다.",
      hint: "탑 던전 7층 + 정상 — 동료가 많을수록 '나쁜' 확률이 소폭 감소",
      choices: [
        { text: "정문으로 진입", outcomes: [
          { text: "경비를 물리치고 1층에 도착.", probability: 0.45, hp: -8, gold: 10, morale: 5, tag: "good" },
          { text: "함정 발동.", probability: 0.35, hp: -18, gold: 0, morale: 0, tag: "bad" },
          { text: "몰래 들어가 스태미나만 소모.", probability: 0.2, hp: -5, gold: 0, morale: 0, tag: "neutral" },
        ]},
        { text: "동료와 함께 돌격", requires: { minCompanions: 1 }, outcomes: [
          { text: "협동 공격 성공.", probability: 0.55, hp: -3, gold: 15, morale: 10, tag: "good" },
          { text: "연계 실패, 혼란.", probability: 0.3, hp: -14, gold: 0, morale: -5, tag: "bad" },
          { text: "간신히 진입.", probability: 0.15, hp: -8, gold: 0, morale: 0, tag: "neutral" },
        ]},
        { text: "탑 주변 유적 조사", outcomes: [
          { text: "신의 파편 반응이 느껴진다.", probability: 0.2, hp: 0, gold: 0, morale: 12, tag: "special", setFlag: "divine_shard" },
          { text: "아무것도 없다.", probability: 0.5, hp: 0, gold: 0, morale: 0, tag: "neutral" },
          { text: "고대 함정.", probability: 0.3, hp: -12, gold: 0, morale: 0, tag: "bad" },
        ]},
      ],
    },
    {
      id: "tower_b2",
      title: "황혼의 탑 — 2층 (독가스 회랑)",
      narrative: "독가스가 깔린 회랑입니다. 통과 방법을 고르세요.",
      hint: "2층 — 독 관련 '나쁜' 결과 비율이 높음",
      choices: [
        { text: "마스크 없이 돌진", outcomes: [
          { text: "빠르게 통과.", probability: 0.35, hp: -10, gold: 0, morale: 0, tag: "neutral" },
          { text: "중독.", probability: 0.5, hp: -22, gold: 0, morale: -5, tag: "bad" },
          { text: "통풍구 발견.", probability: 0.15, hp: 0, gold: 5, morale: 5, tag: "good" },
        ]},
        { text: "셀레네/성직자 축복 기도 (동료 셀레네 시 유리)", outcomes: [
          { text: "가스가 걷힌다.", probability: 0.4, hp: 5, gold: 0, morale: 8, tag: "good" },
          { text: "기도가 통하지 않는다.", probability: 0.4, hp: -15, gold: 0, morale: 0, tag: "bad" },
          { text: "부분적 보호.", probability: 0.2, hp: -5, gold: 0, morale: 2, tag: "neutral" },
        ]},
        { text: "바닥 함정을 피해 벽 타기", outcomes: [
          { text: "완벽한 기동.", probability: 0.3, hp: 0, gold: 12, morale: 6, tag: "good" },
          { text: "추락.", probability: 0.45, hp: -25, gold: 0, morale: 0, tag: "bad" },
          { text: "벽에 발이 걸린다.", probability: 0.25, hp: -10, gold: 0, morale: -3, tag: "neutral" },
        ]},
      ],
    },
    {
      id: "tower_b3",
      title: "황혼의 탑 — 3층 (거울 미궁)",
      narrative: "거울이 무한히 반사되는 미궁. 길을 잃으면 체력만 소모합니다.",
      hint: "3층 — '보통' 결과가 많아 기대값 계산이 중요",
      choices: [
        { text: "오른손 법칙으로 걷는다", outcomes: [
          { text: "출구 발견.", probability: 0.5, hp: 0, gold: 0, morale: 4, tag: "good" },
          { text: "같은 방을 도는군요.", probability: 0.35, hp: -8, gold: 0, morale: -4, tag: "neutral" },
          { text: "거울 요정의 장난.", probability: 0.15, hp: -15, gold: -8, morale: 0, tag: "bad" },
        ]},
        { text: "카이에게 길 찾기를 맡긴다", requires: { minCompanions: 1, companion: "kai" }, outcomes: [
          { text: "카이가 지도를 해독한다.", probability: 0.65, hp: 0, gold: 10, morale: 8, tag: "good" },
          { text: "책이 틀렸다.", probability: 0.35, hp: -10, gold: 0, morale: -5, tag: "bad" },
        ]},
        { text: "거울을 모두 부순다", outcomes: [
          { text: "길이 열린다.", probability: 0.25, hp: -5, gold: 20, morale: 5, tag: "good" },
          { text: "파편 폭풍.", probability: 0.55, hp: -20, gold: 0, morale: 0, tag: "bad" },
          { text: "일부만 깨뜨림.", probability: 0.2, hp: -8, gold: 0, morale: 0, tag: "neutral" },
        ]},
        { text: "그림자 길로 미궁 아래 통로", outcomes: [
          { text: "지름길.", probability: 0.35, hp: 0, gold: 15, morale: 3, tag: "good" },
          { text: "어둠 속 괴물.", probability: 0.4, hp: -18, gold: 0, morale: 0, tag: "bad" },
          { text: "막다른 길.", probability: 0.25, hp: -5, gold: 0, morale: -2, tag: "neutral" },
        ]},
      ],
    },
    {
      id: "tower_b4",
      title: "황혼의 탑 — 4층 (떠도는 석판)",
      narrative: "공중에 떠 있는 석판들을 건너야 합니다.",
      hint: "4층",
      choices: [
        { text: "하나씩 조심히 건넌다", outcomes: [
          { text: "안전 통과.", probability: 0.55, hp: 0, gold: 0, morale: 3, tag: "good" },
          { text: "미끄러짐.", probability: 0.3, hp: -16, gold: 0, morale: 0, tag: "bad" },
          { text: "시간 낭비.", probability: 0.15, hp: -5, gold: 0, morale: -2, tag: "neutral" },
        ]},
        { text: "오른과 함께 판을 고정", requires: { companion: "orn" }, outcomes: [
          { text: "안정적인 다리 완성.", probability: 0.7, hp: 0, gold: 8, morale: 8, tag: "good" },
          { text: "판이 부서진다.", probability: 0.3, hp: -12, gold: 0, morale: 0, tag: "bad" },
        ]},
        { text: "점프로 건너뛰기", outcomes: [
          { text: "화려한 착지.", probability: 0.28, hp: 0, gold: 0, morale: 12, tag: "good" },
          { text: "추락.", probability: 0.52, hp: -28, gold: 0, morale: -8, tag: "bad" },
          { text: "간신히 잡힘.", probability: 0.2, hp: -10, gold: 0, morale: 0, tag: "neutral" },
        ]},
      ],
    },
    {
      id: "tower_b5",
      title: "황혼의 탑 — 5층 (망령의 전당)",
      narrative: "망령들이 속삭이는 전당. 제단에는 탑의 힘이 깃들어 있습니다.",
      hint: "5층 제단 — 신의 파편 획득 가능",
      choices: [
        { text: "망령과 전투", outcomes: [
          { text: "정화 성공.", probability: 0.38, hp: -10, gold: 25, morale: 8, tag: "good" },
          { text: "영혼 흡수.", probability: 0.42, hp: -24, gold: 0, morale: -10, tag: "bad" },
          { text: "상호 무시.", probability: 0.2, hp: 0, gold: 0, morale: 0, tag: "neutral" },
        ]},
        { text: "제단에 기도 (신의 파편)", outcomes: [
          { text: "신의 파편이 응답한다!", probability: 0.22, hp: 10, gold: 0, morale: 15, tag: "special", setFlag: "divine_shard" },
          { text: "아무 일 없음.", probability: 0.48, hp: 0, gold: 0, morale: 0, tag: "neutral" },
          { text: "망령의 저주.", probability: 0.3, hp: -15, gold: 0, morale: -12, tag: "bad" },
        ]},
        { text: "리라와 함께 망령 제압", requires: { companion: "lyra" }, outcomes: [
          { text: "완벽한 연계 검술.", probability: 0.6, hp: -5, gold: 20, morale: 10, tag: "good" },
          { text: "리라가 부상.", probability: 0.4, hp: -15, gold: 0, morale: -5, tag: "bad" },
        ]},
        { text: "조용히 지나간다", outcomes: [
          { text: "발각 없이 통과.", probability: 0.6, hp: 0, gold: 0, morale: 0, tag: "neutral" },
          { text: "뒤에서 습격.", probability: 0.4, hp: -18, gold: 0, morale: -5, tag: "bad" },
        ]},
      ],
    },
    {
      id: "tower_b6",
      title: "황혼의 탑 — 6층 (용암 격자)",
      narrative: "바닥마다 용암 분출구가 있는 격자 방입니다.",
      hint: "6층 — HP 손실이 큰 층",
      choices: [
        { text: "격자 패턴을 읽고 이동", outcomes: [
          { text: "패턴 파악 성공.", probability: 0.42, hp: 0, gold: 0, morale: 6, tag: "good" },
          { text: "용암에 화상.", probability: 0.43, hp: -26, gold: 0, morale: 0, tag: "bad" },
          { text: "지연.", probability: 0.15, hp: -8, gold: 0, morale: -3, tag: "neutral" },
        ]},
        { text: "동료 전원에게 방패 진", requires: { minCompanions: 2 }, outcomes: [
          { text: "무사 통과.", probability: 0.5, hp: -5, gold: 0, morale: 12, tag: "good" },
          { text: "진이 깨짐.", probability: 0.35, hp: -20, gold: 0, morale: 0, tag: "bad" },
          { text: "일부만 성공.", probability: 0.15, hp: -12, gold: 0, morale: 0, tag: "neutral" },
        ]},
        { text: "얼음 부적 사용 (금 20)", outcomes: [
          { text: "길이 얼어붙는다.", probability: 0.35, hp: 0, gold: -20, morale: 4, tag: "good" },
          { text: "부적이 녹는다.", probability: 0.4, hp: -15, gold: -20, morale: 0, tag: "bad" },
          { text: "효과 미미.", probability: 0.25, hp: -8, gold: -20, morale: 0, tag: "neutral" },
        ]},
      ],
    },
    {
      id: "tower_b7",
      title: "황혼의 탑 — 7층 (탑의 수호자)",
      narrative: "정상 직전, 탑의 수호자가 길을 막습니다. 이것을 넘어야 신좌가 보입니다.",
      hint: "7층 보스 — 다음 층이 최종 정상",
      choices: [
        { text: "발가르니 투검과 정면 결투", outcomes: [
          { text: "수호자 발가르니를 격파한다.", probability: 0.35, hp: -15, gold: 30, morale: 15, tag: "good", loot: [{ id: "monster_fang", chance: 0.5 }] },
          { text: "패배 직전 탈출.", probability: 0.4, hp: -32, gold: 0, morale: -10, tag: "bad" },
          { text: "무승부.", probability: 0.25, hp: -20, gold: 10, morale: 0, tag: "neutral" },
        ]},
        { text: "동료 연합 전술", requires: { minCompanions: 2 }, outcomes: [
          { text: "압도적 승리.", probability: 0.48, hp: -8, gold: 35, morale: 18, tag: "good" },
          { text: "전술 붕괴.", probability: 0.32, hp: -28, gold: 0, morale: -8, tag: "bad" },
          { text: "빠듯한 승리.", probability: 0.2, hp: -18, gold: 15, morale: 5, tag: "neutral" },
        ]},
        { text: "수호자와 계약", outcomes: [
          { text: "통행 허가.", probability: 0.28, hp: 0, gold: -15, morale: 10, tag: "good" },
          { text: "계약 파기.", probability: 0.45, hp: -25, gold: 0, morale: -15, tag: "bad" },
          { text: "애매한 조건.", probability: 0.27, hp: -10, gold: 0, morale: 0, tag: "neutral" },
        ]},
        { text: "함정으로 유인", outcomes: [
          { text: "수호자 추락.", probability: 0.22, hp: -5, gold: 40, morale: 8, tag: "special" },
          { text: "본인이 함정에.", probability: 0.48, hp: -30, gold: 0, morale: 0, tag: "bad" },
          { text: "실패.", probability: 0.3, hp: -12, gold: 0, morale: 0, tag: "neutral" },
        ]},
      ],
    },
    {
      id: "job_evolution_4",
      title: "전직의 제단 — 정상 직전",
      narrative: "수호자를 넘은 뒤, 신좌 앞 작은 제단. 아직 진화 여지가 있다면 마지막 전직을 시도할 수 있습니다.",
      hint: "4차(최종) 전직 — 신살/화경/하급 신",
      isEvolution: true,
      choices: [],
    },
    {
      id: "tower_summit",
      title: "황혼의 탑 — 정상 (신좌의 전당)",
      narrative: "구름 위 전당에 신좌가 빛납니다. 탑을 정복하거나, 신좌의 힘으로 신이 될 수 있습니다. 후자는 극히 낮은 확률이지만, 동료와 신의 파편이 열쇠입니다.",
      hint: "히든: 동료 2명+ & divine_shard → '신이 되기' 선택 해금",
      choices: [
        { text: "탑주 크로노스 베일과 최후의 결전", outcomes: [
          { text: "크로노스 베일을 쓰러뜨렸다!", probability: 0.38, hp: -10, gold: 50, morale: 20, tag: "good", ending: "conquer", loot: [{ id: "crystal_shard", chance: 0.35 }] },
          { text: "크로노스에게 역전당해 쓰러진다.", probability: 0.42, hp: -45, gold: 0, morale: 0, tag: "bad" },
          { text: "힘겹게 무승부.", probability: 0.2, hp: -20, gold: 20, morale: 0, tag: "neutral" },
        ]},
        { text: "신좌의 빛을 받아들인다 — 신이 되기", hiddenPath: true, requires: { minCompanions: 2, flag: "divine_shard" }, godAscension: true, outcomes: [
          { text: "황혼의 탑 전체가 빛에 물들고, 당신은 신이 된다.", probability: 0.1, hp: 0, gold: 0, morale: 100, tag: "special", ending: "god" },
          { text: "육신이 견디지 못하고 붕괴한다.", probability: 0.5, hp: -55, gold: 0, morale: -30, tag: "bad" },
          { text: "힘이 부족해 신좌에서 밀려난다.", probability: 0.4, hp: -15, gold: 0, morale: -20, tag: "neutral" },
        ]},
        { text: "신좌를 파괴하고 탑을 봉인", outcomes: [
          { text: "탑이 무너지며 평화가 온다.", probability: 0.3, hp: -5, gold: 30, morale: 15, tag: "good", ending: "seal" },
          { text: "폭발.", probability: 0.45, hp: -35, gold: 0, morale: 0, tag: "bad" },
          { text: "봉인 실패.", probability: 0.25, hp: -15, gold: 0, morale: -5, tag: "neutral" },
        ]},
        { text: "동료들과 함께 신좌의 힘을 나눈다", requires: { minCompanions: 3, flag: "divine_shard" }, godAscension: true, outcomes: [
          { text: "네 명이 함께 신격에 도달한다!", probability: 0.18, hp: 0, gold: 0, morale: 100, tag: "special", ending: "god" },
          { text: "힘이 분산되어 실패.", probability: 0.52, hp: -25, gold: 0, morale: -10, tag: "bad" },
          { text: "인간으로 남기로 했다.", probability: 0.3, hp: 0, gold: 40, morale: 25, tag: "good", ending: "conquer" },
        ]},
      ],
    },
  ];

  const TAG_LABELS = { good: "좋음", bad: "나쁨", special: "특수", neutral: "보통" };

  function getEventChoices(event) {
    if (event.isEvolution) return makeEvolutionChoices();
    return event.choices;
  }

  function mergeBonuses() {
    var merged = {};
    var job = getActiveJob();
    var roleBonus = job ? job.luckBonus || {} : {};
    var tier = job ? job.tier : 0;
    if (tier > 0) {
      merged.good = (merged.good || 0) + tier * 0.008;
      merged.special = (merged.special || 0) + tier * 0.006;
      merged.bad = (merged.bad || 0) - tier * 0.006;
    }
    Object.keys(roleBonus).forEach(function (k) { merged[k] = (merged[k] || 0) + roleBonus[k]; });
    state.companions.forEach(function (id) {
      var c = COMPANIONS[id];
      if (!c) return;
      Object.keys(c.luckBonus).forEach(function (k) {
        merged[k] = (merged[k] || 0) + c.luckBonus[k];
      });
    });
    var eq = getEquipBonus();
    Object.keys(eq).forEach(function (k) { merged[k] = (merged[k] || 0) + eq[k]; });
    if (state.buffs.smoke > 0) merged.bad = (merged.bad || 0) - 0.05;
    if (countItem("gods_fragment") >= 1) merged.special = (merged.special || 0) + 0.04;
    return merged;
  }

  function applyRoleToOutcomes(outcomes, role, extraBonus) {
    var bonus = extraBonus || mergeBonuses();
    if (!Object.keys(bonus).length) return outcomes.map(function (o) { return Object.assign({}, o); });
    var adjusted = outcomes.map(function (o) {
      return Object.assign({}, o, { probability: Math.max(0.01, o.probability + (bonus[o.tag] || 0)) });
    });
    var total = adjusted.reduce(function (s, o) { return s + o.probability; }, 0);
    return adjusted.map(function (o) {
      return Object.assign({}, o, { probability: o.probability / total });
    });
  }

  function applyGodAscensionBoost(outcomes) {
    var boost = 0.05 * state.companions.length;
    if (state.flags.divine_shard) boost += 0.08;
    var job = getActiveJob();
    if (job && (job.branch === "holy" || job.branch === "arcane" || job.godPath)) boost += 0.06;
    if (job && job.id === "god_slayer") boost += 0.1;
    if (job && job.id === "lower_god") boost += 0.12;
    if (countItem("gods_fragment") >= 1) boost += 0.08;
    if (state.morale >= 70) boost += 0.04;
    var adjusted = outcomes.map(function (o, i) {
      var p = o.probability;
      if (i === 0 && o.ending === "god") p = Math.min(0.45, p + boost);
      return Object.assign({}, o, { probability: p });
    });
    var total = adjusted.reduce(function (s, o) { return s + o.probability; }, 0);
    return adjusted.map(function (o) {
      return Object.assign({}, o, { probability: o.probability / total });
    });
  }

  function meetsRequires(req) {
    if (!req) return true;
    if (req.flag && !state.flags[req.flag]) return false;
    if (req.minCompanions && state.companions.length < req.minCompanions) return false;
    if (req.companion && state.companions.indexOf(req.companion) < 0) return false;
    return true;
  }

  function filterVisibleChoices(choices) {
    return choices.filter(function (c) {
      if (c.recruitTarget && state.companions.indexOf(c.recruitTarget) >= 0) return false;
      if (c.recruitTarget && state.companions.length >= MAX_COMPANIONS) return false;
      if (c.requires && !meetsRequires(c.requires)) return false;
      return true;
    });
  }

  function getVisibleChoices(event) {
    return filterVisibleChoices(getEventChoices(event));
  }

  function addCompanion(id) {
    if (!COMPANIONS[id] || state.companions.indexOf(id) >= 0) return;
    if (state.companions.length >= MAX_COMPANIONS) return;
    state.companions.push(id);
    state.log.push("동료 합류: " + COMPANIONS[id].icon + " " + COMPANIONS[id].name);
  }

  function processOutcomeMeta(result, eventId) {
    if (result.setFlag) state.flags[result.setFlag] = true;
    if (result.recruit) addCompanion(result.recruit);
    if (result.ending) state.pendingEnding = result.ending;
    result._dropped = rollLootTables(result, eventId);
    if (state.buffs.smoke > 0) state.buffs.smoke -= 1;
    if (result.evolve) {
      var prev = getActiveJob();
      setJob(result.evolve);
      var next = getActiveJob();
      state.log.push("★ 전직: " + prev.name + " → " + next.name + " (" + getTierLabel(next.tier) + ")");
    }
  }

  function updateJobPathUI() {
    var el = $("#job-path-list");
    if (!state.jobHistory.length) {
      el.textContent = "—";
      return;
    }
    el.innerHTML = state.jobHistory.map(function (id, i) {
      var j = getJob(id);
      var arrow = i < state.jobHistory.length - 1 ? " → " : "";
      return '<span>' + j.icon + " " + j.name + '<span class="job-tier-badge">' + getTierLabel(j.tier) + "</span></span>" + arrow;
    }).join("");
  }

  function hasSageView() {
    var job = getActiveJob();
    return job && job.sageView;
  }

  function getFloorLabel() {
    var ev = EVENTS[state.chapter];
    if (ev.id.indexOf("tower_") === 0) {
      if (ev.id === "tower_enter") return "탑 입구";
      if (ev.id === "tower_summit") return "탑 정상";
      var m = ev.id.match(/tower_b(\d+)/);
      if (m) return "탑 " + m[1] + "층";
    }
    return "여정 " + (state.chapter + 1);
  }

  function updateCompanionsUI() {
    var el = $("#companions-list");
    if (!state.companions.length) {
      el.textContent = "없음 (쉼터에서 맞이 가능)";
    } else {
      el.textContent = state.companions.map(function (id) {
        var c = COMPANIONS[id];
        return c.icon + " " + c.name;
      }).join(" · ");
    }
    var hint = $("#hidden-hint");
    var partial = state.flags.divine_shard || state.companions.length >= 1;
    var job = getActiveJob();
    var godJob = job && job.godPath;
    var full = state.flags.divine_shard && state.companions.length >= 2;
    if (full || godJob) {
      hint.hidden = false;
      hint.textContent = godJob
        ? "✦ " + job.name + " — 정상에서 신좌/신격 선택 시 히든 확률 대폭 상승"
        : "✦ 히든 엔딩 조건 충족! 정상에서 신좌를 선택하세요";
    } else if (partial) {
      hint.hidden = false;
      hint.textContent = "✦ 히든 힌트: 신의 파편 + 동료 2명 필요";
    } else {
      hint.hidden = true;
    }
  }

  function countCases(choices) {
    return choices.reduce(function (s, c) { return s + c.outcomes.length; }, 0);
  }

  function expectedValue(outcomes) {
    return {
      hp: outcomes.reduce(function (s, o) { return s + o.probability * o.hp; }, 0),
      gold: outcomes.reduce(function (s, o) { return s + o.probability * o.gold; }, 0),
      morale: outcomes.reduce(function (s, o) { return s + o.probability * o.morale; }, 0),
    };
  }

  function rollOutcome(outcomes) {
    var r = Math.random();
    for (var i = 0; i < outcomes.length; i++) {
      r -= outcomes[i].probability;
      if (r <= 0) return outcomes[i];
    }
    return outcomes[outcomes.length - 1];
  }

  function formatPercent(p) {
    return (p * 100).toFixed(1) + "%";
  }

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  var screens = {
    title: $("#screen-title"),
    role: $("#screen-role"),
    game: $("#screen-game"),
    camp: $("#screen-camp"),
    result: $("#screen-result"),
    end: $("#screen-end"),
  };

  var state = {
    name: "",
    jobId: null,
    jobHistory: [],
    role: null,
    hp: 100,
    maxHp: 100,
    gold: 30,
    morale: 50,
    chapter: 0,
    log: [],
    pendingChoice: null,
    companions: [],
    flags: {},
    pendingEnding: null,
    godAscensionChoice: false,
    inventory: {},
    equippedId: null,
    buffs: {},
    restedChapter: -1,
    campReturnScreen: "game",
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (k) { screens[k].classList.remove("active"); });
    screens[name].classList.add("active");
  }

  function updateStats() {
    $("#stat-hp-bar").style.width = (state.hp / state.maxHp) * 100 + "%";
    $("#stat-hp").textContent = state.hp + "/" + state.maxHp;
    $("#stat-gold").textContent = state.gold;
    $("#stat-morale").textContent = state.morale;
    $("#stat-chapter").textContent = getFloorLabel() + " (" + (state.chapter + 1) + "/" + EVENTS.length + ")";
    $("#player-name-display").textContent = state.name;
    var job = getActiveJob();
    if (job) {
      $("#player-role-display").innerHTML =
        job.icon + " " + job.name + '<span class="job-tier-badge">' + getTierLabel(job.tier) + "</span>";
    } else {
      $("#player-role-display").textContent = "";
    }
    updateCompanionsUI();
    updateJobPathUI();
    updateInventoryQuick();
  }

  function renderRoles() {
    var grid = $("#role-grid");
    grid.innerHTML = "";
    JOB_STARTERS.forEach(function (id) {
      var job = getJob(id);
      var card = document.createElement("button");
      card.type = "button";
      card.className = "role-card";
      card.dataset.roleId = id;
      card.innerHTML =
        '<span class="role-icon">' + job.icon + "</span>" +
        "<h3>" + job.name + " <span class=\"job-tier-badge\">" + getTierLabel(job.tier) + "</span></h3>" +
        "<p>" + job.description + "</p>";
      card.addEventListener("click", function () { selectStarterJob(id); });
      grid.appendChild(card);
    });
  }

  function selectStarterJob(jobId) {
    setJob(jobId);
    state.jobHistory = [jobId];
    $$(".role-card").forEach(function (c) {
      c.classList.toggle("selected", c.dataset.roleId === jobId);
    });
    $("#btn-start-game").disabled = false;
  }

  function buildOutcomesForChoice(choice) {
    var outcomes = applyRoleToOutcomes(choice.outcomes, state.role);
    if (choice.godAscension) outcomes = applyGodAscensionBoost(outcomes);
    return outcomes;
  }

  function renderProbPanel(choice) {
    var titleEl = $("#prob-panel-title");
    var tagEl = $("#prob-panel-tag");
    var listEl = $("#prob-panel-list");
    var evEl = $("#prob-panel-ev");
    if (!titleEl || !listEl) return;

    if (!choice) {
      titleEl.textContent = "확률표";
      if (tagEl) tagEl.textContent = "";
      listEl.innerHTML =
        '<li class="prob-empty">선택지에 마우스를 올리면<br>결과별 확률이 표시됩니다.</li>';
      if (evEl) evEl.hidden = true;
      return;
    }

    var outcomes = buildOutcomesForChoice(choice);
    var dominant = outcomes.reduce(function (best, o) {
      return !best || o.probability > best.probability ? o : best;
    }, null);
    titleEl.textContent = choice.text;
    if (tagEl) {
      tagEl.textContent = dominant
        ? "(tag: " + dominant.tag + " · " + (TAG_LABELS[dominant.tag] || dominant.tag) + ")"
        : "";
    }

    listEl.innerHTML = outcomes
      .map(function (o) {
        var lootHint = getLootHints(o.tag, EVENTS[state.chapter].id, o.loot);
        var extra = lootHint ? ' <span class="loot-hint">[' + lootHint + "]</span>" : "";
        return (
          '<li class="prob-outcome tag-' + o.tag + '">' +
          '<span class="prob-outcome-name">' + o.text + extra + "</span>" +
          '<span class="prob-outcome-pct">' + formatPercent(o.probability) + "</span>" +
          "</li>"
        );
      })
      .join("");

    if (hasSageView() && evEl) {
      var ev = expectedValue(outcomes);
      evEl.hidden = false;
      evEl.textContent =
        "★ 기대값 HP " + (ev.hp >= 0 ? "+" : "") + ev.hp.toFixed(1) +
        " · 금 " + (ev.gold >= 0 ? "+" : "") + ev.gold.toFixed(1) +
        " · 사기 " + (ev.morale >= 0 ? "+" : "") + ev.morale.toFixed(1);
    } else if (evEl) {
      evEl.hidden = true;
    }
  }

  function setActiveChoiceBtn(activeBtn) {
    $$(".choice-btn").forEach(function (b) {
      b.classList.toggle("is-active", b === activeBtn);
    });
  }

  function renderUtilitySidebar(show) {
    var sidebar = $("#utility-sidebar");
    if (!sidebar) return;
    sidebar.innerHTML = "";
    if (!show) {
      sidebar.classList.remove("visible");
      return;
    }
    sidebar.classList.add("visible");
    var heading = document.createElement("p");
    heading.className = "utility-heading";
    heading.textContent = "부가 행동";
    sidebar.appendChild(heading);

    var bagCard = document.createElement("article");
    bagCard.className = "choice-card is-utility";
    bagCard.innerHTML =
      "<h3>🎒 가방</h3>" +
      '<button type="button" class="btn btn-primary btn-bag-go">가방 열기</button>';
    var campCard = document.createElement("article");
    campCard.className = "choice-card is-utility";
    campCard.innerHTML =
      "<h3>🛖 쉼터</h3>" +
      '<button type="button" class="btn btn-primary btn-camp-go">쉼터로 가기</button>';

    sidebar.appendChild(bagCard);
    sidebar.appendChild(campCard);
    bagCard.querySelector(".btn-bag-go").addEventListener("click", function () { openCamp("bag"); });
    campCard.querySelector(".btn-camp-go").addEventListener("click", function () { openCamp("rest"); });
  }

  function renderEvent() {
    hideTravelMessage();
    var event = EVENTS[state.chapter];
    var allChoices = getEventChoices(event);
    var visible = filterVisibleChoices(allChoices);
    var totalCases = countCases(visible);

    $("#event-title").textContent = event.title;
    var enemyHtml = getEnemyLine(event.id);
    $("#event-narrative").innerHTML = event.narrative + (enemyHtml ? "<br>" + enemyHtml : "");
    var hintEl = $("#event-hint");
    if (hintEl) {
      hintEl.textContent = event.hint ? "📐 " + event.hint : "";
      hintEl.hidden = !event.hint;
    }
    var choiceCount = visible.length;
    $("#event-cases").textContent =
      choiceCount + "가지 선택 × 각 2~4가지 결과 = 이 이벤트만 " + totalCases + "가지 경우의 수 · 동료 " +
      state.companions.length + "/" + MAX_COMPANIONS;

    var list = $("#choices-list");
    list.innerHTML = "";

    if (!visible.length) {
      renderProbPanel(null);
      list.innerHTML =
        '<p class="choices-empty">선택 가능한 행동이 없습니다.</p>' +
        '<button type="button" class="choice-btn choice-btn-skip" id="btn-skip-event">다음으로</button>';
      $("#btn-skip-event").addEventListener("click", function () {
        state.chapter += 1;
        renderEvent();
      });
      renderUtilitySidebar(!event.isEvolution);
      updateStats();
      return;
    }

    var firstBtn = null;
    visible.forEach(function (choice) {
      var idx = allChoices.indexOf(choice);
      if (idx < 0) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice-btn";
      btn.dataset.index = String(idx);
      btn.setAttribute("role", "listitem");
      if (choice.hiddenPath) btn.classList.add("is-hidden-path");
      if (choice.recruitTarget) btn.classList.add("is-recruit");
      if (choice.isEvolution) btn.classList.add("is-evolution");
      if (choice.isCorruption) btn.classList.add("is-corruption");
      btn.innerHTML = '<span class="choice-btn-text">' + choice.text + "</span>";

      btn.addEventListener("mouseenter", function () {
        setActiveChoiceBtn(btn);
        renderProbPanel(choice);
      });
      btn.addEventListener("focus", function () {
        setActiveChoiceBtn(btn);
        renderProbPanel(choice);
      });
      btn.addEventListener("click", function () {
        pickChoice(idx);
      });
      list.appendChild(btn);
      if (!firstBtn) firstBtn = btn;
    });

    if (firstBtn) {
      setActiveChoiceBtn(firstBtn);
      renderProbPanel(visible[0]);
    }

    renderUtilitySidebar(!event.isEvolution);

    updateStats();
  }

  function travelMessage(label) {
    if (!label) return "가는중…";
    var code = label.charCodeAt(label.length - 1);
    if (code >= 0xac00 && code <= 0xd7a3) {
      var hasBatchim = (code - 0xac00) % 28 !== 0;
      return label + (hasBatchim ? "으로" : "로") + " 가는중…";
    }
    return label + "으로 가는중…";
  }

  function showTravelMessage(label) {
    var el = $("#choice-travel-msg");
    if (!el) return;
    el.textContent = travelMessage(label);
    el.hidden = false;
  }

  function hideTravelMessage() {
    var el = $("#choice-travel-msg");
    if (el) el.hidden = true;
  }

  function pickChoice(index) {
    var event = EVENTS[state.chapter];
    var choice = getEventChoices(event)[index];
    if (!choice) choice = event.choices[index];
    var outcomes = applyRoleToOutcomes(choice.outcomes, state.role);
    if (choice.godAscension) outcomes = applyGodAscensionBoost(outcomes);
    state.pendingChoice = outcomes;
    state.godAscensionChoice = !!choice.godAscension;
    showTravelMessage(choice.text);
    $("#choices-list").classList.add("rolling");
    $$(".choice-btn").forEach(function (b) { b.disabled = true; });
    setTimeout(resolveRoll, 2000);
  }

  function resolveRoll() {
    hideTravelMessage();
    var result = rollOutcome(state.pendingChoice);
    var event = EVENTS[state.chapter];
    state.hp = Math.max(0, Math.min(state.maxHp, state.hp + result.hp));
    state.gold = Math.max(0, state.gold + result.gold);
    state.morale = Math.max(0, Math.min(100, state.morale + result.morale));
    state.log.push(event.title + ": " + result.text);
    processOutcomeMeta(result, event.id);

    var icons = { good: "✓", bad: "✗", special: "★", neutral: "·" };
    $("#result-icon").textContent = icons[result.tag] || "·";
    $("#result-icon").className = "result-icon tag-" + result.tag;
    $("#result-text").textContent = result.text;
    var deltaHtml =
      "HP <strong>" + (result.hp >= 0 ? "+" : "") + result.hp + "</strong> · " +
      "금 <strong>" + (result.gold >= 0 ? "+" : "") + result.gold + "</strong> · " +
      "사기 <strong>" + (result.morale >= 0 ? "+" : "") + result.morale + "</strong>";
    if (result.recruit && COMPANIONS[result.recruit]) {
      deltaHtml += "<br><em>동료 " + COMPANIONS[result.recruit].name + " 합류!</em>";
    }
    if (result.setFlag === "divine_shard") {
      deltaHtml += "<br><em>신의 파편을 얻었습니다. (히든 엔딩 열쇠)</em>";
    }
    if (result.setFlag === "corruption") {
      deltaHtml += "<br><em>타락의 길이 열렸습니다. (죽음의 기사·절망 등)</em>";
    }
    if (result.evolve) {
      var nj = getJob(result.evolve);
      deltaHtml += "<br><em>전직: " + nj.name + " (" + getTierLabel(nj.tier) + ")</em>";
    }
    if (result._dropped && result._dropped.length) {
      deltaHtml += "<br><em>획득: " + formatDroppedItems(result._dropped) + "</em>";
    } else if (Math.random() < 0.15) {
      deltaHtml += "<br><em>이번에는 아이템을 얻지 못했습니다.</em>";
    }
    $("#result-delta").innerHTML = deltaHtml;
    updateStats();
    showScreen("result");
  }

  function onResultContinue() {
    if (state.pendingEnding === "god") {
      showGodEnding();
      return;
    }
    if (state.hp <= 0) { showGameOver(); return; }
    if (state.pendingEnding === "conquer" || state.pendingEnding === "seal") {
      showEnding(state.pendingEnding);
      return;
    }
    if (state.chapter >= EVENTS.length - 1) {
      showEnding("normal");
      return;
    }
    state.chapter += 1;
    state.pendingEnding = null;
    $("#choices-list").classList.remove("rolling");
    showScreen("game");
    renderEvent();
  }

  function getHiddenEndingConditions() {
    var summitIndex = EVENTS.findIndex(function (e) { return e.id === "tower_summit"; });
    var reachedSummit = state.chapter >= summitIndex && summitIndex >= 0;
    return [
      {
        label: "신의 파편 획득",
        met: !!state.flags.divine_shard,
        hint: "숲 나무 위 지도 · 탑 입구 유적 · 5층 제단 기도",
      },
      {
        label: "동료 2명 이상 (" + state.companions.length + "/2)",
        met: state.companions.length >= 2,
        hint: "여행자의 쉼터에서 리라·오른·셀레네·카이 중 합류",
      },
      {
        label: "탑 정상(신좌의 전당) 도달",
        met: reachedSummit,
        hint: "황혼의 탑 7층을 모두 통과",
      },
    ];
  }

  function renderHiddenEndingGuide(context) {
    var box = $("#hidden-ending-guide");
    if (!box) return;
    box.hidden = false;

    var intro = $("#hidden-ending-intro");
    if (context === "gameover") {
      intro.textContent =
        "이번에는 게임 오버로 끝났습니다. 히든 엔딩은 탑 정상까지 살아남은 뒤에만 도전할 수 있습니다. 조건을 챙기고 다시 시도해 보세요.";
    } else if (context === "conquer" || context === "seal") {
      intro.textContent =
        "탑을 마쳤지만 히든 엔딩(신이 되기)은 보지 못했습니다. 아래 조건을 맞춘 뒤 정상에서 다른 선택을 해보세요.";
    } else {
      intro.textContent =
        "히든 엔딩을 보지 못하고 여정이 끝났습니다. 다음 플레이에서 조건을 의식적으로 맞춰 보세요.";
    }

    var list = $("#hidden-ending-checklist");
    list.innerHTML = "";
    var conditions = getHiddenEndingConditions();
    var godChoiceHint = "위 세 조건 충족 시 정상에 「신좌의 빛을 받아들인다」 선택지 표시";
    if (context === "conquer") {
      godChoiceHint = "탑주 격파를 선택함 — 신좌의 빛(신이 되기)을 골라야 함";
    } else if (context === "seal") {
      godChoiceHint = "봉인을 선택함 — 신좌의 빛(신이 되기)을 골라야 함";
    }
    conditions.push({
      label: "정상에서 「신이 되기」 선택 & 확률 성공",
      met: false,
      hint: godChoiceHint,
    });

    conditions.forEach(function (c) {
      var li = document.createElement("li");
      var met = c.met;
      li.className = met ? "met" : "unmet";
      li.innerHTML =
        (met ? "✓ " : "○ ") + c.label +
        '<span class="cond-hint">' + c.hint + "</span>";
      list.appendChild(li);
    });

    var tips = [
      "신격 파편(제작)이나 하급 신·신살자 직업은 신좌 선택 시 성공 확률이 올라갑니다.",
      "동료 3명 + 신의 파편이면 「함께 신격에 도달」 분기도 열립니다.",
      "쉼터에서 재료를 모아 연막탄·부적을 만들면 위험한 선택을 버티기 쉽습니다.",
    ];
    $("#hidden-ending-tip").textContent =
      "💡 " + tips.join(" ");
  }

  function hideHiddenEndingGuide() {
    var box = $("#hidden-ending-guide");
    if (box) box.hidden = true;
  }

  function showGameOver() {
    document.body.classList.remove("end-screen-god");
    $("#end-title").textContent = "게임 오버";
    $("#end-rank").textContent = "선택의 확률이 당신을 삼켰습니다";
    $("#end-msg").textContent = "다시 플레이하면 다른 확률 분기·동료·히든 엔딩을 경험할 수 있습니다.";
    renderHiddenEndingGuide("gameover");
    renderEndLog();
    showScreen("end");
  }

  function showGodEnding() {
    hideHiddenEndingGuide();
    document.body.classList.add("end-screen-god");
    var job = getActiveJob();
    var names = state.companions.map(function (id) { return COMPANIONS[id].name; }).join(", ");
    var title = "히든 엔딩 — 신승화";
    var rank = "황혼의 신";
    var msg =
      "황혼의 탑을 정복한 뒤 신좌의 빛을 받아들였습니다. " +
      (names ? "동료 " + names + "의 신념이 확률을 당신 편으로 기울였습니다. " : "") +
      "이제 탑의 운명은 당신의 계산대로 흐릅니다.";

    if (job && job.id === "lower_god") {
      title = "히든 엔딩 — 하급 신 승격";
      rank = "하급 신";
      msg = "성직의 길 끝에서 신좌에 오르셨습니다. 견습 성직자에서 시작해 신계의 문을 연 플레이어입니다.";
    } else if (job && job.id === "god_slayer") {
      title = "히든 엔딩 — 신살";
      rank = "신살자";
      msg = "신을 사냥하는 존재로 탑 정상에 섰습니다. 어설픈 사냥꾼에서 신살급에 이른 극희귀 분기입니다.";
    } else if (job && job.id === "immortal") {
      title = "히든 엔딩 — 선인";
      rank = "선(仙)";
      msg = "동방 여행자의 길 끝, 선인의 경지에서 탑을 넘어섰습니다.";
    } else if (job && job.id === "death_king") {
      title = "히든 엔딩 — 사왕";
      rank = "사왕";
      msg = "망자에서 시작해 죽음의 왕이 되어 탑을 지배합니다.";
    }

    $("#end-title").textContent = title;
    $("#end-rank").textContent = state.name + " (" + (job ? job.name : "") + ") — " + rank;
    $("#end-msg").textContent = msg;
    state.log.push("★ 히든 엔딩: " + rank);
    renderEndLog();
    showScreen("end");
  }

  function showEnding(type) {
    document.body.classList.remove("end-screen-god");
    var score = state.hp + state.gold + state.morale;
    var rank, msg, title;
    if (type === "conquer") {
      title = "엔딩 — 탑 정복";
      rank = "황혼의 탑주";
      msg = "탑의 주인을 쓰러뜨리고 정상을 차지했습니다. 세계는 당신의 확률표 아래 놓입니다.";
    } else if (type === "seal") {
      title = "엔딩 — 탑 봉인";
      rank = "봉인자";
      msg = "신좌를 파괴하고 탑을 봉인했습니다. 신이 되지는 않았지만, 재앙을 막았습니다.";
    } else {
      title = "엔딩";
      if (score >= 240) { rank = "전설의 계산자"; msg = "긴 여정의 확률을 모두 읽고 탑을 마쳤습니다."; }
      else if (score >= 180) { rank = "신중한 모험가"; msg = "손실을 최소화하며 여정을 끝냈습니다."; }
      else { rank = "운에 맡긴 생존자"; msg = "간신히 살아남았으며, 더 높은 목표가 남아 있습니다."; }
    }
    $("#end-title").textContent = title;
    var job = getActiveJob();
    $("#end-rank").textContent = state.name + " (" + (job ? job.name : "") + ") — " + rank;
    $("#end-msg").textContent = msg;
    if (state.companions.length) {
      $("#end-msg").textContent += " 동료: " + state.companions.map(function (id) {
        return COMPANIONS[id].name;
      }).join(", ") + ".";
    }
    renderHiddenEndingGuide(type === "conquer" || type === "seal" ? type : "normal");
    renderEndLog();
    showScreen("end");
  }

  function renderEndLog() {
    $("#journey-log").innerHTML = state.log.map(function (line) {
      return "<li>" + line + "</li>";
    }).join("");
    updateStats();
  }

  function resetGame() {
    state.hp = 100;
    state.gold = 30;
    state.morale = 50;
    state.chapter = 0;
    state.log = [];
    state.pendingChoice = null;
    state.companions = [];
    state.flags = {};
    state.pendingEnding = null;
    state.godAscensionChoice = false;
    state.jobId = null;
    state.jobHistory = [];
    state.role = null;
    state.inventory = {};
    state.equippedId = null;
    state.buffs = {};
    state.restedChapter = -1;
    document.body.classList.remove("game-started", "end-screen-god");
    hideHiddenEndingGuide();
    $("#btn-start-game").disabled = true;
    $$(".role-card").forEach(function (c) { c.classList.remove("selected"); });
    showScreen("title");
  }

  var bgm = {
    el: null,
    enabled: true,
    init: function () {
      this.el = document.getElementById("bgm-audio");
      if (!this.el) return;
      this.el.volume = 0.42;
      if (localStorage.getItem("rpg-bgm-off") === "1") this.enabled = false;
      this.updateButton();
      var self = this;
      $("#btn-bgm").addEventListener("click", function () {
        self.enabled = !self.enabled;
        localStorage.setItem("rpg-bgm-off", self.enabled ? "0" : "1");
        if (self.enabled) self.play();
        else self.stop();
        self.updateButton();
      });
    },
    play: function () {
      if (!this.el || !this.enabled) return;
      var self = this;
      var p = this.el.play();
      if (p && typeof p.then === "function") {
        p.then(function () { self.updateButton(); }).catch(function () {});
      }
    },
    stop: function () {
      if (!this.el) return;
      this.el.pause();
      this.el.currentTime = 0;
      this.updateButton();
    },
    tryStart: function () {
      if (this.enabled) this.play();
    },
    updateButton: function () {
      var btn = $("#btn-bgm");
      if (!btn || !this.el) return;
      var playing = this.enabled && !this.el.paused && !this.el.ended;
      btn.classList.toggle("bgm-on", playing);
      btn.classList.toggle("bgm-muted", !this.enabled);
      btn.setAttribute("aria-pressed", playing ? "true" : "false");
      btn.setAttribute(
        "aria-label",
        playing ? "배경음악 끄기" : this.enabled ? "배경음악 켜기" : "배경음악 꺼짐 — 눌러 켜기"
      );
      btn.title = playing
        ? "배경음악 끄기"
        : "배경음악 켜기 (벅차오르는 감동의 게임 오케스트라 BGM)";
    },
  };

  bgm.init();
  bgm.el && bgm.el.addEventListener("play", function () { bgm.updateButton(); });
  bgm.el && bgm.el.addEventListener("pause", function () { bgm.updateButton(); });

  renderRoles();
  $("#btn-to-role").addEventListener("click", function () {
    state.name = $("#player-name").value.trim() || "무명";
    bgm.tryStart();
    showScreen("role");
  });
  $("#btn-start-game").addEventListener("click", function () {
    if (!state.jobId) return;
    state.chapter = 0;
    state.hp = 100;
    state.gold = 30;
    state.morale = 50;
    state.log = [];
    state.companions = [];
    state.flags = {};
    state.pendingEnding = null;
    state.inventory = {};
    state.equippedId = null;
    state.buffs = {};
    state.restedChapter = -1;
    addItem("forest_herb", 1);
    state.log.push("시작 직업: " + getActiveJob().name);
    document.body.classList.add("game-started");
    bgm.tryStart();
    showScreen("game");
    renderEvent();
  });
  $("#btn-result-continue").addEventListener("click", onResultContinue);
  $("#btn-restart").addEventListener("click", resetGame);
  $("#btn-camp-back").addEventListener("click", function () {
    showScreen(state.campReturnScreen || "game");
    if (state.campReturnScreen === "game") renderEvent();
  });
  $("#btn-rest").addEventListener("click", doRest);
  $$(".camp-tab").forEach(function (btn) {
    btn.addEventListener("click", function () { switchCampTab(btn.dataset.tab); });
  });
  $("#player-name").addEventListener("keydown", function (e) {
    if (e.key === "Enter") $("#btn-to-role").click();
  });
})();
