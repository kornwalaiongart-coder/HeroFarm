// =====================================================
// js/ui/hud.js
// แถบสถานะบนจอ (ชื่อ, เลเวล, EXP, HP, ทอง, เพชร) + ข้อความแจ้งเตือน
// อ่านจาก state/world อย่างเดียว ไม่ตัดสินใจอะไรเอง
// =====================================================

import { state, getPlayerExpNeeded } from "../state.js";
import { getPlayerStats } from "../systems/stats.js";

const $ = (id) => document.getElementById(id);
const formatNumber = (value) => Math.floor(value).toLocaleString("en-US");

// renderHud ถูกเรียกทุกเฟรม — แก้ DOM เฉพาะตอนค่าเปลี่ยนจริง
let lastKey = "";

export function renderHud(world) {
  const player = state.player;
  const stats = getPlayerStats();
  const hp = Math.ceil(world.player.hp);
  const respawnIn = world.player.dead ? Math.ceil(world.player.respawnTimer) : -1;

  const key = [state.profile?.name, world.map.name, player.level, player.exp, player.gold, player.gem, hp, stats.maxHp, respawnIn].join("|");
  if (key === lastKey) return;
  lastKey = key;

  const expNeeded = getPlayerExpNeeded(player.level);

  $("ui-name").textContent = state.profile?.name ?? "";
  $("ui-map").textContent = world.map.name;
  $("ui-level").textContent = player.level;
  $("ui-gold").textContent = formatNumber(player.gold);
  $("ui-gem").textContent = formatNumber(player.gem);

  $("ui-exp-fill").style.width = Math.min(100, (player.exp / expNeeded) * 100) + "%";
  $("ui-exp-text").textContent = formatNumber(player.exp) + " / " + formatNumber(expNeeded);

  $("ui-hp-fill").style.width = (hp / stats.maxHp) * 100 + "%";
  $("ui-hp-text").textContent = hp + " / " + stats.maxHp;
  $("ui-hp-fill").classList.toggle("low", hp / stats.maxHp < 0.3);

  $("death-overlay").hidden = !world.player.dead;
  $("death-timer").textContent = Math.max(0, respawnIn);
}

// ---------- ข้อความแจ้งเตือนสั้นๆ ----------
const MAX_TOASTS = 3;

export function showToast(message) {
  const layer = $("toast-layer");

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  layer.appendChild(toast);

  // ได้ของรัวๆ ไม่ให้ข้อความท่วมจอ
  while (layer.children.length > MAX_TOASTS) layer.firstChild.remove();

  setTimeout(() => toast.remove(), 2400);
}
