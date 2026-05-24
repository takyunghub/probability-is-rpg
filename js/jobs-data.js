/* RPG 직업 진화 트리 (시작직 → 분기 → 고급 → 화경/신살) */
(function () {
  "use strict";

  var TIER_LABELS = ["시작", "초급", "중급", "고급", "화경", "신살"];

  var JOBS = {
    /* ── 시작직 (선행 없음) ── */
    traveler: {
      id: "traveler", name: "여행자", icon: "🧳", tier: 0, branch: "traveler",
      description: "모든 길의 출발점. 모험가·궁수·무사 계열로 뻗어 나갑니다.",
      evolvesTo: ["adventurer"], luckBonus: { neutral: 0.03 }, sageView: false,
    },
    gladiator: {
      id: "gladiator", name: "검투사", icon: "⚔️", tier: 0, branch: "warrior",
      description: "투기장의 피를 마신 전사. 광전사·마검사·기사로 갈라집니다.",
      evolvesTo: ["berserker", "magic_swordsman", "apprentice_knight"], luckBonus: { good: 0.02, bad: 0.02 }, sageView: false,
    },
    apprentice_cleric: {
      id: "apprentice_cleric", name: "견습 성직자", icon: "✝️", tier: 0, branch: "holy",
      description: "신앙의 길. 성직자 → 사도 → 하급 신까지 이어집니다.",
      evolvesTo: ["cleric"], luckBonus: { good: 0.03, bad: -0.02 }, sageView: false,
    },
    apprentice_mage: {
      id: "apprentice_mage", name: "견습 술사", icon: "📘", tier: 0, branch: "arcane",
      description: "마력의 씨앗. 원소·흑마·현자 계열로 성장합니다.",
      evolvesTo: ["mage"], luckBonus: { special: 0.03 }, sageView: false,
    },
    novice_hunter: {
      id: "novice_hunter", name: "어설픈 사냥꾼", icon: "🏹", tier: 0, branch: "hunter",
      description: "먹이사슬 최하층. 끝은 신살자(신살급)입니다.",
      evolvesTo: ["skilled_hunter"], luckBonus: { bad: -0.03, neutral: 0.02 }, sageView: false,
    },
    thief: {
      id: "thief", name: "도적", icon: "🗡️", tier: 0, branch: "shadow",
      description: "그림자 길. 암살자 → 비영(飛影)으로 진화합니다.",
      evolvesTo: ["assassin"], luckBonus: { good: 0.04, bad: -0.03 }, sageView: false,
    },
    corpse: {
      id: "corpse", name: "망자", icon: "💀", tier: 0, branch: "undead",
      description: "죽음에서 깨어난 존재. 해골 군단 → 사왕/패왕.",
      evolvesTo: ["skeleton_soldier"], luckBonus: { bad: 0.02, neutral: 0.04 }, sageView: false,
    },
    apprentice_chef: {
      id: "apprentice_chef", name: "견습 요리사", icon: "🍳", tier: 0, branch: "chef",
      description: "주방의 견습. 요리사 계급을 오르며 약선(藥膳)에 도달합니다.",
      evolvesTo: ["cook_trainee"], luckBonus: { good: 0.02, neutral: 0.03 }, sageView: false,
    },

    /* ── 여행자 계열 ── */
    adventurer: {
      id: "adventurer", name: "모험가", icon: "🗺️", tier: 1, branch: "traveler",
      description: "숙련된 여행자.", evolvesTo: ["expert", "rifleman", "eastern_traveler"],
      luckBonus: { good: 0.03, neutral: 0.02 }, sageView: false,
    },
    expert: {
      id: "expert", name: "전문가", icon: "⭐", tier: 2, branch: "traveler",
      description: "모든 분야에 통달.", evolvesTo: ["martial_artist"],
      luckBonus: { good: 0.04, special: 0.02 }, sageView: false,
    },
    rifleman: {
      id: "rifleman", name: "총사", icon: "🔫", tier: 2, branch: "traveler",
      description: "원거리 화력.", evolvesTo: ["sniper"],
      luckBonus: { good: 0.05, bad: -0.02 }, sageView: false,
    },
    sniper: {
      id: "sniper", name: "저격수", icon: "🎯", tier: 3, branch: "traveler",
      description: "한 발의 확률.", evolvesTo: ["hwagyeong_archer"],
      luckBonus: { good: 0.06, bad: -0.03 }, sageView: false,
    },
    eastern_traveler: {
      id: "eastern_traveler", name: "동방 여행자", icon: "🏯", tier: 2, branch: "traveler",
      description: "동쪽 대륙의 길.", evolvesTo: ["archer", "shaman"],
      luckBonus: { special: 0.03, neutral: 0.02 }, sageView: false,
    },
    archer: {
      id: "archer", name: "궁사", icon: "🏹", tier: 3, branch: "traveler",
      description: "활의 달인.", evolvesTo: ["heavenly_archer"],
      luckBonus: { good: 0.05, bad: -0.02 }, sageView: false,
    },
    heavenly_archer: {
      id: "heavenly_archer", name: "천궁", icon: "☀️", tier: 4, branch: "traveler",
      description: "화경급 궁수.", evolvesTo: ["hwagyeong_archer"],
      luckBonus: { good: 0.08, special: 0.04 }, sageView: false,
    },
    shaman: {
      id: "shaman", name: "주술사", icon: "🔮", tier: 3, branch: "traveler",
      description: "영혼과 계약.", evolvesTo: ["taoist"],
      luckBonus: { special: 0.06, bad: 0.02 }, sageView: false,
    },
    taoist: {
      id: "taoist", name: "도사", icon: "☯️", tier: 4, branch: "traveler",
      description: "도(道)의 극意.", evolvesTo: ["immortal"],
      luckBonus: { special: 0.07, good: 0.03 }, sageView: false,
    },
    immortal: {
      id: "immortal", name: "선인", icon: "🌤️", tier: 5, branch: "traveler",
      description: "신살급 — 선(仙).", evolvesTo: [],
      luckBonus: { special: 0.1, good: 0.05 }, sageView: true, godPath: true,
    },
    martial_artist: {
      id: "martial_artist", name: "무사", icon: "🥋", tier: 3, branch: "traveler",
      description: "몸과 기의 수련.", evolvesTo: ["sword_immortal"],
      luckBonus: { good: 0.05, bad: -0.03 }, sageView: false,
    },
    sword_immortal: {
      id: "sword_immortal", name: "검선", icon: "⚔️", tier: 4, branch: "traveler",
      description: "화경급 검성.", evolvesTo: ["hwagyeong_blade"],
      luckBonus: { good: 0.08, special: 0.05 }, sageView: false,
    },
    hwagyeong_archer: {
      id: "hwagyeong_archer", name: "화경·궁", icon: "🔥", tier: 5, branch: "traveler",
      description: "화경급 최고 궁수.", evolvesTo: [],
      luckBonus: { good: 0.09, special: 0.06 }, sageView: false,
    },
    hwagyeong_blade: {
      id: "hwagyeong_blade", name: "화경·검", icon: "🌸", tier: 5, branch: "traveler",
      description: "화경급 최고 검사.", evolvesTo: [],
      luckBonus: { good: 0.1, bad: -0.04 }, sageView: false, godPath: true,
    },

    /* ── 검투사/기사 ── */
    berserker: {
      id: "berserker", name: "광전사", icon: "🪓", tier: 1, branch: "warrior",
      description: "광기의 힘.", evolvesTo: ["chaos_berserker"],
      luckBonus: { good: 0.06, bad: 0.05 }, sageView: false,
    },
    chaos_berserker: {
      id: "chaos_berserker", name: "혼돈의 광전사", icon: "💢", tier: 3, branch: "warrior",
      description: "극한의 공격.", evolvesTo: ["mugeuk_warrior"],
      luckBonus: { good: 0.08, bad: 0.04 }, sageView: false,
    },
    magic_swordsman: {
      id: "magic_swordsman", name: "마검사", icon: "✨", tier: 1, branch: "warrior",
      description: "검과 마법.", evolvesTo: ["spellblade"],
      luckBonus: { special: 0.05, good: 0.02 }, sageView: false,
    },
    spellblade: {
      id: "spellblade", name: "마검술사", icon: "🌟", tier: 3, branch: "warrior",
      description: "마검의 극意.", evolvesTo: ["mugeuk_warrior"],
      luckBonus: { special: 0.07, good: 0.04 }, sageView: false,
    },
    apprentice_knight: {
      id: "apprentice_knight", name: "견습 기사", icon: "🛡️", tier: 1, branch: "warrior",
      description: "기사단 입문.", evolvesTo: ["knight"],
      luckBonus: { bad: -0.03, good: 0.02 }, sageView: false,
    },
    knight: {
      id: "knight", name: "기사", icon: "🛡️", tier: 2, branch: "warrior",
      description: "명예의 기사.", evolvesTo: ["elite_knight"],
      luckBonus: { bad: -0.05, good: 0.03 }, sageView: false,
    },
    elite_knight: {
      id: "elite_knight", name: "정예 기사", icon: "⚔️", tier: 3, branch: "warrior",
      description: "기사단의 핵.", evolvesTo: ["knight_commander"],
      luckBonus: { bad: -0.06, good: 0.04 }, sageView: false,
    },
    knight_commander: {
      id: "knight_commander", name: "기사 단장", icon: "👑", tier: 4, branch: "warrior",
      description: "군단을 이끈다.", evolvesTo: ["dragon_knight", "death_knight"],
      luckBonus: { good: 0.06, bad: -0.04 }, sageView: false,
    },
    dragon_knight: {
      id: "dragon_knight", name: "용기사", icon: "🐉", tier: 5, branch: "warrior",
      description: "신살급 — 용과 맹세.", evolvesTo: [],
      luckBonus: { good: 0.09, special: 0.05 }, sageView: false, godPath: true,
    },
    death_knight: {
      id: "death_knight", name: "죽음의 기사", icon: "🖤", tier: 5, branch: "warrior",
      description: "타락 기사 — 신살급.", evolvesTo: [],
      requiresCorruption: true,
      luckBonus: { bad: 0.05, special: 0.08 }, sageView: false, godPath: true,
    },
    mugeuk_warrior: {
      id: "mugeuk_warrior", name: "무극검", icon: "∞", tier: 5, branch: "warrior",
      description: "무극급 전사.", evolvesTo: [],
      luckBonus: { good: 0.1, neutral: 0.05 }, sageView: false,
    },

    /* ── 성직자 → 신 ── */
    cleric: {
      id: "cleric", name: "성직자", icon: "⚕️", tier: 1, branch: "holy",
      description: "신의 종. 타락 시 절망 계열.", evolvesTo: ["bishop", "despair"],
      luckBonus: { good: 0.05, bad: -0.04 }, sageView: false,
    },
    bishop: {
      id: "bishop", name: "주교", icon: "✝️", tier: 2, branch: "holy",
      description: "교구를 다스림.", evolvesTo: ["apostle"],
      luckBonus: { good: 0.06, bad: -0.05 }, sageView: false,
    },
    apostle: {
      id: "apostle", name: "사도", icon: "📿", tier: 3, branch: "holy",
      description: "복음을 전함.", evolvesTo: ["sect_leader"],
      luckBonus: { good: 0.07, special: 0.03 }, sageView: false,
    },
    sect_leader: {
      id: "sect_leader", name: "교주", icon: "⛪", tier: 3, branch: "holy",
      description: "교단의 수장.", evolvesTo: ["savior"],
      luckBonus: { special: 0.05, good: 0.05 }, sageView: false,
    },
    savior: {
      id: "savior", name: "구세주", icon: "🕊️", tier: 4, branch: "holy",
      description: "구원의 화신.", evolvesTo: ["demigod"],
      luckBonus: { good: 0.08, special: 0.06 }, sageView: false,
    },
    demigod: {
      id: "demigod", name: "반신", icon: "🌟", tier: 4, branch: "holy",
      description: "신에 가까운 존재.", evolvesTo: ["lower_god"],
      luckBonus: { special: 0.09, good: 0.06 }, sageView: true,
    },
    lower_god: {
      id: "lower_god", name: "하급 신", icon: "👑", tier: 5, branch: "holy",
      description: "신살급 — 신좌의 주인.", evolvesTo: [],
      luckBonus: { special: 0.12, good: 0.08 }, sageView: true, godPath: true,
    },
    despair: {
      id: "despair", name: "절망", icon: "🌑", tier: 2, branch: "holy",
      description: "타락한 성직자.", evolvesTo: ["fallen_warrior"],
      requiresCorruption: true,
      luckBonus: { bad: 0.06, special: 0.04 }, sageView: false,
    },
    fallen_warrior: {
      id: "fallen_warrior", name: "하급 전사", icon: "💀", tier: 3, branch: "holy",
      description: "타락의 끝.", evolvesTo: [],
      requiresCorruption: true,
      luckBonus: { bad: 0.05, good: 0.04 }, sageView: false,
    },

    /* ── 마법사 ── */
    mage: {
      id: "mage", name: "마법사", icon: "🔮", tier: 1, branch: "arcane",
      description: "마력 사용자.", evolvesTo: ["fire_mage", "ice_mage", "black_mage"],
      luckBonus: { special: 0.04 }, sageView: false,
    },
    fire_mage: {
      id: "fire_mage", name: "화염 마법사", icon: "🔥", tier: 2, branch: "arcane",
      description: "불의 술.", evolvesTo: ["wizard"],
      luckBonus: { good: 0.04, special: 0.03 }, sageView: false,
    },
    ice_mage: {
      id: "ice_mage", name: "냉기 마법사", icon: "❄️", tier: 2, branch: "arcane",
      description: "얼음의 술.", evolvesTo: ["wizard"],
      luckBonus: { bad: -0.03, neutral: 0.03 }, sageView: false,
    },
    black_mage: {
      id: "black_mage", name: "흑마법사", icon: "🌑", tier: 2, branch: "arcane",
      description: "금단의 마법.", evolvesTo: ["warlock"],
      luckBonus: { special: 0.05, bad: 0.03 }, sageView: false,
    },
    wizard: {
      id: "wizard", name: "위저드", icon: "✴️", tier: 3, branch: "arcane",
      description: "원소의 지배자.", evolvesTo: ["archmage"],
      luckBonus: { special: 0.06, good: 0.03 }, sageView: false,
    },
    archmage: {
      id: "archmage", name: "아크메이지", icon: "💠", tier: 4, branch: "arcane",
      description: "마법의 정점.", evolvesTo: ["sage_tier"],
      luckBonus: { special: 0.08, good: 0.04 }, sageView: true,
    },
    sage_tier: {
      id: "sage_tier", name: "현자", icon: "📜", tier: 5, branch: "arcane",
      description: "현경급 — 모든 기대값을 볼 수 있음.", evolvesTo: [],
      luckBonus: {}, sageView: true,
    },
    warlock: {
      id: "warlock", name: "워록", icon: "👁️", tier: 3, branch: "arcane",
      description: "악마와 계약.", evolvesTo: ["hermit"],
      luckBonus: { special: 0.07, bad: 0.04 }, sageView: false,
    },
    hermit: {
      id: "hermit", name: "은자", icon: "🌙", tier: 4, branch: "arcane",
      description: "고독한 흑마의 극.", evolvesTo: ["hyeongyeong_mage"],
      luckBonus: { special: 0.09, bad: 0.02 }, sageView: false,
    },
    hyeongyeong_mage: {
      id: "hyeongyeong_mage", name: "현경 마도사", icon: "🌀", tier: 5, branch: "arcane",
      description: "현경급 마법사.", evolvesTo: [],
      luckBonus: { special: 0.11, good: 0.04 }, sageView: true, godPath: true,
    },

    /* ── 사냥꾼 → 신살자 ── */
    skilled_hunter: {
      id: "skilled_hunter", name: "숙련 사냥꾼", icon: "🎯", tier: 1, branch: "hunter",
      description: "사냥의 달인.", evolvesTo: ["master_hunter"],
      luckBonus: { bad: -0.04, good: 0.03 }, sageView: false,
    },
    master_hunter: {
      id: "master_hunter", name: "명사냥꾼", icon: "🏹", tier: 2, branch: "hunter",
      description: "먹이사슬 상위.", evolvesTo: ["predator"],
      luckBonus: { bad: -0.05, good: 0.04 }, sageView: false,
    },
    predator: {
      id: "predator", name: "포식자", icon: "🐺", tier: 3, branch: "hunter",
      description: "사냥감을 노림.", evolvesTo: ["apex_predator"],
      luckBonus: { good: 0.06, bad: -0.03 }, sageView: false,
    },
    apex_predator: {
      id: "apex_predator", name: "최상위 포식자", icon: "🦅", tier: 4, branch: "hunter",
      description: "군식의 정점.", evolvesTo: ["slayer"],
      luckBonus: { good: 0.07, bad: -0.04 }, sageView: false,
    },
    slayer: {
      id: "slayer", name: "학살자", icon: "⚔️", tier: 4, branch: "hunter",
      description: "거대 적 처단.", evolvesTo: ["god_slayer"],
      luckBonus: { good: 0.08, special: 0.04 }, sageView: false,
    },
    god_slayer: {
      id: "god_slayer", name: "신살자", icon: "⚡", tier: 5, branch: "hunter",
      description: "신살급 — 신을 사냥함.", evolvesTo: [],
      luckBonus: { good: 0.1, special: 0.08 }, sageView: false, godPath: true,
    },

    /* ── 도적 ── */
    assassin: {
      id: "assassin", name: "암살자", icon: "🥷", tier: 1, branch: "shadow",
      description: "그림자 살인.", evolvesTo: ["flying_shadow"],
      luckBonus: { good: 0.05, bad: -0.04 }, sageView: false,
    },
    flying_shadow: {
      id: "flying_shadow", name: "비영", icon: "👤", tier: 3, branch: "shadow",
      description: "화경급 암살.", evolvesTo: ["chojeoljung_shadow"],
      luckBonus: { good: 0.07, bad: -0.05 }, sageView: false,
    },
    chojeoljung_shadow: {
      id: "chojeoljung_shadow", name: "초절정·影", icon: "🌑", tier: 5, branch: "shadow",
      description: "초절정급 도적.", evolvesTo: [],
      luckBonus: { good: 0.09, bad: -0.06 }, sageView: false,
    },

    /* ── 망자/언데드 ── */
    skeleton_soldier: {
      id: "skeleton_soldier", name: "해골 병사", icon: "💀", tier: 1, branch: "undead",
      description: "죽음의 병력.", evolvesTo: ["skeleton_captain"],
      luckBonus: { neutral: 0.04, bad: 0.02 }, sageView: false,
    },
    skeleton_captain: {
      id: "skeleton_captain", name: "해골 대장", icon: "🦴", tier: 2, branch: "undead",
      description: "군단 지휘.", evolvesTo: ["skeleton_general"],
      luckBonus: { bad: 0.03, special: 0.03 }, sageView: false,
    },
    skeleton_general: {
      id: "skeleton_general", name: "해골 장군", icon: "⚰️", tier: 3, branch: "undead",
      description: "망령 군단.", evolvesTo: ["death_king", "overlord"],
      luckBonus: { special: 0.05, bad: 0.02 }, sageView: false,
    },
    death_king: {
      id: "death_king", name: "사왕", icon: "👑", tier: 5, branch: "undead",
      description: "신살급 — 죽음의 왕.", evolvesTo: [],
      luckBonus: { special: 0.1, bad: 0.04 }, sageView: false, godPath: true,
    },
    overlord: {
      id: "overlord", name: "패왕", icon: "🖤", tier: 5, branch: "undead",
      description: "신살급 — 지배자.", evolvesTo: [],
      luckBonus: { good: 0.06, bad: 0.05 }, sageView: false,
    },

    /* ── 요리사 ── */
    cook_trainee: {
      id: "cook_trainee", name: "요리 수습", icon: "🥘", tier: 1, branch: "chef",
      description: "주방 수습.", evolvesTo: ["professional_cook"],
      luckBonus: { good: 0.03, neutral: 0.03 }, sageView: false,
    },
    professional_cook: {
      id: "professional_cook", name: "전문 요리사", icon: "👨‍🍳", tier: 2, branch: "chef",
      description: "프로의 맛.", evolvesTo: ["sous_chef"],
      luckBonus: { good: 0.04, neutral: 0.04 }, sageView: false,
    },
    sous_chef: {
      id: "sous_chef", name: "부주방장", icon: "🍲", tier: 3, branch: "chef",
      description: "주방 2인자.", evolvesTo: ["head_chef"],
      luckBonus: { good: 0.05, special: 0.02 }, sageView: false,
    },
    head_chef: {
      id: "head_chef", name: "주방장", icon: "🍽️", tier: 4, branch: "chef",
      description: "주방 총괄.", evolvesTo: ["medicinal_chef"],
      luckBonus: { good: 0.06, special: 0.04 }, sageView: false,
    },
    medicinal_chef: {
      id: "medicinal_chef", name: "약선", icon: "🌿", tier: 5, branch: "chef",
      description: "신살급 — 음식으로 치유.", evolvesTo: [],
      luckBonus: { good: 0.08, special: 0.05 }, sageView: false,
    },
  };

  window.JOBS_DATA = {
    TIER_LABELS: TIER_LABELS,
    STARTERS: [
      "traveler", "gladiator", "apprentice_cleric", "apprentice_mage",
      "novice_hunter", "thief", "corpse", "apprentice_chef",
    ],
    JOBS: JOBS,
  };
})();
