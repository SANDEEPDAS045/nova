/* ============================================================
   tables.js — Table Grid · Assign Customer · Place Order · Bill
   ============================================================ */

const Tables = {
  data: [],
  activeFilter: 'all',

  async load() {
    try {
      this.data = await api.get('/tables');
      this.render();
    } catch(e) {
      toast.show('Failed to load tables: ' + e.message, 'error');
    }
  },

  render() {
    const grid = document.getElementById('tables-grid');
    let tables = this.data;

    if (this.activeFilter !== 'all') {
      tables = tables.filter(t => t.status === this.activeFilter);
    }

    const avail = this.data.filter(t => t.status === 'available').length;
    const occ   = this.data.filter(t => t.status === 'occupied').length;
    const bill  = this.data.filter(t => t.status === 'billing').length;
    document.getElementById('table-count-label').textContent =
      `${avail} Available · ${occ} Occupied · ${bill} Billing`;

    if (!tables.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🪑</div><div class="empty-text">No tables found</div></div>';
      return;
    }

    grid.innerHTML = tables.map(t => `
      <div class="table-card ${t.status}" onclick="Tables.openTableModal(${t.id})">
        <div class="corner-dot"></div>
        <div>
          <div style="font-size:11px;font-family:var(--f-head);letter-spacing:1.5px;text-transform:uppercase;color:var(--tx3);margin-bottom:6px">TABLE</div>
          <div class="t-num">${String(t.id).padStart(2,'0')}</div>
        </div>
        <div>
          <div class="t-status">${t.status}</div>
          ${t.customer_name ? `<div class="t-customer">👤 ${escHtml(t.customer_name)}</div>` : ''}
          ${t.active_orders ? `<div class="t-orders">${t.active_orders} active order${t.active_orders>1?'s':''}</div>` : ''}
        </div>
      </div>
    `).join('');
  },

  setFilter(filter) {
    this.activeFilter = filter;
    document.querySelectorAll('.filter-btn[data-filter]').forEach(b => {
      b.classList.toggle('active-filter', b.dataset.filter === filter);
    });
    this.render();
  },

  async openTableModal(tableId) {
    const table = this.data.find(t => t.id === tableId);
    if (!table) return;

    // Fetch customers for dropdown
    let customers = [];
    try { customers = await api.get('/customers'); } catch {}

    const custOptions = customers.map(c =>
      `<option value="${c.id}" ${c.id == table.customer_id ? 'selected' : ''}>${escHtml(c.name)} — ${escHtml(c.phone)}</option>`
    ).join('');

    let body = '', footer = '';

    if (table.status === 'available') {
      body = `
        <div style="text-align:center;padding:10px 0 24px;">
          <div style="font-family:var(--f-brand);font-size:56px;color:var(--green);text-shadow:0 0 30px rgba(34,211,160,.4)">${String(tableId).padStart(2,'0')}</div>
          <div style="font-family:var(--f-head);color:var(--green);letter-spacing:2px;font-size:13px">TABLE AVAILABLE</div>
        </div>
        <div class="form-group">
          <label class="form-label">Assign Customer</label>
          <select class="form-control" id="tbl-customer-sel">
            <option value="">— Walk-in (no customer) —</option>
            ${custOptions}
          </select>
        </div>
        <div class="form-hint">Assign a customer or leave blank for walk-in guests.</div>
      `;
      footer = `
        <button class="btn btn-ghost" onclick="modal.close()">Cancel</button>
        <button class="btn btn-purple" onclick="Tables.assignAndOrder(${tableId})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          Assign & Place Order
        </button>
        <button class="btn btn-primary" onclick="Tables.assignOnly(${tableId})">Assign Table</button>
      `;

    } else if (table.status === 'occupied') {
      body = `
        <div style="display:flex;align-items:center;gap:16px;padding:8px 0 20px;">
          <div style="font-family:var(--f-brand);font-size:48px;color:var(--purple);line-height:1">${String(tableId).padStart(2,'0')}</div>
          <div>
            <div style="font-family:var(--f-head);color:var(--purple);letter-spacing:1.5px;font-size:12px">OCCUPIED</div>
            ${table.customer_name ? `<div style="font-size:16px;font-weight:600;margin-top:4px">👤 ${escHtml(table.customer_name)}</div>` : '<div style="color:var(--tx3);margin-top:4px">Walk-in guest</div>'}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Reassign Customer</label>
          <select class="form-control" id="tbl-customer-sel">
            <option value="">— Walk-in —</option>
            ${custOptions}
          </select>
        </div>
      `;
      footer = `
        <button class="btn btn-ghost" onclick="modal.close()">Close</button>
        <button class="btn btn-ghost" onclick="Tables.updateCustomer(${tableId})">Save Customer</button>
        <button class="btn btn-purple" onclick="Tables.placeOrder(${tableId})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          Add Order
        </button>
        <button class="btn btn-primary" style="background:linear-gradient(135deg,var(--amber),#d97706);color:#000" onclick="Tables.requestBill(${tableId})">Generate Bill</button>
      `;

    } else { // billing
      body = `
        <div style="text-align:center;padding:8px 0 20px;">
          <div style="font-family:var(--f-brand);font-size:48px;color:var(--amber);line-height:1;text-shadow:0 0 30px rgba(245,158,11,.4)">${String(tableId).padStart(2,'0')}</div>
          <div style="font-family:var(--f-head);color:var(--amber);letter-spacing:2px;font-size:12px;margin-top:6px">BILLING PENDING</div>
          ${table.customer_name ? `<div style="font-size:15px;font-weight:600;margin-top:10px">👤 ${escHtml(table.customer_name)}</div>` : ''}
        </div>
        <div id="table-bill-preview"><div class="loading-center"><div class="spinner"></div></div></div>
      `;
      footer = `
        <button class="btn btn-ghost" onclick="modal.close()">Close</button>
        <button class="btn btn-primary" style="background:linear-gradient(135deg,var(--green),#059669);color:#000" onclick="Tables.markPaid(${tableId})">
          ✅ Mark as Paid & Free Table
        </button>
      `;
      modal.open(`Table ${tableId} — Billing`, body, footer);
      this.loadTableBill(tableId);
      return;
    }

    modal.open(`Table ${tableId}`, body, footer);
  },

  async updateCustomer(tableId) {
    const sel = document.getElementById('tbl-customer-sel');
    const cid = sel?.value || null;
    try {
      await api.put(`/tables/${tableId}`, { status: 'occupied', customer_id: cid || null });
      modal.close();
      toast.show(`Table ${tableId} customer updated`, 'success');
      this.load();
    } catch(e) { toast.show('Error: ' + e.message, 'error'); }
  },

  async assignOnly(tableId) {
    const sel = document.getElementById('tbl-customer-sel');
    const cid = sel?.value || null;
    try {
      await api.put(`/tables/${tableId}`, { status: 'occupied', customer_id: cid || null });
      modal.close();
      toast.show(`Table ${tableId} assigned`, 'success');
      this.load();
      App.updateOrderBadge();
    } catch(e) { toast.show('Error: ' + e.message, 'error'); }
  },

  assignAndOrder(tableId) {
    const sel = document.getElementById('tbl-customer-sel');
    const cid = sel?.value || null;
    modal.close();
    Orders.openNewOrderModal(tableId, cid || null);
  },

  placeOrder(tableId) {
    const table = this.data.find(t => t.id === tableId);
    modal.close();
    Orders.openNewOrderModal(tableId, table?.customer_id || null);
  },

  async requestBill(tableId) {
    // Mark all active orders for this table as billing
    try {
      const orders = await api.get(`/orders?status=active`);
      const tableOrders = orders.filter(o => o.table_id === tableId);
      await Promise.all(tableOrders.map(o => api.put(`/orders/${o.id}`, { status: 'billing' })));
      await api.put(`/tables/${tableId}`, { status: 'billing', customer_id: this.data.find(t=>t.id===tableId)?.customer_id });
      modal.close();
      toast.show(`Bill requested for Table ${tableId}`, 'info');
      this.load();
      App.updateOrderBadge();
    } catch(e) { toast.show('Error: ' + e.message, 'error'); }
  },

  async loadTableBill(tableId) {
    try {
      const orders = await api.get('/orders');
      const tableOrders = orders.filter(o => o.table_id === tableId && ['active','billing'].includes(o.status));
      let total = 0;
      let rows = '';
      for (const o of tableOrders) {
        const det = await api.get(`/orders/${o.id}`);
        det.items.forEach(it => {
          const sub = it.price * it.quantity;
          total += sub;
          rows += `<div class="receipt-line"><span>${escHtml(it.item_name)} x${it.quantity}</span><span>${formatCurrency(sub)}</span></div>`;
        });
      }
      document.getElementById('table-bill-preview').innerHTML = `
        <div class="receipt">
          <div class="receipt-head">
            <div class="receipt-brand">NOVA</div>
            <div style="font-size:12px;color:var(--tx3);margin-top:4px">Table ${tableId}</div>
          </div>
          ${rows || '<div class="receipt-line" style="justify-content:center;color:var(--tx3)">No items found</div>'}
          <div class="receipt-total"><span class="label">TOTAL</span><span class="val">${formatCurrency(total)}</span></div>
        </div>
      `;
    } catch(e) {
      document.getElementById('table-bill-preview').innerHTML = `<div class="text-muted" style="text-align:center;padding:20px">Could not load bill</div>`;
    }
  },

  async markPaid(tableId) {
    try {
      const orders = await api.get('/orders');
      const tableOrders = orders.filter(o => o.table_id === tableId && ['active','billing'].includes(o.status));
      await Promise.all(tableOrders.map(o => api.put(`/orders/${o.id}`, { status: 'paid' })));
      // Table freed automatically by backend
      modal.close();
      toast.show(`Table ${tableId} cleared & payment received!`, 'success');
      this.load();
      App.updateOrderBadge();
    } catch(e) { toast.show('Error: ' + e.message, 'error'); }
  }
};

/* ── FILTER BUTTON LISTENERS ───────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => Tables.setFilter(btn.dataset.filter));
  });
});
