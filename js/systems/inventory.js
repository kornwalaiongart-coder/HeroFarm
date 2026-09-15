// =====================================================
// js/systems/inventory.js
// กระเป๋าและอุปกรณ์ที่สวมใส่
//
// โครงสร้างใน state:
//   inventory.materials = { itemId: จำนวน }            ← ไอเทมที่ซ้อนได้ (วัตถุดิบ ยา ของสะสม ฯลฯ)
//   inventory.equipment = [ { uid, itemId, plus } ]   ← อุปกรณ์ แต่ละชิ้นแยกกัน
//   equipped            = { weapon: uid | null, armor: uid | null }
// =====================================================

import { state, addGold } from "../state.js";
import { ITEMS } from "./itemDatabase.js";
import { discoverItem, isDiscovered } from "./collection.js";

// ---------- วัตถุดิบ ----------
export function countMaterial(itemId) {
  return state.inventory.materials[itemId] ?? 0;
}

// ซ้อนได้ไม่เกิน maxStack ของไอเทม (ตาม Item Database) ส่วนที่เกินจะไม่ถูกเพิ่ม
// คืนจำนวนที่เพิ่มได้จริง
export function addMaterial(itemId, qty = 1) {
  const room = Math.max(0, ITEMS[itemId].maxStack - countMaterial(itemId));
  const added = Math.min(qty, room);
  if (added > 0) state.inventory.materials[itemId] = countMaterial(itemId) + added;

  discoverItem(itemId);
  return added;
}

export function isStackFull(itemId) {
  return countMaterial(itemId) >= ITEMS[itemId].maxStack;
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
  discoverItem(itemId);
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

// สวมได้เฉพาะเมื่อเลเวลผู้เล่นถึง levelRequirement ของไอเทม
// คืน { ok: true } หรือ { ok: false, reason: "notFound" | "level", required }
export function equip(uid) {
  const item = findEquipment(uid);
  if (!item) return { ok: false, reason: "notFound" };

  const def = ITEMS[item.itemId];
  if (!canEquip(item.itemId)) return { ok: false, reason: "level", required: def.levelRequirement };

  state.equipped[def.slot] = uid;
  return { ok: true };
}

export function canEquip(itemId) {
  return state.player.level >= ITEMS[itemId].levelRequirement;
}

export function unequip(slot) {
  state.equipped[slot] = null;
}

// ---------- ได้ของจากมอนเตอร์ ----------
// คืน { added: จำนวนที่เข้ากระเป๋าจริง, isNew: เพิ่งได้ไอเทมนี้ครั้งแรกไหม }
export function addLoot(itemId, qty = 1) {
  const isNew = !isDiscovered(itemId);

  if (ITEMS[itemId].isEquippable) {
    for (let i = 0; i < qty; i++) addEquipment(itemId);
    return { added: qty, isNew };
  }
  return { added: addMaterial(itemId, qty), isNew };
}

// ---------- ขาย ----------
// อุปกรณ์ตีบวกแล้วขายได้แพงขึ้น +50% ต่อระดับ
export function getEquipmentSellPrice(item) {
  return Math.floor(ITEMS[item.itemId].sellPrice * (1 + item.plus * 0.5));
}

// คืนทองที่ได้ (0 = ขายไม่ได้)
export function sellMaterial(itemId, qty = 1) {
  if (!ITEMS[itemId]?.isSellable) return 0;   // เช่น ของสะสมบางชิ้น ขายไม่ได้
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
