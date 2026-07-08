// ─────────────────────────────────────────────
// STORAGE LAYER (Firebase + localStorage fallback)
// ─────────────────────────────────────────────
let fbDatabase = null;
let storageMode = 'local';

(function initFirebase() {
  try {
    if (FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY') {
      firebase.initializeApp(FIREBASE_CONFIG);
      fbDatabase = firebase.database();
      storageMode = 'firebase';
    }
  } catch(e) { /* stay local */ }
})();

function encodeKey(str) {
  return str.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g,'');
}

const DB = {
  async getProfile(key) {
    if (storageMode === 'firebase') {
      const snap = await fbDatabase.ref('profiles/' + key).once('value');
      return snap.val();
    }
    const raw = localStorage.getItem('castr_profile_' + key);
    return raw ? JSON.parse(raw) : null;
  },
  async setProfile(key, data) {
    if (storageMode === 'firebase') {
      await fbDatabase.ref('profiles/' + key).set(data);
    } else {
      localStorage.setItem('castr_profile_' + key, JSON.stringify(data));
    }
  },
  async getAllProfiles() {
    if (storageMode === 'firebase') {
      const snap = await fbDatabase.ref('profiles').once('value');
      return snap.val() || {};
    }
    const result = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('castr_profile_')) {
        try { result[k.replace('castr_profile_','')] = JSON.parse(localStorage.getItem(k)); } catch(e) {}
      }
    }
    return result;
  },
  async getFlags() {
    if (storageMode === 'firebase') {
      const snap = await fbDatabase.ref('flags').once('value');
      return snap.val() || {};
    }
    const raw = localStorage.getItem('castr_flags');
    return raw ? JSON.parse(raw) : {};
  },
  async addFlag(flagId, flagData) {
    if (storageMode === 'firebase') {
      await fbDatabase.ref('flags/' + flagId).set(flagData);
    } else {
      const flags = await DB.getFlags();
      flags[flagId] = flagData;
      localStorage.setItem('castr_flags', JSON.stringify(flags));
    }
  },
  async deleteFlag(flagId) {
    if (storageMode === 'firebase') {
      await fbDatabase.ref('flags/' + flagId).remove();
    } else {
      const flags = await DB.getFlags();
      delete flags[flagId];
      localStorage.setItem('castr_flags', JSON.stringify(flags));
    }
  },
  async migrateKey(oldKey, newKey) {
    const data = await DB.getProfile(oldKey);
    if (data) {
      await DB.setProfile(newKey, data);
      if (storageMode === 'firebase') await fbDatabase.ref('profiles/' + oldKey).remove();
      else localStorage.removeItem('castr_profile_' + oldKey);
    }
  }
};

// ─────────────────────────────────────────────
// STATE / HELPERS
// ─────────────────────────────────────────────
const CREW_COLORS = { Oakbrook:'#0A3D62', Rockford:'#F2A900', Chicago:'#B87333' };
function crewColor(c) { return CREW_COLORS[c] || '#4A5560'; }

const state = {
  screen: 'landing',
  userKey: null,
  profile: null,
  sessionSection: null,
  sessionIdx: 0,
  sessionAnswered: null,
  sessionCorrect: 0,
  sessionTotal: 0,
  sessionResults: [],
  flagOpen: false,
  flagSent: false,
  adminTab: 'roster',
  adminSortCol: 'firstName',
  adminSortDir: 1,
  adminFilter: 'all',
  adminExpandedRow: null,
  adminPractice: false,
  pendingFirst: '',
  pendingLast: '',
  _pendingCrew: null,
  _pendingPin: '',
};

function currentWeek() {
  return Math.max(0, Math.floor((Date.now() - LAUNCH_DATE_CDT_MS) / (7*24*3600*1000)));
}

function isAdmin(profile) {
  return profile && profile.firstName && profile.lastName &&
    profile.firstName.toLowerCase() === 'soundjata' &&
    profile.lastName.toLowerCase() === 'sharod';
}

function sectionAnswers(profile, sk) {
  if (!profile || !profile.answers) return {};
  return profile.answers[sk] || {};
}
function sectionStats(profile, sk) {
  const ans = sectionAnswers(profile, sk);
  const ids = Object.keys(ans);
  return { attempted: ids.length, correct: ids.filter(id => ans[id].correct).length };
}
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function findNextUnanswered(sk, startIdx) {
  const sec = SECTIONS_META[sk];
  const answered = sectionAnswers(state.profile, sk);
  for (let i = startIdx; i < sec.questions.length; i++) {
    if (!answered[sec.questions[i].id]) return i;
  }
  return -1;
}

function computeCrewScores(allProfiles, week) {
  const crewData = {};
  CREWS.forEach(c => { crewData[c] = { ga:{c:0,a:0}, mu:{c:0,a:0}, mc:{c:0,a:0}, rc:{c:0,a:0}, members:new Set() }; });
  Object.entries(allProfiles).forEach(([key, prof]) => {
    if (!prof || !prof.crew || isAdmin(prof)) return;
    const d = crewData[prof.crew];
    if (!d) return;
    Object.keys(SECTIONS_META).forEach(sk => {
      Object.values(sectionAnswers(prof, sk)).forEach(a => {
        if (a.week === week) { d[sk].a++; if (a.correct) d[sk].c++; d.members.add(key); }
      });
    });
  });
  return CREWS.map(c => {
    const d = crewData[c];
    const avgs = ['ga','mu','mc','rc'].map(sk => d[sk].a ? d[sk].c/d[sk].a : null).filter(v => v !== null);
    return { name: c, score: avgs.length ? avgs.reduce((a,b)=>a+b,0)/avgs.length : null, active: d.members.size };
  });
}

// ─────────────────────────────────────────────
// SHARED UI FRAGMENTS
// ─────────────────────────────────────────────
const BOLT_SVG = '<svg width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" fill="#F2A900"/><path d="M13 3 L6 13 H11 L9.5 21 L18 10 H12.5 Z" fill="#0A3D62"/></svg>';
const BOLT_SVG_CONSOLE = '<svg width="22" height="22" viewBox="0 0 24 24"><rect width="24" height="24" fill="#F2A900"/><path d="M13 3 L6 13 H11 L9.5 21 L18 10 H12.5 Z" fill="#37414B"/></svg>';
const CORNER_MARK = `<div style="position:absolute;top:28px;left:32px;display:flex;align-items:center;gap:10px;">
  <svg width="26" height="26" viewBox="0 0 24 24"><rect width="24" height="24" fill="#0A3D62"/><path d="M13 3 L6 13 H11 L9.5 21 L18 10 H12.5 Z" fill="#F2A900"/></svg>
  <div class="mono" style="font-size:11px;letter-spacing:0.14em;color:#4A5560;">TOOLS OF THE TRADE</div>
</div>`;

function rivets4(size) {
  const s = size || 6;
  return `<div class="rivet tl" style="width:${s}px;height:${s}px"></div><div class="rivet tr" style="width:${s}px;height:${s}px"></div><div class="rivet bl" style="width:${s}px;height:${s}px"></div><div class="rivet br" style="width:${s}px;height:${s}px"></div>`;
}

function dimDivider() {
  return `<div class="dim-divider"><i></i><u></u><i></i><u></u><i></i></div>`;
}

function renderNav(active) {
  const p = state.profile;
  const chip = p ? `<div class="nav-chip"><span class="nav-chip-swatch" style="background:${crewColor(p.crew)}"></span><span class="nav-chip-name">${escHtml(p.firstName)} · ${isAdmin(p) ? 'Instructor' : escHtml(p.crew||'')}</span></div>` : '<div></div>';
  return `
  <div class="nav">
    <a class="nav-brand" data-nav="dashboard">
      ${BOLT_SVG}
      <div><div class="nav-brand-title">Tools of the Trade</div><div class="nav-brand-sub">CAST-R PREP</div></div>
    </a>
    <div class="nav-links">
      <button class="nav-link${active==='dashboard'?' active':''}" data-nav="dashboard">Dashboard</button>
      <button class="nav-link${active==='progress'?' active':''}" data-nav="progress">My Progress</button>
      <button class="nav-link${active==='leaderboard'?' active':''}" data-nav="leaderboard">Leaderboard</button>
      <button class="nav-link${active==='settings'?' active':''}" data-nav="settings">Settings</button>
    </div>
    ${chip}
  </div>`;
}

function practiceRibbon() {
  if (!state.adminPractice) return '';
  return `
  <div class="practice-ribbon">
    <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:200px;">
      <span class="ribbon-badge">PRACTICE</span>
      <span style="font-size:12.5px;color:#37414B;font-weight:500;">You're in the student app. Attempts score for you but never count toward any crew or the leaderboard.</span>
    </div>
    <button class="ribbon-back" data-action="back-to-admin"><span style="font-size:14px;">←</span> Back to admin console</button>
  </div>`;
}

function localBanner() {
  return storageMode==='local' ? `<div class="local-mode-banner">📡 Local mode — leaderboard shows this device only. See SETUP.md to enable shared scores.</div>` : '';
}

// ─────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────
const app = document.getElementById('app');

function navigate(screen, params) {
  Object.assign(state, { screen, ...(params||{}) });
  render();
  window.scrollTo(0,0);
}

async function render() {
  const s = state.screen;
  if (s === 'landing') { app.innerHTML = renderLanding(); attachLanding(); return; }
  if (s === 'onboard') { app.innerHTML = renderOnboard(); attachOnboard(); return; }
  if (s === 'return_pin') { app.innerHTML = renderReturnPin(); attachReturnPin(); return; }
  if (s === 'dashboard') { app.innerHTML = await renderDashboard(); return; }
  if (s === 'question') { app.innerHTML = renderQuestion(); return; }
  if (s === 'feedback') { app.innerHTML = renderFeedback(); attachFeedback(); return; }
  if (s === 'summary') { app.innerHTML = renderSummary(); return; }
  if (s === 'progress') { app.innerHTML = await renderProgress(); return; }
  if (s === 'leaderboard') { app.innerHTML = await renderLeaderboard(); return; }
  if (s === 'settings') { app.innerHTML = renderSettings(); attachSettings(); return; }
  if (s === 'admin') { app.innerHTML = await renderAdmin(); return; }
}

// ─────────────────────────────────────────────
// EVENT DELEGATION
// ─────────────────────────────────────────────
document.addEventListener('click', async function(e) {
  const nav = e.target.closest('[data-nav]');
  if (nav) { e.preventDefault(); navigate(nav.dataset.nav); return; }

  const opt = e.target.closest('.option-row[data-letter]');
  if (opt && state.screen === 'question') {
    state.sessionAnswered = opt.dataset.letter;
    document.querySelectorAll('.option-row').forEach(b => b.classList.toggle('selected', b.dataset.letter === state.sessionAnswered));
    const sub = document.getElementById('btn-submit-answer');
    if (sub) { sub.disabled = false; }
    const hint = document.getElementById('submit-hint');
    if (hint) hint.style.visibility = 'hidden';
    return;
  }

  const brk = e.target.closest('.breaker[data-crew]');
  if (brk) {
    state._pendingCrew = brk.dataset.crew;
    document.querySelectorAll('.breaker[data-crew]').forEach(b => {
      const on = b.dataset.crew === state._pendingCrew;
      b.classList.toggle('on', on);
      const st = b.querySelector('.breaker-state');
      if (st) st.textContent = on ? 'ON' : 'OFF';
    });
    const joinBtn = document.getElementById('btn-join-crew');
    if (joinBtn) { joinBtn.disabled = false; joinBtn.textContent = 'Join ' + state._pendingCrew + ' →'; }
    const saveBtn = document.getElementById('btn-save-crew');
    if (saveBtn) saveBtn.disabled = false;
    return;
  }

  const chip = e.target.closest('.chip[data-filter]');
  if (chip) { state.adminFilter = chip.dataset.filter; render(); return; }

  const tab = e.target.closest('.console-tab[data-tab]');
  if (tab) { state.adminTab = tab.dataset.tab; render(); return; }

  const th = e.target.closest('[data-sort]');
  if (th) {
    if (state.adminSortCol === th.dataset.sort) state.adminSortDir *= -1;
    else { state.adminSortCol = th.dataset.sort; state.adminSortDir = 1; }
    render(); return;
  }

  const row = e.target.closest('[data-student-key]');
  if (row && !e.target.closest('[data-action]') && !e.target.closest('input') && !e.target.closest('select')) {
    const k = row.dataset.studentKey;
    state.adminExpandedRow = state.adminExpandedRow === k ? null : k;
    render(); return;
  }

  const btn = e.target.closest('[data-action]');
  if (btn) { await handleAction(btn.dataset.action, btn.dataset); return; }
});

