// Change the production URL below to your Render backend URL after deploying
const API = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api/game'
  : 'https://your-backend.onrender.com/api/game';

const state = {
  sessionId: null,
  hp: 10,
  maxHp: 10,
  xp: 0,
  location: '',
  character: '',
  isAlive: true,
  loading: false,
};

// ── DOM helpers ──────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(name).classList.add('active');
}

function setLoading(val) {
  state.loading = val;
  document.querySelectorAll('.choice-btn, .send-btn, .custom-input').forEach(el => {
    el.disabled = val;
  });
}

function updateStats() {
  $('stat-char').textContent = state.character;
  $('stat-hp').textContent = `${state.hp}/${state.maxHp}`;
  $('stat-xp').textContent = state.xp;
  $('stat-loc').textContent = state.location || '—';
}

function showError(msg) {
  const area = $('story-area');
  const el = document.createElement('div');
  el.className = 'error-toast';
  el.textContent = `⚠ ${msg}`;
  area.appendChild(el);
  area.scrollTop = area.scrollHeight;
}

// ── Story rendering ───────────────────────────────────────
const badgeMap = {
  combat:  { cls: 'badge-combat',  label: '⚔ Combat' },
  explore: { cls: 'badge-explore', label: '🔍 Exploration' },
  story:   { cls: 'badge-story',   label: '📜 Story' },
  loot:    { cls: 'badge-loot',    label: '💰 Loot' },
};

function appendScene(data, playerAction) {
  const area = $('story-area');

  if (playerAction) {
    const pa = document.createElement('div');
    pa.className = 'story-block';
    pa.innerHTML = `<div class="player-action">▶ ${escHtml(playerAction)}</div>`;
    area.appendChild(pa);
  }

  const badge = badgeMap[data.eventType] || badgeMap.story;
  const block = document.createElement('div');
  block.className = 'story-block';
  block.innerHTML = `
    <span class="event-badge ${badge.cls}">${badge.label}</span>
    <div class="scene-text">${escHtml(data.scene)}</div>
  `;
  area.appendChild(block);
  area.scrollTop = area.scrollHeight;
}

function renderChoices(choices) {
  const area = $('choices-area');
  const letters = ['A', 'B', 'C'];
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
  $('custom-input').addEventListener('keydown', e => { if (e.key === 'Enter') submitCustom(); });
}

function renderDeathScreen() {
  $('choices-area').innerHTML = `
    <div class="death-msg">
      <div class="death-title">☠ You Have Fallen</div>
      <div class="death-sub">The void claims another soul. Your story ends here.</div>
    </div>`;
}

function showLoadingDots() {
  const area = $('story-area');
  const el = document.createElement('div');
  el.id = 'loading-indicator';
  el.className = 'loading-dots';
  el.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
  area.appendChild(el);
  area.scrollTop = area.scrollHeight;
}

function hideLoadingDots() {
  const el = $('loading-indicator');
  if (el) el.remove();
}

// ── API calls ─────────────────────────────────────────────
async function startGame(characterClass) {
  if (state.loading) return;
  setLoading(true);
  showScreen('screen-game');
  $('stats-bar').style.display = 'flex';
  state.character = characterClass;
  updateStats();
  showLoadingDots();

  try {
    const res = await fetch(`${API}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterClass }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to start game');

    state.sessionId = data.sessionId;
    state.location = data.location || 'The Dark Forest';
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: state.sessionId, action }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to process action');

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

function makeChoice(label) { sendAction(label); }

function submitCustom() {
  const input = $('custom-input');
  const val = input.value.trim();
  if (val) { input.value = ''; sendAction(val); }
}

// ── Saved sessions ────────────────────────────────────────
async function loadSessions() {
  try {
    const res = await fetch(`${API}/sessions`);
    const data = await res.json();
    const list = $('session-list');

    if (!data.sessions || !data.sessions.length) {
      list.innerHTML = '<div style="color:var(--text-muted);font-size:14px;padding:8px 0">No saved games yet.</div>';
      return;
    }

    list.innerHTML = data.sessions.map(s => `
      <div class="session-item ${!s.is_alive ? 'session-dead' : ''}" onclick="resumeSession(${s.id})">
        <div>
          <div class="session-name">${escHtml(s.character_class)} ${!s.is_alive ? '☠' : ''}</div>
          <div class="session-meta">${escHtml(s.location)} · HP ${s.hp}/${s.max_hp} · XP ${s.xp}</div>
        </div>
        <div class="session-meta">#${s.id}</div>
      </div>
    `).join('');
  } catch (err) {
    $('session-list').innerHTML = '<div style="color:var(--text-muted);font-size:14px">Could not load sessions.</div>';
  }
}

async function resumeSession(id) {
  try {
    const res = await fetch(`${API}/session/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const { session, turns } = data;
    state.sessionId = session.id;
    state.character = session.character_class;
    state.hp = session.hp;
    state.maxHp = session.max_hp;
    state.xp = session.xp;
    state.location = session.location;
    state.isAlive = session.is_alive;

    showScreen('screen-game');
    $('stats-bar').style.display = 'flex';
    $('story-area').innerHTML = '';
    updateStats();

    turns.forEach(t => {
      appendScene(
        { scene: t.scene_text, eventType: t.event_type },
        t.player_action
      );
    });

    const lastTurn = turns[turns.length - 1];
    if (state.isAlive && lastTurn?.choices) {
      renderChoices(typeof lastTurn.choices === 'string'
        ? JSON.parse(lastTurn.choices)
        : lastTurn.choices);
    } else if (!state.isAlive) {
      renderDeathScreen();
    }
  } catch (err) {
    alert('Could not load session: ' + err.message);
  }
}

// ── Navigation ────────────────────────────────────────────
function goHome() {
  showScreen('screen-home');
  $('stats-bar').style.display = 'none';
  $('story-area').innerHTML = '';
  $('choices-area').innerHTML = '';
  loadSessions();
}

// ── Utility ───────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadSessions();
  showScreen('screen-home');
});
