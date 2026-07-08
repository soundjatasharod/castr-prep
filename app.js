// ─────────────────────────────────────────────
// STORAGE LAYER (Firebase + localStorage fallback)
// ─────────────────────────────────────────────
let fbDatabase = null;
let storageMode = 'local'; // 'firebase' | 'local'

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
        const key = k.replace('castr_profile_', '');
        try { result[key] = JSON.parse(localStorage.getItem(k)); } catch(e) {}
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
      if (storageMode === 'firebase') {
        await fbDatabase.ref('profiles/' + oldKey).remove();
      } else {
        localStorage.removeItem('castr_profile_' + oldKey);
      }
    }
  }
};

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
const state = {
  screen: 'landing',
  userKey: null,
  profile: null,
  // question session
  sessionSection: null,
  sessionIdx: 0,
  sessionAnswered: null,
  sessionCorrect: 0,
  sessionTotal: 0,
  sessionStart: 0,
  // flags overlay
  flagQid: null,
  flagOverlayVisible: false,
  // admin
  adminSortCol: 'name',
  adminSortDir: 1,
  adminFilter: 'all',
  adminExpandedRow: null,
  // pending landing name
  pendingFirst: '',
  pendingLast: '',
};

function currentWeek() {
  return Math.max(0, Math.floor((Date.now() - LAUNCH_DATE_CDT_MS) / (7*24*3600*1000)));
}

function isAdmin(profile) {
  return profile && profile.firstName && profile.lastName &&
    profile.firstName.toLowerCase() === 'soundjata' &&
    profile.lastName.toLowerCase() === 'sharod';
}

function sectionAnswers(profile, sectionKey) {
  if (!profile || !profile.answers) return {};
  return profile.answers[sectionKey] || {};
}

function sectionStats(profile, sectionKey) {
  const ans = sectionAnswers(profile, sectionKey);
  const ids = Object.keys(ans);
  const correct = ids.filter(id => ans[id].correct).length;
  return { attempted: ids.length, correct };
}

// ─────────────────────────────────────────────
// ROUTER / RENDER
// ─────────────────────────────────────────────
const app = document.getElementById('app');

function navigate(screen, params) {
  Object.assign(state, { screen, ...(params||{}) });
  render();
}

async function render() {
  const s = state.screen;
  if (s === 'landing') { app.innerHTML = renderLanding(); attachLanding(); return; }
  if (s === 'onboard_name') { app.innerHTML = renderOnboardName(); attachOnboardName(); return; }
  if (s === 'onboard_pin') { app.innerHTML = renderOnboardPin(); attachOnboardPin(); return; }
  if (s === 'onboard_crew') { app.innerHTML = renderOnboardCrew(); attachOnboardCrew(); return; }
  if (s === 'return_pin') { app.innerHTML = renderReturnPin(); attachReturnPin(); return; }
  if (s === 'dashboard') { app.innerHTML = await renderDashboard(); return; }
  if (s === 'question') { app.innerHTML = renderQuestion(); attachQuestion(); return; }
  if (s === 'feedback') { app.innerHTML = renderFeedback(); return; }
  if (s === 'summary') { app.innerHTML = await renderSummary(); return; }
  if (s === 'progress') { app.innerHTML = await renderProgress(); return; }
  if (s === 'leaderboard') { app.innerHTML = await renderLeaderboard(); return; }
  if (s === 'settings') { app.innerHTML = renderSettings(); attachSettings(); return; }
  if (s === 'admin') { app.innerHTML = await renderAdmin(); attachAdmin(); return; }
}

// ─────────────────────────────────────────────
// NAV BAR
// ─────────────────────────────────────────────
function renderNav(activeScreen) {
  const p = state.profile;
  const crewColor = p && p.crew ? `crew-badge-${p.crew.toLowerCase()}` : 'crew-badge-oakbrook';
  const testBadge = p && p.testMode ? '<span class="test-mode-indicator">TEST</span>' : '';
  return `
  <nav class="nav">
    <a class="nav-logo" href="#" data-nav="dashboard">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="1" y="1" width="20" height="20" rx="3" stroke="#F2A900" stroke-width="1.5"/><path d="M6 11h10M11 6v10" stroke="#F2A900" stroke-width="1.5" stroke-linecap="round"/></svg>
      CAST-R Prep
    </a>
    <div class="nav-links">
      <button class="nav-link${activeScreen==='dashboard'?' active':''}" data-nav="dashboard">Home</button>
      <button class="nav-link${activeScreen==='progress'?' active':''}" data-nav="progress">Progress</button>
      <button class="nav-link${activeScreen==='leaderboard'?' active':''}" data-nav="leaderboard">Board</button>
      <button class="nav-link${activeScreen==='settings'?' active':''}" data-nav="settings">Settings</button>
    </div>
    <div class="nav-user">
      ${p ? `<span class="nav-crew-badge ${crewColor}">${p.crew||'?'}</span>${testBadge}` : ''}
    </div>
  </nav>`;
}

document.addEventListener('click', async function(e) {
  const nav = e.target.closest('[data-nav]');
  if (nav) { navigate(nav.dataset.nav); return; }

  const opt = e.target.closest('.option-btn');
  if (opt && state.screen === 'question' && state.sessionAnswered === null) {
    handleOptionSelect(opt.dataset.letter); return;
  }

  const btn = e.target.closest('[data-action]');
  if (btn) { await handleAction(btn.dataset.action, btn.dataset); return; }

  const chip = e.target.closest('.chip[data-filter]');
  if (chip) { state.adminFilter = chip.dataset.filter; render(); return; }

  const th = e.target.closest('th[data-sort]');
  if (th) {
    if (state.adminSortCol === th.dataset.sort) state.adminSortDir *= -1;
    else { state.adminSortCol = th.dataset.sort; state.adminSortDir = 1; }
    render(); return;
  }

  const row = e.target.closest('tr[data-student-key]');
  if (row && !e.target.closest('[data-action]') && !e.target.closest('.editable-cell')) {
    const k = row.dataset.studentKey;
    state.adminExpandedRow = state.adminExpandedRow === k ? null : k;
    render(); return;
  }
});

async function handleAction(action, data) {
  if (action === 'submit-answer') {
    if (state.sessionAnswered === null) return;
    const sec = SECTIONS_META[state.sessionSection];
    const q = sec.questions[state.sessionIdx];
    const isCorrect = state.sessionAnswered === q.opts.find(o=>o.c).l;
    if (isCorrect) state.sessionCorrect++;
    state.sessionTotal++;
    // save answer
    const p = state.profile;
    if (!p.answers) p.answers = {};
    if (!p.answers[state.sessionSection]) p.answers[state.sessionSection] = {};
    p.answers[state.sessionSection][q.id] = {
      chosen: state.sessionAnswered,
      correct: isCorrect,
      week: currentWeek(),
      ts: Date.now()
    };
    await DB.setProfile(state.userKey, p);
    navigate('feedback');
    return;
  }
  if (action === 'next-question') {
    const sec = SECTIONS_META[state.sessionSection];
    const nextIdx = findNextUnanswered(state.sessionSection, state.sessionIdx + 1);
    if (nextIdx === -1) {
      navigate('summary');
    } else {
      state.sessionIdx = nextIdx;
      state.sessionAnswered = null;
      navigate('question');
    }
    return;
  }
  if (action === 'finish-session') { navigate('summary'); return; }
  if (action === 'back-dashboard') { navigate('dashboard'); return; }
  if (action === 'start-section') {
    const sk = data.section;
    const idx = findNextUnanswered(sk, 0);
    state.sessionSection = sk;
    state.sessionIdx = idx === -1 ? 0 : idx;
    state.sessionAnswered = null;
    state.sessionCorrect = 0;
    state.sessionTotal = 0;
    state.sessionStart = Date.now();
    navigate('question');
    return;
  }
  if (action === 'show-flag-form') {
    state.flagQid = data.qid;
    const fwrap = document.getElementById('flag-form-wrap');
    if (fwrap) fwrap.style.display = 'block';
    return;
  }
  if (action === 'submit-flag') {
    const inp = document.getElementById('flag-reason-input');
    const reason = inp ? inp.value.trim() : '';
    if (!reason) return;
    const flagId = Date.now() + '_' + state.flagQid;
    await DB.addFlag(flagId, {
      qid: state.flagQid,
      reason,
      who: state.profile.firstName + ' ' + state.profile.lastName,
      userKey: state.userKey,
      crew: state.profile.crew,
      ts: Date.now(),
      week: currentWeek()
    });
    const fwrap = document.getElementById('flag-form-wrap');
    if (fwrap) fwrap.innerHTML = '<p class="success-notice" style="margin:8px 0">Thanks — we\'ll take a look.</p>';
    return;
  }
  if (action === 'admin-delete-flag') {
    await DB.deleteFlag(data.flagid);
    render(); return;
  }
  if (action === 'toggle-test-mode') {
    state.profile.testMode = !state.profile.testMode;
    await DB.setProfile(state.userKey, state.profile);
    render(); return;
  }
  if (action === 'export-csv') {
    await exportCSV(); return;
  }
  if (action === 'admin-save-edit') {
    const key = data.key;
    const field = data.field;
    const inp = document.getElementById('edit-input-' + key + '-' + field);
    if (!inp) return;
    const val = inp.value.trim();
    if (!val) return;
    const prof = await DB.getProfile(key);
    if (!prof) return;
    if (field === 'pin') {
      prof.pin = val;
      await DB.setProfile(key, prof);
    } else if (field === 'crew') {
      prof.crew = val;
      await DB.setProfile(key, prof);
    } else if (field === 'firstName') {
      const newFirst = val;
      const newKey = encodeKey(newFirst + '_' + prof.lastName);
      prof.firstName = newFirst;
      await DB.setProfile(key, prof);
      if (newKey !== key) {
        await DB.migrateKey(key, newKey);
        if (state.adminExpandedRow === key) state.adminExpandedRow = newKey;
      }
    }
    render(); return;
  }
  if (action === 'logout') {
    state.userKey = null; state.profile = null;
    navigate('landing'); return;
  }
  if (action === 'save-pin') {
    // handled in attachSettings
    return;
  }
}

