// =====================================================
// data/items.js
// "แม่แบบ" ไอเทมทั้งหมดในเกม — ไม่เปลี่ยนระหว่างเล่น
//
// ในเซฟเก็บแค่ itemId (+ ระดับตีบวกสำหรับอุปกรณ์)
// ปรับค่าพลัง / ราคาขายที่ไฟล์นี้ แล้วมีผลกับผู้เล่นเดิมทันที
//
// type: "material"  = วัตถุดิบ ซ้อนกันได้
//       "equipment" = อุปกรณ์ สวมใส่ได้ ตีบวกได้ แต่ละชิ้นแยกกัน
// =====================================================

export const RARITY = {
  common: { name: "ธรรมดา", color: "#8a7558" },
  rare: { name: "หายาก", color: "#2f80ed" },
  epic: { name: "ตำนาน", color: "#9b51e0" }
};

export const EQUIPMENT_SLOTS = {
  weapon: "อาวุธ",
  armor: "เกราะ"
};

export const ITEMS = {
  // ---------- วัตถุดิบ ----------
  slime_jelly: { type: "material", name: "เจลสไลม์", icon: "🟢", rarity: "common", sellPrice: 2 },
  wolf_fang: { type: "material", name: "เขี้ยวหมาป่า", icon: "🦷", rarity: "common", sellPrice: 6 },
  goblin_ear: { type: "material", name: "หูก๊อบลิน", icon: "👂", rarity: "common", sellPrice: 8 },
  bat_wing: { type: "material", name: "ปีกค้างคาว", icon: "🪶", rarity: "common", sellPrice: 10 },
  scorpion_stinger: { type: "material", name: "เหล็กในแมงป่อง", icon: "🪡", rarity: "rare", sellPrice: 25 },
  guardian_heart: { type: "material", name: "หัวใจผู้พิทักษ์", icon: "💚", rarity: "epic", sellPrice: 200 },
  // ของจากโกเลม (ไม่ดรอปแล้ว คงไว้ให้เซฟเดิมไม่หาย)
  golem_core: { type: "material", name: "แกนโกเลม", icon: "🔶", rarity: "rare", sellPrice: 20 },
  enhance_stone: { type: "material", name: "หินตีบวก", icon: "💠", rarity: "rare", sellPrice: 10 },

  // ---------- อาวุธ ----------
  wood_sword: {
    type: "equipment", slot: "weapon", name: "ดาบไม้", icon: "🗡️", rarity: "common",
    atk: 4, atkPerPlus: 1, sellPrice: 5
  },
  iron_sword: {
    type: "equipment", slot: "weapon", name: "ดาบเหล็ก", icon: "⚔️", rarity: "rare",
    atk: 12, atkPerPlus: 3, sellPrice: 40
  },
  golem_hammer: {
    type: "equipment", slot: "weapon", name: "ค้อนหินโกเลม", icon: "🔨", rarity: "epic",
    atk: 26, atkPerPlus: 5, sellPrice: 150
  },
  desert_blade: {
    type: "equipment", slot: "weapon", name: "ตรีศูลทะเลทราย", icon: "🔱", rarity: "epic",
    atk: 30, atkPerPlus: 5, sellPrice: 180
  },
  guardian_axe: {
    type: "equipment", slot: "weapon", name: "ขวานผู้พิทักษ์", icon: "🪓", rarity: "epic",
    atk: 45, atkPerPlus: 7, sellPrice: 400
  },

  // ---------- เกราะ ----------
  cloth_armor: {
    type: "equipment", slot: "armor", name: "เสื้อผ้าฝ้าย", icon: "👕", rarity: "common",
    def: 2, hp: 10, defPerPlus: 1, hpPerPlus: 5, sellPrice: 5
  },
  leather_armor: {
    type: "equipment", slot: "armor", name: "เกราะหนังหมาป่า", icon: "🦺", rarity: "rare",
    def: 6, hp: 30, defPerPlus: 2, hpPerPlus: 12, sellPrice: 40
  },
  stone_armor: {
    type: "equipment", slot: "armor", name: "เกราะหินโกเลม", icon: "🛡️", rarity: "epic",
    def: 14, hp: 80, defPerPlus: 3, hpPerPlus: 25, sellPrice: 150
  },
  sand_armor: {
    type: "equipment", slot: "armor", name: "เกราะเกล็ดทราย", icon: "🧥", rarity: "epic",
    def: 16, hp: 90, defPerPlus: 3, hpPerPlus: 20, sellPrice: 180
  },
  guardian_armor: {
    type: "equipment", slot: "armor", name: "เกราะเปลือกไม้ศักดิ์สิทธิ์", icon: "🥋", rarity: "epic",
    def: 24, hp: 150, defPerPlus: 4, hpPerPlus: 35, sellPrice: 400
  }
};

// อุปกรณ์ที่ตัวละครใหม่ได้รับและสวมไว้ตั้งแต่เริ่ม
export const STARTER_EQUIPMENT = ["wood_sword", "cloth_armor"];