async function handleAction(action, data) {
  if (action === 'submit-answer') {
    if (state.sessionAnswered === null) return;
    const sec = SECTIONS_META[state.sessionSection];
    const q = sec.questions[state.sessionIdx];
    const isCorrect = state.sessionAnswered === q.opts.find(o=>o.c).l;
    if (isCorrect) state.sessionCorrect++;
    state.sessionTotal++;
    state.sessionResults.push(isCorrect);
    const p = state.profile;
    if (!p.answers) p.answers = {};
    if (!p.answers[state.sessionSection]) p.answers[state.sessionSection] = {};
    p.answers[state.sessionSection][q.id] = {
      chosen: state.sessionAnswered, correct: isCorrect, week: currentWeek(), ts: Date.now()
    };
    p.lastActiveTs = Date.now();
    await DB.setProfile(state.userKey, p);
    state.flagOpen = false; state.flagSent = false;
    navigate('feedback');
    return;
  }
  if (action === 'next-question') {
    const nextIdx = findNextUnanswered(state.sessionSection, state.sessionIdx + 1);
    if (nextIdx === -1) { navigate('summary'); }
    else { state.sessionIdx = nextIdx; state.sessionAnswered = null; navigate('question'); }
    return;
  }
  if (action === 'finish-session') { navigate('summary'); return; }
  if (action === 'back-dashboard') { navigate('dashboard'); return; }
  if (action === 'start-section') {
    const sk = data.section;
    const idx = findNextUnanswered(sk, 0);
    if (idx === -1 && Object.keys(sectionAnswers(state.profile, sk)).length >= SECTIONS_META[sk].questions.length) {
      return; // section fully complete
    }
    Object.assign(state, { sessionSection: sk, sessionIdx: idx === -1 ? 0 : idx, sessionAnswered: null, sessionCorrect: 0, sessionTotal: 0, sessionResults: [] });
    navigate('question');
    return;
  }
  if (action === 'open-flag') { state.flagOpen = true; render(); return; }
  if (action === 'close-flag') { state.flagOpen = false; render(); return; }
  if (action === 'submit-flag') {
    const inp = document.getElementById('flag-reason-input');
    const reason = inp ? inp.value.trim() : '';
    if (!reason) return;
    const sec = SECTIONS_META[state.sessionSection];
    const q = sec.questions[state.sessionIdx];
    await DB.addFlag(Date.now() + '_' + q.id, {
      qid: q.id, section: sec.label, reason,
      who: state.profile.firstName + ' ' + state.profile.lastName,
      userKey: state.userKey, crew: state.profile.crew,
      ts: Date.now(), week: currentWeek()
    });
    state.flagOpen = false; state.flagSent = true;
    render(); return;
  }
  if (action === 'back-to-admin') { state.adminPractice = false; navigate('admin'); return; }
  if (action === 'admin-practice') { state.adminPractice = true; navigate('dashboard'); return; }
  if (action === 'admin-delete-flag') { await DB.deleteFlag(data.flagid); render(); return; }
  if (action === 'export-csv') { await exportCSV(); return; }
  if (action === 'admin-save-edit') {
    const key = data.key, field = data.field;
    const inp = document.getElementById('edit-' + field + '-' + key);
    if (!inp) return;
    const val = inp.value.trim();
    if (!val) return;
    const prof = await DB.getProfile(key);
    if (!prof) return;
    if (field === 'pin') { prof.pin = val; await DB.setProfile(key, prof); }
    else if (field === 'crew') { prof.crew = val; await DB.setProfile(key, prof); }
    render(); return;
  }
  if (action === 'logout') {
    Object.assign(state, { userKey:null, profile:null, adminPractice:false });
    navigate('landing'); return;
  }
}

// ─────────────────────────────────────────────
// 01 LANDING
// ─────────────────────────────────────────────
function renderLanding() {
  return `
  <div class="blueprint-bg" style="min-height:100vh;position:relative;display:flex;align-items:center;justify-content:center;padding:24px;">
    ${CORNER_MARK}
    <div style="width:440px;max-width:100%;text-align:center;">
      <div class="display-title" style="font-size:58px;line-height:0.98;">CAST-R<br>Prep</div>
      <div style="font-size:16px;color:#4A5560;margin-top:14px;line-height:1.5;">Practice for the aptitude test with your crew.<br>Enter your name to jump back in.</div>
      ${localBanner() ? '<div style="margin-top:18px;text-align:left;">'+localBanner()+'</div>' : ''}
      <div style="margin-top:40px;text-align:left;background:#fff;border:1px solid #C3CCD3;padding:26px 26px 28px;box-shadow:0 12px 24px -18px rgba(35,48,58,0.4);">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div>
            <div class="field-label">First name</div>
            <input id="inp-first" class="text-input" type="text" autocomplete="given-name" autocapitalize="words">
          </div>
          <div>
            <div class="field-label">Last name</div>
            <input id="inp-last" class="text-input" type="text" autocomplete="family-name" autocapitalize="words">
          </div>
        </div>
        <button class="btn-amber" id="btn-continue" style="margin-top:18px;">Continue</button>
        <div id="landing-error" style="color:#B87333;font-size:12.5px;text-align:center;margin-top:10px;min-height:18px;"></div>
      </div>
    </div>
  </div>`;
}
function attachLanding() {
  const btn = document.getElementById('btn-continue');
  const f = document.getElementById('inp-first');
  const l = document.getElementById('inp-last');
  const err = document.getElementById('landing-error');
  async function go() {
    const first = f.value.trim(), last = l.value.trim();
    if (!first || !last) { err.textContent = 'Please enter your full name.'; return; }
    err.textContent = '';
    btn.disabled = true; btn.textContent = 'Checking…';
    const key = encodeKey(first + '_' + last);
    const existing = await DB.getProfile(key);
    btn.disabled = false; btn.textContent = 'Continue';
    state.pendingFirst = first; state.pendingLast = last;
    if (existing) { state.userKey = key; navigate('return_pin'); }
    else { state._pendingCrew = null; state._pendingPin = ''; navigate('onboard'); }
  }
  btn.addEventListener('click', go);
  [f,l].forEach(inp => inp.addEventListener('keydown', e => { if (e.key==='Enter') go(); }));
}

// ─────────────────────────────────────────────
// 02 ONBOARDING — PIN + breaker panel, one screen
// ─────────────────────────────────────────────
function renderOnboard() {
  return `
  <div style="min-height:100vh;display:flex;flex-wrap:wrap;" class="onboard-grid blueprint-bg">
    <div style="width:440px;max-width:100%;padding:56px 44px;display:flex;flex-direction:column;justify-content:center;border-right:1px solid #C3CCD3;background:#fff;">
      <div class="mono" style="font-size:12px;letter-spacing:0.16em;color:#B87333;">NEW HERE — LET'S SET YOU UP</div>
      <div class="display-title" style="font-size:38px;margin-top:12px;">Welcome,<br>${escHtml(state.pendingFirst)}</div>
      <div style="font-size:15px;color:#4A5560;margin-top:12px;line-height:1.5;">Two quick steps and you're in. First, set a 4-digit PIN you'll use to sign back in.</div>
      <div style="margin-top:30px;">
        <div class="section-label-sm" style="margin-bottom:10px;">Step 1 · Set your PIN</div>
        <div class="pin-row" id="pin-group-set"></div>
      </div>
      <button class="btn-outline" data-nav="landing" style="margin-top:34px;align-self:flex-start;">← Back</button>
    </div>
    <div style="flex:1;min-width:300px;padding:44px 48px;display:flex;flex-direction:column;justify-content:center;">
      <div class="section-label-sm" style="margin-bottom:4px;">Step 2 · Pick your crew</div>
      <div style="font-size:14px;color:#4A5560;margin-bottom:22px;">Flip a breaker to join. You can switch later in Settings.</div>
      <div class="breaker-panel">
        <div class="panel-rivet tl"></div><div class="panel-rivet tr"></div><div class="panel-rivet bl"></div><div class="panel-rivet br"></div>
        <div class="breaker-panel-title">CREW SELECTION PANEL · 3-POLE</div>
        <div class="breaker-row">
          ${CREWS.map(c => `
          <div class="breaker${state._pendingCrew===c?' on':''}" data-crew="${c}">
            <div class="breaker-name">${c}</div>
            <div class="breaker-slot"><div class="breaker-handle"></div></div>
            <div class="breaker-state">${state._pendingCrew===c?'ON':'OFF'}</div>
          </div>`).join('')}
        </div>
      </div>
      <div style="margin-top:26px;display:flex;justify-content:flex-end;">
        <button class="btn-amber" id="btn-join-crew" style="width:auto;padding:14px 40px;" ${!state._pendingCrew?'disabled':''}>${state._pendingCrew ? 'Join '+state._pendingCrew+' →' : 'Pick a crew'}</button>
      </div>
      <div id="onboard-error" style="color:#B87333;font-size:12.5px;text-align:right;margin-top:10px;min-height:18px;"></div>
    </div>
  </div>`;
}
function attachOnboard() {
  renderPinBoxes('pin-group-set', 4, 'pin-set-', () => {
    state._pendingPin = getPinValue('pin-set-', 4);
  });
  document.getElementById('btn-join-crew').addEventListener('click', async () => {
    const err = document.getElementById('onboard-error');
    state._pendingPin = getPinValue('pin-set-', 4);
    if (state._pendingPin.length < 4) { err.textContent = 'Set your 4-digit PIN first (Step 1).'; return; }
    if (!state._pendingCrew) { err.textContent = 'Flip a breaker to pick your crew.'; return; }
    const key = encodeKey(state.pendingFirst + '_' + state.pendingLast);
    const profile = {
      firstName: state.pendingFirst, lastName: state.pendingLast,
      crew: state._pendingCrew, pin: state._pendingPin,
      answers: {}, joinedWeek: currentWeek(), joinedTs: Date.now(), lastActiveTs: Date.now()
    };
    await DB.setProfile(key, profile);
    state.userKey = key; state.profile = profile;
    if (isAdmin(profile)) navigate('admin'); else navigate('dashboard');
  });
}

// ─────────────────────────────────────────────
// 03 RETURN SIGN-IN
// ─────────────────────────────────────────────
function renderReturnPin() {
  const initial = (state.pendingFirst[0]||'?').toUpperCase();
  return `
  <div class="blueprint-bg" style="min-height:100vh;position:relative;display:flex;align-items:center;justify-content:center;padding:24px;">
    ${CORNER_MARK}
    <div style="width:420px;max-width:100%;background:#fff;border:1px solid #C3CCD3;padding:40px 40px 42px;" class="card-shadow">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="avatar">${initial}</div>
        <div>
          <div class="oswald" style="font-weight:600;text-transform:uppercase;font-size:20px;color:#0A3D62;line-height:1;">Welcome back, ${escHtml(state.pendingFirst)}</div>
          <div id="return-crew-line" style="font-size:12px;color:#4A5560;margin-top:3px;"></div>
        </div>
      </div>
      <div class="field-label" style="margin:28px 0 10px;">Enter your PIN</div>
      <div class="pin-row" id="pin-group-return"></div>
      <button class="btn-amber" id="btn-pin-submit" style="margin-top:22px;" disabled>Sign in</button>
      <div id="pin-error" style="color:#B87333;font-size:12.5px;text-align:center;margin-top:10px;min-height:18px;"></div>
      <div style="margin-top:8px;text-align:center;font-size:12px;color:#4A5560;">Forgot your PIN? <a href="mailto:${CONTACT_EMAIL}?subject=CAST-R%20PIN%20Reset&body=Hi%2C%20I%20forgot%20my%20PIN.%20My%20name%20is%20${encodeURIComponent(state.pendingFirst+' '+state.pendingLast)}." style="color:#B87333;font-weight:600;">Email the instructor</a></div>
      <div style="margin-top:14px;text-align:center;"><button class="btn-outline" data-nav="landing" style="padding:9px 18px;font-size:12px;">← Not you?</button></div>
    </div>
  </div>`;
}
function attachReturnPin() {
  DB.getProfile(state.userKey).then(prof => {
    const line = document.getElementById('return-crew-line');
    if (line && prof) line.innerHTML = `<span style="display:inline-block;width:9px;height:9px;background:${crewColor(prof.crew)};border-radius:2px;vertical-align:-1px;margin-right:5px;"></span>${escHtml(prof.crew)} crew`;
  });
  renderPinBoxes('pin-group-return', 4, 'pin-ret-', () => {
    document.getElementById('btn-pin-submit').disabled = getPinValue('pin-ret-', 4).length < 4;
  });
  const doSubmit = async () => {
    const val = getPinValue('pin-ret-', 4);
    if (val.length < 4) return;
    const btn = document.getElementById('btn-pin-submit');
    btn.disabled = true; btn.textContent = 'Checking…';
    const prof = await DB.getProfile(state.userKey);
    if (!prof || prof.pin !== val) {
      document.getElementById('pin-error').textContent = 'Incorrect PIN. Try again.';
      btn.disabled = false; btn.textContent = 'Sign in';
      return;
    }
    state.profile = prof;
    prof.lastActiveTs = Date.now();
    await DB.setProfile(state.userKey, prof);
    if (isAdmin(prof)) navigate('admin'); else navigate('dashboard');
  };
  document.getElementById('btn-pin-submit').addEventListener('click', doSubmit);
}

