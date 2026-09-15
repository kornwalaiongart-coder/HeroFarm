// =====================================================
// js/game/render.js
// วาดโลกลง <canvas> — อ่านอย่างเดียว ไม่เปลี่ยนค่าใดๆ ใน world
//
// ตัวละคร/มอนเตอร์วาดด้วยรูปทรงง่ายๆ ไปก่อน
// มีรูป sprite จริงเมื่อไหร่ แก้แค่ฟังก์ชัน drawPlayer / drawMonster
// =====================================================

import { ITEMS, RARITY } from "../../data/items.js";
import { WORLD_RULES } from "./world.js";

const TILE = 80;

const PLAYER_LOOK = {
  male: { shirt: "#4f7bd9", shirtDark: "#3a5fb0", hair: "#5b3a1e" },
  female: { shirt: "#e56b9f", shirtDark: "#bf4f80", hair: "#8a4b2a" }
};

export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  const view = { width: 0, height: 0 };

  // ปรับขนาดตามกล่องที่ครอบ + ความละเอียดจอ (จอ Retina ไม่เบลอ)
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    view.width = rect.width;
    view.height = rect.height;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(world, profile) {
    if (view.width === 0) resize();

    const camera = getCamera(world, view);
    ctx.save();
    ctx.clearRect(0, 0, view.width, view.height);
    ctx.translate(-camera.x, -camera.y);

    drawGround(ctx, world, camera, view);
    drawSafeZone(ctx, world);
    drawZoneLabels(ctx, world);
    for (const drop of world.drops) drawDrop(ctx, drop);

    // วาดตามแกน y: อะไรอยู่ต่ำกว่าบนจอ บังสิ่งที่อยู่สูงกว่า
    const sprites = [
      ...world.obstacles.map((o) => ({ y: o.y, draw: () => drawObstacle(ctx, o) })),
      ...world.monsters.filter((m) => !m.dead).map((m) => ({ y: m.y, draw: () => drawMonster(ctx, m, world.time) })),
      { y: world.player.y, draw: () => drawPlayer(ctx, world.player, profile) }
    ].sort((a, b) => a.y - b.y);
    for (const sprite of sprites) sprite.draw();

    for (const effect of world.effects) drawEffect(ctx, effect);
    ctx.restore();
  }

  return { resize, draw };
}

// กล้องตามผู้เล่น แต่ไม่เลยขอบแผนที่
function getCamera(world, view) {
  const { map, player } = world;
  const clamp = (value, max) => (max <= 0 ? max / 2 : Math.min(max, Math.max(0, value)));

  return {
    x: clamp(player.x - view.width / 2, map.width - view.width),
    y: clamp(player.y - view.height / 2, map.height - view.height)
  };
}

// ---------- พื้น ----------
function drawGround(ctx, world, camera, view) {
  const { map } = world;
  ctx.fillStyle = "#4b7a3a";
  ctx.fillRect(camera.x, camera.y, view.width, view.height);
  ctx.fillStyle = map.groundColor;
  ctx.fillRect(0, 0, map.width, map.height);

  // วาดเฉพาะช่องที่อยู่ในจอ
  const startX = Math.max(0, Math.floor(camera.x / TILE));
  const startY = Math.max(0, Math.floor(camera.y / TILE));
  const endX = Math.min(Math.ceil(map.width / TILE), Math.ceil((camera.x + view.width) / TILE));
  const endY = Math.min(Math.ceil(map.height / TILE), Math.ceil((camera.y + view.height) / TILE));

  for (let tx = startX; tx < endX; tx++) {
    for (let ty = startY; ty < endY; ty++) {
      const hash = (tx * 73856093) ^ (ty * 19349663);
      if ((tx + ty) % 2 === 0) {
        ctx.fillStyle = map.groundAltColor;
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
      // พุ่มหญ้าเล็กๆ ตำแหน่งคงที่ต่อช่อง
      if ((hash & 3) === 0) {
        const gx = tx * TILE + (hash >>> 4) % 60 + 10;
        const gy = ty * TILE + (hash >>> 10) % 60 + 10;
        ctx.strokeStyle = "#5f9e45";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gx - 4, gy); ctx.lineTo(gx - 6, gy - 7);
        ctx.moveTo(gx, gy); ctx.lineTo(gx, gy - 9);
        ctx.moveTo(gx + 4, gy); ctx.lineTo(gx + 6, gy - 7);
        ctx.stroke();
      }
    }
  }
}

