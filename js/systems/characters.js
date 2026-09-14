// =====================================================
// js/systems/characters.js
// ย้ายมาจาก game.js เดิม (ขั้นตอนที่ 7 และ 8)
// ยังไม่เพิ่มความสามารถใหม่ — ระบบตัวละครเต็มรูปแบบอยู่ Phase 2-3
//
// เปลี่ยนแค่ 2 อย่าง:
// 1. อ่านตัวละครจาก state แทนตัวแปร characterList
// 2. เซฟทุกครั้งที่ตัวละครเปลี่ยนแปลง
// =====================================================

import { state, getExpNeeded } from "../state.js";
import { saveGame } from "../save.js";

// ---------- เพิ่ม EXP ให้ตัวละคร คืนจำนวนเลเวลที่ขึ้น ----------
export function gainExp(character, amount) {
  character.exp += amount;

  let levelsGained = 0;

  while (character.exp >= getExpNeeded(character.level)) {
    character.exp -= getExpNeeded(character.level);
    character.level += 1;
    character.maxHp += 5;
    character.atk += 2;
    levelsGained += 1;
  }

  if (levelsGained > 0) saveGame();

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

  state.characters.forEach((character) => {
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
      if (onBattleHandler) onBattleHandler(character);
    });

    card.append(img, nameEl, levelEl, expBarTrack, expText, battleBtn);
    grid.appendChild(card);
  });
}
