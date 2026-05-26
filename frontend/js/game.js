const API =
  window.location.hostname === "localhost"
    ? "http://localhost:3000/api/game"
    : "https://ai-dungeon-game-3isr.onrender.com/api/game";

const state = {
  sessionId: null,
  hp: 10,
  maxHp: 10,
  xp: 0,
  location: "",
  character: "",
  isAlive: true,
  loading: false,
};

const $ = (id) => document.getElementById(id);

function showScreen(name) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  $(name).classList.add("active");
}

function setLoading(val) {
  state.loading = val;
  document
    .querySelectorAll(".choice-btn, .send-btn, .custom-input")
    .forEach((el) => {
      el.disabled = val;
    });
}

function updateStats() {
  $("stat-char").textContent = state.character;
  $("stat-hp").textContent = `${state.hp}/${state.maxHp}`;
  $("stat-xp").textContent = state.xp;
  $("stat-loc").textContent = state.location || "—";
}

function showError(msg) {
  const area = $("story-area");
  const el = document.createElement("div");
  el.className = "error-toast";
  el.textContent = `⚠ ${msg}`;
  area.appendChild(el);
  area.scrollTop = area.scrollHeight;
}

const badgeMap = {
  combat: { cls: "badge-combat", label: "⚔ Combat" },
  explore: { cls: "badge-explore", label: "🔍 Exploration" },
  story: { cls: "badge-story", label: "📜 Story" },
  loot: { cls: "badge-loot", label: "💰 Loot" },
};

function appendScene(data, playerAction) {
  const area = $("story-area");

  if (playerAction) {
    const pa = document.createElement("div");
    pa.className = "story-block";
    pa.innerHTML = `<div class="player-action">▶ ${escHtml(playerAction)}</div>`;
    area.appendChild(pa);
  }

  const badge = badgeMap[data.eventType] || badgeMap.story;
  const block = document.createElement("div");
  block.className = "story-block";
  block.innerHTML = `
    <span class="event-badge ${badge.cls}">${badge.label}</span>
    <div class="scene-text">${escHtml(data.scene)}</div>
  `;
  area.appendChild(block);
  area.scrollTop = area.scrollHeight;
}

function renderChoices(choices) {
  const area = $("choices-area");
  const letters = ["A", "B", "C"];
  let html = `<div class="choices-label">What do you do?</div>`;

  choices.forEach((c, i) => {
    html += `<button class="choice-btn" onclick="makeChoice('${escAttr(c.label)}')">
      <span class="choice-letter">${letters[i]}.</span>${escHtml(c.label)}
    </button>`;
  });

  html += `
    <div class="custom-row">
      <input id="custom-input" class="custom-input" type="text" placeholder="Or type your own action…" />
      <button class="btn btn-primary send-btn" onclick="submitCustom()">Go →</button>
    </div>`;

  area.innerHTML = html;
  $("custom-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitCustom();
  });
}

function renderDeathScreen() {
  $("choices-area").innerHTML = `
    <div class="death-msg">
      <div class="death-title">☠ You Have Fallen</div>
      <div class="death-sub">The void claims another soul. Your story ends here.</div>
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:1rem" onclick="goHome()">↩ Play Again</button>`;
}

function showLoadingDots() {
  const area = $("story-area");
  const el = document.createElement("div");
  el.id = "loading-indicator";
  el.className = "loading-dots";
  el.innerHTML =
    '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
  area.appendChild(el);
  area.scrollTop = area.scrollHeight;
}

function hideLoadingDots() {
  const el = $("loading-indicator");
  if (el) el.remove();
}

async function startGame(characterClass) {
  if (state.loading) return;
  setLoading(true);
  showScreen("screen-game");
  $("stats-bar").style.display = "flex";
  state.character = characterClass;
  state.hp = 10;
  state.xp = 0;
  state.isAlive = true;
  $("story-area").innerHTML = "";
  $("choices-area").innerHTML = "";
  updateStats();
  showLoadingDots();

  try {
    const res = await fetch(`${API}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterClass }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to start game");

    state.sessionId = data.sessionId;
    state.location = data.location || "The Dark Forest";
    updateStats();

    hideLoadingDots();
    appendScene(data, null);
    renderChoices(data.choices);
  } catch (err) {
    hideLoadingDots();
    showError(err.message);
  }

  setLoading(false);
}

async function sendAction(action) {
  if (state.loading || !state.isAlive) return;
  setLoading(true);
  showLoadingDots();

  try {
    const res = await fetch(`${API}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: state.sessionId, action }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to process action");

    state.hp = data.hp;
    state.xp = data.xp;
    state.location = data.location || state.location;
    state.isAlive = data.isAlive;
    updateStats();

    hideLoadingDots();
    appendScene(data, action);

    if (!state.isAlive) {
      renderDeathScreen();
    } else {
      renderChoices(data.choices);
    }
  } catch (err) {
    hideLoadingDots();
    showError(err.message);
    setLoading(false);
    return;
  }

  setLoading(false);
}

function makeChoice(label) {
  sendAction(label);
}

function submitCustom() {
  const input = $("custom-input");
  const val = input.value.trim();
  if (val) {
    input.value = "";
    sendAction(val);
  }
}

function goHome() {
  showScreen("screen-home");
  $("stats-bar").style.display = "none";
  $("story-area").innerHTML = "";
  $("choices-area").innerHTML = "";
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

document.addEventListener("DOMContentLoaded", () => {
  showScreen("screen-home");
});
