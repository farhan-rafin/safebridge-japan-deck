(() => {
  const APU = { lat: 33.2799, lng: 131.5016 };
  let lang = localStorage.getItem('sb_lang') || 'en';
  let announcements = [];
  let shelters = [];

  const $ = (id) => document.getElementById(id);
  const t = (key) => (UI[lang] && UI[lang][key]) || UI.en[key] || key;

  // ---------- language setup ----------
  function buildLangOptions(select) {
    select.innerHTML = '';
    LANGS.forEach((l) => {
      const opt = document.createElement('option');
      opt.value = l.code;
      opt.textContent = `${l.native} (${l.label})`;
      select.appendChild(opt);
    });
    select.value = lang;
  }

  function applyLang() {
    document.documentElement.lang = lang;
    localStorage.setItem('sb_lang', lang);

    $('wTag').textContent = t('welcomeTag');
    $('wNoLogin').textContent = t('noLogin');
    $('enterBtn').textContent = t('enterApp');
    $('brandLabel').textContent = t('appName');
    $('connLabel').textContent = navigator.onLine ? t('online') : t('offline');

    $('qaTitle').textContent = t('quickActions');
    $('qaSim').textContent = t('simulateAlert');
    $('qaCall').textContent = t('callEmergency');
    $('qaShelter').textContent = t('nearestShelter');
    $('qaPhrase').textContent = t('phrasebook');
    $('latestTitle').textContent = t('latestAlerts');
    $('viewAllLink').textContent = t('viewAll');

    $('alertsPageTitle').textContent = t('alertsTitle');
    $('mapPageTitle').textContent = t('mapTitle');
    $('sheltersTitle').textContent = t('sheltersNearby');
    $('openMapsLabel').textContent = t('openInMaps');
    $('guideTitle').textContent = t('guideTitle');
    $('phrasesPageTitle').textContent = t('phrasesTitle');
    $('phrasesHint').textContent = t('tapToHear');
    $('morePageTitle').textContent = t('moreTitle');
    $('aboutTitle').textContent = t('aboutProject');
    $('aboutDesc').textContent = t('aboutDesc');
    $('pamphletTitle').textContent = t('pamphletTitle');
    $('pamphletDesc').textContent = t('pamphletDesc');
    $('demoNote').textContent = t('demoNote');
    $('deckModalTitle').textContent = t('aboutProject');
    $('pamphletModalTitle').textContent = t('pamphletTitle');
    $('alertDismiss').textContent = t('closeAlert');

    $('nHome').textContent = t('navHome');
    $('nAlerts').textContent = t('navAlerts');
    $('nMap').textContent = t('navMap');
    $('nPhrases').textContent = t('navPhrases');
    $('nMore').textContent = t('navMore');

    setStatus(currentStatus, false);
    renderAnnouncements();
    renderShelters();
    renderGuide();
    renderLegend();
    renderPhrases();
    renderPamphlet();
  }

  // ---------- welcome ----------
  const welcomeLangSel = $('welcomeLang');
  buildLangOptions(welcomeLangSel);
  welcomeLangSel.addEventListener('change', () => { lang = welcomeLangSel.value; applyLang(); buildLangOptions($('langSelect')); });

  $('enterBtn').addEventListener('click', () => {
    $('welcome').classList.add('hide');
    $('app').classList.add('show');
  });

  const topLangSel = $('langSelect');
  buildLangOptions(topLangSel);
  topLangSel.addEventListener('change', () => { lang = topLangSel.value; welcomeLangSel.value = lang; applyLang(); });

  // ---------- connectivity ----------
  function updateConnStatus() {
    const el = $('connStatus');
    if (navigator.onLine) { el.classList.remove('off'); $('connLabel').textContent = t('online'); }
    else { el.classList.add('off'); $('connLabel').textContent = t('offline'); }
  }
  window.addEventListener('online', updateConnStatus);
  window.addEventListener('offline', updateConnStatus);

  // ---------- status banner ----------
  let currentStatus = 'safe'; // safe | advisory | warning | evacuate
  function setStatus(status, doNotify) {
    currentStatus = status;
    const banner = $('statusBanner');
    banner.className = 'statusbar ' + status;
    const msgKey = { safe: 'statusSafe', advisory: 'statusAdvisory', warning: 'statusWarning', evacuate: 'statusEvacuate' }[status];
    $('statusLabel').textContent = t('statusLabel');
    $('statusMsg').textContent = t(msgKey);
    const iconUse = banner.querySelector('use');
    iconUse.setAttribute('href', status === 'safe' ? '#i-shield' : status === 'evacuate' ? '#i-alert' : '#i-bell');
  }

  // ---------- navigation ----------
  function showView(name) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    $('view-' + name).classList.add('active');
    document.querySelectorAll('.navbtn').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
    $('views').scrollTo(0, 0);
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('.navbtn').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));
  $('viewAllLink').addEventListener('click', () => showView('alerts'));
  $('btnPhrasebook').addEventListener('click', () => showView('phrases'));
  $('btnNearestShelter').addEventListener('click', () => showView('map'));

  // ---------- data loading ----------
  async function loadData() {
    try {
      const [a, s] = await Promise.all([
        fetch('data/announcements.json').then((r) => r.json()),
        fetch('data/shelters.json').then((r) => r.json()),
      ]);
      announcements = a.announcements;
      shelters = s.shelters;
    } catch (e) {
      announcements = []; shelters = [];
    }
    renderAnnouncements();
    renderShelters();
    setupMap();
  }

  function sevLabel(sev) { return { advisory: t('sevAdvisory'), warning: t('sevWarning'), evacuate: t('sevEvacuate') }[sev] || sev; }

  function announcementCard(a) {
    const tx = a.text[lang] || a.text.en;
    const d = new Date(a.time);
    const timeStr = isNaN(d) ? '' : d.toLocaleString(lang, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `<div class="ann-card ${a.severity}">
      <div class="ann-top"><span class="sev-chip ${a.severity}">${sevLabel(a.severity)}</span><span class="ann-time">${timeStr}</span></div>
      <h3>${tx.title}</h3><p>${tx.body}</p>
      <div class="ann-src">${t('sourceLabel')}: ${a.source}</div>
    </div>`;
  }

  function renderAnnouncements() {
    $('homeAnnouncements').innerHTML = announcements.slice(0, 2).map(announcementCard).join('');
    $('alertsList').innerHTML = announcements.map(announcementCard).join('');
  }

  // ---------- map + shelters ----------
  function setupMap() {
    const frame = $('mapFrame');
    frame.src = `https://www.google.com/maps?q=${APU.lat},${APU.lng}&z=15&output=embed`;
    frame.addEventListener('error', () => { $('mapBox').style.display = 'none'; });
    const link = $('openMapsLink');
    link.href = `https://www.google.com/maps/search/?api=1&query=${APU.lat},${APU.lng}`;
  }

  function dirUrl(s) { return `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`; }

  function renderShelters() {
    $('shelterList').innerHTML = shelters.map((s) => `
      <div class="shelter-card">
        <div class="ico-box"><svg class="icn"><use href="#i-pin"/></svg></div>
        <div style="flex:1">
          <h3>${s.name}</h3>
          <div class="meta">${s.type} · ${s.distanceKm} km ${t('away')} · ${t('capacityLabel')}: ${s.capacity}</div>
          <a class="dirbtn" href="${dirUrl(s)}" target="_blank" rel="noopener"><svg class="icn" style="width:15px;height:15px"><use href="#i-route"/></svg>${t('getDirections')}</a>
        </div>
      </div>`).join('');
  }

  // ---------- guidance + legend ----------
  function renderGuide() {
    const steps = [t('step1'), t('step2'), t('step3'), t('step4'), t('step5')];
    $('guideSteps').innerHTML = steps.map((s, i) => `<div class="step-card"><div class="step-num">${i + 1}</div><p>${s}</p></div>`).join('');
  }
  function renderLegend() {
    $('legendRow').innerHTML = `
      <div class="lg"><span class="sw g"></span>${t('legendGreen')}</div>
      <div class="lg"><span class="sw a"></span>${t('legendAmber')}</div>
      <div class="lg"><span class="sw r"></span>${t('legendRed')}</div>`;
  }

  // ---------- phrases ----------
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = TTS_LOCALE[lang] || 'en-US';
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
  function renderPhrases() {
    const cats = ['catHelp', 'catMedical', 'catLocation', 'catShelter', 'catThanks'];
    let html = '';
    cats.forEach((cat) => {
      const items = PHRASES.filter((p) => p.cat === cat);
      if (!items.length) return;
      html += `<div class="phrase-cat">${t(cat)}</div>`;
      items.forEach((p) => {
        const native = p[lang] || p.en;
        html += `<div class="phrase-card" data-text="${encodeURIComponent(native)}">
          <div class="native">${native}</div>
          ${lang !== 'en' ? `<div class="eng">${p.en}</div>` : ''}
          <div class="speakrow"><svg class="icn" style="width:14px;height:14px"><use href="#i-speaker"/></svg>${t('tapToHear')}</div>
        </div>`;
      });
    });
    $('phraseList').innerHTML = html;
    $('phraseList').querySelectorAll('.phrase-card').forEach((card) => {
      card.addEventListener('click', () => speak(decodeURIComponent(card.dataset.text)));
    });
  }

  // ---------- pamphlet ----------
  function renderPamphlet() {
    const steps = [t('step1'), t('step2'), t('step3'), t('step4'), t('step5')];
    $('pamphletBody').innerHTML = `
      <h1>${t('appName')}</h1>
      <div class="sub">${t('pamphletDesc')}</div>
      <div class="icon-legend">
        <div class="leg-item g"><div class="ico-box"><svg class="icn"><use href="#i-shield"/></svg></div><span>${t('legendGreen')}</span></div>
        <div class="leg-item a"><div class="ico-box"><svg class="icn"><use href="#i-alert"/></svg></div><span>${t('legendAmber')}</span></div>
        <div class="leg-item r"><div class="ico-box"><svg class="icn"><use href="#i-alert"/></svg></div><span>${t('legendRed')}</span></div>
        <div class="leg-item g"><div class="ico-box"><svg class="icn"><use href="#i-pin"/></svg></div><span>${t('sheltersNearby')}</span></div>
      </div>
      <div class="sectionhead"><h2>${t('guideTitle')}</h2></div>
      <div>${steps.map((s, i) => `<div class="step-card"><div class="step-num">${i + 1}</div><p>${s}</p></div>`).join('')}</div>
      <button id="printBtn2">${t('printBtn')}</button>
    `;
    const btn = $('printBtn2');
    if (btn) btn.addEventListener('click', () => window.print());
  }

  // ---------- modals ----------
  function openModal(id) { $(id).classList.add('show'); }
  function closeModal(id) { $(id).classList.remove('show'); }
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeModal(b.dataset.close)));
  $('btnAbout').addEventListener('click', () => openModal('deckModal'));
  $('btnPamphlet').addEventListener('click', () => openModal('pamphletModal'));

  // ---------- emergency call ----------
  $('btnCall119').addEventListener('click', () => { window.location.href = 'tel:119'; });

  // ---------- alert simulation ----------
  $('btnSimAlert').addEventListener('click', () => {
    setStatus('evacuate', true);
    const overlay = $('alertOverlay');
    overlay.className = 'evacuate';
    overlay.classList.add('show');
    const a = announcements.find((x) => x.severity === 'evacuate') || announcements[0];
    if (a) {
      const tx = a.text[lang] || a.text.en;
      $('alertTitle').textContent = tx.title;
      $('alertBody').textContent = tx.body;
    }
    if (navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 250]);
  });
  $('alertDismiss').addEventListener('click', () => {
    $('alertOverlay').classList.remove('show');
  });

  // ---------- boot ----------
  applyLang();
  updateConnStatus();
  loadData();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