// ─────────────────────────────────────────────
// SCREEN 1: LANDING
// ─────────────────────────────────────────────
function renderLanding() {
  return `
  <div class="landing-wrap blueprint-bg">
    <div class="landing-logo-area">
      <div style="margin-bottom:12px">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <rect width="56" height="56" rx="10" fill="#0A3D62"/>
          <path d="M14 28h28M28 14v28" stroke="#F2A900" stroke-width="3" stroke-linecap="round"/>
          <rect x="18" y="18" width="20" height="20" rx="2" stroke="#F2A900" stroke-width="1.5" fill="none"/>
        </svg>
      </div>
      <h1>CAST-R Prep</h1>
      <p class="tagline">ComEd · Tools of the Trade</p>
    </div>
    <div class="card landing-card">
      <div class="card-rivet tl"></div><div class="card-rivet tr"></div>
      <div class="card-rivet bl"></div><div class="card-rivet br"></div>
      <h2 class="oswald" style="font-size:1.1rem;color:var(--blue);letter-spacing:.05em;text-transform:uppercase;margin-bottom:16px">Sign In</h2>
      ${storageMode==='local'?`<div class="notice" style="font-size:.78rem;margin-bottom:14px">⚠ Local mode — leaderboard is device-only until Firebase is configured. See SETUP.md.</div>`:''}
      <div class="landing-form-row" style="margin-bottom:12px">
        <div class="field">
          <label for="inp-first">First Name</label>
          <input id="inp-first" type="text" placeholder="Marcus" autocomplete="given-name" autocapitalize="words">
        </div>
        <div class="field">
          <label for="inp-last">Last Name</label>
          <input id="inp-last" type="text" placeholder="Johnson" autocomplete="family-name" autocapitalize="words">
        </div>
      </div>
      <button class="btn-primary" id="btn-continue">Continue →</button>
      <p id="landing-error" style="color:var(--copper);font-size:.82rem;text-align:center;margin-top:10px;min-height:18px"></p>
    </div>
  </div>`;
}

function attachLanding() {
  const btnCont = document.getElementById('btn-continue');
  const inpFirst = document.getElementById('inp-first');
  const inpLast = document.getElementById('inp-last');
  const err = document.getElementById('landing-error');
  async function doLanding() {
    const first = inpFirst.value.trim();
    const last = inpLast.value.trim();
    if (!first || !last) { err.textContent = 'Please enter your full name.'; return; }
    err.textContent = '';
    btnCont.disabled = true; btnCont.textContent = 'Checking…';
    const key = encodeKey(first + '_' + last);
    const existing = await DB.getProfile(key);
    btnCont.disabled = false; btnCont.textContent = 'Continue →';
    state.pendingFirst = first; state.pendingLast = last;
    if (existing) {
      state.userKey = key;
      navigate('return_pin');
    } else {
      navigate('onboard_name');
    }
  }
  btnCont.addEventListener('click', doLanding);
  [inpFirst, inpLast].forEach(inp => inp.addEventListener('keydown', e => { if(e.key==='Enter') doLanding(); }));
}

// ─────────────────────────────────────────────
// SCREEN 2: ONBOARDING
// ─────────────────────────────────────────────
function renderOnboardName() {
  return `
  <div class="onboard-wrap">
    <div class="onboard-top">
      <h2>Welcome to the crew</h2>
      <p>Let's get you set up in about 30 seconds.</p>
    </div>
    <div class="onboard-body">
      <div class="step-indicator">
        <div class="step-dot active">1</div>
        <div class="step-line"></div>
        <div class="step-dot pending">2</div>
        <div class="step-line"></div>
        <div class="step-dot pending">3</div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <p style="font-size:.9rem;color:var(--steel);margin-bottom:14px">Confirming your name — this is how you'll be identified on the leaderboard.</p>
        <div class="landing-form-row" style="margin-bottom:16px">
          <div class="field">
            <label>First Name</label>
            <div class="locked-field">${escHtml(state.pendingFirst)} <span class="lock-icon">🔒</span></div>
          </div>
          <div class="field">
            <label>Last Name</label>
            <div class="locked-field">${escHtml(state.pendingLast)} <span class="lock-icon">🔒</span></div>
          </div>
        </div>
        <button class="btn-primary" id="btn-onboard-next1">Next: Set PIN →</button>
      </div>
      <button class="btn-ghost" data-nav="landing">← Back</button>
    </div>
  </div>`;
}
function attachOnboardName() {
  document.getElementById('btn-onboard-next1').addEventListener('click', () => navigate('onboard_pin'));
}

function renderOnboardPin() {
  return `
  <div class="onboard-wrap">
    <div class="onboard-top">
      <h2>Set a 4-digit PIN</h2>
      <p>You'll use this every time you sign in.</p>
    </div>
    <div class="onboard-body">
      <div class="step-indicator">
        <div class="step-dot done">✓</div>
        <div class="step-line done"></div>
        <div class="step-dot active">2</div>
        <div class="step-line"></div>
        <div class="step-dot pending">3</div>
      </div>
      <div class="card">
        <p style="font-size:.9rem;color:var(--steel);margin-bottom:20px;text-align:center">Choose any 4 digits — write it down somewhere safe.</p>
        <div class="pin-group" id="pin-group-set" style="margin-bottom:20px"></div>
        <button class="btn-primary" id="btn-onboard-next2" disabled>Next: Pick Crew →</button>
        <p id="pin-set-error" style="color:var(--copper);font-size:.82rem;text-align:center;margin-top:8px;min-height:18px"></p>
      </div>
      <button class="btn-ghost" data-nav="onboard_name">← Back</button>
    </div>
  </div>`;
}
function attachOnboardPin() {
  renderPinBoxes('pin-group-set', 4, 'pin-set-', () => {
    const val = getPinValue('pin-set-', 4);
    const btn = document.getElementById('btn-onboard-next2');
    btn.disabled = val.length < 4;
    state._pendingPin = val;
  });
  document.getElementById('btn-onboard-next2').addEventListener('click', () => {
    const val = getPinValue('pin-set-', 4);
    if (val.length < 4) { document.getElementById('pin-set-error').textContent = 'Please enter all 4 digits.'; return; }
    state._pendingPin = val;
    navigate('onboard_crew');
  });
}

function renderOnboardCrew() {
  return `
  <div class="onboard-wrap">
    <div class="onboard-top">
      <h2>Pick your crew</h2>
      <p>You're competing with your crew on the weekly leaderboard.</p>
    </div>
    <div class="onboard-body">
      <div class="step-indicator">
        <div class="step-dot done">✓</div>
        <div class="step-line done"></div>
        <div class="step-dot done">✓</div>
        <div class="step-line done"></div>
        <div class="step-dot active">3</div>
      </div>
      <div class="card">
        <div class="breaker-panel" id="crew-panel">
          <div class="breaker-panel-header">⚡ Crew Assignment Panel</div>
          <div class="breaker-list">
            ${CREWS.map(c=>`
            <div class="breaker${state._pendingCrew===c?' selected':''}" data-crew="${c}">
              <div class="breaker-switch-wrap"><div class="breaker-switch"></div></div>
              <span class="breaker-label">${c}</span>
              <span class="breaker-indicator"></span>
            </div>`).join('')}
          </div>
        </div>
        <button class="btn-primary" id="btn-onboard-finish" style="margin-top:16px" ${!state._pendingCrew?'disabled':''}>Finish Setup →</button>
        <p id="crew-error" style="color:var(--copper);font-size:.82rem;text-align:center;margin-top:8px;min-height:18px"></p>
      </div>
      <button class="btn-ghost" data-nav="onboard_pin">← Back</button>
    </div>
  </div>`;
}
function attachOnboardCrew() {
  document.querySelectorAll('.breaker[data-crew]').forEach(el => {
    el.addEventListener('click', () => {
      state._pendingCrew = el.dataset.crew;
      document.querySelectorAll('.breaker[data-crew]').forEach(b => b.classList.toggle('selected', b.dataset.crew === state._pendingCrew));
      document.getElementById('btn-onboard-finish').disabled = false;
    });
  });
  document.getElementById('btn-onboard-finish').addEventListener('click', async () => {
    if (!state._pendingCrew) { document.getElementById('crew-error').textContent = 'Please select a crew.'; return; }
    const key = encodeKey(state.pendingFirst + '_' + state.pendingLast);
    const profile = {
      firstName: state.pendingFirst,
      lastName: state.pendingLast,
      crew: state._pendingCrew,
      pin: state._pendingPin,
      answers: {},
      joinedWeek: currentWeek(),
      joinedTs: Date.now(),
      lastActiveTs: Date.now(),
      testMode: false
    };
    await DB.setProfile(key, profile);
    state.userKey = key;
    state.profile = profile;
    // Admin check
    if (isAdmin(profile)) { navigate('admin'); } else { navigate('dashboard'); }
  });
}

