// VTLog VTC Widget
// CONFIG: set your VTLog API key and VTC id here, or implement a server-side proxy.
const VTC_WIDGET_CONFIG = {
  apiKey: '49e1f7d2ab74b85d8bc62bc85ecb9f432b810f14a54f05d5bf5281e4c1185c0c', // <-- Optional: Put your VTLog API key here. Leave empty to attempt an unauthenticated request.
  vtcId: '8136',   // VTC id as provided
  baseUrl: 'https://api.vtlog.net/v1' // Base URL for the VTLog API (you provided https://api.vtlog.net/v1/vtc/8136/jobs)
};

function escapeHtml(s){ return String(s||'').replace(/[&<>\"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

// Currency conversion factor and formatter (centralized)
const CURRENCY_MULT = 21.2074;
function formatMoney(v){
  if(typeof v !== 'number' || isNaN(v)) return '—';
  // Convert API value by multiplying with the configured factor
  return (v * CURRENCY_MULT).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// Human-friendly labels for fields
const LABELS = {
  job_id: 'Auftragsnummer',
  driver_name: 'Fahrer',
  steam_id: 'Steam ID',
  distance_client: 'Distanz (km)',
  fuel_used: 'Kraftstoff (L)',
  adblue_used: 'AdBlue (L)',
  income: 'Einnahmen',
  profit: 'Gewinn',
  expense: 'Ausgaben',
  income_distance: 'Einnahmen (Distanz)',
  income_weight: 'Einnahmen (Gewicht)',
  started_at: 'Startzeit',
  finished_at: 'Ankunftszeit',
  created_at: 'Erstellt am',
  game: 'Spiel',
  truck_id: 'Truck',
  truck_cabin_damage: 'Kabinen-Schaden',
  truck_chassis_damage: 'Chassis-Schaden',
  truck_engine_damage: 'Motor-Schaden',
  truck_transmission_damage: 'Getriebe-Schaden',
  truck_wheels_damage: 'Reifen-Schaden',
  trailers_chassis_damage: 'Auflieger-Chassis-Schaden',
  trailers_wheels_damage: 'Auflieger-Reifen-Schaden',
  trailer_cargo_damage: 'Ladungs-Schaden',
  trailers_body_damage: 'Auflieger-Karosserie-Schaden',
  cargo_id: 'Ladung',
  cargo_mass: 'Lademasse',
  departure_city: 'Abfahrtsstadt',
  arrival_city: 'Zielstadt',
  departure_company: 'Abfahrt Firma',
  arrival_company: 'Ziel Firma'
};

// label for aggregated profit
LABELS['_total_profit'] = 'Gewinn';

// Helper: compute numeric totals for income/expense and damage
function computeAggregates(job){
  const incomeKeys = Object.keys(job).filter(k => k === 'income' || k.startsWith('income'));
  const expenseKeys = Object.keys(job).filter(k => k === 'expense' || k.startsWith('expense'));
  const profitKeys = Object.keys(job).filter(k => k === 'profit' || k.startsWith('profit'));

  const sumNumeric = (keys) => keys.reduce((sum,k)=>{
    const v = job[k];
    const n = typeof v === 'number' ? v : (typeof v === 'string' ? parseFloat(v.replace(',','.')) : NaN);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const incomeTotal = sumNumeric(incomeKeys);
  const expenseTotal = sumNumeric(expenseKeys);
  let profitTotal = sumNumeric(profitKeys);
  // if no explicit profit keys, derive from income - expense when possible
  if(!profitTotal && Number.isFinite(incomeTotal) && Number.isFinite(expenseTotal)){
    profitTotal = incomeTotal - expenseTotal;
  }

  return { incomeTotal, expenseTotal, profitTotal };
}

document.addEventListener('DOMContentLoaded', ()=>{
  const root = document.getElementById('vtc-jobs');
  if(!root) return;
  const list = root.querySelector('.jobs-list');
  const status = root.querySelector('.widget-status');
  let currentEntries = [];

  // Create modal container
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-header"><h3 id="modal-title">Auftragsdetails</h3><button class="modal-close" aria-label="Schließen">✕</button></div>
      <div class="modal-body"><div class="job-detail-list"></div></div>
    </div>`;
  document.body.appendChild(modalOverlay);

  const modalCloseBtn = modalOverlay.querySelector('.modal-close');
  const modalList = modalOverlay.querySelector('.job-detail-list');
  function openModal(){ modalOverlay.classList.add('open'); document.addEventListener('keydown', onEsc); }
  function closeModal(){ modalOverlay.classList.remove('open'); document.removeEventListener('keydown', onEsc); }
  function onEsc(e){ if(e.key === 'Escape') closeModal(); }
  modalCloseBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e)=>{ if(e.target === modalOverlay) closeModal(); });

  async function loadJobs(){
    status.textContent = 'Lade Aufträge...';
    // Basic client-side fetch — many APIs require server-side proxy due to CORS and to keep the key secret
    if(!VTC_WIDGET_CONFIG.apiKey || !VTC_WIDGET_CONFIG.vtcId){
      status.innerHTML = 'Kein API-Schlüssel oder VTC-ID konfiguriert. <br>Setze die Variablen oben in <code>vtc-widget.js</code> oder richte einen Server-Proxy ein.';
      renderJobs(mockData());
      return;
    }

    try{
      const url = `${VTC_WIDGET_CONFIG.baseUrl}/vtc/${encodeURIComponent(VTC_WIDGET_CONFIG.vtcId)}/jobs?limit=8`;
      const headers = {};
      if(VTC_WIDGET_CONFIG.apiKey) headers['Authorization'] = `Bearer ${VTC_WIDGET_CONFIG.apiKey}`;
      const res = await fetch(url, { headers });
      if(!res.ok) throw new Error('Network response not ok');
      const data = await res.json();
      status.style.display = 'none';
      renderJobs(data);
    }catch(err){
      console.warn('VTLog widget fetch failed:', err);
      status.textContent = 'Fehler beim Laden (CORS/API). Zeige Demo-Daten.';
      renderJobs(mockData());
    }
  }

  function renderJobs(data){
    // VTLog returns { data: [ ... ], hasMore: bool, nextID: n }
    const entries = (data && (data.data || data.jobs || data)) || [];
    if(!entries.length){
      list.innerHTML = '<div class="empty">Keine Aufträge gefunden.</div>';
      return;
    }
    currentEntries = entries;
    list.innerHTML = entries.map((entry,i)=>jobToHtml(entry,i)).join('');
    // Attach click handlers
    list.querySelectorAll('.job-card').forEach(card => {
      card.addEventListener('click', ()=>{
        const idx = Number(card.getAttribute('data-index'));
        const job = currentEntries[idx];
        if(job) showJobDetails(job);
      });
    });
  }

  function jobToHtml(job, idx){
    // Build a readable title: prefer explicit title, otherwise show job id
    const routeTitle = job.title || job.route || (typeof job.job_id !== 'undefined' ? `Auftrag #${job.job_id}` : 'Auftrag');
    const title = escapeHtml(routeTitle);

    // Prefer human-readable driver name if provided, fall back to steam_id
    const rawDriver = job.driver_name || job.driver || job.username || job.steam_id || '';
    let driver = '—';
    if(rawDriver){
      driver = escapeHtml(String(rawDriver));
      // shorten steam-like ids for display
      if(!job.driver_name && String(rawDriver).startsWith('STEAM_')){
        driver = escapeHtml(String(rawDriver).slice(0,12));
      }
    }

    // Collapsed route display: prefer human-readable departure/arrival fields if available
    const dep = job.departure_city || job.departure_city_name || job.departure_company || job.departure_company_name || job.departure_city_id || job.departure_company_id || '';
    const arr = job.arrival_city || job.arrival_city_name || job.arrival_company || job.arrival_company_name || job.arrival_city_id || job.arrival_company_id || '';
    const routeDisplay = (dep && arr) ? `${dep} → ${arr}` : '';

    // Construct compact date from parts if provided
    let time = '';
    if(job.arrival_year || job.arrival_month || job.arrival_day){
      time = formatDateParts(job.arrival_year, job.arrival_month, job.arrival_day);
    } else if(job.departure_year || job.departure_month || job.departure_day){
      time = formatDateParts(job.departure_year, job.departure_month, job.departure_day);
    } else if(job.finished_at || job.started_at || job.created_at){
      time = new Date(job.finished_at || job.started_at || job.created_at).toLocaleString();
    } else {
      time = new Date().toLocaleString();
    }

    // compute aggregates for display
    const ag = computeAggregates(job);
    const income = ag.incomeTotal ? formatMoney(ag.incomeTotal) : '—';
    const expense = ag.expenseTotal ? formatMoney(ag.expenseTotal) : '—';
    const profit = (typeof ag.profitTotal === 'number' && !isNaN(ag.profitTotal)) ? formatMoney(ag.profitTotal) : '—';
    const distance = (typeof job.distance_client === 'number' && job.distance_client) ? `${job.distance_client} km` : '';
    // Render collapsed card: title, small route (from→to), driver and basic stats
    return `<article class="job-card card" data-index="${idx}"><div class="job-head"><strong>${title}</strong><span>${escapeHtml(time)}</span></div>${routeDisplay?`<div class="job-sub">${escapeHtml(routeDisplay)}</div>`:''}<p class="job-sub">Fahrer: ${driver} ${distance ? ' • '+escapeHtml(distance) : ''}</p><p class="job-sub">Einnahmen gesamt: ${escapeHtml(income)} • Ausgaben gesamt: ${escapeHtml(expense)} • Gewinn: ${escapeHtml(profit)}</p></article>`;
  }

  function showJobDetails(job){
    modalList.innerHTML = '';
    // Aggregate truck/trailer damage into singular fields and hide individual damage/expense fields
    const truckDamageKeys = ['truck_cabin_damage','truck_chassis_damage','truck_engine_damage','truck_transmission_damage','truck_wheels_damage'];
    const trailerDamageKeys = ['trailers_chassis_damage','trailers_wheels_damage','trailer_cargo_damage','trailers_body_damage'];

    // compute aggregates and attach totals (only income/expense)
    const ag = computeAggregates(job);
    if(ag.incomeTotal) job._total_income = ag.incomeTotal;
    if(ag.expenseTotal) job._total_expense = ag.expenseTotal;
    if(typeof ag.profitTotal === 'number') job._total_profit = ag.profitTotal;

    // Build combined date range field from departure/arrival parts or from started/finished timestamps
    const depDate = (job.departure_year || job.departure_month || job.departure_day) ? formatDateParts(job.departure_year, job.departure_month, job.departure_day) : null;
    const arrDate = (job.arrival_year || job.arrival_month || job.arrival_day) ? formatDateParts(job.arrival_year, job.arrival_month, job.arrival_day) : null;
    let dateRange = '';
    if(depDate && arrDate) dateRange = `${depDate} → ${arrDate}`;
    else if(depDate) dateRange = depDate;
    else if(arrDate) dateRange = arrDate;
    else if(job.started_at || job.finished_at){
      const s = job.started_at ? new Date(job.started_at).toLocaleString() : '';
      const f = job.finished_at ? new Date(job.finished_at).toLocaleString() : '';
      dateRange = s && f ? `${s} → ${f}` : (s||f||'');
    }
    if(dateRange) job._date_range = dateRange;

    // Exclude fields that end with _id except job_id
    let rawKeys = Object.keys(job).filter(k => (k === 'job_id') || !/_id$/.test(k));
      // Remove individual damage keys and all income/expense/damage detail keys
      rawKeys = rawKeys.filter(k => !truckDamageKeys.includes(k) && !trailerDamageKeys.includes(k));
      rawKeys = rawKeys.filter(k => !(k.startsWith('expense') || k.startsWith('income') || k.startsWith('expense_truck') || k.startsWith('expense_trailer')));
      // Keep arrival_/departure_ fields so we can show start/goal cities in top section
      // (do not remove arrival_/departure_ keys)

    // Preferred order (include aggregated keys)
      const orderedFields = [
        // start / destination (prefer readable keys, include id fallbacks)
        'departure_city','departure_city_id','arrival_city','arrival_city_id',
        // truck, date, driver, cargo
        'truck_id','_date_range','driver_name','cargo_id','cargo_mass',
        // then totals
        '_total_income','_total_expense','_total_profit','distance_client','fuel_used','adblue_used','started_at','finished_at','created_at','game'
      ];
    const keys = [];
    orderedFields.forEach(k=>{ if(rawKeys.includes(k)) keys.push(k); });
    rawKeys.forEach(k=>{ if(!keys.includes(k)) keys.push(k); });

    keys.forEach(k=>{
      let v = job[k];
      if(k === '_total_income' && typeof v === 'number') v = formatMoney(v);
      if(k === '_total_expense' && typeof v === 'number') v = formatMoney(v);
      if(k === '_total_profit' && typeof v === 'number') v = formatMoney(v);

      const displayKey = LABELS[k] || (k === '_date_range' ? 'Datum' : (k === '_total_income' ? 'Einnahmen gesamt' : (k === '_total_expense' ? 'Ausgaben gesamt' : k.replace(/_/g,' ').replace(/\b\w/g, ch => ch.toUpperCase()))));
      const val = (v===null||v===undefined||v==='')? '—' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
      const item = document.createElement('div'); item.className = 'job-detail-item';
      item.innerHTML = `<div class="job-detail-key">${escapeHtml(displayKey)}</div><div class="job-detail-val">${escapeHtml(val)}</div>`;
      modalList.appendChild(item);
    });
    openModal();
  }

  function formatDateParts(y,m,d){
    if(!y) return '';
    // Months may be 0-based or 1-based depending on API; assume 1-based if in 1..12
    const month = (m && m>=1 && m<=12) ? m-1 : (m ? m : 0);
    const day = d || 1;
    try{ return new Date(y, month, day).toLocaleDateString(); }catch(e){ return `${y}-${m || '00'}-${d || '00'}`; }
  }

  function mockData(){
    return { data: [
      { job_id: 1, steam_id: 'STEAM_0:1:123456', driver_name: 'Max Mustermann', departure_city_id: 'München', arrival_city_id: 'Berlin', arrival_year: 2025, arrival_month: 12, arrival_day: 30, distance_client: 580, income: 420, profit: 310 },
      { job_id: 2, steam_id: 'STEAM_0:1:654321', driver_name: 'Anna Bauer', departure_city_id: 'Hamburg', arrival_city_id: 'Köln', arrival_year: 2025, arrival_month: 12, arrival_day: 29, distance_client: 360, income: 260, profit: 180 },
      { job_id: 3, steam_id: 'STEAM_0:1:111222', driver_name: 'Peter Schmidt', departure_city_id: 'Dresden', arrival_city_id: 'Leipzig', arrival_year: 2025, arrival_month: 12, arrival_day: 28, distance_client: 120, income: 90, profit: 70 }
    ] };
  }

  loadJobs();
});