// ─────────────────────────────────────────────
// 04 DASHBOARD
// ─────────────────────────────────────────────
async function renderDashboard() {
  const p = state.profile;
  const week = currentWeek();
  const allProfiles = await DB.getAllProfiles();
  const scores = computeCrewScores(allProfiles, week).sort((a,b)=>(b.score??-1)-(a.score??-1));
  const optLabel = { ga:'5 OPTIONS · A–E', mu:'5 OPTIONS · A–E', mc:'3 OPTIONS · A–C', rc:'4 OPTIONS · A–D' };

  const cards = Object.values(SECTIONS_META).map(s => {
    const st = sectionStats(p, s.key);
    const pct = s.total ? Math.round(st.attempted / s.total * 100) : 0;
    const done = st.attempted >= s.total;
    return `
    <div class="plate" data-action="start-section" data-section="${s.key}" style="padding:18px 20px 20px;cursor:pointer;">
      ${rivets4()}
      <div class="oswald" style="text-transform:uppercase;letter-spacing:0.06em;font-size:16px;color:#0A3D62;">${s.label}</div>
      <div style="display:flex;align-items:baseline;gap:8px;margin-top:8px;"><span class="mono" style="font-weight:600;font-size:34px;color:#23303A;">${st.attempted}</span><span class="mono" style="font-size:15px;color:#4A5560;">of ${s.total} done</span></div>
      <div style="margin-top:12px;height:8px;background:#E3E8EB;border:1px solid #C3CCD3;"><div style="width:${pct}%;height:100%;background:${pct>=75?'#2E7D46':'#F2A900'};"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:8px;" class="mono"><span style="font-size:11px;color:#4A5560;">${optLabel[s.key]}</span><span style="font-size:11px;color:#B87333;font-weight:600;">${done?'Complete ✓':(st.attempted?'Resume →':'Start →')}</span></div>
    </div>`;
  }).join('');

  const lbRows = scores.map((c,i) => `
  <div style="display:flex;align-items:center;gap:12px;padding:12px 0;${i<scores.length-1?'border-bottom:1px solid #E3E8EB;':''}">
    <span class="mono" style="font-weight:600;font-size:16px;color:${i===0?'#F2A900':'#4A5560'};width:18px;">${i+1}</span>
    <span style="width:12px;height:12px;background:${crewColor(c.name)};border-radius:3px;"></span>
    <span class="oswald" style="flex:1;text-transform:uppercase;font-size:16px;color:#23303A;">${c.name}</span>
    <span class="mono" style="font-weight:600;font-size:16px;color:#23303A;">${c.score===null?'—':Math.round(c.score*100)+'%'}</span>
  </div>`).join('');

  const greeting = state.adminPractice
    ? `<div class="eyebrow">PRACTICE RUN</div><div class="display-title" style="font-size:34px;margin-top:4px;">Pick a section to try</div>`
    : `<div class="eyebrow">WELCOME BACK</div><div class="display-title" style="font-size:34px;margin-top:4px;">Good to see you, ${escHtml(p.firstName)}</div>`;

  return `
  ${practiceRibbon()}
  ${renderNav('dashboard')}
  <div class="screen-pad blueprint-bg">
    ${localBanner()}
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;flex-wrap:wrap;gap:16px;">
      <div>${greeting}</div>
      <div class="plate" style="background:${state.adminPractice?'#37414B':'#0A3D62'};color:#fff;padding:14px 22px 16px;min-width:180px;border:none;">
        ${rivets4()}
        <div class="oswald" style="text-transform:uppercase;letter-spacing:0.1em;font-size:10px;color:rgba(255,255,255,0.7);">${state.adminPractice?'Practicing as':'Your crew'}</div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:4px;"><span style="width:16px;height:16px;background:${state.adminPractice?'#F2A900':crewColor(p.crew)};border-radius:3px;"></span><span class="oswald" style="font-weight:600;text-transform:uppercase;font-size:26px;">${state.adminPractice?'Instructor':escHtml(p.crew)}</span></div>
      </div>
    </div>
    <div class="dash-grid" style="display:grid;grid-template-columns:1fr 320px;gap:24px;align-items:start;">
      <div>
        <div class="oswald" style="text-transform:uppercase;letter-spacing:0.1em;font-size:13px;color:#4A5560;margin-bottom:12px;">Practice sections</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;">${cards}</div>
      </div>
      <div class="plate" style="padding:20px 22px;">
        ${rivets4()}
        <div style="display:flex;justify-content:space-between;align-items:baseline;"><div class="oswald" style="text-transform:uppercase;letter-spacing:0.08em;font-size:15px;color:#0A3D62;">This week</div><div class="mono" style="font-size:11px;color:#4A5560;">WK ${String(week).padStart(2,'0')}</div></div>
        <div style="font-size:11px;color:#4A5560;margin-top:2px;margin-bottom:8px;">Crew standings</div>
        ${lbRows}
        <button class="btn-outline-blue" data-nav="leaderboard" style="display:block;width:100%;margin-top:18px;">See full leaderboard →</button>
      </div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// 05 SETTINGS
// ─────────────────────────────────────────────
function renderSettings() {
  const p = state.profile;
  return `
  ${practiceRibbon()}
  ${renderNav('settings')}
  <div class="screen-pad blueprint-bg">
    <div class="display-title" style="font-size:30px;">Settings</div>
    ${dimDivider()}
    <div class="settings-grid" style="display:grid;grid-template-columns:340px 1fr;gap:28px;align-items:start;">
      <div style="display:flex;flex-direction:column;gap:20px;">
        <div style="background:#fff;border:1px solid #C3CCD3;padding:20px 22px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div class="oswald" style="text-transform:uppercase;letter-spacing:0.08em;font-size:13px;color:#4A5560;">Name</div>
            <div class="mono" style="font-size:10px;color:#4A5560;">🔒 LOCKED</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:10px;">
            <div><div class="mono" style="font-size:10px;letter-spacing:0.1em;color:#4A5560;">FIRST</div><div style="font-size:20px;color:#23303A;margin-top:2px;">${escHtml(p.firstName)}</div></div>
            <div><div class="mono" style="font-size:10px;letter-spacing:0.1em;color:#4A5560;">LAST</div><div style="font-size:20px;color:#23303A;margin-top:2px;">${escHtml(p.lastName)}</div></div>
          </div>
          <div style="font-size:12px;color:#4A5560;margin-top:10px;">Your name is your account key, so it can't be changed. Email the instructor (see Help below) if it's wrong.</div>
        </div>
        <div style="background:#fff;border:1px solid #C3CCD3;padding:20px 22px;">
          <div class="oswald" style="text-transform:uppercase;letter-spacing:0.08em;font-size:13px;color:#4A5560;">Reset PIN</div>
          <div style="font-size:12px;color:#4A5560;margin-top:6px;">Enter a new 4-digit PIN.</div>
          <div class="pin-row" id="pin-change-group" style="gap:9px;margin-top:12px;"></div>
          <button class="btn-amber" id="btn-save-pin" style="margin-top:16px;font-size:14px;padding:11px;" disabled>Save new PIN</button>
          <div id="pin-change-msg" style="color:#2E7D46;font-size:12.5px;text-align:center;margin-top:8px;min-height:18px;"></div>
        </div>
        <div style="background:#fff;border:1px solid #C3CCD3;border-top:4px solid #0A3D62;padding:20px 22px;">
          <div class="oswald" style="display:flex;align-items:center;gap:8px;text-transform:uppercase;letter-spacing:0.08em;font-size:13px;color:#4A5560;">ⓘ Having a problem with your account?</div>
          <div style="font-size:12px;color:#4A5560;margin-top:8px;line-height:1.5;">Forgot your PIN, picked the wrong crew, or locked out? Email the instructor directly — account fixes are handled over email, since the app can't verify who you are.</div>
          <a href="mailto:${CONTACT_EMAIL}?subject=CAST-R%20Account%20Help" style="margin-top:14px;display:flex;align-items:center;justify-content:center;gap:8px;background:#0A3D62;color:#fff;font-family:Oswald,sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;font-size:13px;padding:12px;text-decoration:none;">✉ Email the instructor</a>
        </div>
      </div>
      <div style="background:#fff;border:1px solid #C3CCD3;padding:22px 24px;">
        <div class="oswald" style="text-transform:uppercase;letter-spacing:0.08em;font-size:13px;color:#4A5560;">Re-pick your crew</div>
        <div style="font-size:12px;color:#4A5560;margin-top:6px;margin-bottom:18px;">Flip a different breaker to switch crews. Your progress comes with you.</div>
        <div class="breaker-panel" style="padding:22px 22px 24px;">
          <div class="panel-rivet tl"></div><div class="panel-rivet tr"></div><div class="panel-rivet bl"></div><div class="panel-rivet br"></div>
          <div class="breaker-row" style="gap:16px;">
            ${CREWS.map(c => {
              const on = (state._pendingCrew || p.crew) === c;
              const isCurrent = p.crew === c;
              return `
              <div class="breaker${on?' on':''}" data-crew="${c}" style="width:140px;">
                <div class="breaker-name" style="font-size:14px;">${c}</div>
                <div class="breaker-slot" style="width:46px;height:78px;"><div class="breaker-handle" style="width:36px;height:33px;"></div></div>
                <div class="breaker-state" style="font-size:10px;">${on?(isCurrent?'ON · CURRENT':'ON'):'OFF'}</div>
              </div>`;
            }).join('')}
          </div>
        </div>
        <div style="margin-top:20px;display:flex;gap:12px;justify-content:flex-end;flex-wrap:wrap;">
          <button class="btn-outline" data-action="logout">Sign out</button>
          <button class="btn-blue" id="btn-save-crew" ${(!state._pendingCrew || state._pendingCrew===p.crew)?'disabled style="opacity:.5;cursor:not-allowed;"':''}>Save changes</button>
        </div>
        <div id="crew-save-msg" style="color:#2E7D46;font-size:12.5px;text-align:right;margin-top:8px;min-height:18px;"></div>
      </div>
    </div>
  </div>`;
}
function attachSettings() {
  state._pendingCrew = null;
  renderPinBoxes('pin-change-group', 4, 'pin-chg-', () => {
    document.getElementById('btn-save-pin').disabled = getPinValue('pin-chg-', 4).length < 4;
  });
  document.getElementById('btn-save-pin').addEventListener('click', async () => {
    const val = getPinValue('pin-chg-', 4);
    if (val.length < 4) return;
    state.profile.pin = val;
    await DB.setProfile(state.userKey, state.profile);
    document.getElementById('pin-change-msg').textContent = '✓ PIN updated';
    document.getElementById('btn-save-pin').disabled = true;
  });
  document.getElementById('btn-save-crew').addEventListener('click', async () => {
    if (!state._pendingCrew || state._pendingCrew === state.profile.crew) return;
    state.profile.crew = state._pendingCrew;
    await DB.setProfile(state.userKey, state.profile);
    state._pendingCrew = null;
    render();
  });
}

// ─────────────────────────────────────────────
// 06/07 QUESTION + FEEDBACK
// ─────────────────────────────────────────────
function questionShell(rightHtml) {
  const sec = SECTIONS_META[state.sessionSection];
  const q = sec.questions[state.sessionIdx];
  const pct = Math.round((state.sessionIdx+1) / sec.total * 100);

  const eyebrowTxt = state.sessionSection === 'ga' && q.drawing
    ? 'DRAWING · ' + q.drawing.replace(/_/g,' ').toUpperCase()
    : state.sessionSection === 'rc' && q.passage
      ? 'PASSAGE · ' + (RC_PASSAGES[q.passage]?.title || '').toUpperCase()
      : sec.label.toUpperCase();

  let media = '';
  if (state.sessionSection === 'ga' && q.drawing) {
    media = `<div class="drawing-box">${renderDrawing(q)}<div class="fig-caption">FIG. 1 — TOP-DOWN VIEW</div></div>`;
  } else if (state.sessionSection === 'rc' && q.passage) {
    const psg = RC_PASSAGES[q.passage];
    media = `<div class="rc-passage"><h4>${escHtml(psg.title)}</h4>${escHtml(psg.text)}</div>`;
  }

  return `
  ${practiceRibbon()}
  <div class="q-header">
    <button class="q-back" data-action="finish-session"><span style="font-size:16px;">←</span> Finish for now</button>
    <div class="q-section-name">${sec.label}</div>
    <div class="q-counter">Q ${state.sessionIdx+1} / ${sec.total}</div>
  </div>
  <div class="q-progress"><i style="width:${pct}%"></i></div>
  <div class="q-grid">
    <div class="q-left blueprint-bg" style="background-size:26px 26px;">
      <div class="mono" style="font-size:12px;letter-spacing:0.12em;color:#B87333;">${eyebrowTxt}</div>
      <div class="q-prompt-title">${escHtml(q.prompt)}</div>
      ${media}
    </div>
    <div class="q-right">${rightHtml}</div>
  </div>`;
}

function renderQuestion() {
  const sec = SECTIONS_META[state.sessionSection];
  const q = sec.questions[state.sessionIdx];
  const opts = q.opts.map(o => `
  <button class="option-row${state.sessionAnswered===o.l?' selected':''}" data-letter="${o.l}">
    <span class="option-badge">${o.l}</span>
    <span class="option-text${/^[\d.]/.test(o.t)?'':' sans'}">${escHtml(o.t)}</span>
  </button>`).join('');

  return questionShell(`
    <div class="oswald" style="text-transform:uppercase;letter-spacing:0.1em;font-size:12px;color:#4A5560;">Select one answer</div>
    <div style="font-size:12px;color:#4A5560;margin-top:4px;margin-bottom:18px;">${{
      ga:'Work from the labeled dimensions — the drawing is not to scale.',
      mu:'No calculator on the real test — build your speed.',
      mc:'No math needed — reason it out.',
      rc:'Every answer comes from the passage alone.'
    }[state.sessionSection]}</div>
    <div style="display:flex;flex-direction:column;gap:12px;flex:1;">${opts}</div>
    <button class="btn-amber" id="btn-submit-answer" data-action="submit-answer" style="margin-top:18px;padding:15px;" ${state.sessionAnswered?'':'disabled'}>Submit answer</button>
    <div id="submit-hint" style="text-align:center;font-size:11px;color:#4A5560;margin-top:8px;">Select an option to continue</div>
  `);
}

function renderFeedback() {
  const sec = SECTIONS_META[state.sessionSection];
  const q = sec.questions[state.sessionIdx];
  const correctOpt = q.opts.find(o => o.c);
  const isCorrect = state.sessionAnswered === correctOpt.l;
  const nextIdx = findNextUnanswered(sec.key, state.sessionIdx + 1);

  const banner = isCorrect
    ? `<div class="fb-banner hit">
        <div class="fb-banner-title"><span class="fb-banner-icon" style="background:#2E7D46;">✓</span> Correct — nice work</div>
        <div class="fb-rationale">${escHtml(q.rationale)}</div>
      </div>`
    : `<div class="fb-banner miss">
        <div class="fb-banner-title"><span class="fb-banner-icon" style="background:#B87333;">↻</span> Not quite — worth a re-try</div>
        <div class="fb-rationale">${escHtml(q.rationale)}</div>
      </div>`;

  const opts = q.opts.map(o => {
    if (o.c) {
      return `<div class="option-row fb-correct"><div style="display:flex;align-items:center;gap:14px;"><span class="option-badge">${o.l}</span><span class="option-text${/^[\d.]/.test(o.t)?'':' sans'}" style="font-weight:600;">${escHtml(o.t)}</span></div><span class="fb-tag ok">CORRECT</span></div>`;
    }
    if (o.l === state.sessionAnswered) {
      return `<div class="option-row fb-pick"><div style="display:flex;align-items:center;gap:14px;"><span class="option-badge">${o.l}</span><span class="option-text${/^[\d.]/.test(o.t)?'':' sans'}">${escHtml(o.t)}</span></div><span class="fb-tag">YOUR PICK</span></div>`;
    }
    return `<div class="option-row fb-dim"><span class="option-badge">${o.l}</span><span class="option-text${/^[\d.]/.test(o.t)?'':' sans'}" style="color:#4A5560;">${escHtml(o.t)}</span></div>`;
  }).join('');

  const flagModal = state.flagOpen ? `
  <div class="modal-overlay" id="flag-overlay">
    <div class="modal">
      <div class="modal-head">
        <div class="modal-title">⚑ Something wrong with this question?</div>
        <button data-action="close-flag" style="color:rgba(244,246,248,0.7);font-size:20px;background:none;border:none;cursor:pointer;">×</button>
      </div>
      <div style="padding:24px 26px 26px;">
        <div style="font-size:13.5px;color:#4A5560;line-height:1.55;">Tell us what looks off and we'll take a look. Your answer on this question <span style="color:#23303A;font-weight:600;">still counts</span> — this is a report to the instructor, not a way to redo it.</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:18px;background:#F4F6F8;border:1px solid #E3E8EB;padding:10px 14px;flex-wrap:wrap;">
          <span class="oswald" style="text-transform:uppercase;letter-spacing:0.08em;font-size:11px;color:#4A5560;">Question</span>
          <span class="mono" style="font-size:13px;color:#23303A;">${q.id.toUpperCase().replace('_','-')}</span>
          <span style="color:#9aa5ae;">·</span>
          <span style="font-size:12.5px;color:#4A5560;">${sec.label}</span>
        </div>
        <div class="oswald" style="text-transform:uppercase;letter-spacing:0.1em;font-size:11px;color:#4A5560;margin:18px 0 8px;">What's wrong?</div>
        <textarea id="flag-reason-input" style="width:100%;border:1.5px solid #0A3D62;background:#fff;padding:13px 15px;min-height:96px;font-size:14px;color:#23303A;line-height:1.5;resize:vertical;outline:none;border-radius:0;" placeholder="e.g. I think the answer is actually C"></textarea>
        <div class="mono" style="font-size:11px;color:#9aa5ae;margin-top:6px;">SENT WITH YOUR NAME · ${escHtml((state.profile.firstName+' '+state.profile.lastName).toUpperCase())}</div>
        <div style="display:flex;gap:12px;margin-top:20px;">
          <button class="btn-outline" data-action="close-flag" style="flex:1;">Cancel</button>
          <button class="btn-amber" data-action="submit-flag" style="flex:1.4;font-size:14px;padding:13px;">Submit flag</button>
        </div>
      </div>
    </div>
  </div>` : '';

  const flagToast = state.flagSent ? `
  <div style="position:fixed;bottom:26px;right:26px;width:320px;max-width:calc(100vw - 40px);background:#fff;border:1px solid #C3CCD3;border-left:4px solid #2E7D46;box-shadow:0 20px 40px -22px rgba(0,0,0,0.5);padding:16px 18px;z-index:60;">
    <div style="display:flex;align-items:center;gap:10px;"><span style="width:26px;height:26px;border-radius:50%;background:#2E7D46;color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;flex:none;">✓</span><div><div class="oswald" style="font-weight:600;text-transform:uppercase;letter-spacing:0.03em;font-size:15px;color:#2E7D46;line-height:1;">Thanks, we'll take a look</div><div style="font-size:12px;color:#4A5560;margin-top:4px;">Your flag was sent to the instructor. Carry on to the next question.</div></div></div>
  </div>` : '';

  return questionShell(`
    ${banner}
    <div class="oswald" style="text-transform:uppercase;letter-spacing:0.1em;font-size:11px;color:#4A5560;margin-top:20px;margin-bottom:12px;">Your answer</div>
    <div style="display:flex;flex-direction:column;gap:10px;flex:1;">${opts}</div>
    <div style="display:flex;gap:12px;margin-top:18px;">
      <button class="btn-outline" data-action="finish-session" style="flex:1;padding:14px;">Finish for now</button>
      ${nextIdx !== -1
        ? `<button class="btn-amber" data-action="next-question" style="flex:1.4;font-size:14px;padding:14px;width:auto;">Next question →</button>`
        : `<button class="btn-amber" data-action="finish-session" style="flex:1.4;font-size:14px;padding:14px;width:auto;">Finish section →</button>`}
    </div>
    <div style="text-align:center;margin-top:14px;">
      <button data-action="open-flag" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#4A5560;text-decoration:underline;background:none;border:none;cursor:pointer;">⚑ Something wrong with this question?</button>
    </div>
  `) + flagModal + flagToast;
}
function attachFeedback() {
  if (state.flagSent) setTimeout(() => { state.flagSent = false; }, 4000);
  const ta = document.getElementById('flag-reason-input');
  if (ta) ta.focus();
}

// ─────────────────────────────────────────────
// 08 SESSION SUMMARY
// ─────────────────────────────────────────────
function renderSummary() {
  const p = state.profile;
  const sec = SECTIONS_META[state.sessionSection];
  const st = sectionStats(p, state.sessionSection);
  const complete = st.attempted >= sec.total;
  const acc = st.attempted ? Math.round(st.correct / st.attempted * 100) : 0;
  const nextIdx = findNextUnanswered(state.sessionSection, 0);

  const pips = state.sessionResults.map(r => `<span style="width:26px;height:8px;background:${r?'#2E7D46':'#4A5560'};"></span>`).join('');

  const inner = complete ? `
    <div style="width:52px;height:52px;border-radius:50%;background:#EAF4EC;border:1.5px solid #2E7D46;display:flex;align-items:center;justify-content:center;margin:0 auto;"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2E7D46" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 9 17 20 6"/></svg></div>
    <div class="mono" style="font-size:12px;letter-spacing:0.16em;color:#2E7D46;margin-top:16px;">SECTION COMPLETE · ${sec.label.toUpperCase()}</div>
    <div class="display-title" style="font-size:34px;margin-top:10px;line-height:1.05;">All ${sec.total} questions done</div>
    <div style="display:flex;align-items:baseline;justify-content:center;gap:12px;margin-top:22px;">
      <span class="mono" style="font-weight:600;font-size:72px;color:#2E7D46;line-height:1;">${st.correct}</span>
      <span class="mono" style="font-size:30px;color:#4A5560;">of ${sec.total} correct</span>
    </div>
    <div class="mono" style="font-size:15px;color:#4A5560;margin-top:8px;">${acc}% accuracy</div>
    <div style="font-size:14px;color:#4A5560;margin-top:20px;line-height:1.5;">That section's in the books. Pick another section any time from your dashboard.</div>`
  : `
    <div class="mono" style="font-size:12px;letter-spacing:0.16em;color:#B87333;">SESSION SAVED · ${sec.label.toUpperCase()}</div>
    <div class="display-title" style="font-size:34px;margin-top:14px;line-height:1.05;">Nice work this round</div>
    <div style="display:flex;align-items:baseline;justify-content:center;gap:12px;margin-top:22px;">
      <span class="mono" style="font-weight:600;font-size:72px;color:#2E7D46;line-height:1;">${state.sessionCorrect}</span>
      <span class="mono" style="font-size:30px;color:#4A5560;">of ${state.sessionTotal} correct</span>
    </div>
    ${state.sessionResults.length ? `<div style="display:flex;justify-content:center;gap:7px;margin-top:20px;flex-wrap:wrap;">${pips}</div>` : ''}
    <div style="font-size:14px;color:#4A5560;margin-top:20px;line-height:1.5;">Your spot is saved${nextIdx!==-1?` at question ${nextIdx+1} of ${sec.total}`:''}. Come back any time to keep going.</div>`;

  return `
  ${practiceRibbon()}
  ${renderNav('')}
  <div class="blueprint-bg" style="min-height:calc(100vh - 64px);display:flex;align-items:center;justify-content:center;padding:24px;">
    <div class="plate card-shadow" style="width:520px;max-width:100%;padding:44px 44px 40px;text-align:center;${complete?'border-top:5px solid #2E7D46;':''}">
      ${rivets4(7)}
      ${inner}
      <button class="btn-amber" data-action="back-dashboard" style="margin-top:26px;">Back to dashboard</button>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// 09 MY PROGRESS
// ─────────────────────────────────────────────
function weekAccuracy(profile, sk, week) {
  const ans = Object.values(sectionAnswers(profile, sk)).filter(a => a.week === week);
  if (!ans.length) return null;
  return ans.filter(a=>a.correct).length / ans.length;
}

async function renderProgress() {
  const p = state.profile;
  const week = currentWeek();
  let totalDone = 0, totalAll = 0, totalCorrect = 0;

  const rows = Object.values(SECTIONS_META).map((sec, i, arr) => {
    const st = sectionStats(p, sec.key);
    totalDone += st.attempted; totalAll += sec.total; totalCorrect += st.correct;
    const acc = st.attempted ? Math.round(st.correct/st.attempted*100) : null;
    const thisWk = weekAccuracy(p, sec.key, week);
    const lastWk = weekAccuracy(p, sec.key, week-1);
    let trend = '<span class="mono" style="font-size:14px;color:#9aa5ae;">—</span>';
    if (thisWk !== null && lastWk !== null) {
      const d = Math.round((thisWk - lastWk) * 100);
      trend = d >= 0
        ? `<span class="mono" style="font-size:14px;color:#2E7D46;font-weight:600;">▲ +${d}%</span>`
        : `<span class="mono" style="font-size:14px;color:#B87333;font-weight:600;">▼ −${Math.abs(d)}%</span>`;
    }
    const pct = Math.round(st.attempted/sec.total*100);
    return `
    <div style="display:grid;grid-template-columns:2fr 1.3fr 1fr 1.2fr;align-items:center;padding:18px 24px;${i<arr.length-1?'border-bottom:1px solid #E3E8EB;':''}">
      <span class="oswald" style="text-transform:uppercase;font-size:16px;color:#23303A;">${sec.label}</span>
      <div style="display:flex;align-items:center;gap:10px;"><span class="mono" style="font-size:15px;color:#23303A;">${st.attempted} / ${sec.total}</span><div style="width:70px;height:7px;background:#E3E8EB;"><div style="width:${pct}%;height:100%;background:${pct>=75?'#2E7D46':'#F2A900'};"></div></div></div>
      <span class="mono" style="font-size:16px;color:#23303A;">${acc===null?'—':acc+'%'}</span>
      ${trend}
    </div>`;
  }).join('');

  const totalAcc = totalDone ? Math.round(totalCorrect/totalDone*100) : null;

  return `
  ${practiceRibbon()}
  ${renderNav('progress')}
  <div class="screen-pad blueprint-bg">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;">
      <div><div class="eyebrow">PRIVATE · JUST FOR YOU</div><div class="display-title" style="font-size:32px;margin-top:4px;">My progress</div></div>
      <div style="display:flex;gap:14px;">
        <div class="plate" style="padding:12px 20px;text-align:center;"><div class="oswald" style="text-transform:uppercase;letter-spacing:0.08em;font-size:10px;color:#4A5560;">Total done</div><div class="mono" style="font-weight:600;font-size:26px;color:#0A3D62;">${totalDone}<span style="font-size:15px;color:#4A5560;"> / ${totalAll}</span></div></div>
        <div class="plate" style="padding:12px 20px;text-align:center;"><div class="oswald" style="text-transform:uppercase;letter-spacing:0.08em;font-size:10px;color:#4A5560;">Accuracy</div><div class="mono" style="font-weight:600;font-size:26px;color:#2E7D46;">${totalAcc===null?'—':totalAcc+'%'}</div></div>
      </div>
    </div>
    ${dimDivider()}
    <div style="background:#fff;border:1px solid #C3CCD3;overflow-x:auto;">
      <div style="min-width:640px;">
        <div style="display:grid;grid-template-columns:2fr 1.3fr 1fr 1.2fr;padding:12px 24px;background:#0A3D62;" class="oswald">
          <span style="text-transform:uppercase;letter-spacing:0.08em;font-size:11px;color:rgba(244,246,248,0.85);">Section</span>
          <span style="text-transform:uppercase;letter-spacing:0.08em;font-size:11px;color:rgba(244,246,248,0.85);">Completed</span>
          <span style="text-transform:uppercase;letter-spacing:0.08em;font-size:11px;color:rgba(244,246,248,0.85);">Accuracy</span>
          <span style="text-transform:uppercase;letter-spacing:0.08em;font-size:11px;color:rgba(244,246,248,0.85);">Trend vs last wk</span>
        </div>
        ${rows}
      </div>
    </div>
    <div style="font-size:12px;color:#4A5560;margin-top:14px;">Trend compares this week's accuracy to last week. A dip is just a nudge to revisit — copper, not a penalty.</div>
  </div>`;
}

// ─────────────────────────────────────────────
// 10 WEEKLY LEADERBOARD
// ─────────────────────────────────────────────
function crewWeekScore(allProfiles, crew, week) {
  const secs = {ga:{c:0,a:0},mu:{c:0,a:0},mc:{c:0,a:0},rc:{c:0,a:0}};
  Object.values(allProfiles).forEach(prof => {
    if (!prof || prof.crew !== crew || isAdmin(prof)) return;
    Object.keys(secs).forEach(sk => {
      Object.values(sectionAnswers(prof, sk)).forEach(a => {
        if (a.week === week) { secs[sk].a++; if(a.correct) secs[sk].c++; }
      });
    });
  });
  const avgs = Object.values(secs).map(d => d.a ? d.c/d.a : null).filter(v=>v!==null);
  return avgs.length ? avgs.reduce((x,y)=>x+y,0)/avgs.length : null;
}

async function renderLeaderboard() {
  const week = currentWeek();
  const allProfiles = await DB.getAllProfiles();
  const scores = computeCrewScores(allProfiles, week);
  const lastScores = {};
  CREWS.forEach(c => { lastScores[c] = crewWeekScore(allProfiles, c, week-1); });
  const sorted = [...scores].sort((a,b)=>(b.score??-1)-(a.score??-1));

  const cards = sorted.map((c,i) => {
    const last = lastScores[c.name];
    let delta = '';
    if (c.score !== null && last !== null) {
      const d = Math.round((c.score - last)*100);
      delta = d >= 0
        ? `<span class="mono" style="font-size:13px;color:#2E7D46;">▲ +${d}</span>`
        : `<span class="mono" style="font-size:13px;color:#B87333;">▼ −${Math.abs(d)}</span>`;
    }
    return `
    <div class="plate" style="border-top:5px solid ${crewColor(c.name)};padding:20px 22px;">
      <div class="rivet" style="top:9px;left:9px;"></div><div class="rivet" style="top:9px;right:9px;"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;gap:10px;"><span style="width:16px;height:16px;background:${crewColor(c.name)};border-radius:3px;"></span><span class="oswald" style="font-weight:600;text-transform:uppercase;font-size:22px;color:#0A3D62;">${c.name}</span></div>
        <span class="mono" style="font-weight:600;font-size:14px;${i===0?'color:#F2A900;background:#0A3D62;':'color:#fff;background:#4A5560;'}padding:3px 8px;">#${i+1}</span>
      </div>
      <div style="display:flex;align-items:baseline;gap:8px;margin-top:14px;"><span class="mono" style="font-weight:600;font-size:44px;color:#23303A;line-height:1;">${c.score===null?'—':Math.round(c.score*100)+'%'}</span>${delta}</div>
      <div style="font-size:12px;color:#4A5560;margin-top:6px;">avg accuracy · ${c.active} member${c.active===1?'':'s'} active</div>
    </div>`;
  }).join('');

  // trend chart over last 6 weeks
  const wStart = Math.max(0, week-5);
  const weeksArr = [];
  for (let w = wStart; w <= week; w++) weeksArr.push(w);
  const series = CREWS.map(c => ({ name:c, color:crewColor(c), pts: weeksArr.map(w => crewWeekScore(allProfiles, c, w)) }));
  const hasData = series.some(s => s.pts.some(v => v !== null));
  const X0=60, X1=1060, Y = v => 230 - v*200/100*100 ; // map 0-100% → y
  const xFor = i => weeksArr.length===1 ? (X0+X1)/2 : X0 + (X1-X0)*i/(weeksArr.length-1);
  const yFor = v => 180 - (v*100 - 60) * (150/30) * 0 + (180 - ((v*100 - 60)/30)*150); // clamp 60-90
  function yMap(v) {
    const pct = Math.max(0, Math.min(100, v*100));
    return 180 - (pct/100)*160; // 0%→180, 100%→20
  }
  const trendSvg = hasData ? `
  <div style="background:#fff;border:1px solid #C3CCD3;padding:22px 26px;margin-top:20px;overflow-x:auto;">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
      <div class="oswald" style="text-transform:uppercase;letter-spacing:0.08em;font-size:15px;color:#0A3D62;">Rolling trend</div>
      <div class="mono" style="font-size:11px;color:#4A5560;">WK ${String(wStart).padStart(2,'0')} → WK ${String(week).padStart(2,'0')} · AVG ACCURACY</div>
    </div>
    <svg viewBox="0 0 1080 250" width="100%" style="display:block;min-width:500px;" class="mono">
      ${[100,75,50,25].map(pv => `<line x1="60" y1="${180-(pv/100)*160}" x2="1060" y2="${180-(pv/100)*160}" stroke="#E3E8EB" stroke-width="1"/><text x="46" y="${184-(pv/100)*160}" text-anchor="end" font-size="11" fill="#4A5560">${pv}</text>`).join('')}
      ${weeksArr.map((w,i) => `<text x="${xFor(i)}" y="205" text-anchor="middle" font-size="11" fill="#4A5560">WK${String(w).padStart(2,'0')}</text>`).join('')}
      ${series.map(s => {
        const pts = s.pts.map((v,i) => v===null?null:`${xFor(i)},${yMap(v)}`).filter(Boolean);
        const dots = s.pts.map((v,i) => v===null?'':`<circle cx="${xFor(i)}" cy="${yMap(v)}" r="4" fill="${s.color}"/>`).join('');
        return (pts.length>1?`<polyline points="${pts.join(' ')}" fill="none" stroke="${s.color}" stroke-width="3"/>`:'') + dots;
      }).join('')}
    </svg>
    <div style="display:flex;gap:18px;margin-top:10px;flex-wrap:wrap;">
      ${series.map(s => `<span style="display:flex;align-items:center;gap:6px;font-size:12px;color:#4A5560;"><span style="width:11px;height:11px;background:${s.color};border-radius:2px;"></span>${s.name}</span>`).join('')}
    </div>
  </div>` : '';

  const noData = sorted.every(c => c.score === null);

  return `
  ${practiceRibbon()}
  ${renderNav('leaderboard')}
  <div class="screen-pad blueprint-bg">
    ${localBanner()}
    <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px;">
      <div><div class="eyebrow">WEEK ${String(week).padStart(2,'0')} STANDINGS</div><div class="display-title" style="font-size:32px;margin-top:4px;">Weekly leaderboard</div></div>
    </div>
    <div class="lb-cards" style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:22px;">${cards}</div>
    ${noData ? '<div style="margin-top:20px;background:#fff;border:1px solid #C3CCD3;padding:26px;text-align:center;color:#4A5560;font-size:14px;">No scores recorded this week yet. Standings fill in as crews practice.</div>' : trendSvg}
  </div>`;
}

// ─────────────────────────────────────────────
// 11 ADMIN CONSOLE
// ─────────────────────────────────────────────
function consoleNav() {
  return `
  <div class="console-nav">
    <div style="display:flex;align-items:center;gap:22px;flex-wrap:wrap;">
      <div style="display:flex;align-items:center;gap:11px;">
        ${BOLT_SVG_CONSOLE}
        <div><div class="oswald" style="font-weight:600;text-transform:uppercase;letter-spacing:0.05em;font-size:13px;color:#F4F6F8;line-height:1;">Admin Console</div><div class="mono" style="font-size:9px;letter-spacing:0.16em;color:rgba(244,246,248,0.55);margin-top:2px;">CAST-R PREP · INSTRUCTOR</div></div>
      </div>
      <div class="console-tabs">
        <button class="console-tab${state.adminTab==='roster'?' active':''}" data-tab="roster">Roster</button>
        <button class="console-tab${state.adminTab==='flags'?' active':''}" data-tab="flags">Flag Queue</button>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
      <button class="practice-btn" data-action="admin-practice">Practice as student <span style="font-size:14px;">↗</span></button>
      <div style="width:1px;height:24px;background:rgba(244,246,248,0.2);"></div>
      <div style="display:flex;align-items:center;gap:8px;background:rgba(244,246,248,0.1);padding:6px 12px;border-radius:4px;"><span style="width:9px;height:9px;background:#F2A900;border-radius:50%;"></span><span style="font-size:12px;color:#F4F6F8;font-weight:500;">${escHtml(state.profile.firstName+' '+state.profile.lastName)}</span></div>
      <button class="console-tab" data-action="logout" style="font-size:12px;">Sign out</button>
    </div>
  </div>`;
}

async function renderAdmin() {
  const week = currentWeek();
  const allProfiles = await DB.getAllProfiles();
  const flags = await DB.getFlags();

  if (state.adminTab === 'flags') return renderAdminFlags(flags, week);

  const students = Object.entries(allProfiles)
    .map(([key, prof]) => ({ key, ...prof }))
    .filter(s => s && s.firstName && !isAdmin(s));

  const activeKey = s => {
    if (!s.answers) return false;
    return Object.values(s.answers).some(secAns => Object.values(secAns).some(a => a.week === week));
  };
  const activeCount = students.filter(activeKey).length;
  const crewCounts = {}, crewActive = {};
  CREWS.forEach(c => { crewCounts[c]=0; crewActive[c]=0; });
  students.forEach(s => { if (crewCounts[s.crew] !== undefined) { crewCounts[s.crew]++; if (activeKey(s)) crewActive[s.crew]++; } });

  const kpis = `
  <div class="kpi-strip" style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:18px;">
    <div class="kpi" style="border-left:4px solid #37414B;"><div class="kpi-label">Total students</div><div class="kpi-num">${students.length}</div><div class="kpi-sub">enrolled this cohort</div></div>
    ${CREWS.map(c => `<div class="kpi" style="border-left:4px solid ${crewColor(c)};"><div class="kpi-label">${c}</div><div class="kpi-num">${crewCounts[c]}</div><div class="kpi-sub">${crewActive[c]} active this wk</div></div>`).join('')}
    <div class="kpi" style="background:#37414B;border-color:#37414B;"><div class="kpi-label" style="color:rgba(244,246,248,0.7);">Active this week</div><div class="kpi-num" style="color:#F2A900;">${activeCount}<span style="font-size:16px;color:rgba(244,246,248,0.6);"> / ${students.length}</span></div><div class="kpi-sub" style="color:rgba(244,246,248,0.6);">${students.length-activeCount} gone quiet</div></div>
  </div>`;

  // filters
  const flaggedKeys = new Set(Object.values(flags).map(f=>f.userKey));
  let filtered = students;
  if (CREWS.map(c=>c.toLowerCase()).includes(state.adminFilter)) filtered = students.filter(s => (s.crew||'').toLowerCase() === state.adminFilter);
  else if (state.adminFilter === 'inactive') filtered = students.filter(s => !activeKey(s));
  else if (state.adminFilter === 'flagged') filtered = students.filter(s => flaggedKeys.has(s.key));

  filtered = [...filtered].sort((a,b) => {
    if (state.adminSortCol === 'lastActiveTs') return ((b.lastActiveTs||0)-(a.lastActiveTs||0))*state.adminSortDir;
    if (state.adminSortCol === 'acc') {
      const accOf = s => { let c=0,a=0; ['ga','mu','mc','rc'].forEach(sk=>{const st=sectionStats(s,sk);c+=st.correct;a+=st.attempted;}); return a?c/a:-1; };
      return (accOf(b)-accOf(a))*state.adminSortDir;
    }
    return String(a[state.adminSortCol]||'').localeCompare(String(b[state.adminSortCol]||''))*state.adminSortDir;
  });

  const inactiveCount = students.filter(s => !activeKey(s)).length;
  const chips = `
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
    <span class="mono" style="font-size:10px;letter-spacing:0.1em;color:#4A5560;margin-right:2px;">FILTER</span>
    <button class="chip${state.adminFilter==='all'?' active':''}" data-filter="all">All · ${students.length}</button>
    ${CREWS.map(c => `<button class="chip${state.adminFilter===c.toLowerCase()?' active':''}" data-filter="${c.toLowerCase()}">${c}</button>`).join('')}
    <button class="chip${state.adminFilter==='inactive'?' active':''}" data-filter="inactive">Inactive this week · ${inactiveCount}</button>
    <button class="chip${state.adminFilter==='flagged'?' active':''}" data-filter="flagged" style="${state.adminFilter==='flagged'?'':'color:#B87333;border-color:#B87333;'}">Flagged · ${flaggedKeys.size}</button>
  </div>`;

  const ago = ts => {
    if (!ts) return '—';
    const m = Math.floor((Date.now()-ts)/60000);
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m/60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h/24) + 'd ago';
  };
  const accColor = v => v===null ? '#9aa5ae' : v>=85 ? '#2E7D46' : v<70 ? '#B87333' : '#4A5560';

  const rows = filtered.map(s => {
    const stats = {};
    ['ga','mu','mc','rc'].forEach(sk => { stats[sk] = sectionStats(s, sk); });
    let tc=0, ta=0;
    Object.values(stats).forEach(st => { tc+=st.correct; ta+=st.attempted; });
    const acc = ta ? Math.round(tc/ta*100) : null;
    const inactive = !activeKey(s);
    const flagged = flaggedKeys.has(s.key);
    const expanded = state.adminExpandedRow === s.key;
    const txtColor = inactive ? '#7c8791' : '#23303A';

    const cell = sk => `<div style="padding:9px 14px;"><div class="mono" style="font-size:14px;color:${txtColor};">${stats[sk].attempted}/${SECTIONS_META[sk].total}</div><div class="mono" style="font-size:11px;color:${stats[sk].attempted?accColor(Math.round(stats[sk].correct/stats[sk].attempted*100)):'#9aa5ae'};">${stats[sk].attempted?Math.round(stats[sk].correct/stats[sk].attempted*100)+'%':'—'}</div></div>`;

    const main = `
    <div data-student-key="${s.key}" style="display:grid;grid-template-columns:220px 118px 1fr 1fr 1fr 1fr 90px 110px 40px;align-items:center;border-bottom:1px solid #E7ECEF;cursor:pointer;${inactive?'background:#F6F7F8;':''}${expanded?'background:#FCFBF6;border-left:4px solid #F2A900;':''}">
      <div style="padding:11px 18px;border-right:1px solid #E7ECEF;">
        <div style="font-size:14px;font-weight:600;color:${txtColor};">${escHtml(s.firstName)} ${escHtml(s.lastName)}</div>
        <div class="mono" style="font-size:10px;color:${flagged?'#B87333':inactive?'#B87333':'#9aa5ae'};">${flagged?'FLAGGED · review':inactive?'INACTIVE':'PIN ····'}</div>
      </div>
      <div style="padding:11px 14px;display:flex;align-items:center;gap:7px;"><span style="width:11px;height:11px;background:${crewColor(s.crew)};border-radius:2px;flex:none;"></span><span style="font-size:12.5px;color:${inactive?'#7c8791':'#4A5560'};">${escHtml(s.crew||'?')}</span></div>
      ${cell('ga')}${cell('mu')}${cell('mc')}${cell('rc')}
      <div style="padding:9px 14px;"><span class="mono" style="font-weight:600;font-size:15px;color:${accColor(acc)};">${acc===null?'—':acc+'%'}</span></div>
      <div style="padding:9px 14px;"><span class="mono" style="font-size:12px;color:${inactive?'#B87333':'#4A5560'};">${ago(s.lastActiveTs)}</span></div>
      <div style="padding:9px 0;text-align:center;color:${expanded?'#F2A900':'#9aa5ae'};font-size:15px;">${expanded?'⌄':'›'}</div>
    </div>`;

    let detail = '';
    if (expanded) {
      const detailRows = ['ga','mu','mc','rc'].map((sk,i,arr) => {
        const st = stats[sk];
        const wkCells = [week-2, week-1, week].map(w => {
          const v = w < 0 ? null : weekAccuracy(s, sk, w);
          return `<span class="mono" style="font-size:12.5px;color:${v===null?'#9aa5ae':'#4A5560'};">${v===null?'—':Math.round(v*100)+'%'}</span>`;
        }).join('');
        const t1 = weekAccuracy(s, sk, week), t0 = weekAccuracy(s, sk, week-1);
        let tr = '<span class="mono" style="font-size:12px;color:#9aa5ae;">—</span>';
        if (t1 !== null && t0 !== null) {
          const d = Math.round((t1-t0)*100);
          tr = d>=0 ? `<span class="mono" style="font-size:12px;color:#2E7D46;font-weight:600;">▲ +${d}</span>` : `<span class="mono" style="font-size:12px;color:#B87333;font-weight:600;">▼ −${Math.abs(d)}</span>`;
        }
        return `<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 1fr;padding:9px 16px;${i<arr.length-1?'border-bottom:1px solid #F0F2F4;':''}align-items:center;"><span class="oswald" style="text-transform:uppercase;font-size:13px;color:#23303A;">${SECTIONS_META[sk].label}</span><span class="mono" style="font-size:12.5px;color:#4A5560;">${st.attempted} / ${SECTIONS_META[sk].total}</span>${wkCells}${tr}</div>`;
      }).join('');
      detail = `
      <div style="border-bottom:1px solid #E7ECEF;border-left:4px solid #F2A900;background:#FCFBF6;padding:16px 22px 22px;">
        <div style="display:flex;gap:26px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px;">
          <div>
            <div class="oswald" style="text-transform:uppercase;letter-spacing:0.08em;font-size:9px;color:#4A5560;margin-bottom:4px;">PIN</div>
            <div style="display:flex;gap:5px;align-items:center;">
              <input id="edit-pin-${s.key}" value="${escHtml(s.pin||'')}" maxlength="4" style="width:80px;border:1.5px solid #C3CCD3;background:#fff;padding:6px 10px;font-family:'IBM Plex Mono',monospace;font-size:14px;letter-spacing:0.2em;color:#23303A;outline:none;border-radius:0;">
              <button data-action="admin-save-edit" data-key="${s.key}" data-field="pin" style="background:#2E7D46;color:#fff;font-size:11px;font-weight:600;padding:8px 10px;border:none;cursor:pointer;">Save</button>
            </div>
          </div>
          <div>
            <div class="oswald" style="text-transform:uppercase;letter-spacing:0.08em;font-size:9px;color:#4A5560;margin-bottom:4px;">Crew · reassign</div>
            <div style="display:flex;gap:5px;align-items:center;">
              <select id="edit-crew-${s.key}" style="border:1.5px solid #C3CCD3;background:#fff;padding:7px 10px;font-size:12.5px;color:#23303A;outline:none;border-radius:0;">
                ${CREWS.map(c => `<option value="${c}"${s.crew===c?' selected':''}>${c}</option>`).join('')}
              </select>
              <button data-action="admin-save-edit" data-key="${s.key}" data-field="crew" style="background:#2E7D46;color:#fff;font-size:11px;font-weight:600;padding:8px 10px;border:none;cursor:pointer;">Save</button>
            </div>
          </div>
        </div>
        <div class="mono" style="font-size:10px;letter-spacing:0.1em;color:#B87333;margin-bottom:10px;">PER-SECTION · PER-WEEK ACCURACY</div>
        <div style="background:#fff;border:1px solid #E7ECEF;overflow-x:auto;">
          <div style="min-width:600px;">
            <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 1fr;background:#37414B;padding:8px 16px;" class="oswald">
              ${['Section','Completed','WK'+String(Math.max(0,week-2)).padStart(2,'0'),'WK'+String(Math.max(0,week-1)).padStart(2,'0'),'WK'+String(week).padStart(2,'0'),'Trend'].map(h=>`<span style="text-transform:uppercase;letter-spacing:0.06em;font-size:10px;color:rgba(244,246,248,0.85);">${h}</span>`).join('')}
            </div>
            ${detailRows}
          </div>
        </div>
      </div>`;
    }
    return main + detail;
  }).join('');

  return `
  ${consoleNav()}
  <div style="padding:24px 32px;background:#EEF1F3;min-height:calc(100vh - 60px);">
    ${localBanner()}
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:18px;flex-wrap:wrap;gap:12px;">
      <div><div class="mono" style="font-size:11px;letter-spacing:0.14em;color:#B87333;">WEEK ${String(week).padStart(2,'0')}</div><div class="oswald" style="font-weight:700;text-transform:uppercase;font-size:28px;color:#37414B;line-height:1;margin-top:3px;">Roster</div></div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="mono" style="font-size:11px;color:#4A5560;text-align:right;line-height:1.4;">weekly backup —<br>the only copy</div>
        <button data-action="export-csv" style="display:flex;align-items:center;gap:8px;background:#37414B;color:#F4F6F8;font-family:Oswald,sans-serif;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;font-size:13px;padding:10px 16px;border:none;cursor:pointer;"><span style="color:#F2A900;">↓</span> Export CSV</button>
      </div>
    </div>
    ${kpis}
    ${chips}
    <div style="background:#fff;border:1px solid #C3CCD3;overflow-x:auto;">
      <div style="min-width:1000px;">
        <div style="display:grid;grid-template-columns:220px 118px 1fr 1fr 1fr 1fr 90px 110px 40px;background:#37414B;">
          <div class="admin-th" data-sort="firstName" style="padding-left:18px;">Student ▲▼</div>
          <div class="admin-th" data-sort="crew">Crew ▲▼</div>
          <div class="admin-th">GA</div><div class="admin-th">MU</div><div class="admin-th">MC</div><div class="admin-th">RC</div>
          <div class="admin-th" data-sort="acc">Acc ▲▼</div>
          <div class="admin-th" data-sort="lastActiveTs" style="color:#F2A900;">Last active ▾</div>
          <div></div>
        </div>
        ${rows || '<div style="padding:26px;text-align:center;color:#4A5560;font-size:13px;">No students match this filter.</div>'}
        <div class="mono" style="padding:10px 18px;border-top:1px solid #E7ECEF;background:#FBFCFD;font-size:10.5px;color:#9aa5ae;">SHOWING ${filtered.length} OF ${students.length} · CLICK A ROW TO EXPAND</div>
      </div>
    </div>
  </div>`;
}

