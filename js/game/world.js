// =====================================================
// js/game/world.js
// "โลก" ในเกม: ผู้เล่น มอนเตอร์ ของดรอป และกติกาทั้งหมด
//
// ไฟล์นี้ไม่แตะ DOM เลย — รับ input + เวลาที่ผ่านไป แล้วคำนวณผล
// ข้อดี: ทดสอบได้โดยไม่ต้องเปิดหน้าจอ และเปลี่ยนวิธีวาดได้โดยไม่กระทบกติกา
//
// updateWorld() คืน "events" ให้ main.js ใช้อัปเดตหน้าจอ / เซฟ / แจ้งเตือน
//   { type: "kill" | "levelUp" | "pickup" | "playerDied" | "respawn" | "travel", ... }
// =====================================================

import { MAPS } from "../../data/maps.js";
import { MONSTERS } from "../../data/monsters.js";
import { ITEMS } from "../systems/itemDatabase.js";
import { createRng, randomRange } from "../systems/rng.js";
import { getPlayerStats, calcDamage } from "../systems/stats.js";
import { rollLoot } from "../systems/loot.js";
import { addLoot } from "../systems/inventory.js";
import { addGold, addPlayerExp } from "../state.js";

// ---------- กติกาของโลก (ปรับสมดุลได้ที่นี่) ----------
export const WORLD_RULES = {
  regenDelay: 4,          // ไม่โดนตีกี่วินาที ถึงเริ่มฟื้นเลือด
  regenPerSecond: 0.03,   // ฟื้นกี่ส่วนของเลือดสูงสุดต่อวินาที
  safeRegenPerSecond: 0.25,
  playerRespawnTime: 3,
  attackArc: Math.PI * 0.75,  // มุมฟันกว้าง 135° ตีโดนหลายตัวได้
  swingDuration: 0.18,
  pickupRadius: 30,
  magnetRadius: 90,
  magnetSpeed: 280,
  dropPopTime: 0.35,      // ของเพิ่งดรอปยังไม่ถูกดูด ให้เห็นว่ามันเด้งออกมา
  dropLifetime: 60,
  leashExtra: 220,        // มอนเตอร์ไล่ออกนอกโซนได้ไกลเท่านี้ แล้วเดินกลับ
  portalRadius: 36        // เดินเข้าใกล้ประตูวาร์ประยะนี้ = ย้ายแผนที่
};

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// =====================================================
// สร้างโลก
// =====================================================
// fromMapId = แผนที่ที่เพิ่งเดินผ่านประตูมา → เกิดข้างประตูฝั่งนั้น (ไม่ระบุ = เกิดที่จุดพัก)
export function createWorld(mapId, rng = Math.random, fromMapId = null) {
  const map = MAPS[mapId];
  const stats = getPlayerStats();
  const start = getArrivalPoint(map, fromMapId);

  const world = {
    map,
    rng,
    time: 0,
    nextId: 1,
    travelTo: null,         // เดินเข้าประตูแล้ว รอ main.js ย้ายแผนที่
    obstacles: generateObstacles(map),
    player: {
      x: start.x,
      y: start.y,
      radius: stats.radius,
      hp: stats.maxHp,
      facing: { x: 1, y: 0 },
      moving: false,
      walkTime: 0,
      attackTimer: 0,
      swingTimer: 0,
      lastHurtAt: -Infinity,
      dead: false,
      respawnTimer: 0
    },
    monsters: [],
    drops: [],
    effects: [],
    events: []
  };

  for (const zone of map.zones) {
    for (let i = 0; i < zone.count; i++) {
      const monster = { id: world.nextId++, defId: zone.monsterId, def: MONSTERS[zone.monsterId], zone };
      placeMonster(world, monster);
      world.monsters.push(monster);
    }
  }

  return world;
}

// ยืนห่างจากประตูกลับไปทางจุดพัก พ้นระยะวาร์ป จะได้ไม่เด้งกลับทันที
function getArrivalPoint(map, fromMapId) {
  const portal = map.portals.find((p) => p.to === fromMapId);
  if (!portal) return { x: map.spawn.x, y: map.spawn.y };

  const dx = map.spawn.x - portal.x;
  const dy = map.spawn.y - portal.y;
  const dist = Math.hypot(dx, dy) || 1;
  const step = WORLD_RULES.portalRadius + 60;
  return { x: portal.x + (dx / dist) * step, y: portal.y + (dy / dist) * step };
}

