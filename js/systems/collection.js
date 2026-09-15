// =====================================================
// js/systems/collection.js
// สมุดสะสมไอเทม — จำว่าผู้เล่นเคยได้ไอเทมไหนบ้าง
//
// โครงสร้างใน state:
//   collection.discovered = { itemId: เวลาที่ได้ครั้งแรก (ms) }
//
// ได้ของครั้งแรก = ค้นพบ (inventory.js เรียก discoverItem ให้อัตโนมัติ)
// ขายหรือใช้ของหมดแล้ว ก็ยังนับว่าเคยค้นพบ
// =====================================================

import { state } from "../state.js";
import { STARTER_EQUIPMENT, resolveItemId, getCollectionProgress } from "./itemDatabase.js";
import { MONSTERS } from "../../data/monsters.js";
import { MAPS } from "../../data/maps.js";

export function isDiscovered(itemId) {
  const id = resolveItemId(itemId);
  return id !== null && Object.hasOwn(state.collection.discovered, id);
}

// คืน true ถ้าเพิ่งค้นพบครั้งแรก
export function discoverItem(itemId) {
  const id = resolveItemId(itemId);
  if (id === null || isDiscovered(id)) return false;

  state.collection.discovered[id] = Date.now();
  return true;
}

export function getDiscoveredIds() {
  return Object.keys(state.collection.discovered);
}

// สรุปความคืบหน้า: { rows: [{ type, name, icon, found, total }], found, total }
// ไม่แสดงประเภทที่ยังไม่มีไอเทมเลย (เช่น quest ตอนนี้)
export function getCollectionSummary() {
  const rows = getCollectionProgress(getDiscoveredIds()).filter((row) => row.total > 0);
  return {
    rows,
    found: rows.reduce((sum, row) => sum + row.found, 0),
    total: rows.reduce((sum, row) => sum + row.total, 0)
  };
}

// ---------- ไอเทมนี้ได้จากไหน ----------
// อ่านจากรายการดรอปของมอนเตอร์ + ของเริ่มต้น (ไม่ต้องเขียนข้อมูลซ้ำ)
// คืน [{ kind: "starter" } | { kind: "monster", monsterId, icon, name, level, maps: [ชื่อแผนที่], chance }]
let sourceIndex = null;

function buildSourceIndex() {
  const index = {};
  const add = (itemId, source) => (index[itemId] ??= []).push(source);

  for (const itemId of STARTER_EQUIPMENT) add(itemId, { kind: "starter" });

  for (const [monsterId, monster] of Object.entries(MONSTERS)) {
    const maps = Object.values(MAPS)
      .filter((map) => map.zones.some((zone) => zone.monsterId === monsterId))
      .map((map) => map.name);

    for (const drop of monster.drops) {
      add(drop.itemId, {
        kind: "monster", monsterId, icon: monster.icon, name: monster.name,
        level: monster.level, maps, chance: drop.chance
      });
    }
  }
  return index;
}

export function getItemSources(itemId) {
  sourceIndex ??= buildSourceIndex();
  return sourceIndex[resolveItemId(itemId)] ?? [];
}
