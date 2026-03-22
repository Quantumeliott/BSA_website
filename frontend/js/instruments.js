// =============================================
// instruments.js — chargement et rendu des cartes
// =============================================

async function loadInstruments() {
  try {
    const response = await fetch(`${API_URL}/instruments`);
    if (!response.ok) throw new Error("Erreur API");

    const data = await response.json();
    // Le controller renvoie { instruments: [...], meta: {...} }
    const instruments = Array.isArray(data) ? data : (data.instruments ?? []);

    renderToContainer(instruments, 'landing-list', false);
    renderToContainer(instruments, 'dash-list',    true);

  } catch (error) {
    console.error("Erreur d'affichage :", error);
  }
}

function renderToContainer(data, containerId, isDashboard) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const rateLabels = {
    per_min:  'XRP / min',
    per_shot: 'XRP / shot',
    per_hour: 'XRP / hour',
  };

  const statusDot = {
    ONLINE:      'dot-green',
    BUSY:        'dot-orange',
    OFFLINE:     'dot-dim',
    MAINTENANCE: 'dot-dim',
  };

  const isBusy = inst =>
    inst.status === 'OFFLINE' || inst.status === 'MAINTENANCE' || inst.status === 'BUSY';

  const btnLabel = (inst, isDash) => {
    if (inst.status === 'OFFLINE' || inst.status === 'MAINTENANCE') return 'Currently Offline';
    if (inst.status === 'BUSY') return 'In Use — Join Queue';
    if (isDash) return inst.type === 'QUANTUM' ? 'Open Channel →' : 'Reserve Session →';
    return 'Get Started →';
  };

  container.innerHTML = data.map(inst => {
    // Specs : objet ou JSON string
    let specs = inst.specs ?? {};
    if (typeof specs === 'string') { try { specs = JSON.parse(specs); } catch { specs = {}; } }

    const specsHTML = Object.entries(specs)
      .map(([k, v]) => `<div class="spec"><span class="spec-k">${k}</span><span class="spec-v">${v}</span></div>`)
      .join('');

    const dot      = statusDot[inst.status] || 'dot-dim';
    const rate     = rateLabels[inst.rateUnit] || `XRP / ${inst.rateUnit || 'session'}`;
    const busy     = isBusy(inst);
    const label    = btnLabel(inst, isDashboard);
    const safeName = inst.name.replace(/'/g, "\\'");
    const onclick  = busy
      ? ''
      : isDashboard
        ? `showBookModal('${safeName}', ${inst.priceXRP}, '${inst.type.toLowerCase()}')`
        : `showAuth('register')`;

    return `
      <div class="icard">
        ${inst.imageUrl ? `<img src="${inst.imageUrl}" style="width:100%;height:120px;object-fit:cover;margin-bottom:12px;border:1px solid var(--border);">` : ''}
        <div class="icard-badge">
          <span class="dot ${dot}"></span>
          ${inst.status} — ${inst.type}
        </div>
        <div class="icard-name">${inst.name}</div>
        <div class="icard-loc">📍 ${inst.location}, ${inst.country}</div>
        ${specsHTML ? `<div class="icard-specs">${specsHTML}</div>` : ''}
        <div class="icard-price">
          <span class="price-n">${inst.priceXRP}</span>
          <span class="price-u">${rate}</span>
        </div>
        <button class="icard-btn ${busy ? 'off' : ''}" ${busy ? 'disabled' : `onclick="${onclick}"`}>
          ${label}
        </button>
      </div>`;
  }).join('');
}

window.addEventListener('DOMContentLoaded', loadInstruments);
