// =====================================================
// js/save.js
// หน้าที่: เก็บ state ลงเครื่องผู้เล่น (localStorage)
//
// ขั้นตอนโหลด:  อ่าน → แปลงเวอร์ชัน (migrate) → ตรวจ/ซ่อมค่า (sanitize)
// ขั้นตอนเซฟ:   ระบบต่างๆ เรียก markDirty() → main.js เซฟรวบทีเดียวตามรอบ
// =====================================================

import { state, replaceState, createNewState, CONFIG } from "./state.js";
import { ITEMS, EQUIPMENT_SLOTS, resolveItemId } from "./systems/itemDatabase.js";
import { MAPS } from "../data/maps.js";
import { COLLECTION_REWARDS } from "../data/collectionRewards.js";
import { MAX_PLUS } from "./systems/upgrade.js";

const SAVE_KEY = "herofarm_save";
// สำเนาเซฟดิบก่อนแปลงเวอร์ชัน หรือก่อนทิ้งเซฟที่อ่านไม่ได้
const BACKUP_KEY = "herofarm_save_backup";

// ---------- ตารางแปลงเซฟเก่า ----------
// key = เวอร์ชันต้นทาง ฟังก์ชันรับเซฟเวอร์ชันนั้น คืนเซฟเวอร์ชันถัดไป
const MIGRATIONS = {
  // v1 → v2: เลิกเก็บชื่อ/รูป/ค่าพลังในเซฟ เหลือแค่ id, level, exp
  1: (save) => ({
    ...save,
    characters: save.characters.map(({ id, level, exp }) => ({ id, level, exp }))
  }),

  // v2 → v3: เปลี่ยนจากเกมการ์ด เป็นเกมเดินตีมอนเตอร์
  // เก็บเลเวล/ทอง/เพชรของผู้เล่นไว้ ตัดการ์ดตัวละครและพลังงานออก
  // profile = null → ผู้เล่นเดิมจะได้สร้างตัวละครใหม่
  2: (save) => ({
    profile: null,
    player: {
      level: save.player.level,
      exp: save.player.exp,
      gold: save.player.gold,
      gem: save.player.gem
    },
    inventory: { materials: {}, equipment: [] },
    equipped: { weapon: null, armor: null },
    nextUid: 1,
    lastSavedAt: save.lastSavedAt
  })
};

function migrate(save) {
  let current = save;
  let version = current.version ?? 1;

  while (version < CONFIG.SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error("ไม่มีขั้นตอนแปลงเซฟจากเวอร์ชัน " + version);

    version += 1;
    current = { ...step(current), version };
  }

  return current;
}

// ---------- ตรวจและซ่อมค่าในเซฟ ----------
// กันเกมพังเพราะ undefined / NaN / ไอเทมที่ถูกลบออกจากเกมไปแล้ว
function toNumber(value, fallback, min = 0) {
  return Number.isFinite(value) ? Math.max(min, value) : fallback;
}

function sanitizeProfile(profile) {
  if (!profile || typeof profile.name !== "string" || !profile.name.trim()) return null;
  if (profile.gender !== "male" && profile.gender !== "female") return null;

  return {
    name: profile.name.trim().slice(0, 12),
    gender: profile.gender,
    createdAt: toNumber(profile.createdAt, Date.now())
  };
}