function drawSafeZone(ctx, world) {
  const { spawn, safeRadius } = world.map;

  ctx.fillStyle = "#f3dfa8aa";
  ctx.beginPath();
  ctx.arc(spawn.x, spawn.y, safeRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = "#c9a45c";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.setLineDash([]);

  drawLabel(ctx, "🏕️ จุดพัก (ปลอดภัย)", spawn.x, spawn.y - safeRadius + 26, "#6b4a1f", 13);
}

function drawZoneLabels(ctx, world) {
  for (const zone of world.map.zones) {
    drawLabel(ctx, zone.label, zone.x, zone.y - 50, "#ffffffcc", 14);
  }
}

function drawLabel(ctx, text, x, y, color, size) {
  ctx.font = `800 ${size}px "Baloo 2", "Nunito", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#00000055";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawShadow(ctx, x, y, radius) {
  ctx.fillStyle = "#00000030";
  ctx.beginPath();
  ctx.ellipse(x, y + radius * 0.8, radius * 0.9, radius * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- ต้นไม้ / หิน ----------
function drawObstacle(ctx, obstacle) {
  const { x, y, radius } = obstacle;
  drawShadow(ctx, x, y, radius);

  if (obstacle.type === "tree") {
    ctx.fillStyle = "#7a5230";
    ctx.fillRect(x - radius * 0.2, y - radius * 0.2, radius * 0.4, radius);
    ctx.fillStyle = "#3f8a3a";
    ctx.beginPath();
    ctx.arc(x, y - radius * 0.7, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#56a84a";
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius, radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#8d8a86";
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b3afa9";
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.3, y - radius * 0.25, radius * 0.4, radius * 0.25, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------- มอนเตอร์ ----------
function drawMonster(ctx, monster, time) {
  const { x, y, radius, def } = monster;
  drawShadow(ctx, x, y, radius);

  // สไลม์เด้งดึ๋ง / ตัวอื่นขยับเล็กน้อย / พุ่งตอนโจมตี
  const bounce = monster.defId === "slime" ? Math.sin(time * 6 + monster.id) * 0.08 : 0;
  const lunge = monster.lungeTimer > 0 ? 1.12 : 1;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale((1 + bounce) * lunge, (1 - bounce) * lunge);

  ctx.fillStyle = def.color;
  if (monster.defId === "golem") {
    roundRect(ctx, -radius, -radius, radius * 2, radius * 2, 8);
    ctx.fill();
    ctx.fillStyle = "#00000022";
    ctx.fillRect(-radius, radius * 0.2, radius * 2, radius * 0.25);
  } else {
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * (monster.defId === "slime" ? 0.85 : 1), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (monster.defId === "wolf") {
    ctx.beginPath();
    ctx.moveTo(-radius * 0.8, -radius * 0.4); ctx.lineTo(-radius * 0.5, -radius * 1.3); ctx.lineTo(-radius * 0.1, -radius * 0.7);
    ctx.moveTo(radius * 0.8, -radius * 0.4); ctx.lineTo(radius * 0.5, -radius * 1.3); ctx.lineTo(radius * 0.1, -radius * 0.7);
    ctx.fill();
  }

  // ตา: โกรธ = สีแดง
  ctx.fillStyle = monster.mode === "chase" ? "#ff3b3b" : "#2d1b4e";
  ctx.beginPath();
  ctx.arc(-radius * 0.35, -radius * 0.15, radius * 0.13, 0, Math.PI * 2);
  ctx.arc(radius * 0.35, -radius * 0.15, radius * 0.13, 0, Math.PI * 2);
  ctx.fill();

  if (monster.hitFlash > 0) {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ชื่อ + หลอดเลือด แสดงเมื่อโดนตีหรือกำลังไล่
  if (monster.hp < def.maxHp || monster.mode === "chase") {
    const barWidth = Math.max(36, radius * 2);
    const top = y - radius - 14;
    ctx.fillStyle = "#2d1b4ecc";
    ctx.fillRect(x - barWidth / 2, top, barWidth, 6);
    ctx.fillStyle = "#ff5c6c";
    ctx.fillRect(x - barWidth / 2 + 1, top + 1, (barWidth - 2) * (monster.hp / def.maxHp), 4);
    drawLabel(ctx, `Lv.${def.level} ${def.name}`, x, top - 9, "#fff8ea", 11);
  }
}

// ---------- ผู้เล่น ----------
function drawPlayer(ctx, player, profile) {
  const look = PLAYER_LOOK[profile?.gender] ?? PLAYER_LOOK.male;
  const { x, facing } = player;
  const bob = player.moving ? Math.abs(Math.sin(player.walkTime * 12)) * 3 : 0;
  const y = player.y - bob;

  ctx.save();
  if (player.dead) ctx.globalAlpha = 0.35;

  drawShadow(ctx, x, player.y, player.radius);

  // ดาบ: ปกติถือข้างตัว ตอนฟันกวาดเป็นส่วนโค้ง
  const baseAngle = Math.atan2(facing.y, facing.x);
  const swingProgress = player.swingTimer > 0 ? 1 - player.swingTimer / WORLD_RULES.swingDuration : null;
  const swordAngle = swingProgress === null
    ? baseAngle + 0.9
    : baseAngle - WORLD_RULES.attackArc / 2 + WORLD_RULES.attackArc * swingProgress;

  if (swingProgress !== null) {
    ctx.fillStyle = "#ffffff55";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, 58, baseAngle - WORLD_RULES.attackArc / 2, swordAngle);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = "#dfe6ee";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(swordAngle) * 12, y + Math.sin(swordAngle) * 12);
  ctx.lineTo(x + Math.cos(swordAngle) * 34, y + Math.sin(swordAngle) * 34);
  ctx.stroke();

  // ผมยาวด้านหลัง (ตัวละครหญิง)
  if (profile?.gender === "female") {
    ctx.fillStyle = look.hair;
    roundRect(ctx, x - 11, y - 24, 22, 26, 8);
    ctx.fill();
  }

  // ลำตัว
  ctx.fillStyle = look.shirt;
  roundRect(ctx, x - 11, y - 6, 22, 20, 8);
  ctx.fill();
  ctx.fillStyle = look.shirtDark;
  ctx.fillRect(x - 11, y + 6, 22, 4);

  // หัว
  ctx.fillStyle = "#ffd9b3";
  ctx.beginPath();
  ctx.arc(x, y - 16, 11, 0, Math.PI * 2);
  ctx.fill();

  // ผมด้านบน
  ctx.fillStyle = look.hair;
  ctx.beginPath();
  ctx.arc(x, y - 18, 11.5, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();
  if (profile?.gender === "female") {
    ctx.fillStyle = "#ff8fb1";
    ctx.beginPath();
    ctx.arc(x + 8, y - 27, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ตามองไปทางที่หัน
  ctx.fillStyle = "#2d1b4e";
  const eyeX = facing.x * 3;
  const eyeY = Math.max(-1, facing.y * 2);
  ctx.beginPath();
  ctx.arc(x - 4 + eyeX, y - 15 + eyeY, 1.6, 0, Math.PI * 2);
  ctx.arc(x + 4 + eyeX, y - 15 + eyeY, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  if (profile) drawLabel(ctx, profile.name, x, player.y + 26, "#fff8ea", 12);
}

// ---------- ของดรอป ----------
function drawDrop(ctx, drop) {
  // เด้งออกมาตอนเพิ่งดรอป / กะพริบเมื่อใกล้หายไป
  const pop = drop.age < WORLD_RULES.dropPopTime ? Math.sin((drop.age / WORLD_RULES.dropPopTime) * Math.PI) * 14 : 0;
  const expiring = WORLD_RULES.dropLifetime - drop.age < 10;
  if (expiring && Math.floor(drop.age * 6) % 2 === 0) return;

  const y = drop.y - pop;
  drawShadow(ctx, drop.x, drop.y, 7);

  if (drop.kind === "gold") {
    ctx.fillStyle = "#f5b82e";
    ctx.beginPath();
    ctx.arc(drop.x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe89a";
    ctx.beginPath();
    ctx.arc(drop.x - 2, y - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const item = ITEMS[drop.itemId];
  ctx.fillStyle = RARITY[item.rarity].color + "66";
  ctx.beginPath();
  ctx.arc(drop.x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(item.icon, drop.x, y + 1);
}

// ---------- ตัวเลขดาเมจ / ข้อความลอย ----------
function drawEffect(ctx, effect) {
  const progress = effect.age / effect.life;
  ctx.save();
  ctx.globalAlpha = 1 - Math.max(0, progress - 0.5) * 2;
  drawLabel(ctx, effect.text, effect.x, effect.y - progress * 34, effect.color, effect.big ? 20 : 14);
  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}