// ต้นไม้/หินสุ่มจาก seed ของแผนที่ → ได้ตำแหน่งเดิมทุกครั้ง
function generateObstacles(map) {
  const rng = createRng(map.obstacleSeed);
  const obstacles = [];

  const tryPlace = (type, minRadius, maxRadius) => {
    for (let attempt = 0; attempt < 30; attempt++) {
      const radius = randomRange(rng, minRadius, maxRadius);
      const x = randomRange(rng, 40, map.width - 40);
      const y = randomRange(rng, 40, map.height - 40);

      const nearSpawn = Math.hypot(x - map.spawn.x, y - map.spawn.y) < map.safeRadius + radius + 40;
      const nearZoneCenter = map.zones.some((zone) => Math.hypot(x - zone.x, y - zone.y) < 110);
      const nearPortal = map.portals.some((p) => Math.hypot(x - p.x, y - p.y) < WORLD_RULES.portalRadius + radius + 120);
      const overlaps = obstacles.some((o) => Math.hypot(x - o.x, y - o.y) < o.radius + radius + 30);

      if (!nearSpawn && !nearZoneCenter && !nearPortal && !overlaps) {
        obstacles.push({ type, x, y, radius });
        return;
      }
    }
  };

  for (let i = 0; i < map.trees; i++) tryPlace("tree", 22, 32);
  for (let i = 0; i < map.rocks; i++) tryPlace("rock", 14, 24);
  return obstacles;
}

export function isInSafeZone(world, x, y) {
  const { spawn, safeRadius } = world.map;
  return Math.hypot(x - spawn.x, y - spawn.y) < safeRadius;
}

// หาจุดว่างในโซน (ไม่ทับต้นไม้/หิน ไม่อยู่ในเขตปลอดภัย)
function randomPointInZone(world, zone, radius) {
  const { rng, map } = world;
  let point = { x: zone.x, y: zone.y };

  for (let attempt = 0; attempt < 20; attempt++) {
    const angle = rng() * Math.PI * 2;
    const dist = Math.sqrt(rng()) * zone.radius;
    const x = zone.x + Math.cos(angle) * dist;
    const y = zone.y + Math.sin(angle) * dist;

    const inBounds = x > radius && y > radius && x < map.width - radius && y < map.height - radius;
    const blocked = world.obstacles.some((o) => Math.hypot(x - o.x, y - o.y) < o.radius + radius + 4);

    point = { x, y };
    if (inBounds && !blocked && !isInSafeZone(world, x, y)) break;
  }

  return point;
}

function placeMonster(world, monster) {
  const point = randomPointInZone(world, monster.zone, monster.def.radius);

  Object.assign(monster, {
    x: point.x,
    y: point.y,
    homeX: point.x,
    homeY: point.y,
    radius: monster.def.radius,
    hp: monster.def.maxHp,
    mode: "idle",           // idle | chase | return
    wanderTarget: null,
    wanderTimer: randomRange(world.rng, 0.5, 3),
    attackTimer: 0,
    hitFlash: 0,
    lungeTimer: 0,
    dead: false,
    respawnTimer: 0
  });
}

// =====================================================
// การเคลื่อนที่ + ชนสิ่งกีดขวาง
// =====================================================
function moveEntity(world, entity, dx, dy) {
  const { map } = world;

  entity.x = Math.min(map.width - entity.radius, Math.max(entity.radius, entity.x + dx));
  entity.y = Math.min(map.height - entity.radius, Math.max(entity.radius, entity.y + dy));

  // ชนแล้วดันออกตามแนวรัศมี → ตัวละครไถลเลียบต้นไม้ได้ ไม่ติดค้าง
  for (const obstacle of world.obstacles) {
    const ox = entity.x - obstacle.x;
    const oy = entity.y - obstacle.y;
    const dist = Math.hypot(ox, oy);
    const minDist = obstacle.radius + entity.radius;

    if (dist < minDist) {
      const nx = dist === 0 ? 1 : ox / dist;
      const ny = dist === 0 ? 0 : oy / dist;
      entity.x = obstacle.x + nx * minDist;
      entity.y = obstacle.y + ny * minDist;
    }
  }
}

