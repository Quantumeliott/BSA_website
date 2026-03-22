// =============================================
// instruments.js — chargement et rendu des cartes
// =============================================
 
// ---- Images fallback par type ----
const FALLBACK_IMAGES = {
  TELESCOPE:    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/JWST_spacecraft_model_2.png/800px-JWST_spacecraft_model_2.png',
  QUANTUM:      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/IBM_quantum_computer.jpg/800px-IBM_quantum_computer.jpg',
  SPECTROGRAPH: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Spectrometer.jpg/800px-Spectrometer.jpg',
  SYNCHROTRON:  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Synchrotron_radiation_source.jpg/800px-Synchrotron_radiation_source.jpg',
  RADIO:        'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/USA.NM.VeryLargeArray.02.jpg/800px-USA.NM.VeryLargeArray.02.jpg',
  'CRYO-EM':    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/CryoEM_Titan_Krios.jpg/800px-CryoEM_Titan_Krios.jpg',
};
 
// ---- Agenda : vérifie si l'heure actuelle est dans un créneau ----
// Créneau attendu : "08:00 - 10:00" ou "08:00-10:00"
function isInAgenda(agenda) {
  if (!Array.isArray(agenda) || agenda.length === 0) return true; // pas d'agenda = toujours dispo
 
  const now   = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
 
  return agenda.some(slot => {
    // Accepte "08:00 - 10:00", "08:00-10:00", "8h00-10h00"
    const parts = slot.replace(/h/gi, ':').replace(/\s/g, '').split('-');
    if (parts.length < 2) return false;
 
    const parseTime = str => {
      const [h, m] = str.split(':').map(Number);
      return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
    };
 
    const start = parseTime(parts[0]);
    const end   = parseTime(parts[1]);
    return nowMin >= start && nowMin < end;
  });
}
 
// ---- Calcule le statut réel en croisant DB + agenda ----
function getStatus(inst) {
  // Si la DB dit OFFLINE ou MAINTENANCE, on respecte
  if (inst.status === 'OFFLINE' || inst.status === 'MAINTENANCE') return inst.status;
 
  const available = isInAgenda(inst.agenda);
 
  if (!available) return 'CLOSED';   // hors créneau
  if (inst.status === 'BUSY')        return 'BUSY';
  return 'ONLINE';
}
 
// ---- Image ----
function isValidImageUrl(url) {
  if (!url) return false;
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url)
      || url.includes('images.') || url.includes('/image/') || url.includes('img.');
}
 
function getImageSrc(inst) {
  const raw = inst.image || inst.imageUrl || '';
  if (isValidImageUrl(raw)) return raw;
  return FALLBACK_IMAGES[inst.type] || '';
}
 
// ---- Loaders ----
function showLoading(containerId) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = `<div style="grid-column:1/-1;padding:60px;text-align:center;color:var(--text-dim);font-size:11px;letter-spacing:.15em;text-transform:uppercase;">⟳ &nbsp;Connexion aux instruments...</div>`;
}
 
function showError(containerId, msg) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = `<div style="grid-column:1/-1;padding:60px;text-align:center;color:var(--red,#ff3860);font-size:11px;">⚠ &nbsp;${msg}</div>`;
}
 
// ---- Fetch ----
async function loadInstruments() {
  showLoading('landing-list');
  showLoading('dash-list');
 
  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 15000);
    const response   = await fetch(API_URL + '/instruments', { signal: controller.signal });
    clearTimeout(timeout);
 
    if (!response.ok) throw new Error('HTTP ' + response.status);
 
    const data        = await response.json();
    const instruments = Array.isArray(data) ? data : (data.instruments ?? data.data ?? []);
 
    if (!instruments.length) {
      showError('landing-list', 'Aucun instrument disponible.');
      showError('dash-list',    'Aucun instrument disponible.');
      return;
    }
 
    renderToContainer(instruments, 'landing-list', false);
    renderToContainer(instruments, 'dash-list',    true);
 
  } catch (error) {
    console.error('[instruments] Erreur :', error);
    const msg = error.name === 'AbortError'
      ? 'Serveur trop lent. Réessayez dans quelques secondes.'
      : 'Impossible de charger les instruments : ' + error.message;
    showError('landing-list', msg);
    showError('dash-list',    msg);
  }
}
 
