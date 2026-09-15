// =====================================================
// js/systems/itemDatabase.js
// ประตูเข้า ITEM DATABASE — ทุกระบบเรียกข้อมูลไอเทมผ่านไฟล์นี้
//
// ข้อมูลดิบอยู่ที่ data/items.js ไฟล์นี้ทำ 3 อย่าง:
//   1. ตรวจข้อมูล  — ID ซ้ำ / ประเภทผิด / พิมพ์ชื่อค่าพลังผิด → แจ้ง error ทันทีตอนโหลด
//   2. เติมค่าเริ่มต้น — ไอเทมทุกชิ้นมีฟิลด์ครบ ระบบอื่นไม่ต้องเช็ก undefined เอง
//   3. ฟังก์ชันค้นหา — getItemById / getItemsByType / getItemsByRarity ฯลฯ
//
// ไอเทมที่ได้ถูก freeze (แก้ค่าไม่ได้) กันระบบอื่นเผลอแก้ข้อมูลกลาง
// =====================================================

import {
  ITEM_DEFINITIONS, ITEM_TYPES, RARITIES, EQUIPMENT_SLOTS, LEGACY_ITEM_IDS, STARTER_EQUIPMENT
} from "../../data/items.js";

// ส่งต่อค่าคงที่ ระบบอื่นจะได้ import จากไฟล์นี้ไฟล์เดียว
export { ITEM_TYPES, RARITIES, EQUIPMENT_SLOTS, STARTER_EQUIPMENT };

// ---------- รูปแบบข้อมูล ----------
// ค่าพลังของอุปกรณ์ — ระบบต่อสู้ตอนนี้ใช้แค่ attack / defense / hp
// critical / attackSpeed / criticalResistance เก็บไว้ก่อน รอระบบในอนาคต
export const ITEM_STAT_KEYS = ["attack", "defense", "hp", "critical", "attackSpeed", "criticalResistance"];

// ผลของไอเทมใช้แล้วหมดไป (consumable) — ดูตัวอย่างใน data/items.js
export const EFFECT_TYPES = ["hp", "mp", "exp", "buff"];

// ชนิดของสะสม (collectible)
export const COLLECTIBLE_KINDS = ["badge", "trophy", "relic"];

const ID_PATTERN = /^[a-z][a-z0-9_]*$/;