function moveToward(world, entity, target, speed, dt) {
  const dx = target.x - entity.x;
  const dy = target.y - entity.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return dist;

  const step = Math.min(dist, speed * dt);
  moveEntity(world, entity, (dx / dist) * step, (dy / dist) * step);
  return dist;
}

// =====================================================
// อัปเดตทุกเฟรม
// =====================================================
export function updateWorld(world, input, dt) {
  // แท็บค้าง/เครื่องกระตุก → dt ใหญ่มาก จำกัดไว้ไม่ให้มอนเตอร์วาร์ป
  dt = Math.min(dt, 0.1);
  world.time += dt;
  world.events = [];

  const stats = getPlayerStats();

  updatePlayer(world, input, stats, dt);
  updateMonsters(world, stats, dt);
  updateDrops(world, dt);
  updateEffects(world, dt);

  return world.events;
}

// ---------- ผู้เล่น ----------
function updatePlayer(world, input, stats, dt) {
  const player = world.player;

  if (player.dead) {
    player.respawnTimer -= dt;
    if (player.respawnTimer <= 0) {
      player.dead = false;
      player.x = world.map.spawn.x;
      player.y = world.map.spawn.y;
      player.hp = stats.maxHp;
      world.events.push({ type: "respawn" });
    }
    return;
  }

  // ถอดเกราะแล้วเลือดสูงสุดลด → เลือดปัจจุบันต้องไม่เกิน
  player.hp = Math.min(player.hp, stats.maxHp);

  // เดิน
  player.moving = input.moveX !== 0 || input.moveY !== 0;
  if (player.moving) {
    moveEntity(world, player, input.moveX * stats.speed * dt, input.moveY * stats.speed * dt);
    const length = Math.hypot(input.moveX, input.moveY);
    player.facing = { x: input.moveX / length, y: input.moveY / length };
    player.walkTime += dt;
  }

  // เดินเข้าประตูวาร์ป → แจ้ง main.js ครั้งเดียว แล้วรอย้ายแผนที่
  const portal = world.map.portals.find((p) => Math.hypot(player.x - p.x, player.y - p.y) < WORLD_RULES.portalRadius);
  if (portal && !world.travelTo) {
    world.travelTo = portal.to;
    world.events.push({ type: "travel", from: world.map.id, to: portal.to });
  }

  // ฟื้นเลือด (ในเขตปลอดภัยฟื้นเร็ว)
  const inSafeZone = isInSafeZone(world, player.x, player.y);
  if (inSafeZone || world.time - player.lastHurtAt > WORLD_RULES.regenDelay) {
    const rate = inSafeZone ? WORLD_RULES.safeRegenPerSecond : WORLD_RULES.regenPerSecond;
    player.hp = Math.min(stats.maxHp, player.hp + stats.maxHp * rate * dt);
  }

  // โจมตี
  player.attackTimer -= dt;
  player.swingTimer = Math.max(0, player.swingTimer - dt);

  if (input.attack && player.attackTimer <= 0) {
    player.attackTimer = stats.attackCooldown;
    player.swingTimer = WORLD_RULES.swingDuration;
    playerAttack(world, stats);
  }
}

function gapBetween(a, b) {
  return distance(a, b) - a.radius - b.radius;
}

function playerAttack(world, stats) {
  const player = world.player;

  // หันหาเป้าที่ใกล้ที่สุดให้เอง — เล่นบนมือถือไม่ต้องเล็งเป๊ะ
  let nearest = null;
  for (const monster of world.monsters) {
    if (monster.dead || gapBetween(player, monster) > stats.attackRange) continue;
    if (!nearest || distance(player, monster) < distance(player, nearest)) nearest = monster;
  }
  if (nearest) {
    const dist = distance(player, nearest) || 1;
    player.facing = { x: (nearest.x - player.x) / dist, y: (nearest.y - player.y) / dist };
  }

  // ตีโดนทุกตัวในมุมฟันด้านหน้า
  for (const monster of world.monsters) {
    if (monster.dead || gapBetween(player, monster) > stats.attackRange) continue;

    const dist = distance(player, monster) || 1;
    const dot = ((monster.x - player.x) * player.facing.x + (monster.y - player.y) * player.facing.y) / dist;
    const inArc = dot >= Math.cos(WORLD_RULES.attackArc / 2) || dist < player.radius + monster.radius;
    if (!inArc) continue;

    const hit = calcDamage(stats.atk, monster.def.def, world.rng, stats.critChance, stats.critMultiplier);
    damageMonster(world, monster, hit);
  }
}

