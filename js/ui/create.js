// =====================================================
// js/ui/create.js
// หน้าสร้างตัวละคร: ตั้งชื่อ + เลือกชาย/หญิง
// =====================================================

import { GENDERS, NAME_MAX, validateName, createCharacter } from "../systems/player.js";

const $ = (id) => document.getElementById(id);

let onCreated = null;
let selectedGender = "male";
let bound = false;

function selectGender(gender) {
  selectedGender = gender;
  document.querySelectorAll(".gender-option").forEach((button) => {
    button.classList.toggle("selected", button.dataset.gender === gender);
    button.setAttribute("aria-pressed", button.dataset.gender === gender);
  });
}

function bindOnce() {
  if (bound) return;
  bound = true;

  $("create-name").maxLength = NAME_MAX;

  document.querySelectorAll(".gender-option").forEach((button) => {
    button.addEventListener("click", () => selectGender(button.dataset.gender));
  });

  // ใช้ <form> → กด Enter บนคีย์บอร์ดมือถือก็สร้างตัวละครได้
  $("create-form").addEventListener("submit", (event) => {
    event.preventDefault();

    const name = $("create-name").value;
    const error = validateName(name);
    $("create-error").textContent = error ?? "";
    if (error) return;

    createCharacter(name, selectedGender);
    $("create-screen").hidden = true;
    onCreated?.();
  });
}

export function showCreateScreen(callback) {
  bindOnce();
  onCreated = callback;

  $("create-name").value = "";
  $("create-error").textContent = "";
  selectGender("male");
  $("create-screen").hidden = false;
  $("create-name").focus();
}

export { GENDERS };