function renderAdminFlags(flags, week) {
  const entries = Object.entries(flags).sort((a,b)=>(b[1].ts||0)-(a[1].ts||0));
  const ago = ts => {
    const m = Math.floor((Date.now()-ts)/60000);
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m/60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h/24) + 'd ago';
  };
  const sectionOf = f => f.section || (f.qid||'').split('_')[0].toUpperCase();

  const cards = entries.length === 0
    ? '<div style="padding:40px;text-align:center;color:#4A5560;font-size:14px;background:#fff;border:1px solid #C3CCD3;">No open flags. When a student reports a question, it shows up here.</div>'
    : entries.map(([fid, f]) => `
    <div class="flag-card">
      <div style="flex:none;width:210px;padding:14px 16px;border-right:1px solid #E7ECEF;background:#FBFCFD;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><span class="mono" style="font-size:12.5px;color:#37414B;background:#EDEFF1;padding:2px 7px;">${escHtml((f.qid||'').toUpperCase().replace('_','-'))}</span><span class="mono" style="font-size:11px;color:#B87333;">${f.ts?ago(f.ts):''}</span></div>
        <div style="font-size:12px;color:#4A5560;margin-top:8px;">${escHtml(f.section||'')}</div>
        <div style="font-size:12px;color:#4A5560;margin-top:10px;">Flagged by</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:2px;"><span style="width:9px;height:9px;background:${crewColor(f.crew)};border-radius:2px;"></span><span style="font-size:13px;font-weight:600;color:#23303A;">${escHtml(f.who||'?')}</span></div>
      </div>
      <div style="flex:1;min-width:220px;padding:14px 18px;display:flex;flex-direction:column;justify-content:center;">
        <div class="mono" style="font-size:10px;letter-spacing:0.1em;color:#B87333;">STUDENT'S REASON</div>
        <div style="font-size:14px;color:#23303A;line-height:1.5;margin-top:6px;border-left:3px solid #E3E8EB;padding-left:12px;">"${escHtml(f.reason||'')}"</div>
      </div>
      <div style="flex:none;width:210px;padding:14px 16px;border-left:1px solid #E7ECEF;display:flex;flex-direction:column;justify-content:center;gap:8px;">
        <button data-action="admin-delete-flag" data-flagid="${fid}" style="border:1px solid #C3CCD3;color:#4A5560;font-family:Oswald,sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;font-size:12px;padding:9px 10px;background:none;cursor:pointer;">Dismiss flag</button>
      </div>
    </div>`).join('');

  return `
  ${consoleNav()}
  <div style="padding:24px 32px;background:#EEF1F3;min-height:calc(100vh - 60px);">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
      <div><div class="mono" style="font-size:11px;letter-spacing:0.14em;color:#B87333;">${entries.length} OPEN FLAG${entries.length===1?'':'S'}</div><div class="oswald" style="font-weight:700;text-transform:uppercase;font-size:28px;color:#37414B;line-height:1;margin-top:3px;">Flag queue</div></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;">${cards}</div>
    <div style="padding:11px 18px;margin-top:12px;border:1px solid #E7ECEF;background:#FBFCFD;display:flex;align-items:center;gap:8px;">
      <span style="font-size:11.5px;color:#4A5560;">ⓘ Flagging is a report, not an undo — the student's attempt still counts. Dismissing a flag clears it from this queue.</span>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// CSV EXPORT
// ─────────────────────────────────────────────
async function exportCSV() {
  const allProfiles = await DB.getAllProfiles();
  const rows = [['Key','FirstName','LastName','Crew','GA_Done','GA_Correct','MU_Done','MU_Correct','MC_Done','MC_Correct','RC_Done','RC_Correct','LastActive','Week']];
  Object.entries(allProfiles).forEach(([key, p]) => {
    if (!p) return;
    const ga = sectionStats(p,'ga'), mu = sectionStats(p,'mu'), mc = sectionStats(p,'mc'), rc = sectionStats(p,'rc');
    rows.push([key, p.firstName, p.lastName, p.crew, ga.attempted, ga.correct, mu.attempted, mu.correct, mc.attempted, mc.correct, rc.attempted, rc.correct, p.lastActiveTs ? new Date(p.lastActiveTs).toISOString() : '', currentWeek()]);
  });
  const csv = rows.map(r => r.map(v => `"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `castr_export_week${currentWeek()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// SVG DRAWINGS (technical-drawing style)