function damageMonster(world, monster, hit) {
  const player = world.player;

  monster.hp -= hit.amount;
  monster.hitFlash = 0.15;
  monster.mode = "chase"; // โดนตีแล้วโกรธ แม้ผู้เล่นอยู่นอกระยะมองเห็น

  // กระเด็นเล็กน้อย ให้รู้สึกว่าตีโดนจริง
  const dist = distance(player, monster) || 1;
  moveEntity(world, monster, ((monster.x - player.x) / dist) * 8, ((monster.y - player.y) / dist) * 8);

  addEffect(world, {
    text: hit.crit ? hit.amount + "!" : String(hit.amount),
    x: monster.x,
    y: monster.y - monster.radius,
    color: hit.crit ? "#ffd23f" : "#ffffff",
    big: hit.crit
  });

  if (monster.hp <= 0) killMonster(world, monster);
}

function killMonster(world, monster) {
  const { def } = monster;

  monster.dead = true;
  monster.hp = 0;
  monster.respawnTimer = def.respawnTime;

  // ของดรอปกระจายรอบตัวมอนเตอร์
  const loot = rollLoot(def, world.rng);
  const dropAt = () => {
    const angle = world.rng() * Math.PI * 2;
    const dist = randomRange(world.rng, 8, 30);
    return { x: monster.x + Math.cos(angle) * dist, y: monster.y + Math.sin(angle) * dist };
  };

  world.drops.push({ id: world.nextId++, kind: "gold", qty: loot.gold, age: 0, ...dropAt() });
  for (const item of loot.items) {
    world.drops.push({ id: world.nextId++, kind: "item", itemId: item.itemId, qty: item.qty, age: 0, ...dropAt() });
  }

  const levelsGained = addPlayerExp(def.exp);
  addEffect(world, { text: "+" + def.exp + " EXP", x: monster.x, y: monster.y - monster.radius - 18, color: "#a7e9ff" });
  world.events.push({ type: "kill", monsterId: monster.defId, exp: def.exp, boss: Boolean(def.boss) });

  if (levelsGained > 0) {
    world.player.hp = getPlayerStats().maxHp;
    addEffect(world, { text: "LEVEL UP!", x: world.player.x, y: world.player.y - 40, color: "#ffd23f", big: true, life: 1.4 });
    world.events.push({ type: "levelUp", levels: levelsGained });
  }
}

// ---------- มอนเตอร์ ----------
function updateMonsters(world, stats, dt) {
  const player = world.player;
  const playerSafe = player.dead || isInSafeZone(world, player.x, player.y);

  for (const monster of world.monsters) {
    const { def } = monster;

    if (monster.dead) {
      monster.respawnTimer -= dt;
      if (monster.respawnTimer <= 0) placeMonster(world, monster);
      continue;
    }

    monster.hitFlash = Math.max(0, monster.hitFlash - dt);
    monster.lungeTimer = Math.max(0, monster.lungeTimer - dt);
    monster.attackTimer -= dt;

    const home = { x: monster.homeX, y: monster.homeY };
    const leash = monster.zone.radius + WORLD_RULES.leashExtra;
    const gap = gapBetween(monster, player);

    if (monster.mode === "idle") {
      if (!playerSafe && gap < def.aggroRange) {
        monster.mode = "chase";
      } else {
        wander(world, monster, dt);
      }
    }

    if (monster.mode === "chase") {
      if (playerSafe || distance(monster, home) > leash) {
        monster.mode = "return";
      } else if (gap > def.attackRange * 0.6) {
        moveToward(world, monster, player, def.speed, dt);
      }

      if (monster.mode === "chase" && gap <= def.attackRange && monster.attackTimer <= 0) {
        monsterAttack(world, monster, stats);
      }
    }

    if (monster.mode === "return") {
      // กลับบ้านพร้อมฟื้นเลือด กันผู้เล่นตีแล้ววิ่งหนีสลับไปมา
      monster.hp = Math.min(def.maxHp, monster.hp + def.maxHp * 0.3 * dt);
      if (moveToward(world, monster, home, def.speed * 1.3, dt) < 8) {
        monster.mode = "idle";
      }
    }

    // มอนเตอร์เข้าเขตปลอดภัยไม่ได้
    const { spawn, safeRadius } = world.map;
    const fromSpawn = Math.hypot(monster.x - spawn.x, monster.y - spawn.y);
    const minDist = safeRadius + monster.radius;
    if (fromSpawn < minDist) {
      monster.x = spawn.x + ((monster.x - spawn.x) / (fromSpawn || 1)) * minDist;
      monster.y = spawn.y + ((monster.y - spawn.y) / (fromSpawn || 1)) * minDist;
    }
  }
}

