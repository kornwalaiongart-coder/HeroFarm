// =====================================================
// js/systems/battle.js
// ย้ายมาจาก game.js เดิม (ขั้นตอนที่ 10-13)
// ระบบต่อสู้ของจริง (ทีม 4 ตัว, ธาตุ, สกิล, บอส) จะสร้างใหม่ใน Phase 6
//
// กติกา:
// 1. เริ่มต่อสู้ต้องเสียพลังงาน
// 2. ชนะแล้วได้ทอง + EXP ทั้งตัวละครและผู้เล่น
// 3. ระหว่างต่อสู้ล็อกเมนู ออกได้ทางเดียวคือ "ถอยหนี" (นับเป็นแพ้ ไม่คืนพลังงาน)
// =====================================================

import { CONFIG, spendEnergy, addGold, addPlayerExp } from "../state.js";
import { ENEMY_LIST } from "../../data/enemies.js";
import { gainExp, getCharacterView } from "./characters.js";
import { showScreen, setNavigationGuard } from "../router.js";
import { renderTopBar, showToast } from "../ui.js";
import { saveGame } from "../save.js";

let ownedCharacter = null; // ข้อมูลในเซฟ (id/level/exp) ใช้ตอนให้ EXP
let currentPlayer = null;  // ค่าพลังที่คำนวณไว้ตอนเริ่ม ใช้ตลอดการต่อสู้
let currentEnemy = null;
let playerCurrentHp = 0;
let enemyCurrentHp = 0;

// true ระหว่างที่การต่อสู้ยังไม่จบ
let battleActive = false;
// เปลี่ยนทุกครั้งที่การต่อสู้เริ่มหรือจบ
// handleAttack ใช้เช็คว่าระหว่างรอแอนิเมชัน ผู้เล่นถอยหนีไปแล้วหรือยัง
let battleToken = 0;

function setBattleActive(active) {
  battleActive = active;
  battleToken += 1;

  document.getElementById("menu-bar").classList.toggle("locked", active);
  document.getElementById("battle-back-btn").textContent =
    active ? "🏳️ ถอยหนี (นับเป็นแพ้)" : "← กลับหน้าตัวละคร";
}

// ---------- เริ่มต่อสู้ ----------
export function startBattle(owned) {
  if (!spendEnergy(CONFIG.BATTLE_ENERGY_COST)) {
    showToast("พลังงานไม่พอ ต้องใช้ " + CONFIG.BATTLE_ENERGY_COST + " หน่วย");
    return;
  }

  renderTopBar();
  saveGame();

  ownedCharacter = owned;
  currentPlayer = getCharacterView(owned);
  playerCurrentHp = currentPlayer.maxHp;

  currentEnemy = ENEMY_LIST[Math.floor(Math.random() * ENEMY_LIST.length)];
  enemyCurrentHp = currentEnemy.maxHp;

  updateBattleUI();

  document.getElementById("turn-indicator").textContent = "ตาของคุณ ⚔️";
  document.getElementById("battle-log").textContent =
    "พบ " + currentEnemy.name + "! กดปุ่มโจมตีเพื่อเริ่มต่อสู้";
  document.getElementById("attack-btn").disabled = false;

  showScreen("battle-screen");
  setBattleActive(true);
}

// ---------- อัปเดตรูป ชื่อ หลอดเลือด ----------
function updateBattleUI() {
  document.getElementById("battle-player-image").src = currentPlayer.image;
  document.getElementById("battle-player-name").textContent =
    currentPlayer.name + " (Lv." + currentPlayer.level + ")";
  document.getElementById("battle-player-hp-text").textContent =
    playerCurrentHp + " / " + currentPlayer.maxHp;
  document.getElementById("battle-player-hp-fill").style.width =
    (playerCurrentHp / currentPlayer.maxHp) * 100 + "%";

  document.getElementById("battle-enemy-image").src = currentEnemy.image;
  document.getElementById("battle-enemy-name").textContent = currentEnemy.name;
  document.getElementById("battle-enemy-hp-text").textContent =
    enemyCurrentHp + " / " + currentEnemy.maxHp;
  document.getElementById("battle-enemy-hp-fill").style.width =
    (enemyCurrentHp / currentEnemy.maxHp) * 100 + "%";
}

// ---------- ฟังก์ชันช่วยเรื่องเอฟเฟกต์ (ของเดิม) ----------
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function showDamagePopup(sideElement, damageAmount) {
  const popup = document.createElement("span");
  popup.className = "damage-popup";
  popup.textContent = "-" + damageAmount;
  sideElement.appendChild(popup);
  setTimeout(() => popup.remove(), 800);
}

function playAttackAnimation(imageElement) {
  imageElement.classList.add("attack-anim");
  setTimeout(() => imageElement.classList.remove("attack-anim"), 300);
}

function playHitAnimation(imageElement) {
  imageElement.classList.add("hit-shake");
  setTimeout(() => imageElement.classList.remove("hit-shake"), 400);
}

