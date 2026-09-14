// =====================================================
// js/systems/characters.js
// ระบบตัวละคร — ระบบเต็มรูปแบบอยู่ Phase 2-3
//
// ตัวละครมี 2 ส่วน:
// - "ข้อมูลในเซฟ"  { id, level, exp }       อยู่ใน state.characters
// - "แม่แบบ"      ชื่อ รูป ค่าฐาน ค่าเติบโต   อยู่ใน data/characters.js
// getCharacterView() รวมสองส่วนนี้ออกมาเป็นตัวละครพร้อมใช้งาน
// =====================================================

import { state, getExpNeeded } from "../state.js";
import { CHARACTER_DEFS } from "../../data/characters.js";

const DEFS_BY_ID = new Map(CHARACTER_DEFS.map((def) => [def.id, def]));

export function getCharacterDef(id) {
  return DEFS_BY_ID.get(id) ?? null;
}

// ---------- คำนวณค่าพลังจากเลเวล ----------
// คืน object ใหม่เสมอ ห้ามเอาไปแก้แล้วหวังว่าจะเซฟ
export function getCharacterView(owned) {
  const def = getCharacterDef(owned.id);
  const growth = owned.level - 1;

  return {
    id: owned.id,
    level: owned.level,
    exp: owned.exp,
    name: def.name,
    image: def.image,
    maxHp: def.baseHp + def.hpPerLevel * growth,
    atk: def.baseAtk + def.atkPerLevel * growth
  };
}

// ---------- เพิ่ม EXP ให้ตัวละคร คืนจำนวนเลเวลที่ขึ้น ----------
// owned = ข้อมูลในเซฟ ค่าพลังจะเพิ่มเองเพราะคำนวณจากเลเวล
// ไฟล์นี้ไม่เซฟเอง — ระบบที่เรียก (เช่น battle) เป็นคนเซฟครั้งเดียวตอนจบ
export function gainExp(owned, amount) {
  owned.exp += amount;

  let levelsGained = 0;

  while (owned.exp >= getExpNeeded(owned.level)) {
    owned.exp -= getExpNeeded(owned.level);
    owned.level += 1;
    levelsGained += 1;
  }

  return levelsGained;
}

// ---------- วาดการ์ดตัวละครทั้งหมด ----------
// onBattle = ฟังก์ชันที่จะถูกเรียกเมื่อกดปุ่มต่อสู้
// main.js เป็นคนบอกว่าจะให้เรียกอะไร ไฟล์นี้จึงไม่ต้องรู้จักระบบต่อสู้เลย
let onBattleHandler = null;

export function setBattleHandler(handler) {
  onBattleHandler = handler;
}

export function renderCharacters() {
  const grid = document.getElementById("characters-grid");
  grid.innerHTML = "";

  state.characters.forEach((owned) => {
    const character = getCharacterView(owned);

    const card = document.createElement("div");
    card.className = "character-card";

    const img = document.createElement("img");
    img.src = character.image;
    img.alt = character.name;
    img.loading = "lazy";

    const nameEl = document.createElement("p");
    nameEl.className = "character-name";
    nameEl.textContent = character.name;

    const levelEl = document.createElement("span");
    levelEl.className = "character-level";
    levelEl.textContent = "Lv. " + character.level;

    const statsEl = document.createElement("p");
    statsEl.className = "exp-text";
    statsEl.textContent = "❤️ " + character.maxHp + "   ⚔️ " + character.atk;

    const expNeeded = getExpNeeded(character.level);
    const expPercent = (character.exp / expNeeded) * 100;

    const expBarTrack = document.createElement("div");
    expBarTrack.className = "exp-bar-track";

    const expBarFill = document.createElement("div");
    expBarFill.className = "exp-bar-fill";
    expBarFill.style.width = expPercent + "%";
    expBarTrack.appendChild(expBarFill);

    const expText = document.createElement("p");
    expText.className = "exp-text";
    expText.textContent = "EXP " + character.exp + " / " + expNeeded;

    const battleBtn = document.createElement("button");
    battleBtn.className = "battle-select-button";
    battleBtn.textContent = "⚔️ ต่อสู้";
    battleBtn.addEventListener("click", () => {
      if (onBattleHandler) onBattleHandler(owned);
    });

    card.append(img, nameEl, levelEl, statsEl, expBarTrack, expText, battleBtn);
    grid.appendChild(card);
  });
}
