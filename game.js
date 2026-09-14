// =====================================================
// game.js
// หน้าที่ของไฟล์นี้:
// 1) ระบบ Navigation สลับหน้าจอ (Home / Characters / Battle)
// 2) ระบบต่อสู้แบบผลัดตาชัดเจน มีเอฟเฟกต์ (สั่น, ดาเมจลอย)
// 3) ระบบเลเวลอัพแบบ EXP ยิ่งเลเวลสูงยิ่งต้องใช้ EXP เยอะขึ้น
// =====================================================


// -----------------------------------------------------
// ขั้นตอนที่ 1: ดึงปุ่มเมนูทั้งหมดออกมาจากหน้าเว็บ
// -----------------------------------------------------
const menuButtons = document.querySelectorAll(".menu-button");


// -----------------------------------------------------
// ขั้นตอนที่ 2: ข้อความสำหรับปุ่มที่ยังไม่มีหน้าจริง
// -----------------------------------------------------
const menuMessages = {
  "Farm": "🌾 คุณกดปุ่ม Farm สำเร็จ! (หน้านี้ยังไม่ได้สร้าง)",
  "Gacha": "🎁 คุณกดปุ่ม Gacha สำเร็จ! (หน้านี้ยังไม่ได้สร้าง)"
};


// -----------------------------------------------------
// ขั้นตอนที่ 3: ข้อมูลตัวละครของผู้เล่น
// -----------------------------------------------------
// เพิ่มฟิลด์ exp (คะแนนประสบการณ์สะสม) เข้ามา
// เริ่มต้นทุกตัวที่ exp: 0 ส่วน level, maxHp, atk คือค่าฐานเดิม
const characterList = [
  { name: "อัศวินแสงจันทร์", level: 5, exp: 0, maxHp: 40, atk: 8, image: "https://placehold.co/160x160/png?text=Knight" },
  { name: "นักธนูป่าเขียว", level: 3, exp: 0, maxHp: 30, atk: 10, image: "https://placehold.co/160x160/png?text=Archer" },
  { name: "จอมเวทเปลวไฟ", level: 7, exp: 0, maxHp: 25, atk: 14, image: "https://placehold.co/160x160/png?text=Mage" },
  { name: "นักบวชแสงทอง", level: 4, exp: 0, maxHp: 45, atk: 6, image: "https://placehold.co/160x160/png?text=Priest" }
];


// -----------------------------------------------------
// ขั้นตอนที่ 4: ข้อมูลศัตรูที่จะเจอในสนามต่อสู้
// -----------------------------------------------------
// เพิ่ม expReward คือ EXP ที่จะได้รับเมื่อชนะศัตรูตัวนั้น
const enemyList = [
  { name: "สไลม์ป่า", maxHp: 30, atk: 4, expReward: 15, image: "https://placehold.co/160x160/png?text=Slime" },
  { name: "หมาป่าเงา", maxHp: 45, atk: 6, expReward: 25, image: "https://placehold.co/160x160/png?text=Wolf" },
  { name: "โกเลมหิน", maxHp: 60, atk: 8, expReward: 40, image: "https://placehold.co/160x160/png?text=Golem" }
];


// -----------------------------------------------------
// ขั้นตอนที่ 5: ตัวแปรเก็บสถานะการต่อสู้ปัจจุบัน
// -----------------------------------------------------
let currentPlayer = null;
let currentEnemy = null;
let playerCurrentHp = 0;
let enemyCurrentHp = 0;


// -----------------------------------------------------
// ขั้นตอนที่ 6: สูตรคำนวณ EXP ที่ต้องใช้เพื่อเลเวลอัพ
// -----------------------------------------------------
// ยิ่งเลเวลสูง ยิ่งต้องใช้ EXP มากขึ้นแบบไม่เป็นเส้นตรง
// (คล้ายเกมสะสมตัวละครทั่วไป เช่น Genshin Impact ที่อัพเลเวลยากขึ้นเรื่อยๆ)
// ตัวอย่าง: Lv.1 ต้องการ 50, Lv.3 ต้องการ ~259, Lv.7 ต้องการ ~926
function getExpNeeded(level) {
  return Math.floor(50 * Math.pow(level, 1.5));
}


// -----------------------------------------------------
// ขั้นตอนที่ 7: เพิ่ม EXP ให้ตัวละคร และเลเวลอัพถ้า EXP ถึงเกณฑ์
// -----------------------------------------------------
// ถ้าได้ EXP เยอะมากพอ อาจเลเวลอัพหลายเลเวลพร้อมกันได้ (ใช้ while loop)
// EXP ที่เกินจากเกณฑ์จะถูกทบไปเลเวลถัดไป ไม่หายไปไหน
function gainExp(character, amount) {
  character.exp += amount;

  let leveledUp = false;

  while (character.exp >= getExpNeeded(character.level)) {
    character.exp -= getExpNeeded(character.level);
    character.level += 1;
    character.maxHp += 5;
    character.atk += 2;
    leveledUp = true;
  }

  return leveledUp;
}


