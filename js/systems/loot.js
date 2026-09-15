// =====================================================
// js/systems/loot.js
// สุ่มของดรอปเมื่อมอนเตอร์ตาย
// ไม่แตะ state — แค่บอกว่าดรอปอะไร ส่วนการเก็บเข้ากระเป๋าอยู่ที่ world
// =====================================================

import { randomInt } from "./rng.js";

// คืน { gold, items: [{ itemId, qty }] }
export function rollLoot(monsterDef, rng = Math.random) {
  const gold = randomInt(rng, monsterDef.gold[0], monsterDef.gold[1]);
  const items = [];

  for (const drop of monsterDef.drops) {
    if (rng() >= drop.chance) continue;

    const qty = drop.qty ? randomInt(rng, drop.qty[0], drop.qty[1]) : 1;
    items.push({ itemId: drop.itemId, qty });
  }

  return { gold, items };
}
