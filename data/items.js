// =====================================================
// data/items.js
// ITEM DATABASE — ข้อมูลไอเทมทั้งหมดของเกม (แหล่งข้อมูลหลักแห่งเดียว)
//
// ไฟล์นี้มีแต่ "ข้อมูล" ไม่มีตรรกะ
// ระบบอื่นอย่า import ไฟล์นี้ตรงๆ — ให้เรียกผ่าน js/systems/itemDatabase.js
// (ที่นั่นตรวจข้อมูลผิดให้ + เติมค่าเริ่มต้นให้ครบ + มีฟังก์ชันค้นหา)
//
// กฎของ Item ID:
//   - ภาษาอังกฤษตัวเล็ก ตัวเลข และ _ เท่านั้น เช่น "iron_sword"
//   - ห้ามเปลี่ยน ID หลังใช้งานจริง (เซฟผู้เล่นเก็บ ID ไว้)
//     ถ้าจำเป็นต้องเปลี่ยน ให้เพิ่มคู่ "ID เก่า → ID ใหม่" ใน LEGACY_ITEM_IDS ด้านล่าง
//
// ค่าภายในเป็นภาษาอังกฤษเสมอ (type, rarity) — ชื่อภาษาไทยมีไว้แสดงผลเท่านั้น
// =====================================================

// ---------- ความหายาก ----------
// order = ลำดับจากธรรมดา → หายากที่สุด (ใช้เรียงของ)
export const RARITIES = {
  common: { id: "common", name: "ทั่วไป", color: "#8a7558", order: 1 },
  uncommon: { id: "uncommon", name: "ไม่ธรรมดา", color: "#27ae60", order: 2 },
  rare: { id: "rare", name: "หายาก", color: "#2f80ed", order: 3 },
  epic: { id: "epic", name: "มหากาพย์", color: "#9b51e0", order: 4 },
  legendary: { id: "legendary", name: "ตำนาน", color: "#f2994a", order: 5 },
  mythic: { id: "mythic", name: "เทพนิยาย", color: "#eb5757", order: 6 }
};

// ---------- ประเภทไอเทม ----------
// equipSlot = สวมใส่ได้ที่ช่องไหน (null = สวมไม่ได้)
// maxStack  = ค่าเริ่มต้นว่าซ้อนได้กี่ชิ้น (ไอเทมแต่ละชิ้นกำหนดเองทับได้)
export const ITEM_TYPES = {
  weapon: { id: "weapon", name: "อาวุธ", icon: "⚔️", equipSlot: "weapon", maxStack: 1 },
  armor: { id: "armor", name: "เกราะ", icon: "🛡️", equipSlot: "armor", maxStack: 1 },
  accessory: { id: "accessory", name: "เครื่องประดับ", icon: "💍", equipSlot: "accessory", maxStack: 1 },
  consumable: { id: "consumable", name: "ของใช้", icon: "🧪", equipSlot: null, maxStack: 99 },
  material: { id: "material", name: "วัตถุดิบ", icon: "🧱", equipSlot: null, maxStack: 999 },
  collectible: { id: "collectible", name: "ของสะสม", icon: "🏅", equipSlot: null, maxStack: 1 },
  quest: { id: "quest", name: "ไอเทมเควสต์", icon: "📜", equipSlot: null, maxStack: 1, isSellable: false, isTradable: false },
  special: { id: "special", name: "ไอเทมพิเศษ", icon: "🎁", equipSlot: null, maxStack: 1 }
};

// ช่องสวมใส่ที่เปิดใช้ในเกมตอนนี้ (accessory ยังไม่เปิด รอระบบ Equipment)
export const EQUIPMENT_SLOTS = {
  weapon: "อาวุธ",
  armor: "เกราะ"
};

