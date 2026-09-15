// =====================================================
// data/shop.js
// ร้านค้าที่จุดพัก 🏕️ — ขายเฉพาะไอเทมในรายการนี้ (เรียงตามลำดับที่แสดง)
//
// ราคาซื้ออ่านจาก buyPrice ใน data/items.js — ไม่เขียนราคาซ้ำที่นี่
// ไอเทมที่ใส่ในร้านต้องมี buyPrice มากกว่า 0 (เกมจะแจ้ง error ถ้าลืม)
// =====================================================

export const SHOP = {
  id: "camp_shop",
  name: "🏪 ร้านค้าจุดพัก",
  stock: [
    "small_hp_potion",
    "large_hp_potion",
    "wooden_sword",
    "cloth_armor",
    "iron_sword",
    "iron_armor",
    "iron_ore"
  ]
};