// =====================================================
// 1. ตรวจข้อมูล
// คืนรายการข้อความ error (array ว่าง = ข้อมูลถูกต้องทั้งหมด)
// =====================================================
export function validateItemDefinitions(definitions, legacyIds = LEGACY_ITEM_IDS) {
  const errors = [];
  const seenIds = new Set();
  const isNumber = (value) => typeof value === "number" && Number.isFinite(value);

  definitions.forEach((def, index) => {
    const fail = (message) => errors.push(`ไอเทมลำดับที่ ${index + 1} (${def?.id ?? "ไม่มี id"}): ${message}`);

    if (!def || typeof def !== "object") {
      fail("ข้อมูลต้องเป็น object");
      return;
    }

    // --- ข้อมูลพื้นฐาน ---
    if (typeof def.id !== "string" || !ID_PATTERN.test(def.id)) {
      fail('id ต้องเป็นภาษาอังกฤษตัวเล็ก ตัวเลข หรือ _ เท่านั้น เช่น "iron_sword"');
    } else if (seenIds.has(def.id)) {
      fail("id ซ้ำกับไอเทมอื่น");
    } else if (Object.hasOwn(legacyIds, def.id)) {
      fail("id ซ้ำกับ ID เก่าใน LEGACY_ITEM_IDS");
    }
    seenIds.add(def.id);

    if (typeof def.name !== "string" || !def.name.trim()) fail("ต้องมี name");

    const type = Object.hasOwn(ITEM_TYPES, def.type) ? ITEM_TYPES[def.type] : null;
    if (!type) fail(`type "${def.type}" ไม่มีในระบบ (ใช้ได้: ${Object.keys(ITEM_TYPES).join(", ")})`);
    if (!Object.hasOwn(RARITIES, def.rarity)) {
      fail(`rarity "${def.rarity}" ไม่มีในระบบ (ใช้ได้: ${Object.keys(RARITIES).join(", ")})`);
    }

    for (const key of ["sellPrice", "buyPrice"]) {
      if (def[key] !== undefined && (!isNumber(def[key]) || def[key] < 0)) fail(`${key} ต้องเป็นตัวเลข 0 ขึ้นไป`);
    }
    if (def.levelRequirement !== undefined && (!Number.isInteger(def.levelRequirement) || def.levelRequirement < 1)) {
      fail("levelRequirement ต้องเป็นจำนวนเต็ม 1 ขึ้นไป");
    }
    if (def.maxStack !== undefined && (!Number.isInteger(def.maxStack) || def.maxStack < 1)) {
      fail("maxStack ต้องเป็นจำนวนเต็ม 1 ขึ้นไป");
    }
    for (const key of ["isSellable", "isTradable"]) {
      if (def[key] !== undefined && typeof def[key] !== "boolean") fail(`${key} ต้องเป็น true หรือ false`);
    }
    if ("isEquippable" in def) fail("ไม่ต้องใส่ isEquippable — ระบบคำนวณจาก type ให้เอง");
    if (def.tags !== undefined && (!Array.isArray(def.tags) || def.tags.some((tag) => typeof tag !== "string"))) {
      fail('tags ต้องเป็น array ของข้อความ เช่น ["legacy"]');
    }

    // --- อุปกรณ์ (weapon / armor / accessory) ---
    const equippable = Boolean(type?.equipSlot);
    if (equippable && def.maxStack !== undefined && def.maxStack !== 1) fail("อุปกรณ์ซ้อนกันไม่ได้ (maxStack ต้องเป็น 1)");

    for (const field of ["stats", "statsPerPlus"]) {
      if (def[field] === undefined) continue;
      if (type && !equippable) {
        fail(`${field} ใช้ได้เฉพาะไอเทมที่สวมใส่ได้`);
        continue;
      }
      for (const [key, value] of Object.entries(def[field])) {
        if (!ITEM_STAT_KEYS.includes(key)) fail(`${field}.${key} ไม่รู้จัก (ใช้ได้: ${ITEM_STAT_KEYS.join(", ")})`);
        else if (!isNumber(value)) fail(`${field}.${key} ต้องเป็นตัวเลข`);
      }
    }

    // --- ของใช้ (consumable) ---
    if (def.effects !== undefined && def.type !== "consumable") fail("effects ใช้ได้เฉพาะ type consumable");
    if (def.type === "consumable") {
      if (!Array.isArray(def.effects) || def.effects.length === 0) {
        fail("consumable ต้องมี effects อย่างน้อย 1 อย่าง");
      } else {
        def.effects.forEach((effect, i) => {
          if (!EFFECT_TYPES.includes(effect?.type)) fail(`effects[${i}].type ต้องเป็น ${EFFECT_TYPES.join(" / ")}`);
          if (!isNumber(effect?.amount)) fail(`effects[${i}].amount ต้องเป็นตัวเลข`);
          if (effect?.type === "buff" && (!ITEM_STAT_KEYS.includes(effect.stat) || !isNumber(effect.duration))) {
            fail(`effects[${i}] แบบ buff ต้องมี stat และ duration`);
          }
        });
      }
    }

    // --- วัตถุดิบ / ของสะสม ---
    if (def.material !== undefined && def.type !== "material") fail("material ใช้ได้เฉพาะ type material");
    if (def.collectible !== undefined && def.type !== "collectible") fail("collectible ใช้ได้เฉพาะ type collectible");
    if (def.type === "collectible" && def.collectible && !COLLECTIBLE_KINDS.includes(def.collectible.kind)) {
      fail(`collectible.kind ต้องเป็น ${COLLECTIBLE_KINDS.join(" / ")}`);
    }
  });

  for (const [oldId, newId] of Object.entries(legacyIds)) {
    if (!seenIds.has(newId)) errors.push(`LEGACY_ITEM_IDS: "${oldId}" ชี้ไปที่ "${newId}" ซึ่งไม่มีอยู่`);
  }

  return errors;
}

// =====================================================
// 2. เติมค่าเริ่มต้น → ไอเทมทุกชิ้นมีหน้าตาเหมือนกัน
// =====================================================
function buildStats(values = {}) {
  return Object.freeze(Object.fromEntries(ITEM_STAT_KEYS.map((key) => [key, values[key] ?? 0])));
}

function normalizeItem(def) {
  const type = ITEM_TYPES[def.type];
  const isEquippable = Boolean(type.equipSlot);

  return Object.freeze({
    // --- ข้อมูลพื้นฐาน (ไอเทมทุกชนิดมี) ---
    id: def.id,
    name: def.name,
    type: def.type,
    rarity: def.rarity,
    icon: def.icon ?? type.icon,
    description: def.description ?? "",
    maxStack: def.maxStack ?? type.maxStack,
    sellPrice: def.sellPrice ?? 0,
    buyPrice: def.buyPrice ?? 0,             // 0 = ร้านค้าไม่ขาย
    levelRequirement: def.levelRequirement ?? 1,
    isSellable: def.isSellable ?? type.isSellable ?? true,
    isTradable: def.isTradable ?? type.isTradable ?? true,
    isEquippable,
    slot: type.equipSlot,                    // "weapon" | "armor" | "accessory" | null
    tags: Object.freeze([...(def.tags ?? [])]),

    // --- ข้อมูลเฉพาะประเภท (ไม่ใช่ประเภทนั้น = null หรือ array ว่าง) ---
    stats: isEquippable ? buildStats(def.stats) : null,
    statsPerPlus: isEquippable ? buildStats(def.statsPerPlus) : null,
    effects: Object.freeze((def.effects ?? []).map((effect) => Object.freeze({ ...effect }))),
    material: def.type === "material"
      ? Object.freeze({ tier: def.material?.tier ?? 1, craftingTags: Object.freeze([...(def.material?.craftingTags ?? [])]) })
      : null,
    collectible: def.type === "collectible"
      ? Object.freeze({ collectionId: def.collectible?.collectionId ?? "general", kind: def.collectible?.kind ?? "relic" })
      : null,
    quest: def.type === "quest" ? Object.freeze({ questId: def.quest?.questId ?? null }) : null
  });
}

