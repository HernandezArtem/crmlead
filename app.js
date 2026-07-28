/**
 * CRM Lead Card
 * -------------
 * Логика кнопки «Сохранить» — handleSubmit
 * Сохранение данных — loadLeads / saveLeads (localStorage)
 * Рендер списка — renderLeads
 * Доп. задание — changeStage (смена этапа сделки)
 */

const STORAGE_KEY = "crm_leads";

const STAGES = [
  "Новый лид",
  "Квалифицирован",
  "Назначена консультация",
  "Отказ",
];

const form = document.getElementById("lead-form");
const formError = document.getElementById("form-error");
const leadsList = document.getElementById("leads-list");
const leadsCount = document.getElementById("leads-count");
const emptyState = document.getElementById("empty-state");
const phoneInput = document.getElementById("phone");

/**
 * Маска телефона: +7 (XXX) XXX-XX-XX
 * Нормализует 8XXXXXXXXXX / 7XXXXXXXXXX / XXXXXXXXXX → +7 (...)
 */
function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizePhoneDigits(value) {
  let digits = digitsOnly(value);

  if (digits.startsWith("8")) {
    digits = "7" + digits.slice(1);
  }

  if (digits.length > 0 && !digits.startsWith("7")) {
    digits = "7" + digits;
  }

  return digits.slice(0, 11);
}

/** Форматирует уже нормализованные цифры (7 + до 10 локальных) */
function formatFromDigits(digits) {
  if (!digits) return "";

  // Только код страны — показываем +7 (нужно при вводе «8» / «7»)
  if (digits.length === 1) return "+7";

  let result = "+7";
  const local = digits.slice(1);

  result += " (" + local.slice(0, 3);
  if (local.length < 3) return result;
  result += ")";

  if (local.length > 3) result += " " + local.slice(3, 6);
  if (local.length > 6) result += "-" + local.slice(6, 8);
  if (local.length > 8) result += "-" + local.slice(8, 10);

  return result;
}

function formatPhoneMask(value) {
  return formatFromDigits(normalizePhoneDigits(value));
}

function isCompletePhone(value) {
  return normalizePhoneDigits(value).length === 11;
}

function setPhoneValue(digits, { fromDelete = false } = {}) {
  let normalized = (digits || "").slice(0, 11);

  // Backspace до кода страны — полностью очищаем поле
  if (fromDelete && normalized.length <= 1) {
    normalized = "";
  }

  const formatted = formatFromDigits(normalized);
  phoneInput.value = formatted;
  lastPhoneDigits = normalized;

  const pos = formatted.length;
  requestAnimationFrame(() => {
    phoneInput.setSelectionRange(pos, pos);
  });
}

let lastPhoneDigits = "";

/**
 * Backspace/Delete снимают цифру, а не скобки маски.
 * Зажатый Backspace работает за счёт key repeat.
 */
function handlePhoneKeydown(event) {
  if (event.key !== "Backspace" && event.key !== "Delete") return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  event.preventDefault();

  const start = phoneInput.selectionStart ?? 0;
  const end = phoneInput.selectionEnd ?? 0;
  let digits = lastPhoneDigits || normalizePhoneDigits(phoneInput.value);

  // Выделение всего поля — очистить
  if (start !== end && start === 0 && end === phoneInput.value.length) {
    setPhoneValue("", { fromDelete: true });
    return;
  }

  digits = digits.slice(0, -1);
  setPhoneValue(digits, { fromDelete: true });
}

function applyPhoneMask(event) {
  const isDelete =
    event.inputType === "deleteContentBackward" ||
    event.inputType === "deleteContentForward" ||
    event.inputType === "deleteByCut";

  if (isDelete) {
    let digits = normalizePhoneDigits(phoneInput.value);
    if (digits.length >= lastPhoneDigits.length) {
      digits = lastPhoneDigits.slice(0, -1);
    }
    setPhoneValue(digits, { fromDelete: true });
    return;
  }

  setPhoneValue(normalizePhoneDigits(phoneInput.value));
}

/** Загрузка лидов из localStorage */
function loadLeads() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Сохранение лидов в localStorage */
function saveLeads(leads) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearError() {
  formError.hidden = true;
  formError.textContent = "";
}