// -----------------------------------------------------
// ขั้นตอนที่ 8: ฟังก์ชันวาดการ์ดตัวละครลงในหน้า Characters
// -----------------------------------------------------
function renderCharacters() {
  const grid = document.getElementById("characters-grid");
  grid.innerHTML = "";

  characterList.forEach(function (character) {
    const card = document.createElement("div");
    card.className = "character-card";

    const img = document.createElement("img");
    img.src = character.image;
    img.alt = character.name;

    const nameEl = document.createElement("p");
    nameEl.className = "character-name";
    nameEl.textContent = character.name;

    const levelEl = document.createElement("span");
    levelEl.className = "character-level";
    levelEl.textContent = "Lv. " + character.level;

    // แถบ EXP: แสดงความคืบหน้าไปเลเวลถัดไป
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
    battleBtn.addEventListener("click", function () {
      startBattle(character);
    });

    card.appendChild(img);
    card.appendChild(nameEl);
    card.appendChild(levelEl);
    card.appendChild(expBarTrack);
    card.appendChild(expText);
    card.appendChild(battleBtn);

    grid.appendChild(card);
  });
}


// -----------------------------------------------------
// ขั้นตอนที่ 9: ฟังก์ชันสลับหน้าจอ (Home / Characters / Battle)
// -----------------------------------------------------
function showScreen(screenIdToShow) {
  const allScreens = document.querySelectorAll(".screen");

  allScreens.forEach(function (screen) {
    screen.classList.add("hidden");
  });

  document.getElementById(screenIdToShow).classList.remove("hidden");
}


// -----------------------------------------------------
// ขั้นตอนที่ 10: เริ่มการต่อสู้ด้วยตัวละครที่เลือก
// -----------------------------------------------------
function startBattle(character) {
  currentPlayer = character;
  playerCurrentHp = character.maxHp;

  const randomIndex = Math.floor(Math.random() * enemyList.length);
  currentEnemy = enemyList[randomIndex];
  enemyCurrentHp = currentEnemy.maxHp;

  updateBattleUI();

  document.getElementById("turn-indicator").textContent = "ตาของคุณ ⚔️";
  document.getElementById("battle-log").textContent =
    "พบ " + currentEnemy.name + "! กดปุ่มโจมตีเพื่อเริ่มต่อสู้";

  document.getElementById("attack-btn").disabled = false;

  showScreen("battle-screen");
}


// -----------------------------------------------------
// ขั้นตอนที่ 11: อัปเดตหน้าจอสนามต่อสู้ (รูป, ชื่อ, หลอดเลือด)
// -----------------------------------------------------
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


// -----------------------------------------------------
// ขั้นตอนที่ 12: ฟังก์ชันช่วยสำหรับเอฟเฟกต์การต่อสู้
// -----------------------------------------------------

// "รอ" ตามเวลาที่กำหนด (มิลลิวินาที) แบบใช้ async/await ได้
// ใช้เพื่อสร้างจังหวะการต่อสู้ ไม่ให้ทุกอย่างเกิดขึ้นพร้อมกันทันที
function wait(milliseconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, milliseconds);
  });
}

// แสดงตัวเลขดาเมจ (เช่น "-8") ลอยขึ้นเหนือฝั่งที่โดนตี แล้วหายไปเอง
function showDamagePopup(sideElement, damageAmount) {
  const popup = document.createElement("span");
  popup.className = "damage-popup";
  popup.textContent = "-" + damageAmount;
  sideElement.appendChild(popup);

  // ลบทิ้งหลัง animation จบ (0.8 วินาที) กันไม่ให้ค้างอยู่ในหน้าเว็บ
  setTimeout(function () {
    popup.remove();
  }, 800);
}

// เล่นท่ากระเพื่อมตอน "โจมตี"
function playAttackAnimation(imageElement) {
  imageElement.classList.add("attack-anim");
  setTimeout(function () {
    imageElement.classList.remove("attack-anim");
  }, 300);
}

// เล่นอาการสั่นตอน "โดนตี"
function playHitAnimation(imageElement) {
  imageElement.classList.add("hit-shake");
  setTimeout(function () {
    imageElement.classList.remove("hit-shake");
  }, 400);
}


// -----------------------------------------------------
// ขั้นตอนที่ 13: ปุ่ม "โจมตี" — ระบบต่อสู้แบบผลัดตาชัดเจน
// -----------------------------------------------------
// ฟังก์ชันนี้เป็น "async" แปลว่าเราใช้ await เพื่อ "รอ" ก่อนทำขั้นต่อไปได้
// ทำให้ควบคุมจังหวะ ผู้เล่นตี -> รอ -> ศัตรูตีกลับ -> รอ ได้ตามลำดับจริง
const attackButton = document.getElementById("attack-btn");
const turnIndicator = document.getElementById("turn-indicator");
const battleLog = document.getElementById("battle-log");

