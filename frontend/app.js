/* ============================================================
   app.js — NOVA Router · API · Modal · Toast · Clock
   ============================================================ */

const API_BASE = '/api';

async function parseApiResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = isJson
      ? payload?.error || payload?.message || JSON.stringify(payload)
      : payload || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

/* ── API UTILITY ───────────────────────────────────────────── */
const api = {
  async get(path) {
    const r = await fetch(API_BASE + path);
    return parseApiResponse(r);
  },
  async post(path, data) {
    const r = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return parseApiResponse(r);
  },
  async put(path, data) {
    const r = await fetch(API_BASE + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return parseApiResponse(r);
  },
  async del(path) {
    const r = await fetch(API_BASE + path, { method: 'DELETE' });
    return parseApiResponse(r);
  }
};

/* ── TOAST ─────────────────────────────────────────────────── */
const toast = {
  show(msg, type = 'info') {
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${msg}</span>`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
};

/* ── MODAL ─────────────────────────────────────────────────── */
const modal = {
  open(title, bodyHTML, footerHTML = '', large = false) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML  = bodyHTML;
    document.getElementById('modal-footer').innerHTML = footerHTML;
    const box = document.getElementById('modal-box');
    large ? box.classList.add('large') : box.classList.remove('large');
    document.getElementById('modal-overlay').classList.add('open');
  },
  close() {
    document.getElementById('modal-overlay').classList.remove('open');
    document.getElementById('modal-body').innerHTML = '';
    document.getElementById('modal-footer').innerHTML = '';
  }
};

/* ── ROUTER ────────────────────────────────────────────────── */
const App = {
  current: 'dashboard',

  sectionMeta: {
    dashboard: { title: 'Dashboard',   sub: 'Overview' },
    tables:    { title: 'Tables',      sub: 'Floor Plan' },
    orders:    { title: 'Orders',      sub: 'Order Management' },
    menu:      { title: 'Menu',        sub: 'Menu Items' },
    customers: { title: 'Customers',   sub: 'Customer Directory' }
  },

  navigate(section) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Show target
    const el = document.getElementById(`section-${section}`);
    const nav = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (el) el.classList.add('active');
    if (nav) nav.classList.add('active');

    this.current = section;
    const meta = this.sectionMeta[section] || {};
    document.getElementById('topbar-title').textContent   = meta.title  || section;
    document.getElementById('topbar-section').textContent = meta.sub    || section;

    // Load section data
    const loaders = {
      dashboard: () => Dashboard.load(),
      tables:    () => Tables.load(),
      orders:    () => Orders.load(),
      menu:      () => Menu.load(),
      customers: () => Customers.load()
    };
    loaders[section]?.();
  },

  init() {
    // Nav click handlers
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
      item.addEventListener('click', () => this.navigate(item.dataset.section));
    });

    // Modal close
    document.getElementById('modal-close').addEventListener('click', modal.close);
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target.id === 'modal-overlay') modal.close();
    });

    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', () => {
      this.navigate(this.current);
      toast.show('Data refreshed', 'info');
    });

    // Clock
    const clock = () => {
      const now = new Date();
      document.getElementById('topbar-clock').textContent =
        now.toLocaleTimeString('en-US', { hour12: false });
      // Greeting
      const h = now.getHours();
      const g = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
      const el = document.getElementById('greeting-time');
      if (el) el.textContent = g;
    };
    clock();
    setInterval(clock, 1000);

    // Load initial section
    this.navigate('dashboard');

    // Update order badge every 30s
    this.updateOrderBadge();
    setInterval(() => this.updateOrderBadge(), 30000);
  },

  async updateOrderBadge() {
    try {
      const orders = await api.get('/orders?status=active');
      document.getElementById('active-orders-badge').textContent = orders.length || '0';
    } catch {}
  }
};

/* ── HELPERS ───────────────────────────────────────────────── */
function formatCurrency(v) {
  return '$' + parseFloat(v || 0).toFixed(2);
}

function formatDateTime(ts) {
  if (!ts) return '—';
  const d = parseTimestamp(ts);
  return d.toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

function formatDate(ts) {
  if (!ts) return '—';
  return parseTimestamp(ts).toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

function statusBadge(status) {
  const map = {
    active:    'badge-active',
    billing:   'badge-billing',
    paid:      'badge-paid',
    cancelled: 'badge-cancelled'
  };
  return `<span class="badge ${map[status] || 'badge-active'}">${status || 'active'}</span>`;
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function parseTimestamp(ts) {
  return new Date(String(ts).replace(' ', 'T'));
}

/* ── BOOT ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => App.init());
