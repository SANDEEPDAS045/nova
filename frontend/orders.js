/* ============================================================
   orders.js — Order List · New Order Builder · Status Actions
   ============================================================ */

const Orders = {
  activeFilter: '',
  orderCart: [],
  menuCache: [],

  async load(filter) {
    if (filter !== undefined) this.activeFilter = filter;
    const url = this.activeFilter ? `/orders?status=${this.activeFilter}` : '/orders';
    try {
      const data = await api.get(url);
      this.renderTable(data);
      App.updateOrderBadge();
    } catch(e) {
      toast.show('Failed to load orders: ' + e.message, 'error');
    }
  },

  renderTable(orders) {
    const tbody = document.getElementById('orders-tbody');
    if (!orders.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">No orders found</div></div></td></tr>`;
      return;
    }
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td class="bold" style="font-family:var(--f-brand);color:var(--cyan)">#${o.id}</td>
        <td class="bold">${escHtml(o.customer_name)}</td>
        <td>${o.table_num ? `<span style="font-family:var(--f-brand);font-size:13px">T${o.table_num}</span>` : '<span class="text-muted">—</span>'}</td>
        <td>${formatDateTime(o.timestamp)}</td>
        <td style="font-family:var(--f-brand);color:var(--green)">${formatCurrency(o.total)}</td>
        <td>${statusBadge(o.status)}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="Orders.viewOrder(${o.id})">View</button>
            ${o.status === 'active' ? `<button class="btn btn-sm" style="background:var(--amber-dim);color:var(--amber);border:1px solid rgba(245,158,11,.2)" onclick="Orders.updateStatus(${o.id},'billing')">Bill</button>` : ''}
            ${o.status === 'billing' ? `<button class="btn btn-sm" style="background:var(--green-dim);color:var(--green);border:1px solid rgba(34,211,160,.2)" onclick="Orders.updateStatus(${o.id},'paid')">Paid</button>` : ''}
            ${['active','billing'].includes(o.status) ? `<button class="btn btn-danger btn-sm" onclick="Orders.updateStatus(${o.id},'cancelled')">✕</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  setFilter(filter) {
    this.activeFilter = filter;
    document.querySelectorAll('[data-order-filter]').forEach(b => {
      b.classList.toggle('active-filter', b.dataset.orderFilter === filter);
    });
    this.load(filter);
  },

  async viewOrder(orderId) {
    try {
      const { order, items } = await api.get(`/orders/${orderId}`);
      const rows = items.map(it =>
        `<div class="receipt-line"><span>${escHtml(it.item_name)} × ${it.quantity}</span><span>${formatCurrency(it.price * it.quantity)}</span></div>`
      ).join('');

      const body = `
        <div class="receipt">
          <div class="receipt-head">
            <div class="receipt-brand">NOVA</div>
            <div style="font-size:12px;color:var(--tx3);margin-top:4px">Order #${order.id}</div>
          </div>
          <div class="receipt-line"><span style="color:var(--tx3)">Customer</span><span>${escHtml(order.customer_name)}</span></div>
          <div class="receipt-line"><span style="color:var(--tx3)">Table</span><span>${order.table_num ? 'Table ' + order.table_num : 'No table'}</span></div>
          <div class="receipt-line"><span style="color:var(--tx3)">Time</span><span>${formatDateTime(order.timestamp)}</span></div>
          <div class="receipt-line"><span style="color:var(--tx3)">Status</span><span>${statusBadge(order.status)}</span></div>
          <hr class="divider">
          ${rows}
          <div class="receipt-total"><span class="label">TOTAL</span><span class="val">${formatCurrency(order.total)}</span></div>
        </div>
      `;

      let footer = `<button class="btn btn-ghost" onclick="modal.close()">Close</button>`;
      if (order.status === 'active') {
        footer += `<button class="btn btn-primary" style="background:linear-gradient(135deg,var(--amber),#d97706);color:#000" onclick="Orders.updateStatus(${order.id},'billing');modal.close()">Request Bill</button>`;
      }
      if (order.status === 'billing') {
        footer += `<button class="btn btn-primary" style="background:linear-gradient(135deg,var(--green),#059669);color:#000" onclick="Orders.updateStatus(${order.id},'paid');modal.close()">Mark Paid</button>`;
      }
      modal.open(`Order #${orderId}`, body, footer);
    } catch(e) { toast.show('Error loading order: ' + e.message, 'error'); }
  },

  async updateStatus(orderId, newStatus) {
    try {
      await api.put(`/orders/${orderId}`, { status: newStatus });
      const msgs = { billing:'Bill requested', paid:'Order marked as paid ✅', cancelled:'Order cancelled' };
      toast.show(msgs[newStatus] || 'Updated', 'success');
      this.load();
      // Refresh tables too if we're on tables section
      if (App.current === 'tables') Tables.load();
    } catch(e) { toast.show('Error: ' + e.message, 'error'); }
  },

  /* ── NEW ORDER MODAL ─────────────────────────────────────── */
  async openNewOrderModal(preTableId = null, preCustomerId = null) {
    this.orderCart = [];
    // Load menu + customers in parallel
    try {
      const [menu, customers] = await Promise.all([
        api.get('/menu'),
        api.get('/customers')
      ]);
      this.menuCache = menu;

      // Group menu by category
      const cats = [...new Set(menu.map(m => m.category))].sort();

      const custOptions = customers.map(c =>
        `<option value="${c.id}" ${c.id == preCustomerId ? 'selected' : ''}>${escHtml(c.name)}</option>`
      ).join('');

      let tableOptions = '';
      try {
        const tables = await api.get('/tables');
        const selectableTables = tables.filter(t =>
          t.status === 'available' || t.id == preTableId
        );
        tableOptions = selectableTables.map(t =>
          `<option value="${t.id}" ${t.id == preTableId ? 'selected' : ''}>Table ${t.id} (${t.status})</option>`
        ).join('');
      } catch {}

      const menuGrid = cats.map(cat => `
        <div class="menu-cat-header">${escHtml(cat)}</div>
        ${menu.filter(m => m.category === cat).map(m => `
          <div class="menu-item-card" id="mic-${m.id}" onclick="Orders.toggleItem(${m.id})">
            <div class="mic-name">${escHtml(m.name)}</div>
            <div class="mic-cat">${escHtml(m.category)}</div>
            <div class="mic-price">${formatCurrency(m.price)}</div>
          </div>
        `).join('')}
      `).join('');

      const body = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px">
          <div class="form-group" style="margin:0">
            <label class="form-label">Customer</label>
            <select class="form-control" id="order-customer">
              <option value="">Walk-in</option>
              ${custOptions}
            </select>
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Table</label>
            <select class="form-control" id="order-table">
              <option value="">No table</option>
              ${tableOptions}
            </select>
          </div>
        </div>
        <div class="order-builder">
          <div>
            <div style="font-family:var(--f-head);font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--tx3);margin-bottom:12px">Select Menu Items</div>
            <div class="menu-grid">${menuGrid}</div>
          </div>
          <div class="order-summary">
            <div class="os-title">Order Summary</div>
            <div id="os-items"><div class="os-empty">No items added yet</div></div>
            <hr class="os-divider">
            <div class="os-total">
              <span class="os-total-label">TOTAL</span>
              <span class="os-total-val" id="os-total">$0.00</span>
            </div>
          </div>
        </div>
      `;
      const footer = `
        <button class="btn btn-ghost" onclick="modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="Orders.submitOrder()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Place Order
        </button>
      `;
      modal.open('New Order', body, footer, true);
    } catch(e) { toast.show('Error loading data: ' + e.message, 'error'); }
  },

  toggleItem(itemId) {
    const item = this.menuCache.find(m => m.id === itemId);
    if (!item) return;
    const existing = this.orderCart.find(c => c.item_id === itemId);
    if (existing) {
      // Remove from cart
      this.orderCart = this.orderCart.filter(c => c.item_id !== itemId);
      document.getElementById(`mic-${itemId}`)?.classList.remove('selected');
    } else {
      this.orderCart.push({ item_id: itemId, quantity: 1, price: item.price, name: item.name });
      document.getElementById(`mic-${itemId}`)?.classList.add('selected');
    }
    this.renderCart();
  },

  changeQty(itemId, delta) {
    const entry = this.orderCart.find(c => c.item_id === itemId);
    if (!entry) return;
    entry.quantity = Math.max(1, entry.quantity + delta);
    this.renderCart();
  },

  renderCart() {
    const el = document.getElementById('os-items');
    if (!this.orderCart.length) {
      el.innerHTML = '<div class="os-empty">No items added yet</div>';
      document.getElementById('os-total').textContent = '$0.00';
      return;
    }
    el.innerHTML = this.orderCart.map(item => `
      <div class="os-item">
        <div class="os-item-name">${escHtml(item.name)}</div>
        <div class="os-item-qty">
          <div class="qty-btn" onclick="Orders.changeQty(${item.item_id},-1)">−</div>
          <div class="qty-val">${item.quantity}</div>
          <div class="qty-btn" onclick="Orders.changeQty(${item.item_id},+1)">+</div>
        </div>
        <div class="os-item-price">${formatCurrency(item.price * item.quantity)}</div>
        <div class="os-remove" onclick="Orders.toggleItem(${item.item_id})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </div>
      </div>
    `).join('');
    const total = this.orderCart.reduce((s, i) => s + i.price * i.quantity, 0);
    document.getElementById('os-total').textContent = formatCurrency(total);
  },

  async submitOrder() {
    if (!this.orderCart.length) {
      toast.show('Add at least one item to the order', 'error');
      return;
    }
    const customerId = document.getElementById('order-customer')?.value || null;
    const tableId    = document.getElementById('order-table')?.value    || null;

    const payload = {
      customer_id: customerId ? parseInt(customerId) : null,
      table_id:    tableId    ? parseInt(tableId)    : null,
      items: this.orderCart.map(i => ({
        item_id:  i.item_id,
        quantity: i.quantity,
        price:    i.price
      }))
    };

    try {
      const res = await api.post('/orders', payload);
      modal.close();
      toast.show(`Order #${res.order_id} placed successfully!`, 'success');
      this.load();
      App.updateOrderBadge();
      // Refresh tables if user is looking at them
      if (App.current === 'tables') Tables.load();
    } catch(e) { toast.show('Error placing order: ' + e.message, 'error'); }
  }
};

/* ── ORDER FILTER BUTTONS ──────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-order-filter]').forEach(btn => {
    btn.addEventListener('click', () => Orders.setFilter(btn.dataset.orderFilter));
  });
});