attackButton.addEventListener("click", async function () {
  // ปิดปุ่มระหว่างกำลังเล่นแอนิเมชัน กันผู้เล่นกดรัวๆ ระหว่างตา
  attackButton.disabled = true;

  const playerImage = document.getElementById("battle-player-image");
  const enemyImage = document.getElementById("battle-enemy-image");
  const playerSide = playerImage.closest(".battle-side");
  const enemySide = enemyImage.closest(".battle-side");

  // ----------------- ตาของผู้เล่น -----------------
  turnIndicator.textContent = "ตาของคุณ ⚔️";
  playAttackAnimation(playerImage);
  await wait(200); // รอให้ท่าโจมตีเล่นก่อน ค่อยให้ดาเมจลง

  enemyCurrentHp -= currentPlayer.atk;
  if (enemyCurrentHp < 0) enemyCurrentHp = 0;

  showDamagePopup(enemySide, currentPlayer.atk);
  playHitAnimation(enemyImage);
  updateBattleUI();

  let logText = currentPlayer.name + " โจมตี " + currentEnemy.name + " ทำดาเมจ " + currentPlayer.atk + " แต้ม";
  battleLog.textContent = logText;

  await wait(700); // รอให้ผู้เล่นเห็นผลก่อนไปต่อ

  // เช็คว่าศัตรูตายหรือยัง
  if (enemyCurrentHp <= 0) {
    const leveledUp = gainExp(currentPlayer, currentEnemy.expReward);

    logText += "\n🎉 ชนะการต่อสู้! ได้รับ EXP +" + currentEnemy.expReward;
    if (leveledUp) {
      logText += "\n✨ เลเวลอัพ! ตอนนี้ " + currentPlayer.name + " อยู่ Lv." + currentPlayer.level;
    }

    battleLog.textContent = logText;
    turnIndicator.textContent = "จบการต่อสู้ 🏆";
    return; // จบตรงนี้ ไม่ต้องให้ศัตรูตีกลับเพราะตายแล้ว
  }

  // ----------------- ตาของศัตรู -----------------
  turnIndicator.textContent = "ตาของศัตรู 👹";
  await wait(400); // หน่วงให้ผู้เล่นทันเห็นว่าเปลี่ยนตาแล้ว

  playAttackAnimation(enemyImage);
  await wait(200);

  playerCurrentHp -= currentEnemy.atk;
  if (playerCurrentHp < 0) playerCurrentHp = 0;

  showDamagePopup(playerSide, currentEnemy.atk);
  playHitAnimation(playerImage);
  updateBattleUI();

  logText += "\n" + currentEnemy.name + " โจมตีกลับ ทำดาเมจ " + currentEnemy.atk + " แต้ม";
  battleLog.textContent = logText;

  await wait(700);

  // เช็คว่าผู้เล่นแพ้หรือยัง
  if (playerCurrentHp <= 0) {
    logText += "\n💀 พ่ายแพ้! ลองฝึกฝนแล้วกลับมาใหม่อีกครั้ง";
    battleLog.textContent = logText;
    turnIndicator.textContent = "จบการต่อสู้ 💀";
    return;
  }

  // ยังไม่จบ กลับไปเป็นตาผู้เล่นรอบใหม่
  turnIndicator.textContent = "ตาของคุณ ⚔️";
  attackButton.disabled = false;
});


// -----------------------------------------------------
// ขั้นตอนที่ 14: ให้ทุกปุ่มเมนูด้านล่าง "ฟัง" เหตุการณ์การคลิก
// -----------------------------------------------------
menuButtons.forEach(function (button) {

  button.addEventListener("click", function () {

    const labelElement = button.querySelector(".menu-label");
    const menuName = labelElement.textContent;

    // Characters และ Battle ทั้งคู่พาไปหน้า Characters เพื่อเลือกตัวละครก่อนสู้
    if (menuName === "Characters" || menuName === "Battle") {
      renderCharacters();
      showScreen("characters-screen");
      return;
    }

    const message = menuMessages[menuName];
    alert(message);
  });

});


// -----------------------------------------------------
// ขั้นตอนที่ 15: ปุ่ม "กลับหน้าหลัก" ในหน้า Characters
// -----------------------------------------------------
document.getElementById("back-to-home-btn").addEventListener("click", function () {
  showScreen("home-screen");
});


// -----------------------------------------------------
// ขั้นตอนที่ 16: ปุ่ม "กลับหน้าตัวละคร" ในหน้า Battle
// -----------------------------------------------------
document.getElementById("back-to-characters-btn").addEventListener("click", function () {
  // เรียก renderCharacters() ใหม่ เพื่อให้เลเวลและ EXP ที่อัปเดตแล้วแสดงผลถูกต้อง
  renderCharacters();
  showScreen("characters-screen");
});