// =====================================================
// รายการไอเทม
// ใส่เฉพาะค่าที่ต่างจากค่าเริ่มต้น — ค่าที่ไม่ใส่ itemDatabase.js เติมให้:
//   description "" · maxStack ตามประเภท · sellPrice 0 · buyPrice 0 (ร้านไม่ขาย)
//   levelRequirement 1 · isSellable true · isTradable true
// tags: ป้ายเพิ่มเติม — ไอเทมที่มีป้ายเหล่านี้ไม่นับในสมุดสะสม
//   ["legacy"] = ของเก่าที่หาไม่ได้แล้ว
//   ["reward"] = ของรางวัลจากสมุดสะสม (ดู data/collectionRewards.js)
// =====================================================
export const ITEM_DEFINITIONS = [
  // ===== อาวุธ (weapon) =====
  // stats:        attack · defense · critical (0.05 = คริเพิ่ม 5%) · attackSpeed (0.1 = ตีเร็วขึ้น 10%)
  // statsPerPlus: ค่าที่เพิ่มต่อการตีบวก +1
  {
    id: "wooden_sword", name: "ดาบไม้", type: "weapon", rarity: "common", icon: "🗡️",
    description: "ดาบไม้สำหรับนักผจญภัยมือใหม่ เบาและใช้ง่าย",
    sellPrice: 5, buyPrice: 20, levelRequirement: 1,
    stats: { attack: 4 }, statsPerPlus: { attack: 1 }
  },
  {
    id: "iron_sword", name: "ดาบเหล็ก", type: "weapon", rarity: "rare", icon: "⚔️",
    description: "ดาบเหล็กคมกริบ ตีหมาป่าและก๊อบลินได้สบาย",
    sellPrice: 40, buyPrice: 200, levelRequirement: 3,
    stats: { attack: 12 }, statsPerPlus: { attack: 3 }
  },
  {
    id: "flame_sword", name: "ดาบเพลิง", type: "weapon", rarity: "epic", icon: "🔥",
    description: "ดาบที่ลุกเป็นไฟตลอดเวลา ฟันแรงและติดคริติคอลบ่อย",
    sellPrice: 120, levelRequirement: 8,
    stats: { attack: 22, critical: 0.05, attackSpeed: 0.1 }, statsPerPlus: { attack: 4 }
  },
  {
    id: "golem_hammer", name: "ค้อนหินโกเลม", type: "weapon", rarity: "epic", icon: "🔨",
    description: "ค้อนหนักอึ้งจากแกนโกเลมโบราณ",
    tags: ["legacy"],
    sellPrice: 150, levelRequirement: 9,
    stats: { attack: 26 }, statsPerPlus: { attack: 5 }
  },
  {
    id: "desert_blade", name: "ตรีศูลทะเลทราย", type: "weapon", rarity: "epic", icon: "🔱",
    description: "อาวุธของนักล่าแมงป่องแห่งทะเลทราย",
    sellPrice: 180, levelRequirement: 10,
    stats: { attack: 30 }, statsPerPlus: { attack: 5 }
  },
  {
    id: "guardian_axe", name: "ขวานผู้พิทักษ์", type: "weapon", rarity: "epic", icon: "🪓",
    description: "ขวานศักดิ์สิทธิ์ที่ได้จากการปราบผู้พิทักษ์ป่า",
    sellPrice: 400, levelRequirement: 15,
    stats: { attack: 45 }, statsPerPlus: { attack: 7 }
  },

  // ===== เกราะ (armor) =====
  // stats: defense · hp · criticalResistance (0.1 = ลดโอกาสโดนคริ 10%) · attack
  {
    id: "cloth_armor", name: "เสื้อผ้าฝ้าย", type: "armor", rarity: "common", icon: "👕",
    description: "เสื้อผ้าธรรมดา กันการโจมตีได้นิดหน่อย",
    sellPrice: 5, buyPrice: 20, levelRequirement: 1,
    stats: { defense: 2, hp: 10 }, statsPerPlus: { defense: 1, hp: 5 }
  },
  {
    id: "leather_armor", name: "เกราะหนังหมาป่า", type: "armor", rarity: "rare", icon: "🦺",
    description: "เกราะหนังเหนียวที่ทำจากหนังหมาป่า",
    sellPrice: 40, levelRequirement: 3,
    stats: { defense: 6, hp: 30 }, statsPerPlus: { defense: 2, hp: 12 }
  },
  {
    id: "iron_armor", name: "เกราะเหล็ก", type: "armor", rarity: "uncommon", icon: "⛓️",
    description: "เกราะเหล็กแข็งแรง หนักหน่อยแต่คุ้มค่า",
    sellPrice: 60, buyPrice: 300, levelRequirement: 5,
    stats: { defense: 9, hp: 45 }, statsPerPlus: { defense: 2, hp: 15 }
  },
  {
    id: "knight_armor", name: "เกราะอัศวิน", type: "armor", rarity: "epic", icon: "🪖",
    description: "เกราะเต็มตัวของอัศวิน ป้องกันการโจมตีคริติคอลได้ดี",
    sellPrice: 200, levelRequirement: 12,
    stats: { defense: 18, hp: 100, criticalResistance: 0.1 }, statsPerPlus: { defense: 3, hp: 25 }
  },
  {
    id: "stone_armor", name: "เกราะหินโกเลม", type: "armor", rarity: "epic", icon: "🛡️",
    description: "เกราะหินหนาจากโกเลมโบราณ",
    tags: ["legacy"],
    sellPrice: 150, levelRequirement: 9,
    stats: { defense: 14, hp: 80 }, statsPerPlus: { defense: 3, hp: 25 }
  },
  {
    id: "sand_armor", name: "เกราะเกล็ดทราย", type: "armor", rarity: "epic", icon: "🧥",
    description: "เกราะเกล็ดที่ทนแดดและทรายของทะเลทราย",
    sellPrice: 180, levelRequirement: 10,
    stats: { defense: 16, hp: 90 }, statsPerPlus: { defense: 3, hp: 20 }
  },
  {
    id: "guardian_armor", name: "เกราะเปลือกไม้ศักดิ์สิทธิ์", type: "armor", rarity: "epic", icon: "🥋",
    description: "เกราะจากเปลือกของผู้พิทักษ์ป่า แข็งแกร่งดั่งต้นไม้พันปี",
    sellPrice: 400, levelRequirement: 15,
    stats: { defense: 24, hp: 150 }, statsPerPlus: { defense: 4, hp: 35 }
  },

  // ===== ของใช้ (consumable) =====
  // effects: { type: "hp" | "mp" | "exp", amount }
  //          { type: "buff", stat: "attack", amount: 0.1, duration: 60 }   (duration = วินาที)
  {
    id: "small_hp_potion", name: "ยาฟื้นพลังเล็ก", type: "consumable", rarity: "common", icon: "🧪",
    description: "ฟื้นฟู HP 50 หน่วย",
    sellPrice: 3, buyPrice: 15,
    effects: [{ type: "hp", amount: 50 }]
  },
  {
    id: "large_hp_potion", name: "ยาฟื้นพลังใหญ่", type: "consumable", rarity: "uncommon", icon: "⚗️",
    description: "ฟื้นฟู HP 250 หน่วย",
    sellPrice: 15, buyPrice: 80, levelRequirement: 5,
    effects: [{ type: "hp", amount: 250 }]
  },
  {
    id: "exp_potion", name: "ยาเพิ่มประสบการณ์", type: "consumable", rarity: "rare", icon: "✨",
    description: "ดื่มแล้วได้รับ EXP 200",
    sellPrice: 30,
    effects: [{ type: "exp", amount: 200 }]
  },

  // ===== วัตถุดิบ (material) =====
  // material: { tier: ระดับวัตถุดิบ 1–5, craftingTags: ป้ายสำหรับสูตรคราฟต์ในอนาคต }
  {
    id: "slime_gel", name: "เจลสไลม์", type: "material", rarity: "common", icon: "🟢",
    description: "เจลเหนียวหนึบจากสไลม์ วัตถุดิบพื้นฐานที่หาได้ง่าย",
    sellPrice: 2,
    material: { tier: 1, craftingTags: ["slime", "gel"] }
  },
  {
    id: "wolf_fang", name: "เขี้ยวหมาป่า", type: "material", rarity: "common", icon: "🦷",
    description: "เขี้ยวแหลมคมของหมาป่า",
    sellPrice: 6,
    material: { tier: 1, craftingTags: ["beast", "fang"] }
  },
  {
    id: "goblin_ear", name: "หูก๊อบลิน", type: "material", rarity: "common", icon: "👂",
    description: "หลักฐานว่าปราบก๊อบลินมาแล้ว",
    sellPrice: 8,
    material: { tier: 2, craftingTags: ["goblin"] }
  },
  {
    id: "bat_wing", name: "ปีกค้างคาว", type: "material", rarity: "common", icon: "🪶",
    description: "ปีกบางเบาของค้างคาวถ้ำ",
    sellPrice: 10,
    material: { tier: 2, craftingTags: ["beast", "wing"] }
  },
  {
    id: "scorpion_stinger", name: "เหล็กในแมงป่อง", type: "material", rarity: "rare", icon: "🪡",
    description: "เหล็กในที่ยังมีพิษหลงเหลืออยู่",
    sellPrice: 25,
    material: { tier: 3, craftingTags: ["beast", "poison"] }
  },
  {
    id: "iron_ore", name: "แร่เหล็ก", type: "material", rarity: "common", icon: "🪨",
    description: "แร่ดิบสำหรับหลอมอาวุธและเกราะเหล็ก",
    sellPrice: 5, buyPrice: 20,
    material: { tier: 1, craftingTags: ["ore", "metal"] }
  },
  {
    id: "magic_crystal", name: "คริสตัลเวทมนตร์", type: "material", rarity: "rare", icon: "🔮",
    description: "คริสตัลที่เก็บพลังเวทไว้ภายใน",
    sellPrice: 40,
    material: { tier: 3, craftingTags: ["magic", "crystal"] }
  },
  {
    id: "enhance_stone", name: "หินตีบวก", type: "material", rarity: "rare", icon: "💠",
    description: "ใช้ตีบวกอุปกรณ์ให้แข็งแกร่งขึ้น",
    sellPrice: 10,
    material: { tier: 2, craftingTags: ["upgrade"] }
  },
  {
    id: "golem_core", name: "แกนโกเลม", type: "material", rarity: "rare", icon: "🔶",
    description: "แกนพลังงานของโกเลมโบราณ (ไม่ดรอปแล้ว)",
    tags: ["legacy"],
    sellPrice: 20,
    material: { tier: 3, craftingTags: ["golem", "core"] }
  },
  {
    id: "guardian_heart", name: "หัวใจผู้พิทักษ์", type: "material", rarity: "epic", icon: "💚",
    description: "หัวใจที่ยังเต้นเบาๆ ของผู้พิทักษ์ป่า",
    sellPrice: 200,
    material: { tier: 5, craftingTags: ["boss", "nature"] }
  },

  // ===== ของสะสม (collectible) =====
  // collectible: { collectionId: อยู่หมวดไหนของสมุดสะสม, kind: "badge" | "trophy" | "relic" }
  {
    id: "slime_badge", name: "เหรียญตราสไลม์", type: "collectible", rarity: "uncommon", icon: "🏅",
    description: "เหรียญตราสำหรับผู้ที่ปราบสไลม์มาแล้วมากมาย",
    isSellable: false, isTradable: false,
    collectible: { collectionId: "monster_badges", kind: "badge" }
  },
  {
    id: "ancient_coin", name: "เหรียญโบราณ", type: "collectible", rarity: "rare", icon: "🪙",
    description: "เหรียญเก่าแก่จากอาณาจักรที่สาบสูญ นักสะสมต่างตามหา",
    sellPrice: 50,
    collectible: { collectionId: "treasures", kind: "relic" }
  },

  // ----- ของรางวัลจากสมุดสะสม (ป้าย "reward") -----
  {
    id: "weapon_collector_badge", name: "เหรียญตรานักสะสมอาวุธ", type: "collectible", rarity: "rare", icon: "🎖️",
    description: "มอบให้ผู้ที่สะสมอาวุธครบทุกชนิด",
    isSellable: false, isTradable: false, tags: ["reward"],
    collectible: { collectionId: "collection_rewards", kind: "badge" }
  },
  {
    id: "armor_collector_badge", name: "เหรียญตรานักสะสมเกราะ", type: "collectible", rarity: "rare", icon: "🎗️",
    description: "มอบให้ผู้ที่สะสมเกราะครบทุกชนิด",
    isSellable: false, isTradable: false, tags: ["reward"],
    collectible: { collectionId: "collection_rewards", kind: "badge" }
  },
  {
    id: "potion_collector_badge", name: "เหรียญตรานักปรุงยา", type: "collectible", rarity: "uncommon", icon: "🏵️",
    description: "มอบให้ผู้ที่สะสมของใช้ครบทุกชนิด",
    isSellable: false, isTradable: false, tags: ["reward"],
    collectible: { collectionId: "collection_rewards", kind: "badge" }
  },
  {
    id: "material_collector_badge", name: "เหรียญตรานักสะสมวัตถุดิบ", type: "collectible", rarity: "rare", icon: "📿",
    description: "มอบให้ผู้ที่สะสมวัตถุดิบครบทุกชนิด",
    isSellable: false, isTradable: false, tags: ["reward"],
    collectible: { collectionId: "collection_rewards", kind: "badge" }
  },
  {
    id: "treasure_collector_badge", name: "เหรียญตรานักล่าของหายาก", type: "collectible", rarity: "epic", icon: "🔰",
    description: "มอบให้ผู้ที่สะสมของสะสมครบทุกชิ้น",
    isSellable: false, isTradable: false, tags: ["reward"],
    collectible: { collectionId: "collection_rewards", kind: "badge" }
  },
  {
    id: "legend_collector_trophy", name: "ถ้วยรางวัลนักสะสมตำนาน", type: "collectible", rarity: "legendary", icon: "🏆",
    description: "ถ้วยรางวัลสำหรับผู้ที่สะสมไอเทมครบทุกชิ้นในสมุดสะสม",
    isSellable: false, isTradable: false, tags: ["reward"],
    collectible: { collectionId: "collection_rewards", kind: "trophy" }
  }
];

// ---------- ID เก่าที่เปลี่ยนชื่อแล้ว ----------
// เซฟเก่าที่ยังเก็บ ID เดิม จะถูกแปลงเป็น ID ใหม่ตอนโหลดเกม
export const LEGACY_ITEM_IDS = {
  wood_sword: "wooden_sword",
  slime_jelly: "slime_gel"
};

// อุปกรณ์ที่ตัวละครใหม่ได้รับและสวมไว้ตั้งแต่เริ่ม
export const STARTER_EQUIPMENT = ["wooden_sword", "cloth_armor"];
