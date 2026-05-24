/* 아이템 · 제작 · 몬스터/보스 */
(function () {
  "use strict";

  var ITEMS = {
    forest_herb: { id: "forest_herb", name: "숲의 약초", icon: "🌿", type: "material", desc: "회복약 재료" },
    iron_scrap: { id: "iron_scrap", name: "철 파편", icon: "⚙️", type: "material", desc: "무기 제작 재료" },
    monster_fang: { id: "monster_fang", name: "마수 송곳니", icon: "🦷", type: "material", desc: "강화 재료" },
    mystic_dust: { id: "mystic_dust", name: "신비의 가루", icon: "✨", type: "material", desc: "마법 재료" },
    charcoal: { id: "charcoal", name: "숯", icon: "🪵", type: "material", desc: "단조 연료" },
    crystal_shard: { id: "crystal_shard", name: "수정 파편", icon: "💎", type: "material", desc: "집중의 돌" },
    holy_water: { id: "holy_water", name: "성수", icon: "💧", type: "material", desc: "축복 재료" },
    rust_coin: { id: "rust_coin", name: "녹슨 주화", icon: "🪙", type: "material", desc: "판매·합성용" },

    healing_potion: { id: "healing_potion", name: "회복약", icon: "🧪", type: "consumable", desc: "HP +25", use: { hp: 25 } },
    greater_potion: { id: "greater_potion", name: "상급 회복약", icon: "🍶", type: "consumable", desc: "HP +45", use: { hp: 45 } },
    smoke_bomb: { id: "smoke_bomb", name: "연막탄", icon: "💨", type: "consumable", desc: "다음 선택 나쁨 -5%p", use: { buff: "smoke", battles: 1 } },
    lucky_charm: { id: "lucky_charm", name: "행운의 부적", icon: "🍀", type: "equip", desc: "좋음 +4%p", equipBonus: { good: 0.04 } },
    iron_blade: { id: "iron_blade", name: "철검", icon: "🗡️", type: "equip", desc: "나쁨 -3%p", equipBonus: { bad: -0.03 } },
    demon_bane: { id: "demon_bane", name: "마인해커", icon: "⚔️", type: "equip", desc: "특수 +6%p", equipBonus: { special: 0.06 } },
    tower_key: { id: "tower_key", name: "탑의 열쇠 조각", icon: "🗝️", type: "key", desc: "정상 문 해금 조각" },
    gods_fragment: { id: "gods_fragment", name: "신격 파편", icon: "🌟", type: "key", desc: "신이 되기 확률 보조" },
  };

  var RECIPES = [
    { id: "r_heal", name: "회복약 제조", result: "healing_potion", resultQty: 1, cost: { forest_herb: 2 }, gold: 0 },
    { id: "r_greater", name: "상급 회복약", result: "greater_potion", resultQty: 1, cost: { forest_herb: 2, holy_water: 1 }, gold: 5 },
    { id: "r_blade", name: "철검 단조", result: "iron_blade", resultQty: 1, cost: { iron_scrap: 2, charcoal: 1 }, gold: 8 },
    { id: "r_charm", name: "행운 부적", result: "lucky_charm", resultQty: 1, cost: { mystic_dust: 1, crystal_shard: 1 }, gold: 10 },
    { id: "r_bane", name: "마인해커", result: "demon_bane", resultQty: 1, cost: { monster_fang: 2, holy_water: 1, iron_scrap: 1 }, gold: 15 },
    { id: "r_smoke", name: "연막탄", result: "smoke_bomb", resultQty: 1, cost: { charcoal: 2, mystic_dust: 1 }, gold: 3 },
    { id: "r_godfrag", name: "신격 파편 합성", result: "gods_fragment", resultQty: 1, cost: { crystal_shard: 2, mystic_dust: 2, holy_water: 1 }, gold: 20 },
  ];

  var LOOT_BY_TAG = {
    good: [
      { id: "forest_herb", chance: 0.35 },
      { id: "rust_coin", chance: 0.2 },
    ],
    special: [
      { id: "mystic_dust", chance: 0.3 },
      { id: "crystal_shard", chance: 0.18 },
      { id: "tower_key", chance: 0.08 },
    ],
    neutral: [{ id: "rust_coin", chance: 0.15 }],
    bad: [{ id: "monster_fang", chance: 0.12 }],
  };

  var LOOT_BY_EVENT = {
    forest_crossroad: [{ id: "forest_herb", chance: 0.25 }],
    tower_enter: [{ id: "iron_scrap", chance: 0.3 }],
    tower_b2: [{ id: "charcoal", chance: 0.28 }],
    tower_b5: [{ id: "holy_water", chance: 0.22 }, { id: "mystic_dust", chance: 0.2 }],
    tower_b7: [{ id: "monster_fang", chance: 0.35 }],
    tower_summit: [{ id: "gods_fragment", chance: 0.05 }],
  };

  var ENEMIES = {
    forest_crossroad: {
      mobs: ["안개 도적 '침묵의 레인'", "돌연변이 늑대 무리", "유령 기사 잔영"],
      boss: null,
    },
    village_square: { mobs: ["골목 슬라임", "가짜 상인의 호위병"], boss: null },
    cave_bridge: { mobs: ["절벽 박쥐 떼", "동굴 크롤러", "강철 골렘 잔해"], boss: "다리 수호자 '넬로스'" },
    castle_trial: { mobs: ["시험의 환영", "저주 인형"], boss: "성령의 파수꾘 '아자르'" },
    tower_enter: { mobs: ["탑 문지기 해골", "그림자 경비병"], boss: "입구 대장 '브라스 쉴드'" },
    tower_b2: { mobs: ["맹독 슬라임", "가스 정령 '포이즌미스트'", "부식 쥐떼"], boss: null },
    tower_b3: { mobs: ["거울 요정 '미러린'", "환영 도적", "유리 박쥐"], boss: null },
    tower_b4: { mobs: ["공중 포식자 '스카피온'", "떠도는 석판 골렘"], boss: null },
    tower_b5: { mobs: ["망령 술사", "영혼 흡수자", "저주 인형 '라그노'"], boss: "망령 군주 '모르탈리스'" },
    tower_b6: { mobs: ["용암 정령", "화염 박쥐", "격자 함정 골렘"], boss: null },
    tower_b7: {
      mobs: ["수호자의 기사단", "황혼의 망아지"],
      boss: "탑의 수호자 '발가르니 투검'",
    },
    tower_summit: {
      mobs: ["신좌의 그림자"],
      boss: "황혼의 탑주 '크로노스 베일'",
    },
  };

  window.ITEMS_DATA = {
    ITEMS: ITEMS,
    RECIPES: RECIPES,
    LOOT_BY_TAG: LOOT_BY_TAG,
    LOOT_BY_EVENT: LOOT_BY_EVENT,
    ENEMIES: ENEMIES,
  };
})();
