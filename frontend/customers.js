/* ============================================================
   customers.js — Customer List · Search · Add/Edit · History
   ============================================================ */

const Customers = {
  searchTimeout: null,

  async load() {
    await this.fetch('');
  },

  search(query) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.fetch(query), 320);
  },

  async fetch(query = '') {
    const url = query ? `/customers?search=${encodeURIComponent(query)}` : '/customers';
    try {
      const data = await api.get(url);
      this.renderTable(data);
    } catch(e) {
      toast.show('Failed to load customers: ' + e.message, 'error');
    }
  },

  renderTable(customers) {
    const tbody = document.getElementById('customers-tbody');
    if (!customers.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">No customers found</div></div></td></tr>`;
      return;
    }
    tbody.innerHTML = customers.map(c => `
      <tr>
        <td style="font-family:var(--f-brand);color:var(--tx3);font-size:13px">${c.id}</td>
        <td class="bold">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--cyan),var(--purple));display:grid;place-items:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">
              ${escHtml(c.name).charAt(0).toUpperCase()}
            </div>
            ${escHtml(c.name)}
          </div>
        </td>
        <td>${escHtml(c.phone) || '<span class="text-muted">—</span>'}</td>
        <td>
          <span style="font-family:var(--f-brand);font-size:14px;color:var(--purple)">${c.order_count || 0}</span>
        </td>
        <td style="font-family:var(--f-brand);color:var(--green)">${formatCurrency(c.total_spent)}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="Customers.viewHistory(${c.id})">History</button>
            <button class="btn btn-ghost btn-sm" onclick="Customers.openEditModal(${c.id},'${escHtml(c.name).replace(/'/g,"\\'")}','${escHtml(c.phone||'').replace(/'/g,"\\'")}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="Customers.deleteCustomer(${c.id},'${escHtml(c.name).replace(/'/g,"\\'")}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  customerForm(c = {}) {
    return `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Full Name *</label>
          <input class="form-control" id="c-name" placeholder="e.g. Alex Rivera" value="${escHtml(c.name || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input class="form-control" id="c-phone" placeholder="555-0100" value="${escHtml(c.phone || '')}">
        </div>
      </div>
    `;
  },

  openAddModal() {
    const footer = `
      <button class="btn btn-ghost" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="Customers.submitAdd()">Add Customer</button>
    `;
    modal.open('Add Customer', this.customerForm(), footer);
  },

  openEditModal(id, name, phone) {
    const footer = `
      <button class="btn btn-ghost" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="Customers.submitEdit(${id})">Save Changes</button>
    `;
    modal.open(`Edit: ${name}`, this.customerForm({ name, phone }), footer);
  },

  async submitAdd() {
    const name  = document.getElementById('c-name')?.value.trim();
    const phone = document.getElementById('c-phone')?.value.trim();
    if (!name) { toast.show('Name is required', 'error'); return; }
    try {
      await api.post('/customers', { name, phone });
      modal.close();
      toast.show(`Customer "${name}" added!`, 'success');
      this.fetch(document.getElementById('customer-search')?.value || '');
    } catch(e) { toast.show('Error: ' + e.message, 'error'); }
  },

  async submitEdit(id) {
    const name  = document.getElementById('c-name')?.value.trim();
    const phone = document.getElementById('c-phone')?.value.trim();
    if (!name) { toast.show('Name is required', 'error'); return; }
    try {
      await api.put(`/customers/${id}`, { name, phone });
      modal.close();
      toast.show('Customer updated!', 'success');
      this.fetch(document.getElementById('customer-search')?.value || '');
    } catch(e) { toast.show('Error: ' + e.message, 'error'); }
  },

  async deleteCustomer(id, name) {
    const body   = `<p style="color:var(--tx2);margin:8px 0">Delete <strong style="color:var(--tx1)">"${name}"</strong>? Their order history will remain intact.</p>`;
    const footer = `
      <button class="btn btn-ghost" onclick="modal.close()">Cancel</button>
      <button class="btn btn-danger" onclick="Customers.confirmDelete(${id})">Delete</button>
    `;
    modal.open('Delete Customer', body, footer);
  },

  async confirmDelete(id) {
    try {
      await api.del(`/customers/${id}`);
      modal.close();
      toast.show('Customer deleted', 'success');
      this.fetch('');
    } catch(e) { toast.show('Error: ' + e.message, 'error'); }
  },

  async viewHistory(id) {
    try {
      const { customer, orders } = await api.get(`/customers/${id}`);
      const orderRows = orders.length
        ? orders.map(o => `
            <tr>
              <td style="font-family:var(--f-brand);color:var(--cyan);font-size:13px">#${o.id}</td>
              <td>${o.table_num ? 'Table ' + o.table_num : '—'}</td>
              <td>${formatDateTime(o.timestamp)}</td>
              <td style="font-family:var(--f-brand);color:var(--green)">${formatCurrency(o.total)}</td>
              <td>${statusBadge(o.status)}</td>
            </tr>
          `).join('')
        : `<tr><td colspan="5"><div class="empty-state" style="padding:30px"><div class="empty-text">No orders yet</div></div></td></tr>`;

      const body = `
        <div class="customer-meta">
          <div class="meta-item">
            <div class="meta-val">${customer.order_count || 0}</div>
            <div class="meta-label">Total Orders</div>
          </div>
          <div class="meta-item">
            <div class="meta-val">${formatCurrency(customer.total_spent)}</div>
            <div class="meta-label">Total Spent</div>
          </div>
          <div class="meta-item">
            <div class="meta-val">${escHtml(customer.phone) || '—'}</div>
            <div class="meta-label">Phone</div>
          </div>
        </div>
        <div class="card-title" style="margin-bottom:12px">Order History</div>
        <div class="data-table-wrap" style="max-height:300px;overflow-y:auto">
          <table>
            <thead>
              <tr><th>#</th><th>Table</th><th>Date</th><th>Total</th><th>Status</th></tr>
            </thead>
            <tbody>${orderRows}</tbody>
          </table>
        </div>
      `;
      const footer = `
        <button class="btn btn-ghost" onclick="modal.close()">Close</button>
        <button class="btn btn-primary" onclick="modal.close();Orders.openNewOrderModal(null,${customer.id})">New Order</button>
      `;
      modal.open(`${customer.name} — Profile`, body, footer);
    } catch(e) { toast.show('Error loading profile: ' + e.message, 'error'); }
  }
};
