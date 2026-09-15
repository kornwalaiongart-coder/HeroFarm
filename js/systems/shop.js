// =====================================================
// js/systems/shop.js
// ร้านค้า — ซื้อไอเทมด้วยทอง
//
// รายการของในร้านอยู่ที่ data/shop.js · ราคาอ่านจาก buyPrice ใน Item Database
// ไฟล์นี้ไม่รู้เรื่องตำแหน่งผู้เล่น — การเช็กว่า "อยู่ที่จุดพักไหม" ทำที่หน้าจอ (panels.js)
// =====================================================

import { state, addGold } from "../state.js";
import { ITEMS } from "./itemDatabase.js";
import { addLoot, countMaterial } from "./inventory.js";
import { SHOP } from "../../data/shop.js";

export { SHOP };

// ---------- ตรวจข้อมูลร้าน ----------
export function validateShop(shop = SHOP) {
  const errors = [];
  const seen = new Set();

  for (const itemId of shop.stock) {
    const item = ITEMS[itemId];
    if (!item) errors.push(`ไม่มีไอเทม ${itemId}`);
    else if (item.buyPrice <= 0) errors.push(`${itemId} ไม่มีราคาซื้อ (ใส่ buyPrice มากกว่า 0 ใน data/items.js)`);
    if (seen.has(itemId)) errors.push(`${itemId} ซ้ำในรายการร้าน`);
    seen.add(itemId);
  }
  return errors;
}

const shopErrors = validateShop();
if (shopErrors.length > 0) {
  throw new Error("[SHOP] ข้อมูลใน data/shop.js ไม่ถูกต้อง:\n- " + shopErrors.join("\n- "));
}

// ---------- ซื้อ ----------
// ซื้อได้อีกสูงสุดกี่ชิ้น — ของที่ซ้อนได้ติด maxStack / อุปกรณ์ไม่จำกัด
export function getBuyLimit(itemId) {
  const item = ITEMS[itemId];
  if (!item) return 0;
  return item.isEquippable ? Infinity : Math.max(0, item.maxStack - countMaterial(itemId));
}

// คืน { ok: false, reason: "notInShop" | "invalidQty" | "full" | "gold" }
// หรือ { ok: true, item, qty, cost, isNew }   (isNew = ได้ไอเทมนี้ครั้งแรก → ลงสมุดสะสม)
export function buyItem(itemId, qty = 1) {
  if (!SHOP.stock.includes(itemId)) return { ok: false, reason: "notInShop" };
  if (!Number.isInteger(qty) || qty < 1) return { ok: false, reason: "invalidQty" };
  if (getBuyLimit(itemId) < qty) return { ok: false, reason: "full" };

  const item = ITEMS[itemId];
  const cost = item.buyPrice * qty;
  if (state.player.gold < cost) return { ok: false, reason: "gold" };

  addGold(-cost);
  const { isNew } = addLoot(itemId, qty);
  return { ok: true, item, qty, cost, isNew };
}