// ─────────────────────────────────────────────
function renderDrawing(q) {
  if (q.drawing === 'shop_floor_layout') return renderShopFloor(q);
  if (q.drawing === 'job_site_layout') return renderJobSite(q);
  if (q.drawing === 'mounting_bracket') return renderBracket(q);
  return '';
}

const SVG_DIM_STYLE = `<style>.dim{font-size:10px;fill:#4A5560;font-family:'IBM Plex Mono',monospace}.dimc{font-size:12px;fill:#B87333;font-family:'IBM Plex Mono',monospace}.dl{stroke:#4A5560;stroke-width:1}.dlc{stroke:#B87333;stroke-width:1}.masked-dim{fill:#F2A900;font-weight:700;font-size:12px;font-family:'IBM Plex Mono',monospace}</style>`;

function renderShopFloor(q) {
  const ml = q.maskedLetter, m = q.masked;
  const lbl = (id, val) => m===id ? `class="masked-dim"` : `class="dim"`;
  const txt = (id, val) => m===id ? ml : val;
  return `<svg viewBox="0 0 700 480" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;background:#fff;font-family:'IBM Plex Sans',sans-serif;">
  ${SVG_DIM_STYLE}
  <rect x="120" y="90" width="480" height="288" fill="none" stroke="#23303A" stroke-width="2"/>
  <rect x="144" y="90" width="192" height="66" fill="#F4F6F8" stroke="#23303A" stroke-width="1.3"/>
  <text x="240" y="118" text-anchor="middle" font-size="12" fill="#23303A">Tool Crib</text>
  <text x="240" y="134" text-anchor="middle" font-size="10" fill="#4A5560" font-family="'IBM Plex Mono',monospace">h = 22'</text>
  <rect x="522" y="132" width="78" height="54" fill="#F4F6F8" stroke="#23303A" stroke-width="1.3"/>
  <text x="561" y="156" text-anchor="middle" font-size="10.5" fill="#23303A">Supervisor's</text>
  <text x="561" y="169" text-anchor="middle" font-size="10.5" fill="#23303A">Office</text>
  <rect x="360" y="318" width="72" height="60" fill="#F4F6F8" stroke="#23303A" stroke-width="1.3"/>
  <text x="396" y="345" text-anchor="middle" font-size="10.5" fill="#23303A">Break Room</text>
  <rect x="468" y="300" width="90" height="78" fill="#F4F6F8" stroke="#23303A" stroke-width="1.3"/>
  <text x="513" y="335" text-anchor="middle" font-size="10.5" fill="#23303A">Parts Storage</text>
  <line x1="120" y1="42" x2="600" y2="42" class="dlc"/><line x1="120" y1="36" x2="120" y2="48" class="dlc"/><line x1="600" y1="36" x2="600" y2="48" class="dlc"/>
  <rect x="338" y="33" width="44" height="18" fill="#fff"/><text x="360" y="46" text-anchor="middle" class="dimc">160'</text>
  <line x1="120" y1="68" x2="144" y2="68" class="dl"/><line x1="120" y1="62" x2="120" y2="74" class="dl"/><line x1="144" y1="62" x2="144" y2="74" class="dl"/>
  <text x="132" y="82" text-anchor="middle" class="dim">8'</text>
  <line x1="144" y1="68" x2="336" y2="68" class="dl"/><line x1="336" y1="62" x2="336" y2="74" class="dl"/>
  <rect x="224" y="59" width="32" height="18" fill="#fff"/><text x="240" y="72" text-anchor="middle" ${lbl('tool_crib_width')}>${txt('tool_crib_width',"64'")}</text>
  <line x1="336" y1="68" x2="600" y2="68" class="dl"/><line x1="600" y1="62" x2="600" y2="74" class="dl"/>
  <rect x="452" y="59" width="32" height="18" fill="#fff"/><text x="468" y="72" text-anchor="middle" class="dim">88'</text>
  <line x1="640" y1="90" x2="640" y2="378" class="dlc"/><line x1="634" y1="90" x2="646" y2="90" class="dlc"/><line x1="634" y1="378" x2="646" y2="378" class="dlc"/>
  <rect x="626" y="225" width="28" height="18" fill="#fff"/><text x="640" y="238" text-anchor="middle" class="dimc">96'</text>
  <line x1="616" y1="90" x2="616" y2="132" class="dl"/><line x1="610" y1="90" x2="622" y2="90" class="dl"/><line x1="610" y1="132" x2="622" y2="132" class="dl"/>
  <rect x="606" y="102" width="22" height="16" fill="#fff"/><text x="617" y="115" text-anchor="middle" class="dim">14'</text>
  <line x1="616" y1="132" x2="616" y2="186" class="dl"/><line x1="610" y1="186" x2="622" y2="186" class="dl"/>
  <rect x="606" y="149" width="22" height="16" fill="#fff"/><text x="617" y="162" text-anchor="middle" class="dim">18'</text>
  <line x1="616" y1="186" x2="616" y2="216" class="dl"/><line x1="610" y1="216" x2="622" y2="216" class="dl"/>
  <rect x="606" y="192" width="22" height="16" fill="#fff"/><text x="617" y="205" text-anchor="middle" class="dim">10'</text>
  <line x1="616" y1="216" x2="616" y2="378" class="dl"/>
  <rect x="604" y="288" width="26" height="16" fill="#fff"/><text x="617" y="301" text-anchor="middle" ${lbl('right_remainder')}>${txt('right_remainder',"54'")}</text>
  <line x1="522" y1="120" x2="600" y2="120" class="dl" stroke-dasharray="3 2"/>
  <rect x="534" y="104" width="54" height="16" fill="#fff"/><text x="561" y="117" text-anchor="middle" class="dim">26' wide</text>
  <line x1="120" y1="400" x2="360" y2="400" class="dl"/><line x1="120" y1="394" x2="120" y2="406" class="dl"/><line x1="360" y1="394" x2="360" y2="406" class="dl"/>
  <rect x="224" y="391" width="32" height="18" fill="#fff"/><text x="240" y="404" text-anchor="middle" ${lbl('left_gap_break')}>${txt('left_gap_break',"80'")}</text>
  <line x1="360" y1="400" x2="432" y2="400" class="dl"/><line x1="432" y1="394" x2="432" y2="406" class="dl"/>
  <rect x="384" y="391" width="24" height="18" fill="#fff"/><text x="396" y="404" text-anchor="middle" class="dim">24'</text>
  <line x1="432" y1="400" x2="468" y2="400" class="dl"/><line x1="468" y1="394" x2="468" y2="406" class="dl"/>
  <rect x="440" y="391" width="20" height="18" fill="#fff"/><text x="450" y="404" text-anchor="middle" class="dim">12'</text>
  <line x1="468" y1="400" x2="558" y2="400" class="dl"/><line x1="558" y1="394" x2="558" y2="406" class="dl"/>
  <rect x="500" y="391" width="26" height="18" fill="#fff"/><text x="513" y="404" text-anchor="middle" ${lbl('parts_storage_width')}>${txt('parts_storage_width',"30'")}</text>
  <line x1="558" y1="400" x2="600" y2="400" class="dl"/><line x1="600" y1="394" x2="600" y2="406" class="dl"/>
  <rect x="569" y="391" width="20" height="18" fill="#fff"/><text x="579" y="404" text-anchor="middle" class="dim">14'</text>
  <line x1="462" y1="300" x2="462" y2="378" class="dl"/><line x1="456" y1="300" x2="468" y2="300" class="dl"/><line x1="456" y1="378" x2="468" y2="378" class="dl"/>
  <rect x="438" y="331" width="22" height="16" fill="#fff"/><text x="449" y="344" text-anchor="middle" class="dim">26'</text>
  <line x1="354" y1="318" x2="354" y2="378" class="dl"/><line x1="348" y1="318" x2="360" y2="318" class="dl"/><line x1="348" y1="378" x2="360" y2="378" class="dl"/>
  <rect x="330" y="340" width="22" height="16" fill="#fff"/><text x="341" y="353" text-anchor="middle" class="dim">20'</text>
  </svg>`;
}

