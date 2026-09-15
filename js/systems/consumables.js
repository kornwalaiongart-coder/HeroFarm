// =====================================================
// js/systems/consumables.js
// ใช้ไอเทมประเภทของใช้ (consumable) เช่น ยาฟื้นพลัง / ยา EXP
//
// ตัวเลขผลของยาอ่านจาก Item Database (effects) — ไม่เขียนซ้ำที่นี่
// ไม่แตะ DOM: main.js เรียกใช้ แล้วเอาผลลัพธ์ไปแสดงข้อความ
// =====================================================

import { state, addPlayerExp } from "../state.js";
import { getItemById, getItemsByType } from "./itemDatabase.js";
import { countMaterial, removeMaterial } from "./inventory.js";
import { getPlayerStats } from "./stats.js";

// รวมค่าของ effect ชนิดเดียวกัน เช่น ยาที่มี hp 2 อัน
function sumEffect(item, type) {
  return item.effects
    .filter((effect) => effect.type === type)
    .reduce((total, effect) => total + effect.amount, 0);
}

// ใช้ไอเทม 1 ชิ้น
// คืน { ok: false, reason, item? } ถ้าใช้ไม่ได้ (ไม่หักของ)
//   reason: "notConsumable" | "notOwned" | "level" | "dead" | "fullHp" | "noEffect"
// คืน { ok: true, item, healed, exp, levelsGained } ถ้าใช้สำเร็จ (หักของ 1 ชิ้น)
//
// ตอนนี้รองรับ effect: hp, exp
// (mp / buff มีในข้อมูลได้ แต่ยังไม่มีระบบรองรับ — จะไม่มีผลอะไร)
export function useItem(itemId, world) {
  const item = getItemById(itemId);
  if (!item || item.type !== "consumable") return { ok: false, reason: "notConsumable" };
  if (countMaterial(item.id) <= 0) return { ok: false, reason: "notOwned", item };
  if (state.player.level < item.levelRequirement) return { ok: false, reason: "level", item };

  const player = world.player;
  if (player.dead) return { ok: false, reason: "dead", item };

  const maxHp = getPlayerStats().maxHp;
  const missingHp = Math.max(0, maxHp - player.hp);
  const healAmount = sumEffect(item, "hp");
  const expAmount = sumEffect(item, "exp");

  // ยาที่มีแค่ฟื้น HP ห้ามใช้ตอนเลือดเต็ม กันเสียของโดยไม่ได้อะไร
  if (expAmount === 0) {
    if (healAmount === 0) return { ok: false, reason: "noEffect", item };
    if (missingHp < 1) return { ok: false, reason: "fullHp", item };
  }

  removeMaterial(item.id, 1);

  const healed = Math.min(healAmount, missingHp);
  player.hp += healed;

  let levelsGained = 0;
  if (expAmount > 0) {
    levelsGained = addPlayerExp(expAmount);
    // เลเวลอัพ = เลือดเต็ม (เหมือนตอนเลเวลอัพจากการตีมอนเตอร์)
    if (levelsGained > 0) player.hp = getPlayerStats().maxHp;
  }

  return { ok: true, item, healed: Math.round(healed), exp: expAmount, levelsGained };
}

// ปุ่มลัดใช้ยา: เลือกยาฟื้น HP ที่ "พอดี" ที่สุด
// = ขวดที่ฟื้นน้อยที่สุดแต่ยังเติมเลือดที่ขาดได้เต็ม ถ้าไม่มีขวดไหนพอ ก็เอาขวดที่ฟื้นมากที่สุด
// คืนข้อมูลไอเทม หรือ null ถ้าไม่มียาที่ใช้ได้
export function pickHealingPotion(missingHp) {
  const potions = getItemsByType("consumable")
    .filter((item) => countMaterial(item.id) > 0 && state.player.level >= item.levelRequirement)
    .map((item) => ({ item, heal: sumEffect(item, "hp") }))
    .filter((potion) => potion.heal > 0)
    .sort((a, b) => a.heal - b.heal);

  if (potions.length === 0) return null;
  return (potions.find((potion) => potion.heal >= missingHp) ?? potions[potions.length - 1]).item;
}
