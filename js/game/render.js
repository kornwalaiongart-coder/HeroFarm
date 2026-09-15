// =====================================================
// js/game/render.js
// วาดโลกลง <canvas> — อ่านอย่างเดียว ไม่เปลี่ยนค่าใดๆ ใน world
//
// ตัวละคร/มอนเตอร์วาดด้วยรูปทรงง่ายๆ ไปก่อน
// มีรูป sprite จริงเมื่อไหร่ แก้แค่ฟังก์ชัน drawPlayer / drawMonster
// =====================================================

import { ITEMS, RARITIES } from "../systems/itemDatabase.js";
import { MAPS } from "../../data/maps.js";
import { WORLD_RULES } from "./world.js";

const TILE = 80;

// สีของแต่ละธีมแผนที่ (map.theme)   tufts = ลายพื้นเป็นพุ่มหญ้า (ไม่งั้นเป็นก้อนกรวด)
const THEMES = {
  grass: {
    border: "#4b7a3a", ground: "#8fcf6a", alt: "#86c562", detail: "#5f9e45", tufts: true,
    trunk: "#7a5230", tree: "#3f8a3a", treeLight: "#56a84a", rock: "#8d8a86", rockLight: "#b3afa9"
  },
  forest: {
    border: "#1f3a1c", ground: "#5a9444", alt: "#548c3f", detail: "#3d6e2e", tufts: true,
    trunk: "#5e3d22", tree: "#2a6a2e", treeLight: "#3f873c", rock: "#7a7670", rockLight: "#9d9890"
  },
  cave: {
    border: "#120e16", ground: "#4b4452", alt: "#463f4d", detail: "#3a3440", tufts: false,
    trunk: "#4a3a2a", tree: "#3b3444", treeLight: "#4d4558", rock: "#6d6378", rockLight: "#90859e"
  },
  desert: {
    border: "#a97c40", ground: "#e9cb8c", alt: "#e3c281", detail: "#c9a263", tufts: false,
    trunk: "#7a5230", tree: "#5f9b4a", treeLight: "#79b760", rock: "#b08a5f", rockLight: "#d0ad82"
  }
};

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

    const theme = THEMES[world.map.theme] ?? THEMES.grass;
    drawGround(ctx, world, camera, view, theme);
    drawSafeZone(ctx, world);
    drawPortals(ctx, world);
    drawZoneLabels(ctx, world);
    for (const drop of world.drops) drawDrop(ctx, drop);

    // วาดตามแกน y: อะไรอยู่ต่ำกว่าบนจอ บังสิ่งที่อยู่สูงกว่า
    const sprites = [
      ...world.obstacles.map((o) => ({ y: o.y, draw: () => drawObstacle(ctx, o, theme) })),
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
function drawGround(ctx, world, camera, view, theme) {
  const { map } = world;
  ctx.fillStyle = theme.border;
  ctx.fillRect(camera.x, camera.y, view.width, view.height);
  ctx.fillStyle = theme.ground;
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
        ctx.fillStyle = theme.alt;
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
      // ลายพื้นเล็กๆ ตำแหน่งคงที่ต่อช่อง: พุ่มหญ้า หรือ ก้อนกรวด
      if ((hash & 3) === 0) {
        const gx = tx * TILE + (hash >>> 4) % 60 + 10;
        const gy = ty * TILE + (hash >>> 10) % 60 + 10;
        if (theme.tufts) {
          ctx.strokeStyle = theme.detail;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(gx - 4, gy); ctx.lineTo(gx - 6, gy - 7);
          ctx.moveTo(gx, gy); ctx.lineTo(gx, gy - 9);
          ctx.moveTo(gx + 4, gy); ctx.lineTo(gx + 6, gy - 7);
          ctx.stroke();
        } else {
          ctx.fillStyle = theme.detail;
          ctx.beginPath();
          ctx.ellipse(gx, gy, 5, 3, 0, 0, Math.PI * 2);
          ctx.ellipse(gx + 9, gy + 4, 3, 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
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

// ---------- ประตูวาร์ป ----------
function drawPortals(ctx, world) {
  const radius = WORLD_RULES.portalRadius;

  for (const portal of world.map.portals) {
    const target = MAPS[portal.to];
    const pulse = radius * (1 + Math.sin(world.time * 3) * 0.08);

    const glow = ctx.createRadialGradient(portal.x, portal.y, 4, portal.x, portal.y, pulse);
    glow.addColorStop(0, "#ffffffee");
    glow.addColorStop(0.45, "#b38cffcc");
    glow.addColorStop(1, "#6a3fd400");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(portal.x, portal.y, pulse, 0, Math.PI * 2);
    ctx.fill();

    // เส้นประหมุนรอบประตู
    ctx.strokeStyle = "#e3d4ff";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -world.time * 20;
    ctx.beginPath();
    ctx.arc(portal.x, portal.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    // ประตูชิดขอบแผนที่ → ขยับป้ายเข้ามาไม่ให้ตกขอบ
    const labelX = Math.min(world.map.width - 90, Math.max(90, portal.x));
    drawLabel(ctx, "🌀 " + target.name, labelX, portal.y - radius - 26, "#fff8ea", 13);
    drawLabel(ctx, "แนะนำ Lv." + target.level + "+", labelX, portal.y - radius - 10, "#e3d4ff", 11);
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
function drawObstacle(ctx, obstacle, theme) {
  const { x, y, radius } = obstacle;
  drawShadow(ctx, x, y, radius);

  if (obstacle.type === "tree") {
    ctx.fillStyle = theme.trunk;
    ctx.fillRect(x - radius * 0.2, y - radius * 0.2, radius * 0.4, radius);
    ctx.fillStyle = theme.tree;
    ctx.beginPath();
    ctx.arc(x, y - radius * 0.7, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.treeLight;
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius, radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = theme.rock;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.rockLight;
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.3, y - radius * 0.25, radius * 0.4, radius * 0.25, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------- มอนเตอร์ ----------
function drawMonster(ctx, monster, time) {
  const { x, y, radius, def } = monster;
  drawShadow(ctx, x, y, radius);

  // ขยับขึ้นลงเบาๆ (สไลม์เด้งแรงกว่า) / ค้างคาวบินลอย / พุ่งตอนโจมตี
  const bounce = Math.sin(time * 6 + monster.id) * (monster.defId === "slime" ? 0.08 : 0.03);
  const lift = monster.defId === "bat" ? 8 + Math.sin(time * 8 + monster.id) * 4 : 0;
  const lunge = monster.lungeTimer > 0 ? 1.15 : 1;

  ctx.save();
  ctx.translate(x, y - lift);
  ctx.scale((1 + bounce) * lunge, (1 - bounce) * lunge);

  // กำลังไล่ผู้เล่น = วงแดงรอบตัว
  if (monster.mode === "chase") {
    ctx.strokeStyle = "#ff3b3b99";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.1, 0, Math.PI * 2);
    ctx.stroke();
  }

  // อีโมจิสีใช้ความโปร่งใสของ fillStyle ด้วย → ต้องตั้งสีทึบก่อน (ไม่งั้นจางตามเงา)
  ctx.fillStyle = "#000000";
  ctx.font = `${Math.round(radius * 2)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(def.icon, 0, radius * 0.1);

  if (def.boss) {
    ctx.font = `${Math.round(radius * 0.9)}px sans-serif`;
    ctx.fillText("👑", 0, -radius * 1.05);
  }

  if (monster.hitFlash > 0) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ชื่อ + หลอดเลือด แสดงเมื่อโดนตี / กำลังไล่ / เป็นบอส
  if (def.boss || monster.hp < def.maxHp || monster.mode === "chase") {
    const barWidth = Math.max(36, radius * 2);
    const top = y - lift - radius * (def.boss ? 1.6 : 1) - 14;
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
  ctx.fillStyle = RARITIES[item.rarity].color + "66";
  ctx.beginPath();
  ctx.arc(drop.x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000000"; // สีทึบ ไม่งั้นไอคอนจางตามวงสีด้านหลัง
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