function renderJobSite(q) {
  const ml = q.maskedLetter, m = q.masked;
  const lbl = id => m===id ? `class="masked-dim"` : `class="dim"`;
  const txt = (id, val) => m===id ? ml : val;
  return `<svg viewBox="0 0 670 460" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;background:#fff;font-family:'IBM Plex Sans',sans-serif;">
  ${SVG_DIM_STYLE}
  <rect x="110" y="90" width="448" height="269" fill="none" stroke="#23303A" stroke-width="2"/>
  <rect x="142" y="90" width="128" height="77" fill="#F4F6F8" stroke="#23303A" stroke-width="1.3"/>
  <text x="206" y="132" text-anchor="middle" font-size="11" fill="#23303A">Trailer</text>
  <rect x="318" y="90" width="202" height="77" fill="#F4F6F8" stroke="#23303A" stroke-width="1.3"/>
  <text x="419" y="132" text-anchor="middle" font-size="11" fill="#23303A">Storage Container</text>
  <rect x="501" y="154" width="58" height="51" fill="#F4F6F8" stroke="#2E7D46" stroke-width="1.3"/>
  <text x="530" y="176" text-anchor="middle" font-size="10" fill="#2E7D46">Gen</text>
  <text x="530" y="188" text-anchor="middle" font-size="10" fill="#2E7D46">Pad</text>
  <line x1="110" y1="56" x2="558" y2="56" class="dlc"/><line x1="110" y1="50" x2="110" y2="62" class="dlc"/><line x1="558" y1="50" x2="558" y2="62" class="dlc"/>
  <rect x="312" y="47" width="44" height="18" fill="#fff"/><text x="334" y="60" text-anchor="middle" class="dimc">140'</text>
  <line x1="110" y1="76" x2="142" y2="76" class="dl"/><line x1="110" y1="70" x2="110" y2="82" class="dl"/><line x1="142" y1="70" x2="142" y2="82" class="dl"/>
  <text x="126" y="72" text-anchor="middle" class="dim">10'</text>
  <line x1="142" y1="76" x2="270" y2="76" class="dl"/><line x1="270" y1="70" x2="270" y2="82" class="dl"/>
  <rect x="194" y="67" width="24" height="16" fill="#fff"/><text x="206" y="80" text-anchor="middle" class="dim">40'</text>
  <line x1="270" y1="76" x2="318" y2="76" class="dl"/><line x1="318" y1="70" x2="318" y2="82" class="dl"/>
  <text x="294" y="72" text-anchor="middle" class="dim">15'</text>
  <line x1="318" y1="76" x2="520" y2="76" class="dl"/><line x1="520" y1="70" x2="520" y2="82" class="dl"/>
  <rect x="405" y="67" width="28" height="16" fill="#fff"/><text x="419" y="80" text-anchor="middle" ${lbl('container_width')}>${txt('container_width',"63'")}</text>
  <line x1="520" y1="76" x2="558" y2="76" class="dl"/><line x1="558" y1="70" x2="558" y2="82" class="dl"/>
  <text x="539" y="72" text-anchor="middle" class="dim">12'</text>
  <line x1="598" y1="90" x2="598" y2="359" class="dlc"/><line x1="592" y1="90" x2="604" y2="90" class="dlc"/><line x1="592" y1="359" x2="604" y2="359" class="dlc"/>
  <rect x="585" y="216" width="26" height="18" fill="#fff"/><text x="598" y="229" text-anchor="middle" class="dimc">84'</text>
  <line x1="578" y1="90" x2="578" y2="154" class="dl"/><line x1="572" y1="90" x2="584" y2="90" class="dl"/><line x1="572" y1="154" x2="584" y2="154" class="dl"/>
  <rect x="568" y="114" width="22" height="16" fill="#fff"/><text x="579" y="127" text-anchor="middle" class="dim">20'</text>
  <line x1="578" y1="154" x2="578" y2="205" class="dl"/><line x1="572" y1="205" x2="584" y2="205" class="dl"/>
  <rect x="568" y="171" width="22" height="16" fill="#fff"/><text x="579" y="184" text-anchor="middle" class="dim">16'</text>
  <line x1="578" y1="205" x2="578" y2="359" class="dl"/><line x1="572" y1="359" x2="584" y2="359" class="dl"/>
  <rect x="566" y="274" width="26" height="16" fill="#fff"/><text x="579" y="287" text-anchor="middle" ${lbl('gen_remainder')}>${txt('gen_remainder',"48'")}</text>
  <line x1="136" y1="90" x2="136" y2="167" class="dl"/><line x1="130" y1="90" x2="142" y2="90" class="dl"/><line x1="130" y1="167" x2="142" y2="167" class="dl"/>
  <rect x="112" y="120" width="22" height="16" fill="#fff"/><text x="123" y="133" text-anchor="middle" class="dim">24'</text>
  <line x1="501" y1="218" x2="559" y2="218" class="dl"/><line x1="501" y1="212" x2="501" y2="224" class="dl"/><line x1="559" y1="212" x2="559" y2="224" class="dl"/>
  <rect x="519" y="221" width="22" height="16" fill="#fff"/><text x="530" y="234" text-anchor="middle" class="dim">18'</text>
  </svg>`;
}