// ---- Render ----
function renderToContainer(data, containerId, isDashboard) {
  const container = document.getElementById(containerId);
  if (!container) return;
 
  const rateLabels = { per_min: 'XRP / min', per_shot: 'XRP / shot', per_hour: 'XRP / hour' };
 
  const statusDot = {
    ONLINE:      'dot-green',
    BUSY:        'dot-orange',
    CLOSED:      'dot-orange',
    OFFLINE:     'dot-dim',
    MAINTENANCE: 'dot-dim',
  };
 
  const statusLabel = {
    ONLINE:      'Available',
    BUSY:        'Busy',
    CLOSED:      'Closed — hors créneau',
    OFFLINE:     'Offline',
    MAINTENANCE: 'Maintenance',
  };
 
  const isBusy = status => ['OFFLINE', 'MAINTENANCE', 'BUSY', 'CLOSED'].includes(status);
 
  const btnLabel = (status, isDash) => {
    if (status === 'OFFLINE' || status === 'MAINTENANCE') return 'Currently Offline';
    if (status === 'BUSY')   return 'In Use — Join Queue';
    if (status === 'CLOSED') return 'Hors créneau';
    if (isDash) return 'Reserve Session →';
    return 'Get Started →';
  };
 
  // Affiche les créneaux de l'agenda
  const agendaHTML = agenda => {
    if (!Array.isArray(agenda) || !agenda.length) return '';
    return '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:14px;">'
      + agenda.map(slot => {
          const active = isInAgenda([slot]);
          return '<span style="font-size:9px;padding:3px 8px;border:1px solid '
            + (active ? 'var(--green)' : 'var(--border)')
            + ';color:' + (active ? 'var(--green)' : 'var(--text-dim)')
            + ';background:' + (active ? 'rgba(57,255,20,.07)' : 'transparent')
            + ';">' + slot + '</span>';
        }).join('')
      + '</div>';
  };
 
  container.innerHTML = data.map(inst => {
    const status   = getStatus(inst);
    const dot      = statusDot[status]  || 'dot-dim';
    const slabel   = statusLabel[status] || status;
    const rate     = rateLabels[inst.rateUnit] || 'XRP / ' + (inst.rateUnit || 'session');
    const busy     = isBusy(status);
    const label    = btnLabel(status, isDashboard);
    const safeName = (inst.name || '').replace(/'/g, "\\'");
    const imgSrc   = getImageSrc(inst);
    const onclick  = busy ? '' : isDashboard
      ? "showBookModal('" + safeName + "', " + inst.priceXRP + ", '" + (inst.type || '').toLowerCase() + "')"
      : "showAuth('register')";
 
    let specs = inst.specs ?? {};
    if (typeof specs === 'string') { try { specs = JSON.parse(specs); } catch { specs = {}; } }
    const specsHTML = Object.entries(specs)
      .map(([k, v]) => '<div class="spec"><span class="spec-k">' + k + '</span><span class="spec-v">' + v + '</span></div>')
      .join('');
 
    return '<div class="icard">'
      + (imgSrc ? '<img src="' + imgSrc + '" alt="' + (inst.name||'') + '" style="width:100%;height:160px;object-fit:cover;margin-bottom:16px;border:1px solid var(--border);" onerror="this.style.display=\'none\'">' : '')
      + '<div class="icard-badge"><span class="dot ' + dot + '"></span> ' + slabel + ' — ' + (inst.type||'') + '</div>'
      + '<div class="icard-name">' + (inst.name||'') + '</div>'
      + '<div class="icard-loc">📍 ' + (inst.location||'') + ', ' + (inst.country||'') + '</div>'
      + agendaHTML(inst.agenda)
      + (specsHTML ? '<div class="icard-specs">' + specsHTML + '</div>' : '')
      + '<div class="icard-price"><span class="price-n">' + (inst.priceXRP||'') + '</span><span class="price-u">' + rate + '</span></div>'
      + '<button class="icard-btn ' + (busy ? 'off' : '') + '" ' + (busy ? 'disabled' : 'onclick="' + onclick + '"') + '>' + label + '</button>'
      + '</div>';
  }).join('');
}
 
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadInstruments);
} else {
  loadInstruments();
}