/** Логика кнопки «Сохранить» + валидация */
function handleSubmit(event) {
  event.preventDefault();
  clearError();

  const name = form.name.value.trim();
  const phone = formatPhoneMask(form.phone.value);
  form.phone.value = phone;

  // Проверка обязательных полей
  if (!name && !phone) {
    showError("Заполните имя клиента и номер телефона.");
    return;
  }
  if (!name) {
    showError("Заполните имя клиента.");
    form.name.focus();
    return;
  }
  if (!phone) {
    showError("Заполните номер телефона.");
    form.phone.focus();
    return;
  }
  if (!isCompletePhone(phone)) {
    showError("Введите телефон полностью: +7 (XXX) XXX-XX-XX");
    form.phone.focus();
    return;
  }

  const lead = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `lead-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    phone,
    source: form.source.value,
    owner: form.owner.value,
    stage: form.stage.value,
    tzRequested: form.tzRequested.checked,
    createdAt: new Date().toISOString(),
  };

  const leads = loadLeads();
  leads.unshift(lead);
  saveLeads(leads);
  renderLeads();

  form.reset();
  form.name.focus();
}

/** Доп. задание: изменение этапа сделки */
function changeStage(id, newStage) {
  const leads = loadLeads();
  const lead = leads.find((item) => item.id === id);
  if (!lead) return;
  lead.stage = newStage;
  saveLeads(leads);
  renderLeads();
}

function deleteLead(id) {
  const leads = loadLeads().filter((item) => item.id !== id);
  saveLeads(leads);
  renderLeads();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Отрисовка карточек лидов */
function renderLeads() {
  const leads = loadLeads();
  leadsCount.textContent = String(leads.length);
  emptyState.hidden = leads.length > 0;
  leadsList.innerHTML = "";

  for (const lead of leads) {
    const card = document.createElement("article");
    card.className = "lead-card";
    card.dataset.id = lead.id;

    const stageOptions = STAGES.map(
      (stage) =>
        `<option value="${escapeHtml(stage)}" ${
          stage === lead.stage ? "selected" : ""
        }>${escapeHtml(stage)}</option>`
    ).join("");

    card.innerHTML = `
      <div class="lead-card__top">
        <div>
          <h3 class="lead-card__name">${escapeHtml(lead.name)}</h3>
          <p class="lead-card__meta">${escapeHtml(lead.phone)}</p>
        </div>
      </div>
      <div class="lead-card__grid">
        <div><span>Источник:</span> ${escapeHtml(lead.source)}</div>
        <div><span>Ответственный:</span> ${escapeHtml(lead.owner)}</div>
        <div><span>Этап:</span> ${escapeHtml(lead.stage)}</div>
        <div>
          <span>Запрошено ТЗ:</span>
          ${
            lead.tzRequested
              ? '<span class="tz-yes">Да</span>'
              : "Нет"
          }
        </div>
      </div>
      <div class="lead-card__actions">
        <label>
          Новый этап:
          <select class="stage-select" aria-label="Выбрать этап сделки">
            ${stageOptions}
          </select>
        </label>
        <button type="button" class="btn btn-secondary" data-action="change-stage">
          Изменить этап
        </button>
        <button type="button" class="btn btn-danger-ghost" data-action="delete">
          Удалить
        </button>
      </div>
    `;

    leadsList.appendChild(card);
  }
}

leadsList.addEventListener("click", (event) => {
  const card = event.target.closest(".lead-card");
  if (!card) return;

  const changeBtn = event.target.closest('[data-action="change-stage"]');
  if (changeBtn) {
    const select = card.querySelector(".stage-select");
    if (select) changeStage(card.dataset.id, select.value);
    return;
  }

  const deleteBtn = event.target.closest('[data-action="delete"]');
  if (deleteBtn) {
    deleteLead(card.dataset.id);
  }
});

phoneInput.addEventListener("keydown", handlePhoneKeydown);
phoneInput.addEventListener("input", applyPhoneMask);
phoneInput.addEventListener("paste", (event) => {
  event.preventDefault();
  const pasted = (event.clipboardData || window.clipboardData).getData("text");
  setPhoneValue(normalizePhoneDigits(pasted));
});
phoneInput.addEventListener("blur", () => {
  if (phoneInput.value.trim()) {
    setPhoneValue(normalizePhoneDigits(phoneInput.value));
  } else {
    setPhoneValue("");
  }
});

form.addEventListener("submit", handleSubmit);

// При загрузке страницы — восстановить лиды из localStorage
renderLeads();