function renderBracket(q) {
  const ml = q.maskedLetter, m = q.masked;
  const lbl = id => m===id ? `class="masked-dim"` : `class="dim"`;
  const txt = (id, val) => m===id ? ml : val;
  return `<svg viewBox="0 0 560 210" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;background:#fff;font-family:'IBM Plex Sans',sans-serif;">
  ${SVG_DIM_STYLE}
  <rect x="80" y="85" width="396" height="36" fill="#F4F6F8" stroke="#23303A" stroke-width="2" rx="2"/>
  ${[[116,'H1'],[192,'H2'],[282,'H3'],[363,'H4'],[430,'H5']].map(([x,h]) => `
  <circle cx="${x}" cy="103" r="6" fill="#fff" stroke="#23303A" stroke-width="1.5"/>
  <text x="${x}" y="76" text-anchor="middle" font-size="9" fill="#23303A" font-family="'IBM Plex Mono',monospace">${h}</text>
  <line x1="${x}" y1="80" x2="${x}" y2="85" class="dl" stroke-dasharray="2 2"/>`).join('')}
  <line x1="80" y1="146" x2="116" y2="146" class="dl"/><line x1="80" y1="140" x2="80" y2="152" class="dl"/><line x1="116" y1="140" x2="116" y2="152" class="dl"/>
  <text x="98" y="162" text-anchor="middle" class="dim">4"</text>
  <line x1="116" y1="146" x2="192" y2="146" class="dl"/><line x1="192" y1="140" x2="192" y2="152" class="dl"/>
  <text x="154" y="162" text-anchor="middle" class="dim">8.5"</text>
  <line x1="192" y1="146" x2="282" y2="146" class="dl"/><line x1="282" y1="140" x2="282" y2="152" class="dl"/>
  <text x="237" y="162" text-anchor="middle" ${lbl('hole2_to_hole3')}>${txt('hole2_to_hole3','10"')}</text>
  <line x1="282" y1="146" x2="363" y2="146" class="dl"/><line x1="363" y1="140" x2="363" y2="152" class="dl"/>
  <text x="322" y="162" text-anchor="middle" class="dim">9"</text>
  <line x1="363" y1="146" x2="430" y2="146" class="dl"/><line x1="430" y1="140" x2="430" y2="152" class="dl"/>
  <text x="396" y="162" text-anchor="middle" class="dim">7.5"</text>
  <line x1="430" y1="146" x2="476" y2="146" class="dl"/><line x1="476" y1="140" x2="476" y2="152" class="dl"/>
  <text x="453" y="162" text-anchor="middle" class="dim">5"</text>
  <line x1="80" y1="180" x2="476" y2="180" class="dlc"/><line x1="80" y1="174" x2="80" y2="186" class="dlc"/><line x1="476" y1="174" x2="476" y2="186" class="dlc"/>
  <rect x="264" y="188" width="28" height="16" fill="#fff"/><text x="278" y="200" text-anchor="middle" class="dimc">44"</text>
  </svg>`;
}