// ---------- ปุ่มโจมตี ----------
async function handleAttack() {
  if (!battleActive) return;

  // ถ้าระหว่าง await ผู้เล่นถอยหนี token จะเปลี่ยน → หยุดทันที ไม่ให้รางวัลย้อนหลัง
  const token = battleToken;
  const cancelled = () => token !== battleToken;

  const attackButton = document.getElementById("attack-btn");
  const turnIndicator = document.getElementById("turn-indicator");
  const battleLog = document.getElementById("battle-log");

  attackButton.disabled = true;

  const playerImage = document.getElementById("battle-player-image");
  const enemyImage = document.getElementById("battle-enemy-image");
  const playerSide = playerImage.closest(".battle-side");
  const enemySide = enemyImage.closest(".battle-side");

  // ----- ตาของผู้เล่น -----
  turnIndicator.textContent = "ตาของคุณ ⚔️";
  playAttackAnimation(playerImage);
  await wait(200);
  if (cancelled()) return;

  enemyCurrentHp = Math.max(0, enemyCurrentHp - currentPlayer.atk);

  showDamagePopup(enemySide, currentPlayer.atk);
  playHitAnimation(enemyImage);
  updateBattleUI();

  let logText =
    currentPlayer.name + " โจมตี " + currentEnemy.name +
    " ทำดาเมจ " + currentPlayer.atk + " แต้ม";
  battleLog.textContent = logText;

  await wait(700);
  if (cancelled()) return;

  // ----- ชนะ -----
  if (enemyCurrentHp <= 0) {
    const charLevels = gainExp(ownedCharacter, currentEnemy.expReward);
    const playerLevels = addPlayerExp(currentEnemy.expReward);
    addGold(currentEnemy.goldReward);

    logText += "\n🎉 ชนะการต่อสู้! ได้รับ EXP +" + currentEnemy.expReward +
               " และทอง +" + currentEnemy.goldReward;

    if (charLevels > 0) {
      logText += "\n✨ " + currentPlayer.name + " เลเวลอัพเป็น Lv." + ownedCharacter.level;
    }
    if (playerLevels > 0) {
      logText += "\n🌟 ผู้เล่นเลเวลอัพ! พลังงานสูงสุดเพิ่มขึ้นและเติมเต็มแล้ว";
    }

    battleLog.textContent = logText;
    turnIndicator.textContent = "จบการต่อสู้ 🏆";

    setBattleActive(false);
    renderTopBar();
    saveGame();
    return;
  }

  // ----- ตาของศัตรู -----
  turnIndicator.textContent = "ตาของศัตรู 👹";
  await wait(400);
  if (cancelled()) return;

  playAttackAnimation(enemyImage);
  await wait(200);
  if (cancelled()) return;

  playerCurrentHp = Math.max(0, playerCurrentHp - currentEnemy.atk);

  showDamagePopup(playerSide, currentEnemy.atk);
  playHitAnimation(playerImage);
  updateBattleUI();

  logText += "\n" + currentEnemy.name + " โจมตีกลับ ทำดาเมจ " + currentEnemy.atk + " แต้ม";
  battleLog.textContent = logText;

  await wait(700);
  if (cancelled()) return;

  // ----- แพ้ -----
  if (playerCurrentHp <= 0) {
    logText += "\n💀 พ่ายแพ้! ลองฝึกฝนแล้วกลับมาใหม่อีกครั้ง";
    battleLog.textContent = logText;
    turnIndicator.textContent = "จบการต่อสู้ 💀";
    setBattleActive(false);
    return;
  }

  turnIndicator.textContent = "ตาของคุณ ⚔️";
  attackButton.disabled = false;
}

// ---------- ปุ่มด้านบนซ้าย: ถอยหนีระหว่างสู้ / กลับเมื่อสู้จบ ----------
function handleBackButton() {
  if (!battleActive) {
    showScreen("characters-screen");
    return;
  }

  setBattleActive(false);
  document.getElementById("attack-btn").disabled = true;
  document.getElementById("turn-indicator").textContent = "ถอยหนี 🏳️";
  document.getElementById("battle-log").textContent +=
    "\n🏳️ ถอยหนีจากการต่อสู้ (พลังงานที่ใช้ไปไม่คืน)";
}

export function initBattle() {
  document.getElementById("attack-btn").addEventListener("click", handleAttack);
  document.getElementById("battle-back-btn").addEventListener("click", handleBackButton);

  // ห้ามเปลี่ยนหน้าระหว่างต่อสู้ กันผู้เล่นเผลอกดเมนูแล้วเสียพลังงานฟรี
  setNavigationGuard((screenId) => {
    if (!battleActive || screenId === "battle-screen") return true;
    showToast("กำลังต่อสู้อยู่ — กด “ถอยหนี” ถ้าต้องการออก");
    return false;
  });
}