function wander(world, monster, dt) {
  monster.wanderTimer -= dt;

  if (monster.wanderTimer <= 0) {
    monster.wanderTimer = randomRange(world.rng, 2, 5);
    const angle = world.rng() * Math.PI * 2;
    const dist = randomRange(world.rng, 20, 80);
    monster.wanderTarget = {
      x: monster.homeX + Math.cos(angle) * dist,
      y: monster.homeY + Math.sin(angle) * dist
    };
  }

  if (monster.wanderTarget) {
    if (moveToward(world, monster, monster.wanderTarget, monster.def.speed * 0.4, dt) < 4) {
      monster.wanderTarget = null;
    }
  }
}

function monsterAttack(world, monster, stats) {
  const player = world.player;

  monster.attackTimer = monster.def.attackCooldown;
  monster.lungeTimer = 0.15;

  const hit = calcDamage(monster.def.atk, stats.def, world.rng);
  player.hp -= hit.amount;
  player.lastHurtAt = world.time;

  addEffect(world, { text: String(hit.amount), x: player.x, y: player.y - player.radius - 10, color: "#ff5c6c" });

  if (player.hp <= 0) {
    player.hp = 0;
    player.dead = true;
    player.respawnTimer = WORLD_RULES.playerRespawnTime;
    world.events.push({ type: "playerDied", killedBy: monster.defId });
  }
}

// ---------- ของดรอป ----------
function updateDrops(world, dt) {
  const player = world.player;

  world.drops = world.drops.filter((drop) => {
    drop.age += dt;
    if (drop.age > WORLD_RULES.dropLifetime) return false;
    if (player.dead || drop.age < WORLD_RULES.dropPopTime) return true;

    const dist = distance(drop, player);

    if (dist < WORLD_RULES.pickupRadius) {
      collectDrop(world, drop);
      return false;
    }

    // เข้าใกล้แล้วของลอยเข้าหาเอง
    if (dist < WORLD_RULES.magnetRadius) {
      const step = Math.min(dist, WORLD_RULES.magnetSpeed * dt);
      drop.x += ((player.x - drop.x) / dist) * step;
      drop.y += ((player.y - drop.y) / dist) * step;
    }
    return true;
  });
}

function collectDrop(world, drop) {
  const { player } = world;

  if (drop.kind === "gold") {
    addGold(drop.qty);
    addEffect(world, { text: "+" + drop.qty + " 🪙", x: player.x, y: player.y - 34, color: "#ffd23f" });
  } else {
    addLoot(drop.itemId, drop.qty);
    const item = ITEMS[drop.itemId];
    addEffect(world, { text: item.icon + " " + item.name + (drop.qty > 1 ? " ×" + drop.qty : ""), x: player.x, y: player.y - 34, color: "#fff8ea" });
  }

  world.events.push({ type: "pickup", kind: drop.kind, itemId: drop.itemId, qty: drop.qty });
}

// ---------- ตัวหนังสือลอย ----------
function addEffect(world, effect) {
  world.effects.push({ age: 0, life: 0.9, big: false, ...effect });
}

function updateEffects(world, dt) {
  world.effects = world.effects.filter((effect) => {
    effect.age += dt;
    return effect.age < effect.life;
  });
}