// ─────────────────────────────────────────────
// PIN BOX HELPERS
// ─────────────────────────────────────────────
function renderPinBoxes(containerId, count, prefix, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const small = container.id === 'pin-change-group';
  container.innerHTML = Array.from({length:count}, (_,i) =>
    `<input class="pin-box${small?' sm':''}" id="${prefix}${i}" type="tel" inputmode="numeric" maxlength="1" autocomplete="one-time-code">`
  ).join('');
  const boxes = Array.from({length:count}, (_,i) => document.getElementById(prefix+i));
  boxes.forEach((box,i) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g,'').slice(-1);
      if (box.value && i < count-1) boxes[i+1].focus();
      onChange();
    });
    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && i > 0) { boxes[i-1].focus(); boxes[i-1].value=''; onChange(); }
      if (e.key === 'Enter') onChange();
    });
    box.addEventListener('paste', e => {
      e.preventDefault();
      const t = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g,'').slice(0,count);
      t.split('').forEach((ch,j) => { if (boxes[i+j]) boxes[i+j].value = ch; });
      if (boxes[Math.min(i+t.length, count-1)]) boxes[Math.min(i+t.length, count-1)].focus();
      onChange();
    });
  });
}
function getPinValue(prefix, count) {
  return Array.from({length:count}, (_,i) => {
    const el = document.getElementById(prefix+i);
    return el ? el.value : '';
  }).join('');
}

// ─────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────
navigate('landing');