// ─────────────────────────────────────────────
// SCREEN 3: RETURN PIN
// ─────────────────────────────────────────────
function renderReturnPin() {
  return `
  <div class="landing-wrap blueprint-bg">
    <div class="landing-logo-area">
      <h1 style="font-size:1.6rem">Welcome back</h1>
      <p class="tagline">${escHtml(state.pendingFirst)} ${escHtml(state.pendingLast)}</p>
    </div>
    <div class="card landing-card">
      <div class="card-rivet tl"></div><div class="card-rivet tr"></div>
      <div class="card-rivet bl"></div><div class="card-rivet br"></div>
      <h2 class="oswald" style="font-size:1rem;color:var(--steel);letter-spacing:.1em;text-transform:uppercase;margin-bottom:20px;text-align:center">Enter your PIN</h2>
      <div class="pin-group" id="pin-group-return" style="margin-bottom:20px"></div>
      <button class="btn-primary" id="btn-pin-submit" disabled>Sign In →</button>
      <p id="pin-error" style="color:var(--copper);font-size:.82rem;text-align:center;margin-top:10px;min-height:18px"></p>
      <div style="text-align:center;margin-top:12px">
        <a href="mailto:${CONTACT_EMAIL}?subject=CAST-R%20PIN%20Reset&body=Hi%2C%20I%20forgot%20my%20PIN.%20My%20name%20is%20${encodeURIComponent(state.pendingFirst + ' ' + state.pendingLast)}." style="color:var(--steel);font-size:.8rem">Forgot your PIN?</a>
      </div>
      <div style="text-align:center;margin-top:8px">
        <button class="btn-ghost" data-nav="landing">← Not you?</button>
      </div>
    </div>
  </div>`;
}
function attachReturnPin() {
  renderPinBoxes('pin-group-return', 4, 'pin-ret-', () => {
    const val = getPinValue('pin-ret-', 4);
    document.getElementById('btn-pin-submit').disabled = val.length < 4;
  });
  const doSubmit = async () => {
    const val = getPinValue('pin-ret-', 4);
    if (val.length < 4) return;
    document.getElementById('btn-pin-submit').disabled = true;
    document.getElementById('btn-pin-submit').textContent = 'Checking…';
    const prof = await DB.getProfile(state.userKey);
    if (!prof || prof.pin !== val) {
      document.getElementById('pin-error').textContent = 'Incorrect PIN. Try again.';
      document.getElementById('btn-pin-submit').disabled = false;
      document.getElementById('btn-pin-submit').textContent = 'Sign In →';
      return;
    }
    state.profile = prof;
    prof.lastActiveTs = Date.now();
    await DB.setProfile(state.userKey, prof);
    if (isAdmin(prof)) { navigate('admin'); } else { navigate('dashboard'); }
  };
  document.getElementById('btn-pin-submit').addEventListener('click', doSubmit);
}