function sanitize(save) {
  const fresh = createNewState();

  const player = {};
  for (const key of Object.keys(fresh.player)) {
    player[key] = toNumber(save.player?.[key], fresh.player[key]);
  }
  player.level = Math.max(1, Math.floor(player.level));

  const materials = {};
  for (const [savedId, qty] of Object.entries(save.inventory?.materials ?? {})) {
    // ID เก่าที่เปลี่ยนชื่อแล้ว (เช่น slime_jelly → slime_gel) แปลงเป็น ID ปัจจุบัน
    const itemId = resolveItemId(savedId);
    const count = Math.floor(toNumber(qty, 0));
    if (itemId && !ITEMS[itemId].isEquippable && count > 0) {
      materials[itemId] = Math.min(ITEMS[itemId].maxStack, (materials[itemId] ?? 0) + count);
    }
  }

  const seenUids = new Set();
  const equipment = [];
  for (const item of Array.isArray(save.inventory?.equipment) ? save.inventory.equipment : []) {
    const itemId = resolveItemId(item?.itemId);
    if (!itemId || !ITEMS[itemId].isEquippable) continue;
    if (!Number.isInteger(item.uid) || seenUids.has(item.uid)) continue;

    seenUids.add(item.uid);
    equipment.push({
      uid: item.uid,
      itemId,
      plus: Math.min(MAX_PLUS, Math.floor(toNumber(item.plus, 0)))
    });
  }

  // สวมได้เฉพาะของที่มีอยู่จริงและใส่ถูกช่อง
  const equipped = {};
  for (const slot of Object.keys(EQUIPMENT_SLOTS)) {
    const uid = save.equipped?.[slot];
    const item = equipment.find((other) => other.uid === uid);
    // + เลเวลต้องถึง levelRequirement (ของที่เลเวลไม่ถึงถูกถอด แต่ยังอยู่ในกระเป๋า)
    const usable = item && ITEMS[item.itemId].slot === slot && player.level >= ITEMS[item.itemId].levelRequirement;
    equipped[slot] = usable ? uid : null;
  }

  // สมุดสะสม: เก็บเฉพาะไอเทมที่มีจริง
  // + ของที่อยู่ในกระเป๋าตอนนี้นับว่าค้นพบแล้ว (ผู้เล่นที่เล่นก่อนมีสมุดสะสม)
  const discovered = {};
  for (const [savedId, time] of Object.entries(save.collection?.discovered ?? {})) {
    const itemId = resolveItemId(savedId);
    if (itemId) discovered[itemId] = toNumber(time, Date.now());
  }
  for (const itemId of [...Object.keys(materials), ...equipment.map((item) => item.itemId)]) {
    discovered[itemId] ??= Date.now();
  }

  // รางวัลสมุดสะสมที่รับแล้ว: เก็บเฉพาะรางวัลที่มีอยู่จริง
  const claimedRewards = {};
  for (const reward of COLLECTION_REWARDS) {
    const time = save.collection?.claimedRewards?.[reward.id];
    if (time !== undefined) claimedRewards[reward.id] = toNumber(time, Date.now());
  }

  const maxUid = equipment.reduce((max, item) => Math.max(max, item.uid), 0);

  return {
    version: CONFIG.SAVE_VERSION,
    profile: sanitizeProfile(save.profile),
    player,
    inventory: { materials, equipment },
    equipped,
    // แผนที่ที่ไม่มีในเกมแล้ว (หรือเซฟเก่าที่ยังไม่มีค่านี้) → กลับแผนที่เริ่มต้น
    mapId: Object.hasOwn(MAPS, save.mapId) ? save.mapId : fresh.mapId,
    collection: { discovered, claimedRewards },
    nextUid: Math.max(maxUid + 1, Math.floor(toNumber(save.nextUid, 1, 1))),
    lastSavedAt: save.lastSavedAt ?? null
  };
}

// ---------- บันทึก ----------
let dirty = false;

// เรียกทุกครั้งที่ state เปลี่ยน (ได้ของ, ตีบวก, เลเวลอัพ ฯลฯ)
export function markDirty() {
  dirty = true;
}

export function saveGame() {
  try {
    state.lastSavedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    dirty = false;
    return true;
  } catch (error) {
    // เกิดได้ถ้าเบราว์เซอร์ปิด localStorage หรือพื้นที่เต็ม
    console.error("บันทึกไม่สำเร็จ:", error);
    return false;
  }
}

export function saveIfDirty() {
  return dirty ? saveGame() : false;
}

function backupRawSave(raw) {
  try {
    localStorage.setItem(BACKUP_KEY, raw);
  } catch (error) {
    console.error("สำรองเซฟไม่สำเร็จ:", error);
  }
}

// ---------- โหลด ----------
// คืน true ถ้าเจอเซฟเดิม, false ถ้าเป็นผู้เล่นใหม่ (หรือเซฟใช้ไม่ได้)
export function loadGame() {
  let raw = null;

  try {
    raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    const loaded = JSON.parse(raw);
    if (!loaded || typeof loaded.player !== "object") {
      throw new Error("โครงสร้างเซฟไม่ถูกต้อง");
    }

    const version = loaded.version ?? 1;
    if (version > CONFIG.SAVE_VERSION) {
      throw new Error("เซฟมาจากเกมเวอร์ชันที่ใหม่กว่า (v" + version + ")");
    }
    if (version < 3 && !Array.isArray(loaded.characters)) {
      throw new Error("โครงสร้างเซฟเก่าไม่ถูกต้อง");
    }
    if (version < CONFIG.SAVE_VERSION) backupRawSave(raw);

    replaceState(sanitize(migrate(loaded)));
    return true;
  } catch (error) {
    console.error("โหลดเซฟไม่สำเร็จ เริ่มเกมใหม่แทน (สำรองเซฟเดิมไว้ที่ " + BACKUP_KEY + "):", error);
    if (raw) backupRawSave(raw);
    return false;
  }
}

// ---------- ลบเซฟและเริ่มใหม่ ----------
export function resetGame() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (error) {
    console.error("ลบเซฟไม่สำเร็จ:", error);
  }
  replaceState(createNewState());
  saveGame();
}

// ---------- ข้อความบอกเวลาที่เซฟล่าสุด ----------
export function getSaveStatusText() {
  if (!state.lastSavedAt) return "ยังไม่ได้บันทึก";

  const time = new Date(state.lastSavedAt);
  const hh = String(time.getHours()).padStart(2, "0");
  const mm = String(time.getMinutes()).padStart(2, "0");
  return `บันทึกล่าสุด ${hh}:${mm} น.`;
}
