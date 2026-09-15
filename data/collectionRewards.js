// =====================================================
// data/collectionRewards.js
// รางวัลสมุดสะสม — สะสมไอเทมในหมวดให้ครบ แล้วกดรับที่หน้า 📖 สมุดสะสม
//
// id:     ห้ามเปลี่ยนหลังใช้งานจริง (เซฟเก็บว่ารับรางวัลไหนไปแล้ว)
// type:   หมวดไอเทม (ตาม ITEM_TYPES ใน data/items.js) ที่ต้องสะสมให้ครบ · null = ทุกหมวดรวมกัน
// gold / gem: ทอง / เพชรที่ได้
// itemId: ไอเทมรางวัล — ต้องเป็นไอเทมที่มีป้าย "reward" ใน data/items.js
// =====================================================

export const COLLECTION_REWARDS = [
  { id: "weapon_complete", type: "weapon", name: "นักสะสมอาวุธ", gold: 1000, gem: 10, itemId: "weapon_collector_badge" },
  { id: "armor_complete", type: "armor", name: "นักสะสมเกราะ", gold: 1000, gem: 10, itemId: "armor_collector_badge" },
  { id: "consumable_complete", type: "consumable", name: "นักปรุงยา", gold: 300, gem: 3, itemId: "potion_collector_badge" },
  { id: "material_complete", type: "material", name: "นักสะสมวัตถุดิบ", gold: 1500, gem: 15, itemId: "material_collector_badge" },
  { id: "collectible_complete", type: "collectible", name: "นักล่าของหายาก", gold: 800, gem: 8, itemId: "treasure_collector_badge" },
  { id: "all_complete", type: null, name: "นักสะสมระดับตำนาน", gold: 5000, gem: 50, itemId: "legend_collector_trophy" }
];
