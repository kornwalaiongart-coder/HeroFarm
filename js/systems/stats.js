// =====================================================
// js/systems/stats.js
// คำนวณค่าพลังผู้เล่น และสูตรดาเมจ
//
// ค่าพลังไม่ถูกเก็บในเซฟ — คำนวณใหม่ทุกครั้งจาก
// เลเวลผู้เล่น + อุปกรณ์ที่สวมอยู่ (รวมระดับตีบวก)
// =====================================================

import { state } from "../state.js";
import { ITEMS } from "./itemDatabase.js";
import { findEquipment } from "./inventory.js";

// ---------- ค่าพลังพื้นฐานของผู้เล่น (ปรับสมดุลได้ที่นี่) ----------
export const PLAYER_BASE = {
  hp: 100,
  hpPerLevel: 12,
  atk: 10,
  atkPerLevel: 2,
  def: 2,
  defPerLevel: 1,

  speed: 150,           // พิกเซล/วินาที
  radius: 16,
  attackRange: 62,
  attackCooldown: 0.45, // วินาที
  critChance: 0.1,
  critMultiplier: 1.5
};

// ---------- ค่าพลังที่อุปกรณ์ชิ้นหนึ่งให้ ----------
// อ่านจาก Item Database: stats + statsPerPlus × ระดับตีบวก
// (critical / attackSpeed / criticalResistance ยังไม่ใช้ในการต่อสู้ตอนนี้)
export function getEquipmentStats(item) {
  const def = ITEMS[item.itemId];
  return {
    atk: def.stats.attack + def.statsPerPlus.attack * item.plus,
    def: def.stats.defense + def.statsPerPlus.defense * item.plus,
    hp: def.stats.hp + def.statsPerPlus.hp * item.plus
  };
}

// ---------- ค่าพลังรวมของผู้เล่นตอนนี้ ----------
export function getPlayerStats() {
  const growth = state.player.level - 1;

  const stats = {
    ...PLAYER_BASE,
    maxHp: PLAYER_BASE.hp + PLAYER_BASE.hpPerLevel * growth,
    atk: PLAYER_BASE.atk + PLAYER_BASE.atkPerLevel * growth,
    def: PLAYER_BASE.def + PLAYER_BASE.defPerLevel * growth
  };

  for (const uid of Object.values(state.equipped)) {
    const item = uid === null ? null : findEquipment(uid);
    if (!item) continue;

    const bonus = getEquipmentStats(item);
    stats.atk += bonus.atk;
    stats.def += bonus.def;
    stats.maxHp += bonus.hp;
  }

  return stats;
}

// ---------- สูตรดาเมจ ----------
// ดาเมจ = ATK × (0.9–1.1) − DEF ÷ 2   (ต่ำสุด 1)
// critChance = 0 สำหรับมอนเตอร์ (มอนเตอร์ไม่คริ)
export function calcDamage(atk, def, rng = Math.random, critChance = 0, critMultiplier = 1.5) {
  const crit = rng() < critChance;
  let amount = atk * (0.9 + rng() * 0.2);
  if (crit) amount *= critMultiplier;
  amount -= def / 2;

  return { amount: Math.max(1, Math.round(amount)), crit };
}