// ข้อมูลผิด → หยุดโหลดทันที พร้อมบอกว่าผิดตรงไหน (ดูได้ใน Console)
const definitionErrors = validateItemDefinitions(ITEM_DEFINITIONS);
if (definitionErrors.length > 0) {
  throw new Error("[ITEM DATABASE] ข้อมูลใน data/items.js ไม่ถูกต้อง:\n- " + definitionErrors.join("\n- "));
}

// ITEMS["iron_sword"] → ข้อมูลไอเทม
// ใช้ Object.create(null) เพื่อไม่ให้ ITEMS["toString"] หรือ ITEMS["constructor"] หาเจอโดยบังเอิญ
export const ITEMS = Object.freeze(Object.assign(
  Object.create(null),
  Object.fromEntries(ITEM_DEFINITIONS.map((def) => [def.id, normalizeItem(def)]))
));

const ITEM_LIST = Object.freeze(Object.values(ITEMS));

// =====================================================
// 3. ฟังก์ชันค้นหา
// =====================================================

// แปลง ID (รวม ID เก่าที่เปลี่ยนชื่อแล้ว) เป็น ID ปัจจุบัน — ไม่มีไอเทมนี้ คืน null
export function resolveItemId(id) {
  if (typeof id !== "string") return null;
  if (ITEMS[id]) return id;

  const newId = Object.hasOwn(LEGACY_ITEM_IDS, id) ? LEGACY_ITEM_IDS[id] : null;
  return newId && ITEMS[newId] ? newId : null;
}

// getItemById("iron_sword") → ข้อมูลไอเทม หรือ null ถ้าไม่มี
export function getItemById(id) {
  const itemId = resolveItemId(id);
  return itemId ? ITEMS[itemId] : null;
}

export function hasItem(id) {
  return resolveItemId(id) !== null;
}

// ไอเทมทั้งหมด เรียงตามลำดับใน data/items.js
export function getAllItems() {
  return ITEM_LIST;
}

// getItemsByType("weapon") → [ไอเทม, ...]
export function getItemsByType(type) {
  return ITEM_LIST.filter((item) => item.type === type);
}

// getItemsByRarity("epic") → [ไอเทม, ...]
export function getItemsByRarity(rarity) {
  return ITEM_LIST.filter((item) => item.rarity === rarity);
}

// ข้อมูลแสดงผลของความหายาก (ชื่อไทย / สี) — ไม่รู้จักจะคืน common
export function getRarity(rarity) {
  return Object.hasOwn(RARITIES, rarity) ? RARITIES[rarity] : RARITIES.common;
}

export function getItemType(type) {
  return Object.hasOwn(ITEM_TYPES, type) ? ITEM_TYPES[type] : null;
}

// ซ้อนในกระเป๋าได้ไหม (อุปกรณ์แต่ละชิ้นแยกกัน เพราะตีบวกได้ไม่เท่ากัน)
export function isStackable(itemOrId) {
  const item = typeof itemOrId === "string" ? getItemById(itemOrId) : itemOrId;
  return Boolean(item) && !item.isEquippable;
}

// ---------- สมุดสะสม (Item Collection) ----------
// ไอเทมที่นับในสมุดสะสม — ไม่รวมไอเทมป้าย "legacy" (ของเก่าที่หาไม่ได้แล้ว)
// และ "reward" (ของรางวัลจากสมุดสะสมเอง ถ้านับด้วยจะสะสมครบไม่ได้)
// type ไม่ระบุ = ทุกประเภท
const NOT_IN_COLLECTION_TAGS = ["legacy", "reward"];

export function getCollectionItems(type = null) {
  return ITEM_LIST.filter((item) =>
    !item.tags.some((tag) => NOT_IN_COLLECTION_TAGS.includes(tag)) && (type === null || item.type === type)
  );
}

// discoveredIds = ID ไอเทมที่ผู้เล่นเคยได้ (Array หรือ Set)
// คืน [{ type, name, icon, found, total }] เรียงตาม ITEM_TYPES
//   เช่น { type: "weapon", name: "อาวุธ", found: 2, total: 6 }
export function getCollectionProgress(discoveredIds = []) {
  const found = new Set();
  for (const id of discoveredIds) {
    const itemId = resolveItemId(id);
    if (itemId) found.add(itemId);
  }

  return Object.values(ITEM_TYPES).map((type) => {
    const items = getCollectionItems(type.id);
    return {
      type: type.id,
      name: type.name,
      icon: type.icon,
      found: items.filter((item) => found.has(item.id)).length,
      total: items.length
    };
  });
}
