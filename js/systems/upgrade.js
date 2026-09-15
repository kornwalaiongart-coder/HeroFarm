// =====================================================
// js/systems/upgrade.js
// ตีบวกอุปกรณ์ +0 → +10
//
// ใช้ทอง + หินตีบวก ยิ่งบวกสูงยิ่งแพงและโอกาสสำเร็จยิ่งต่ำ
// ตีไม่สำเร็จ: เสียของที่ใช้ แต่ระดับไม่ลดและอุปกรณ์ไม่แตก
// =====================================================

import { state, addGold } from "../state.js";
import { ITEMS } from "./itemDatabase.js";
import { findEquipment, countMaterial, removeMaterial } from "./inventory.js";

export const MAX_PLUS = 10;

// index = ระดับปัจจุบัน → โอกาสตีสำเร็จไประดับถัดไป
const SUCCESS_RATE = [1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2];

const RARITY_COST_MULTIPLIER = { common: 1, uncommon: 1.5, rare: 2, epic: 3, legendary: 4, mythic: 5 };

export function getUpgradeCost(item) {
  const plus = item.plus;
  const multiplier = RARITY_COST_MULTIPLIER[ITEMS[item.itemId].rarity] ?? 1;

  return {
    gold: 40 * (plus + 1) * (plus + 1) * multiplier,
    stones: 1 + Math.floor(plus / 2),
    successRate: SUCCESS_RATE[plus] ?? 0
  };
}

// คืน { ok: false, reason } ถ้าตีไม่ได้
//   reason: "notFound" | "maxed" | "gold" | "stones"
// คืน { ok: true, success, plus } ถ้าตีแล้ว (สำเร็จหรือไม่ก็ได้)
export function upgradeEquipment(uid, rng = Math.random) {
  const item = findEquipment(uid);
  if (!item) return { ok: false, reason: "notFound" };
  if (item.plus >= MAX_PLUS) return { ok: false, reason: "maxed" };

  const cost = getUpgradeCost(item);
  if (state.player.gold < cost.gold) return { ok: false, reason: "gold" };
  if (countMaterial("enhance_stone") < cost.stones) return { ok: false, reason: "stones" };

  addGold(-cost.gold);
  removeMaterial("enhance_stone", cost.stones);

  const success = rng() < cost.successRate;
  if (success) item.plus += 1;

  return { ok: true, success, plus: item.plus };
}
