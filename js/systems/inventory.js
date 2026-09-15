// =====================================================
// js/systems/inventory.js
// กระเป๋าและอุปกรณ์ที่สวมใส่
//
// โครงสร้างใน state:
//   inventory.materials = { itemId: จำนวน }
//   inventory.equipment = [ { uid, itemId, plus } ]   ← แต่ละชิ้นแยกกัน
//   equipped            = { weapon: uid | null, armor: uid | null }
// =====================================================

import { state, addGold } from "../state.js";
import { ITEMS } from "../../data/items.js";

// ---------- วัตถุดิบ ----------
export function countMaterial(itemId) {
  return state.inventory.materials[itemId] ?? 0;
}

export function addMaterial(itemId, qty = 1) {
  state.inventory.materials[itemId] = countMaterial(itemId) + qty;
}

// คืน true ถ้ามีพอและหักสำเร็จ
export function removeMaterial(itemId, qty = 1) {
  const have = countMaterial(itemId);
  if (have < qty) return false;

  if (have === qty) delete state.inventory.materials[itemId];
  else state.inventory.materials[itemId] = have - qty;
  return true;
}

// ---------- อุปกรณ์ ----------
export function addEquipment(itemId, plus = 0) {
  const item = { uid: state.nextUid, itemId, plus };
  state.nextUid += 1;
  state.inventory.equipment.push(item);
  return item;
}

export function findEquipment(uid) {
  return state.inventory.equipment.find((item) => item.uid === uid) ?? null;
}

export function isEquipped(uid) {
  return Object.values(state.equipped).includes(uid);
}

export function equip(uid) {
  const item = findEquipment(uid);
  if (!item) return false;

  state.equipped[ITEMS[item.itemId].slot] = uid;
  return true;
}

export function unequip(slot) {
  state.equipped[slot] = null;
}

// ---------- ได้ของจากมอนเตอร์ ----------
export function addLoot(itemId, qty = 1) {
  if (ITEMS[itemId].type === "equipment") {
    for (let i = 0; i < qty; i++) addEquipment(itemId);
  } else {
    addMaterial(itemId, qty);
  }
}

// ---------- ขาย ----------
// อุปกรณ์ตีบวกแล้วขายได้แพงขึ้น +50% ต่อระดับ
export function getEquipmentSellPrice(item) {
  return Math.floor(ITEMS[item.itemId].sellPrice * (1 + item.plus * 0.5));
}

// คืนทองที่ได้ (0 = ขายไม่ได้)
export function sellMaterial(itemId, qty = 1) {
  if (!removeMaterial(itemId, qty)) return 0;

  const gold = ITEMS[itemId].sellPrice * qty;
  addGold(gold);
  return gold;
}

// อุปกรณ์ที่สวมอยู่ขายไม่ได้ กันผู้เล่นเผลอขายของที่ใช้อยู่
export function sellEquipment(uid) {
  const item = findEquipment(uid);
  if (!item || isEquipped(uid)) return 0;

  const gold = getEquipmentSellPrice(item);
  state.inventory.equipment = state.inventory.equipment.filter((other) => other.uid !== uid);
  addGold(gold);
  return gold;
}