// ─────────────────────────────────────────────
// SCREEN 4: DASHBOARD
// ─────────────────────────────────────────────
async function renderDashboard() {
  const p = state.profile;
  const week = currentWeek();
  const allProfiles = await DB.getAllProfiles();
  const crewScores = computeCrewScores(allProfiles, week);
  const sortedCrews = [...crewScores].sort((a,b) => b.score - a.score);

  const sections = Object.values(SECTIONS_META).map(s => {
    const st = sectionStats(p, s.key);
    const pct = s.total > 0 ? (st.attempted / s.total * 100).toFixed(0) : 0;
    const acc = st.attempted > 0 ? (st.correct / st.attempted * 100).toFixed(0) : '—';
    return `
    <div class="section-card" data-action="start-section" data-section="${s.key}">
      <div class="sc-icon">${s.icon}</div>
      <div class="sc-label">${s.label}</div>
      <div class="sc-progress">${st.attempted}/${s.total}</div>
      <div class="sc-sub">Accuracy: ${acc}${typeof acc==='string'?'':'%'}</div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill${pct>=80?' green':''}" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');

  const lbCrew = sortedCrews.map((c,i) => `
  <div class="lb-crew rank-${i+1}">
    <div class="lb-crew-name">${c.name}</div>
    <div class="lb-crew-score">${c.score === null ? '—' : (c.score*100).toFixed(1)+'%'}</div>
    <div class="lb-crew-rank">#${i+1}</div>
  </div>`).join('');

  const localBanner = storageMode==='local' ? `<div class="local-mode-banner">📡 Local mode — leaderboard shows your device only. See SETUP.md to enable shared scores.</div>` : '';

  return `
  ${renderNav('dashboard')}
  <div class="screen">
    <div class="screen-content">
      ${localBanner}
      <div class="dashboard-greeting">
        <h2>Hey, ${escHtml(p.firstName)} 👋</h2>
        <p class="subtitle">Week ${week} · ${p.crew} crew · CAST-R Prep</p>
      </div>
      <div class="dim-divider"><span>Sections</span></div>
      <div class="sections-grid">${sections}</div>
      <div class="leaderboard-snap" data-nav="leaderboard">
        <h3>Weekly Leaderboard · Week ${week}</h3>
        <div class="lb-crews">${lbCrew}</div>
        <p class="lb-tap-hint">Tap to see full leaderboard →</p>
      </div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// CREW SCORING
// ─────────────────────────────────────────────
function computeCrewScores(allProfiles, week) {
  const crewData = {};
  CREWS.forEach(c => { crewData[c] = { ga:{c:0,a:0}, mu:{c:0,a:0}, mc:{c:0,a:0}, rc:{c:0,a:0} }; });
  Object.values(allProfiles).forEach(prof => {
    if (!prof || !prof.crew) return;
    if (prof.testMode) return; // exclude test mode
    const crew = prof.crew;
    if (!crewData[crew]) return;
    Object.keys(SECTIONS_META).forEach(sk => {
      const ans = sectionAnswers(prof, sk);
      Object.values(ans).forEach(a => {
        if (a.week === week) {
          crewData[crew][sk].a++;
          if (a.correct) crewData[crew][sk].c++;
        }
      });
    });
  });
  return CREWS.map(c => {
    const d = crewData[c];
    const secAvgs = ['ga','mu','mc','rc'].map(sk => {
      if (d[sk].a === 0) return null;
      return d[sk].c / d[sk].a;
    }).filter(v => v !== null);
    const score = secAvgs.length === 0 ? null : secAvgs.reduce((a,b)=>a+b,0)/secAvgs.length;
    return { name: c, score };
  });
}

// ─────────────────────────────────────────────
// SCREEN 5: SETTINGS
// ─────────────────────────────────────────────
function renderSettings() {
  const p = state.profile;
  return `
  ${renderNav('settings')}
  <div class="screen">
    <div class="screen-content">
      <p class="page-title">Settings</p>
      <p class="page-sub">Manage your account</p>
      <div class="settings-section">
        <h3 class="oswald" style="font-size:.85rem;letter-spacing:.12em;text-transform:uppercase;color:var(--steel);margin-bottom:10px">Account</h3>
        <div class="card" style="margin-bottom:10px">
          <div class="field" style="margin-bottom:10px">
            <label>Name (not editable)</label>
            <div class="locked-field">${escHtml(p.firstName)} ${escHtml(p.lastName)} <span class="lock-icon">🔒</span></div>
          </div>
          <div class="field">
            <label>Crew</label>
            <div class="locked-field">${escHtml(p.crew)} <span class="lock-icon">🔒</span></div>
          </div>
        </div>
        <p style="font-size:.78rem;color:var(--steel)">To change your crew, contact your instructor.</p>
      </div>
      <div class="dim-divider"><span>Change PIN</span></div>
      <div class="card" style="margin-bottom:16px">
        <p style="font-size:.85rem;color:var(--steel);margin-bottom:16px;text-align:center">Enter a new 4-digit PIN</p>
        <div class="pin-group" id="pin-change-group" style="margin-bottom:16px"></div>
        <button class="btn-primary" id="btn-save-pin" disabled>Save New PIN</button>
        <p id="pin-change-msg" style="color:var(--green);font-size:.82rem;text-align:center;margin-top:8px;min-height:18px"></p>
      </div>
      <div class="dim-divider"><span>Help</span></div>
      <div class="card" style="margin-bottom:16px">
        <p style="font-size:.88rem;color:var(--dark);margin-bottom:8px">Having a problem with your account?</p>
        <p style="font-size:.82rem;color:var(--steel);margin-bottom:12px">For a forgotten PIN, wrong crew assignment, or account access issues — email your instructor directly.</p>
        <a href="mailto:${CONTACT_EMAIL}?subject=CAST-R%20Account%20Help" class="btn-secondary" style="text-decoration:none">Email Instructor</a>
      </div>
      <button class="btn-ghost" data-action="logout" style="color:var(--copper);margin-top:8px">Sign out</button>
    </div>
  </div>`;
}
function attachSettings() {
  renderPinBoxes('pin-change-group', 4, 'pin-chg-', () => {
    const val = getPinValue('pin-chg-', 4);
    document.getElementById('btn-save-pin').disabled = val.length < 4;
  });
  document.getElementById('btn-save-pin').addEventListener('click', async () => {
    const val = getPinValue('pin-chg-', 4);
    if (val.length < 4) return;
    state.profile.pin = val;
    await DB.setProfile(state.userKey, state.profile);
    document.getElementById('pin-change-msg').textContent = '✓ PIN updated!';
    document.getElementById('btn-save-pin').disabled = true;
  });
}

// ─────────────────────────────────────────────
// SCREEN 6: QUESTION
// ─────────────────────────────────────────────
function findNextUnanswered(sectionKey, startIdx) {
  const sec = SECTIONS_META[sectionKey];
  const answered = sectionAnswers(state.profile, sectionKey);
  for (let i = startIdx; i < sec.questions.length; i++) {
    if (!answered[sec.questions[i].id]) return i;
  }
  return -1;
}

function renderQuestion() {
  const sec = SECTIONS_META[state.sessionSection];
  const q = sec.questions[state.sessionIdx];
  const totalLeft = sec.questions.length - Object.keys(sectionAnswers(state.profile, state.sessionSection)).length;
  const optLetters = ['A','B','C','D','E'].slice(0, sec.optCount);

  let drawing = '';
  if (state.sessionSection === 'ga' && q.drawing) {
    drawing = `<div class="drawing-wrap">${renderDrawing(q)}</div>`;
  }

  let passage = '';
  if (state.sessionSection === 'rc' && q.passage) {
    const psg = RC_PASSAGES[q.passage];
    passage = `<div class="rc-passage-box"><h4>${escHtml(psg.title)}</h4>${escHtml(psg.text)}</div>`;
  }

  const opts = q.opts.map(o => `
  <button class="option-btn" data-letter="${o.l}" data-action="">
    <span class="option-letter">${o.l}</span>
    <span>${escHtml(o.t)}</span>
  </button>`).join('');

  return `
  ${renderNav('')}
  <div class="question-screen">
    <div class="question-header">
      <span class="section-label">${sec.label}</span>
      <span class="q-number">${state.sessionIdx+1} / ${sec.total}</span>
    </div>
    <div class="question-body">
      ${drawing}
      ${passage}
      <p class="q-prompt">${escHtml(q.prompt)}</p>
      <div class="option-list" id="option-list">${opts}</div>
    </div>
    <div class="question-actions">
      <button class="btn-primary" id="btn-submit-answer" data-action="submit-answer" disabled>Submit Answer</button>
      <button class="btn-ghost" data-action="finish-session">Finish for now</button>
    </div>
  </div>`;
}
function attachQuestion() {
  // option selection is handled via delegation
}

function handleOptionSelect(letter) {
  state.sessionAnswered = letter;
  document.querySelectorAll('.option-btn').forEach(b => b.classList.toggle('selected', b.dataset.letter === letter));
  document.getElementById('btn-submit-answer').disabled = false;
}

// ─────────────────────────────────────────────
// SCREEN 7: FEEDBACK
// ─────────────────────────────────────────────
function renderFeedback() {
  const sec = SECTIONS_META[state.sessionSection];
  const q = sec.questions[state.sessionIdx];
  const correctOpt = q.opts.find(o => o.c);
  const isCorrect = state.sessionAnswered === correctOpt.l;

  const opts = q.opts.map(o => {
    let cls = '';
    if (o.c) cls = 'correct';
    else if (o.l === state.sessionAnswered && !o.c) cls = 'incorrect';
    return `
    <div class="option-btn ${cls}" style="cursor:default;pointer-events:none">
      <span class="option-letter">${o.l}</span>
      <span>${escHtml(o.t)}</span>
    </div>`;
  }).join('');

  let drawing = '';
  if (state.sessionSection === 'ga' && q.drawing) {
    drawing = `<div class="drawing-wrap">${renderDrawing(q)}</div>`;
  }
  let passage = '';
  if (state.sessionSection === 'rc' && q.passage) {
    const psg = RC_PASSAGES[q.passage];
    passage = `<div class="rc-passage-box"><h4>${escHtml(psg.title)}</h4>${escHtml(psg.text)}</div>`;
  }

  const nextIdx = findNextUnanswered(sec.key, state.sessionIdx + 1);

  return `
  ${renderNav('')}
  <div class="question-screen">
    <div class="question-header">
      <span class="section-label">${sec.label}</span>
      <span class="q-number">${state.sessionIdx+1} / ${sec.total}</span>
    </div>
    <div class="question-body">
      ${drawing}
      ${passage}
      <p class="q-prompt">${escHtml(q.prompt)}</p>
      <div class="feedback-result ${isCorrect?'correct':'incorrect'}">
        <span class="feedback-icon">${isCorrect?'✓':'✗'}</span>
        <div>
          <div class="feedback-label">${isCorrect?'Correct!':'Not quite.'}</div>
          <div class="feedback-rationale">${escHtml(q.rationale)}</div>
        </div>
      </div>
      <div class="option-list">${opts}</div>
      <div class="flag-link-wrap">
        <button class="btn-ghost" data-action="show-flag-form" data-qid="${q.id}" style="font-size:.75rem;color:var(--steel)">Something wrong with this question?</button>
      </div>
      <div id="flag-form-wrap" style="display:none;margin-bottom:8px">
        <div class="field" style="margin-bottom:8px">
          <label>Describe the issue</label>
          <input id="flag-reason-input" type="text" placeholder="e.g. I think the answer should be C" style="font-size:.9rem">
        </div>
        <button class="btn-inline" data-action="submit-flag">Send Report</button>
      </div>
    </div>
    <div class="question-actions">
      ${nextIdx !== -1 ? `<button class="btn-primary" data-action="next-question">Next Question →</button>` : `<button class="btn-primary" data-action="finish-session">Finish Section →</button>`}
      <button class="btn-ghost" data-action="finish-session">Save &amp; go to dashboard</button>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// SCREEN 8: SUMMARY
// ─────────────────────────────────────────────
async function renderSummary() {
  const p = state.profile;
  const sec = SECTIONS_META[state.sessionSection];
  const st = sectionStats(p, state.sessionSection);
  const acc = st.attempted > 0 ? Math.round(st.correct / st.attempted * 100) : 0;
  return `
  ${renderNav('dashboard')}
  <div class="screen">
    <div class="screen-content">
      <div class="card summary-card">
        <div class="card-rivet tl"></div><div class="card-rivet tr"></div>
        <div class="card-rivet bl"></div><div class="card-rivet br"></div>
        <div style="font-size:2.5rem;margin-bottom:4px">${sec.icon}</div>
        <div class="summary-big">${state.sessionCorrect}/${state.sessionTotal}</div>
        <div class="summary-label">This session · ${sec.label}</div>
        <div class="summary-accuracy">${acc}% all-time accuracy</div>
        <div style="margin-top:20px;font-size:.85rem;color:var(--steel)">
          ${st.attempted} of ${sec.total} questions answered in this section.
        </div>
      </div>
      <div style="margin-top:16px;display:flex;flex-direction:column;gap:10px">
        <button class="btn-primary" data-action="back-dashboard">Back to Dashboard</button>
        <button class="btn-secondary" data-action="start-section" data-section="${state.sessionSection}">Continue ${sec.label}</button>
      </div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// SCREEN 9: PROGRESS
// ─────────────────────────────────────────────
async function renderProgress() {
  const p = state.profile;
  const week = currentWeek();

  const sections = Object.values(SECTIONS_META).map(sec => {
    const ans = sectionAnswers(p, sec.key);
    const ids = Object.keys(ans);
    const total = sec.total;
    const attempted = ids.length;
    const correct = ids.filter(id => ans[id].correct).length;
    const acc = attempted > 0 ? (correct/attempted*100).toFixed(0) : '—';
    const pct = attempted / total * 100;

    // this week
    const weekIds = ids.filter(id => ans[id].week === week);
    const weekCorrect = weekIds.filter(id => ans[id].correct).length;
    const weekAcc = weekIds.length > 0 ? (weekCorrect/weekIds.length*100).toFixed(0)+'%' : 'none this week';

    return `
    <div class="progress-section-card">
      <div class="psc-header">
        <span style="font-size:1.2rem">${sec.icon}</span>
        <span class="psc-title">${sec.label}</span>
        <span class="psc-count">${attempted}/${total}</span>
      </div>
      <div class="progress-bar-wrap" style="margin-bottom:12px">
        <div class="progress-bar-fill${pct>=80?' green':''}" style="width:${pct.toFixed(0)}%"></div>
      </div>
      <div class="psc-stats">
        <div class="psc-stat"><div class="val">${acc}${typeof acc==='string'?'':'%'}</div><div class="lbl">All-time accuracy</div></div>
        <div class="psc-stat"><div class="val">${weekAcc}</div><div class="lbl">This week</div></div>
        <div class="psc-stat"><div class="val">${total - attempted}</div><div class="lbl">Remaining</div></div>
      </div>
    </div>`;
  }).join('');

  return `
  ${renderNav('progress')}
  <div class="screen">
    <div class="screen-content">
      <p class="page-title">My Progress</p>
      <p class="page-sub">${escHtml(p.firstName)} · ${p.crew} · Week ${week}</p>
      ${sections}
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// SCREEN 10: LEADERBOARD
// ─────────────────────────────────────────────
async function renderLeaderboard() {
  const week = currentWeek();
  const allProfiles = await DB.getAllProfiles();
  const crewScores = computeCrewScores(allProfiles, week);
  const sorted = [...crewScores].sort((a,b) => (b.score??-1) - (a.score??-1));

  const cards = sorted.map((c,i) => {
    const sectionBreakdown = computeCrewSectionBreakdown(allProfiles, c.name, week);
    const secStr = Object.entries(sectionBreakdown).map(([k,v]) =>
      `<span class="crew-lb-sec">${k.toUpperCase()} ${v!==null?(v*100).toFixed(0)+'%':'—'}</span>`
    ).join('');
    return `
    <div class="crew-lb-card rank-${i+1}">
      <div class="crew-lb-rank-num">#${i+1}</div>
      <div class="crew-lb-name">${c.name}</div>
      <div class="crew-lb-score">${c.score !== null ? (c.score*100).toFixed(1)+'%' : '—'}</div>
      <div class="crew-lb-detail">${secStr}</div>
    </div>`;
  }).join('');

  const noData = sorted.every(c => c.score === null);

  return `
  ${renderNav('leaderboard')}
  <div class="screen">
    <div class="screen-content">
      <p class="page-title">Weekly Leaderboard</p>
      <p class="page-sub">Team accuracy averages · equal section weighting</p>
      <span class="week-badge">Week ${week}</span>
      ${storageMode==='local'?`<div class="local-mode-banner">📡 Local mode — only showing scores from this device.</div>`:''}
      ${noData ? '<div class="lb-no-data">No scores recorded this week yet. Start practicing!</div>' : cards}
    </div>
  </div>`;
}

function computeCrewSectionBreakdown(allProfiles, crewName, week) {
  const secs = {ga:{c:0,a:0}, mu:{c:0,a:0}, mc:{c:0,a:0}, rc:{c:0,a:0}};
  Object.values(allProfiles).forEach(prof => {
    if (!prof || prof.crew !== crewName || prof.testMode) return;
    Object.keys(secs).forEach(sk => {
      const ans = sectionAnswers(prof, sk);
      Object.values(ans).forEach(a => {
        if (a.week === week) { secs[sk].a++; if(a.correct) secs[sk].c++; }
      });
    });
  });
  const result = {};
  Object.keys(secs).forEach(sk => {
    result[sk] = secs[sk].a > 0 ? secs[sk].c / secs[sk].a : null;
  });
  return result;
}

// ─────────────────────────────────────────────
// SCREEN 11: ADMIN
// ─────────────────────────────────────────────
async function renderAdmin() {
  const week = currentWeek();
  const allProfiles = await DB.getAllProfiles();
  const flags = await DB.getFlags();
  const p = state.profile;

  const students = Object.entries(allProfiles)
    .map(([key, prof]) => ({ key, ...prof }))
    .filter(s => !isAdmin(s));

  const activeThisWeek = students.filter(s => {
    if (!s.answers) return false;
    return Object.values(s.answers).some(secAns =>
      Object.values(secAns).some(a => a.week === week)
    );
  }).length;

  const crewCounts = {};
  CREWS.forEach(c => { crewCounts[c] = 0; });
  students.forEach(s => { if(crewCounts[s.crew] !== undefined) crewCounts[s.crew]++; });

  // KPI
  const kpiHtml = `
  <div class="admin-kpi-strip">
    <div class="kpi-card"><div class="kpi-val">${students.length}</div><div class="kpi-lbl">Total Students</div></div>
    ${CREWS.map(c=>`<div class="kpi-card"><div class="kpi-val">${crewCounts[c]||0}</div><div class="kpi-lbl">${c}</div></div>`).join('')}
    <div class="kpi-card"><div class="kpi-val">${activeThisWeek}</div><div class="kpi-lbl">Active Wk ${week}</div></div>
    <div class="kpi-card"><div class="kpi-val">${Object.keys(flags).length}</div><div class="kpi-lbl">Open Flags</div></div>
  </div>`;

  // filter
  let filtered = students;
  if (state.adminFilter === 'oakbrook') filtered = students.filter(s=>s.crew==='Oakbrook');
  else if (state.adminFilter === 'rockford') filtered = students.filter(s=>s.crew==='Rockford');
  else if (state.adminFilter === 'chicago') filtered = students.filter(s=>s.crew==='Chicago');
  else if (state.adminFilter === 'inactive') filtered = students.filter(s => !activeThisWeek);
  else if (state.adminFilter === 'flagged') {
    const flaggedKeys = new Set(Object.values(flags).map(f=>f.userKey));
    filtered = students.filter(s=>flaggedKeys.has(s.key));
  }

  // sort
  filtered = [...filtered].sort((a,b) => {
    let va = a[state.adminSortCol] || '';
    let vb = b[state.adminSortCol] || '';
    if (state.adminSortCol === 'lastActiveTs') { va = va||0; vb = vb||0; return (vb-va)*state.adminSortDir; }
    return String(va).localeCompare(String(vb)) * state.adminSortDir;
  });

  // table rows
  const rows = filtered.map(s => {
    const gaSt = sectionStats(s, 'ga');
    const muSt = sectionStats(s, 'mu');
    const mcSt = sectionStats(s, 'mc');
    const rcSt = sectionStats(s, 'rc');
    const lastActive = s.lastActiveTs ? new Date(s.lastActiveTs).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—';
    const expanded = state.adminExpandedRow === s.key;

    const mainRow = `<tr data-student-key="${s.key}" style="cursor:pointer">
      <td><strong>${escHtml(s.firstName)} ${escHtml(s.lastName)}</strong></td>
      <td><span class="crew-badge-${s.crew?.toLowerCase()||'oakbrook'}" style="padding:2px 8px;border-radius:3px;font-size:.72rem;font-weight:700">${escHtml(s.crew||'?')}</span></td>
      <td class="mono-num">${gaSt.attempted}/${SECTIONS_META.ga.total}</td>
      <td class="mono-num">${muSt.attempted}/${SECTIONS_META.mu.total}</td>
      <td class="mono-num">${mcSt.attempted}/${SECTIONS_META.mc.total}</td>
      <td class="mono-num">${rcSt.attempted}/${SECTIONS_META.rc.total}</td>
      <td class="mono-num">${gaSt.attempted > 0 ? (gaSt.correct/gaSt.attempted*100).toFixed(0)+'%' : '—'}</td>
      <td class="mono-num" style="color:var(--steel);font-size:.78rem">${lastActive}</td>
      <td>${expanded ? '▲' : '▼'}</td>
    </tr>`;

    let expandedRow = '';
    if (expanded) {
      expandedRow = `<tr class="expanded-row"><td colspan="9">
        <div class="student-detail-grid">
          ${['ga','mu','mc','rc'].map(sk => {
            const st = sectionStats(s, sk);
            const acc = st.attempted > 0 ? (st.correct/st.attempted*100).toFixed(0)+'%' : '—';
            return `<div class="student-detail-item">
              <div class="label">${SECTIONS_META[sk].label}</div>
              <div class="val">${st.attempted}/${SECTIONS_META[sk].total}</div>
              <div class="sub">Accuracy: ${acc}</div>
            </div>`;
          }).join('')}
          <div class="student-detail-item">
            <div class="label">PIN</div>
            <input class="edit-input" id="edit-input-${s.key}-pin" value="${escHtml(s.pin||'')}" type="text" maxlength="4" style="width:70px">
            <button class="btn-inline" data-action="admin-save-edit" data-key="${s.key}" data-field="pin" style="margin-top:6px;font-size:.75rem;padding:5px 10px">Save</button>
          </div>
          <div class="student-detail-item">
            <div class="label">Crew</div>
            <select class="edit-input" id="edit-input-${s.key}-crew" style="width:110px">
              ${CREWS.map(c=>`<option value="${c}"${s.crew===c?' selected':''}>${c}</option>`).join('')}
            </select>
            <button class="btn-inline" data-action="admin-save-edit" data-key="${s.key}" data-field="crew" style="margin-top:6px;font-size:.75rem;padding:5px 10px">Save</button>
          </div>
        </div>
      </td></tr>`;
    }
    return mainRow + expandedRow;
  }).join('');

  const arrow = col => state.adminSortCol===col ? (state.adminSortDir===1?'↑':'↓') : '';

  // Flags
  const flagHtml = Object.entries(flags).length === 0
    ? '<div class="empty">No flags yet</div>'
    : Object.entries(flags).map(([fid, f]) => `
      <div class="flag-item">
        <div class="flag-item-header">
          <span class="flag-qid">${f.qid}</span>
          <span class="flag-who">${escHtml(f.who)} · ${f.crew}</span>
          <span class="flag-time">${new Date(f.ts).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
        </div>
        <p class="flag-reason">"${escHtml(f.reason)}"</p>
        <button class="btn-danger" data-action="admin-delete-flag" data-flagid="${fid}" style="margin-top:6px;font-size:.75rem;padding:4px 10px">Dismiss</button>
      </div>`).join('');

  const testModeHtml = `
  <div class="toggle-wrap">
    <span style="font-size:.88rem;color:var(--dark)">Test Mode</span>
    <label class="toggle">
      <input type="checkbox" id="toggle-test" ${p.testMode?'checked':''}>
      <span class="toggle-slider"></span>
    </label>
    <span style="font-size:.8rem;color:var(--steel)">Exclude admin attempts from leaderboard</span>
    ${p.testMode?'<span class="test-mode-indicator">TEST MODE ON</span>':''}
  </div>`;

  return `
  <nav class="nav">
    <span class="nav-logo">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="1" y="1" width="20" height="20" rx="3" stroke="#F2A900" stroke-width="1.5"/><path d="M6 11h10M11 6v10" stroke="#F2A900" stroke-width="1.5" stroke-linecap="round"/></svg>
      CAST-R Admin
    </span>
    <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
      <span style="color:rgba(255,255,255,.6);font-size:.78rem">Week ${week}</span>
      <button class="nav-link" data-action="export-csv">Export CSV</button>
      <button class="nav-link" data-action="logout">Sign out</button>
    </div>
  </nav>
  ${p.testMode?'<div class="test-banner">⚠ TEST MODE ACTIVE — your attempts are excluded from leaderboard</div>':''}
  <div class="screen">
    <div class="screen-content wide">
      ${kpiHtml}
      <div class="admin-section-title">
        ${testModeHtml}
      </div>
      <div class="admin-section-title">Roster
        <div class="filter-chips">
          <div class="chip${state.adminFilter==='all'?' active':''}" data-filter="all">All</div>
          ${CREWS.map(c=>`<div class="chip${state.adminFilter===c.toLowerCase()?' active':''}" data-filter="${c.toLowerCase()}">${c}</div>`).join('')}
          <div class="chip${state.adminFilter==='inactive'?' active':''}" data-filter="inactive">Inactive</div>
          <div class="chip${state.adminFilter==='flagged'?' active':''}" data-filter="flagged">Flagged</div>
        </div>
      </div>
      <div class="admin-table-wrap">
        <table>
          <thead><tr>
            <th data-sort="firstName">Name ${arrow('firstName')}</th>
            <th data-sort="crew">Crew ${arrow('crew')}</th>
            <th>GA</th><th>MU</th><th>MC</th><th>RC</th>
            <th>GA Acc</th>
            <th data-sort="lastActiveTs">Last Active ${arrow('lastActiveTs')}</th>
            <th></th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="9" class="empty">No students match this filter</td></tr>'}</tbody>
        </table>
      </div>
      <div class="admin-section-title">Flagged Questions</div>
      ${flagHtml}
    </div>
  </div>`;
}

function attachAdmin() {
  const toggle = document.getElementById('toggle-test');
  if (toggle) {
    toggle.addEventListener('change', async () => {
      state.profile.testMode = toggle.checked;
      await DB.setProfile(state.userKey, state.profile);
      render();
    });
  }
}

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
// SVG DRAWINGS
// ─────────────────────────────────────────────
function renderDrawing(q) {
  if (q.drawing === 'shop_floor_layout') return renderShopFloor(q);
  if (q.drawing === 'job_site_layout') return renderJobSite(q);
  if (q.drawing === 'mounting_bracket') return renderBracket(q);
  return '';
}

function dimLabel(val, masked, maskedLetter) {
  if (masked && val === masked) {
    return `<tspan style="fill:#F2A900;font-weight:700;font-size:11px">${maskedLetter}</tspan>`;
  }
  return `<tspan>${val}</tspan>`;
}

function renderShopFloor(q) {
  const ml = q.maskedLetter;
  const m = q.masked;
  // Building: 160'×96', scale 3px/ft, viewBox 0 0 700 480
  // Building rect: (120,90) → (600,378)  [480w × 288h]
  // Tool Crib: x=144,y=90,w=192,h=66 (64'×22')
  // Sup Office: x=522,y=132,w=78,h=54 (26'×18')
  // Break Room: x=360,y=318,w=72,h=60 (24'×20')
  // Parts Storage: x=468,y=300,w=90,h=78 (30'×26')

  const masked = (label, id) => m === id
    ? `<text style="fill:#F2A900;font-weight:700;font-size:11px;font-family:'IBM Plex Mono',monospace">${ml}</text>`
    : `<text style="fill:#23303A;font-size:10px;font-family:'IBM Plex Mono',monospace">${label}</text>`;

  return `<svg viewBox="0 0 700 480" xmlns="http://www.w3.org/2000/svg" style="background:#fff;width:100%;max-width:660px">
  <!-- building -->
  <rect x="120" y="90" width="480" height="288" fill="none" stroke="#0A3D62" stroke-width="2"/>
  <!-- Tool Crib -->
  <rect x="144" y="90" width="192" height="66" fill="#e8f0f8" stroke="#0A3D62" stroke-width="1.2"/>
  <text x="240" y="130" text-anchor="middle" font-size="10" fill="#0A3D62" font-family="'IBM Plex Sans',sans-serif" font-weight="600">Tool Crib</text>
  <!-- Supervisor Office -->
  <rect x="522" y="132" width="78" height="54" fill="#e8f0f8" stroke="#0A3D62" stroke-width="1.2"/>
  <text x="561" y="160" text-anchor="middle" font-size="9" fill="#0A3D62" font-family="'IBM Plex Sans',sans-serif" font-weight="600">Sup. Office</text>
  <!-- Break Room -->
  <rect x="360" y="318" width="72" height="60" fill="#e8f0f8" stroke="#0A3D62" stroke-width="1.2"/>
  <text x="396" y="352" text-anchor="middle" font-size="9" fill="#0A3D62" font-family="'IBM Plex Sans',sans-serif" font-weight="600">Break</text>
  <text x="396" y="364" text-anchor="middle" font-size="9" fill="#0A3D62" font-family="'IBM Plex Sans',sans-serif">Room</text>
  <!-- Parts Storage -->
  <rect x="468" y="300" width="90" height="78" fill="#e8f0f8" stroke="#0A3D62" stroke-width="1.2"/>
  <text x="513" y="336" text-anchor="middle" font-size="9" fill="#0A3D62" font-family="'IBM Plex Sans',sans-serif" font-weight="600">Parts</text>
  <text x="513" y="348" text-anchor="middle" font-size="9" fill="#0A3D62" font-family="'IBM Plex Sans',sans-serif">Storage</text>
  <!-- dim lines style -->
  <style>.dim{font-size:10px;fill:#4A5560;font-family:'IBM Plex Mono',monospace}.dl{stroke:#4A5560;stroke-width:.8}.masked-dim{fill:#F2A900;font-weight:700;font-size:11px;font-family:'IBM Plex Mono',monospace}</style>
  <!-- TOP: 8' gap -->
  <line x1="120" y1="74" x2="144" y2="74" class="dl" marker-start="url(#arr)" marker-end="url(#arr)"/>
  <text x="132" y="70" text-anchor="middle" class="dim">8'</text>
  <!-- TOP: Tool Crib width (masked if tool_crib_width) -->
  <line x1="144" y1="74" x2="336" y2="74" class="dl"/>
  <line x1="144" y1="68" x2="144" y2="80" class="dl"/><line x1="336" y1="68" x2="336" y2="80" class="dl"/>
  <text x="240" y="70" text-anchor="middle" class="${m==='tool_crib_width'?'masked-dim':'dim'}">${m==='tool_crib_width'?ml:"64'"}</text>
  <!-- TOP: right 88' -->
  <line x1="336" y1="74" x2="600" y2="74" class="dl"/>
  <line x1="600" y1="68" x2="600" y2="80" class="dl"/>
  <text x="468" y="70" text-anchor="middle" class="dim">88'</text>
  <!-- FULL TOP: 160' -->
  <line x1="120" y1="58" x2="600" y2="58" class="dl"/>
  <line x1="120" y1="52" x2="120" y2="64" class="dl"/><line x1="600" y1="52" x2="600" y2="64" class="dl"/>
  <text x="360" y="54" text-anchor="middle" class="dim">160'</text>
  <!-- RIGHT: 14' to Sup Office -->
  <line x1="616" y1="90" x2="616" y2="132" class="dl"/>
  <line x1="610" y1="90" x2="622" y2="90" class="dl"/><line x1="610" y1="132" x2="622" y2="132" class="dl"/>
  <text x="638" y="114" text-anchor="middle" class="dim">14'</text>
  <!-- RIGHT: 18' Sup Office -->
  <line x1="616" y1="132" x2="616" y2="186" class="dl"/>
  <text x="638" y="162" text-anchor="middle" class="dim">18'</text>
  <!-- RIGHT: 10' gap -->
  <line x1="616" y1="186" x2="616" y2="216" class="dl"/>
  <line x1="610" y1="186" x2="622" y2="186" class="dl"/><line x1="610" y1="216" x2="622" y2="216" class="dl"/>
  <text x="638" y="204" text-anchor="middle" class="dim">10'</text>
  <!-- RIGHT: remainder (54') -->
  <line x1="616" y1="216" x2="616" y2="378" class="dl"/>
  <line x1="610" y1="378" x2="622" y2="378" class="dl"/>
  <text x="650" y="300" text-anchor="middle" class="${m==='right_remainder'?'masked-dim':'dim'}">${m==='right_remainder'?ml:"54'"}</text>
  <!-- FULL RIGHT: 96' -->
  <line x1="636" y1="90" x2="636" y2="378" class="dl"/>
  <line x1="630" y1="90" x2="642" y2="90" class="dl"/><line x1="630" y1="378" x2="642" y2="378" class="dl"/>
  <text x="662" y="238" text-anchor="middle" class="dim">96'</text>
  <!-- Sup Office width: 26' -->
  <line x1="522" y1="120" x2="600" y2="120" class="dl"/>
  <line x1="522" y1="114" x2="522" y2="126" class="dl"/><line x1="600" y1="114" x2="600" y2="126" class="dl"/>
  <text x="561" y="116" text-anchor="middle" class="dim">26'</text>
  <!-- BOTTOM: left gap (masked if left_gap_break) -->
  <line x1="120" y1="400" x2="360" y2="400" class="dl"/>
  <line x1="120" y1="394" x2="120" y2="406" class="dl"/><line x1="360" y1="394" x2="360" y2="406" class="dl"/>
  <text x="240" y="396" text-anchor="middle" class="${m==='left_gap_break'?'masked-dim':'dim'}">${m==='left_gap_break'?ml:"80'"}</text>
  <!-- BOTTOM: Break Room 24' -->
  <line x1="360" y1="400" x2="432" y2="400" class="dl"/>
  <text x="396" y="396" text-anchor="middle" class="dim">24'</text>
  <!-- BOTTOM: gap 12' -->
  <line x1="432" y1="400" x2="468" y2="400" class="dl"/>
  <line x1="432" y1="394" x2="432" y2="406" class="dl"/><line x1="468" y1="394" x2="468" y2="406" class="dl"/>
  <text x="450" y="396" text-anchor="middle" class="dim">12'</text>
  <!-- BOTTOM: Parts Storage 30' -->
  <line x1="468" y1="400" x2="558" y2="400" class="dl"/>
  <text x="513" y="396" text-anchor="middle" class="${m==='parts_storage_width'?'masked-dim':'dim'}">${m==='parts_storage_width'?ml:"30'"}</text>
  <!-- BOTTOM: right 14' -->
  <line x1="558" y1="400" x2="600" y2="400" class="dl"/>
  <line x1="558" y1="394" x2="558" y2="406" class="dl"/><line x1="600" y1="394" x2="600" y2="406" class="dl"/>
  <text x="579" y="396" text-anchor="middle" class="dim">14'</text>
  <!-- Parts Storage height: 26' -->
  <line x1="462" y1="300" x2="462" y2="378" class="dl"/>
  <line x1="456" y1="300" x2="468" y2="300" class="dl"/><line x1="456" y1="378" x2="468" y2="378" class="dl"/>
  <text x="440" y="342" text-anchor="middle" class="dim">26'</text>
  <!-- Break Room height: 20' -->
  <line x1="354" y1="318" x2="354" y2="378" class="dl"/>
  <line x1="348" y1="318" x2="360" y2="318" class="dl"/><line x1="348" y1="378" x2="360" y2="378" class="dl"/>
  <text x="336" y="352" text-anchor="middle" class="dim">20'</text>
  </svg>`;
}

function renderJobSite(q) {
  const ml = q.maskedLetter; const m = q.masked;
  // Job site: 140'×84', scale 3.2px/ft
  // Site: (110,90)→(558,359) [448w×269h]
  // Trailer: x=142,y=90,w=128,h=77 (40'×24')
  // Container: x=318,y=90,w=202,h=77 (63'×24')
  // Gen Pad: x=501,y=154,w=58,h=51 (18'×16')
  return `<svg viewBox="0 0 670 460" xmlns="http://www.w3.org/2000/svg" style="background:#fff;width:100%;max-width:640px">
  <style>.dim{font-size:10px;fill:#4A5560;font-family:'IBM Plex Mono',monospace}.dl{stroke:#4A5560;stroke-width:.8}.masked-dim{fill:#F2A900;font-weight:700;font-size:11px;font-family:'IBM Plex Mono',monospace}</style>
  <!-- site outline -->
  <rect x="110" y="90" width="448" height="269" fill="none" stroke="#0A3D62" stroke-width="2"/>
  <!-- Trailer -->
  <rect x="142" y="90" width="128" height="77" fill="#dde8f0" stroke="#0A3D62" stroke-width="1.2"/>
  <text x="206" y="132" text-anchor="middle" font-size="10" fill="#0A3D62" font-family="'IBM Plex Sans',sans-serif" font-weight="600">Trailer</text>
  <!-- Container -->
  <rect x="318" y="90" width="202" height="77" fill="#dde8f0" stroke="#0A3D62" stroke-width="1.2"/>
  <text x="419" y="132" text-anchor="middle" font-size="10" fill="#0A3D62" font-family="'IBM Plex Sans',sans-serif" font-weight="600">Storage Container</text>
  <!-- Gen Pad -->
  <rect x="501" y="154" width="58" height="51" fill="#e8f0e8" stroke="#2E7D46" stroke-width="1.2"/>
  <text x="530" y="176" text-anchor="middle" font-size="9" fill="#2E7D46" font-family="'IBM Plex Sans',sans-serif" font-weight="600">Gen</text>
  <text x="530" y="188" text-anchor="middle" font-size="9" fill="#2E7D46" font-family="'IBM Plex Sans',sans-serif">Pad</text>
  <!-- TOP: 10' left gap -->
  <line x1="110" y1="74" x2="142" y2="74" class="dl"/>
  <line x1="110" y1="68" x2="110" y2="80" class="dl"/><line x1="142" y1="68" x2="142" y2="80" class="dl"/>
  <text x="126" y="70" text-anchor="middle" class="dim">10'</text>
  <!-- TOP: 40' Trailer -->
  <line x1="142" y1="74" x2="270" y2="74" class="dl"/>
  <line x1="270" y1="68" x2="270" y2="80" class="dl"/>
  <text x="206" y="70" text-anchor="middle" class="dim">40'</text>
  <!-- TOP: 15' gap -->
  <line x1="270" y1="74" x2="318" y2="74" class="dl"/>
  <line x1="318" y1="68" x2="318" y2="80" class="dl"/>
  <text x="294" y="70" text-anchor="middle" class="dim">15'</text>
  <!-- TOP: container width -->
  <line x1="318" y1="74" x2="520" y2="74" class="dl"/>
  <line x1="520" y1="68" x2="520" y2="80" class="dl"/>
  <text x="419" y="70" text-anchor="middle" class="${m==='container_width'?'masked-dim':'dim'}">${m==='container_width'?ml:"63'"}</text>
  <!-- TOP: 12' right -->
  <line x1="520" y1="74" x2="558" y2="74" class="dl"/>
  <line x1="558" y1="68" x2="558" y2="80" class="dl"/>
  <text x="539" y="70" text-anchor="middle" class="dim">12'</text>
  <!-- FULL TOP: 140' -->
  <line x1="110" y1="56" x2="558" y2="56" class="dl"/>
  <line x1="110" y1="50" x2="110" y2="62" class="dl"/><line x1="558" y1="50" x2="558" y2="62" class="dl"/>
  <text x="334" y="52" text-anchor="middle" class="dim">140'</text>
  <!-- RIGHT: 20' to gen top -->
  <line x1="578" y1="90" x2="578" y2="154" class="dl"/>
  <line x1="572" y1="90" x2="584" y2="90" class="dl"/><line x1="572" y1="154" x2="584" y2="154" class="dl"/>
  <text x="600" y="124" text-anchor="middle" class="dim">20'</text>
  <!-- RIGHT: 16' gen height -->
  <line x1="578" y1="154" x2="578" y2="205" class="dl"/>
  <line x1="572" y1="205" x2="584" y2="205" class="dl"/>
  <text x="600" y="182" text-anchor="middle" class="dim">16'</text>
  <!-- RIGHT: remainder -->
  <line x1="578" y1="205" x2="578" y2="359" class="dl"/>
  <line x1="572" y1="359" x2="584" y2="359" class="dl"/>
  <text x="604" y="285" text-anchor="middle" class="${m==='gen_remainder'?'masked-dim':'dim'}">${m==='gen_remainder'?ml:"48'"}</text>
  <!-- FULL RIGHT: 84' -->
  <line x1="598" y1="90" x2="598" y2="359" class="dl"/>
  <line x1="592" y1="90" x2="604" y2="90" class="dl"/><line x1="592" y1="359" x2="604" y2="359" class="dl"/>
  <text x="628" y="228" text-anchor="middle" class="dim">84'</text>
  <!-- Trailer height: 24' -->
  <line x1="136" y1="90" x2="136" y2="167" class="dl"/>
  <line x1="130" y1="90" x2="142" y2="90" class="dl"/><line x1="130" y1="167" x2="142" y2="167" class="dl"/>
  <text x="114" y="132" text-anchor="middle" class="dim">24'</text>
  <!-- Gen Pad width: 18' -->
  <line x1="501" y1="218" x2="559" y2="218" class="dl"/>
  <line x1="501" y1="212" x2="501" y2="224" class="dl"/><line x1="559" y1="212" x2="559" y2="224" class="dl"/>
  <text x="530" y="232" text-anchor="middle" class="dim">18'</text>
  </svg>`;
}

function renderBracket(q) {
  const ml = q.maskedLetter; const m = q.masked;
  // Bracket: 44" total, scale 9px/in
  // SVG 560×200, bracket y-band: 85→121 (36px tall)
  // Left edge x=80, right edge x=476 (44"×9=396px)
  // Holes at y=103: H1=116, H2=193, H3=283, H4=364, H5=431 (r=6)
  // Spacings: 4", 8.5", 10", 9", 7.5", 5" (from left edge)
  return `<svg viewBox="0 0 560 200" xmlns="http://www.w3.org/2000/svg" style="background:#fff;width:100%;max-width:540px">
  <style>.dim{font-size:9px;fill:#4A5560;font-family:'IBM Plex Mono',monospace}.dl{stroke:#4A5560;stroke-width:.8}.masked-dim{fill:#F2A900;font-weight:700;font-size:10px;font-family:'IBM Plex Mono',monospace}</style>
  <!-- bracket body -->
  <rect x="80" y="85" width="396" height="36" fill="#c8d8e8" stroke="#0A3D62" stroke-width="2" rx="2"/>
  <!-- Holes -->
  <circle cx="116" cy="103" r="6" fill="#fff" stroke="#0A3D62" stroke-width="1.5"/>
  <circle cx="192" cy="103" r="6" fill="#fff" stroke="#0A3D62" stroke-width="1.5"/>
  <circle cx="282" cy="103" r="6" fill="#fff" stroke="#0A3D62" stroke-width="1.5"/>
  <circle cx="363" cy="103" r="6" fill="#fff" stroke="#0A3D62" stroke-width="1.5"/>
  <circle cx="430" cy="103" r="6" fill="#fff" stroke="#0A3D62" stroke-width="1.5"/>
  <!-- hole labels -->
  <text x="116" y="132" text-anchor="middle" font-size="8" fill="#0A3D62" font-family="'IBM Plex Mono',monospace">H1</text>
  <text x="192" y="132" text-anchor="middle" font-size="8" fill="#0A3D62" font-family="'IBM Plex Mono',monospace">H2</text>
  <text x="282" y="132" text-anchor="middle" font-size="8" fill="#0A3D62" font-family="'IBM Plex Mono',monospace">H3</text>
  <text x="363" y="132" text-anchor="middle" font-size="8" fill="#0A3D62" font-family="'IBM Plex Mono',monospace">H4</text>
  <text x="430" y="132" text-anchor="middle" font-size="8" fill="#0A3D62" font-family="'IBM Plex Mono',monospace">H5</text>
  <!-- dim: 4" left edge to H1 -->
  <line x1="80" y1="150" x2="116" y2="150" class="dl"/>
  <line x1="80" y1="144" x2="80" y2="156" class="dl"/><line x1="116" y1="144" x2="116" y2="156" class="dl"/>
  <text x="98" y="165" text-anchor="middle" class="dim">4"</text>
  <!-- dim: 8.5" H1 to H2 -->
  <line x1="116" y1="150" x2="192" y2="150" class="dl"/>
  <line x1="192" y1="144" x2="192" y2="156" class="dl"/>
  <text x="154" y="165" text-anchor="middle" class="dim">8.5"</text>
  <!-- dim: H2 to H3 (masked if hole2_to_hole3) -->
  <line x1="192" y1="150" x2="282" y2="150" class="dl"/>
  <line x1="282" y1="144" x2="282" y2="156" class="dl"/>
  <text x="237" y="165" text-anchor="middle" class="${m==='hole2_to_hole3'?'masked-dim':'dim'}">${m==='hole2_to_hole3'?ml:'10"'}</text>
  <!-- dim: 9" H3 to H4 -->
  <line x1="282" y1="150" x2="363" y2="150" class="dl"/>
  <line x1="363" y1="144" x2="363" y2="156" class="dl"/>
  <text x="322" y="165" text-anchor="middle" class="dim">9"</text>
  <!-- dim: 7.5" H4 to H5 -->
  <line x1="363" y1="150" x2="430" y2="150" class="dl"/>
  <line x1="430" y1="144" x2="430" y2="156" class="dl"/>
  <text x="396" y="165" text-anchor="middle" class="dim">7.5"</text>
  <!-- dim: 5" H5 to right -->
  <line x1="430" y1="150" x2="476" y2="150" class="dl"/>
  <line x1="476" y1="144" x2="476" y2="156" class="dl"/>
  <text x="453" y="165" text-anchor="middle" class="dim">5"</text>
  <!-- FULL: 44" -->
  <line x1="80" y1="178" x2="476" y2="178" class="dl"/>
  <line x1="80" y1="172" x2="80" y2="184" class="dl"/><line x1="476" y1="172" x2="476" y2="184" class="dl"/>
  <text x="278" y="194" text-anchor="middle" class="dim">44"</text>
  <!-- top vertical dims: H1-H5 y-coords -->
  <line x1="116" y1="68" x2="116" y2="85" class="dl" stroke-dasharray="3,2"/>
  <line x1="192" y1="68" x2="192" y2="85" class="dl" stroke-dasharray="3,2"/>
  <line x1="282" y1="68" x2="282" y2="85" class="dl" stroke-dasharray="3,2"/>
  <line x1="363" y1="68" x2="363" y2="85" class="dl" stroke-dasharray="3,2"/>
  <line x1="430" y1="68" x2="430" y2="85" class="dl" stroke-dasharray="3,2"/>
  </svg>`;
}

// ─────────────────────────────────────────────
// PIN BOX HELPERS
// ─────────────────────────────────────────────
function renderPinBoxes(containerId, count, prefix, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = Array.from({length:count}, (_,i) =>
    `<input class="pin-box" id="${prefix}${i}" type="tel" inputmode="numeric" maxlength="1" pattern="[0-9]" autocomplete="one-time-code">`
  ).join('');
  const boxes = Array.from({length:count}, (_,i) => document.getElementById(prefix+i));
  boxes.forEach((box,i) => {
    box.addEventListener('input', e => {
      box.value = box.value.replace(/\D/g,'').slice(-1);
      if (box.value) box.classList.add('filled'); else box.classList.remove('filled');
      if (box.value && i < count-1) boxes[i+1].focus();
      onChange();
    });
    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && i > 0) { boxes[i-1].focus(); boxes[i-1].value=''; boxes[i-1].classList.remove('filled'); onChange(); }
      if (e.key === 'Enter') onChange();
    });
    box.addEventListener('paste', e => {
      e.preventDefault();
      const txt = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g,'').slice(0,count);
      txt.split('').forEach((ch,j) => { if (boxes[i+j]) { boxes[i+j].value=ch; boxes[i+j].classList.add('filled'); } });
      if (boxes[Math.min(i+txt.length, count-1)]) boxes[Math.min(i+txt.length, count-1)].focus();
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
// UTILITIES
// ─────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────
navigate('landing');
