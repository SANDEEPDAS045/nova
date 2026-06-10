/* ============================================================
   menu.js — Menu CRUD · Category Filter
   ============================================================ */

const Menu = {
  data: [],
  activeCategory: '',

  async load() {
    try {
      this.data = await api.get('/menu');
      this.renderCategoryFilters();
      this.renderTable();
    } catch(e) {
      toast.show('Failed to load menu: ' + e.message, 'error');
    }
  },

  renderCategoryFilters() {
    const cats = ['', ...new Set(this.data.map(m => m.category))].sort();
    const container = document.getElementById('menu-cat-filters');
    container.innerHTML = cats.map(cat => `
      <div class="cat-tag ${cat === this.activeCategory ? 'active' : ''}"
           data-cat="${escHtml(cat)}"
           onclick="Menu.setCategory('${escHtml(cat)}')">
        ${cat || 'All'}
      </div>
    `).join('');
  },

  setCategory(cat) {
    this.activeCategory = cat;
    this.renderCategoryFilters();
    this.renderTable();
  },

  renderTable() {
    const tbody = document.getElementById('menu-tbody');
    let items = this.data;
    if (this.activeCategory) {
      items = items.filter(m => m.category === this.activeCategory);
    }
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">🍽️</div><div class="empty-text">No items found</div></div></td></tr>`;
      return;
    }
    tbody.innerHTML = items.map(m => `
      <tr>
        <td class="bold" style="font-family:var(--f-brand);color:var(--tx3);font-size:13px">${m.id}</td>
        <td class="bold">${escHtml(m.name)}</td>
        <td>
          <span class="badge" style="background:var(--purp-dim);color:var(--purple);border:1px solid rgba(168,85,247,.15)">
            ${escHtml(m.category)}
          </span>
        </td>
        <td class="price-col">${formatCurrency(m.price)}</td>
        <td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--tx3)">
          ${escHtml(m.description) || '—'}
        </td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="Menu.openEditModal(${m.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="Menu.deleteItem(${m.id},'${escHtml(m.name).replace(/'/g,"\\'")}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  itemForm(item = {}) {
    const cats = ['Starters','Pizza','Salads','Burgers','Mains','Pasta','Desserts','Drinks','Sides'];
    return `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Item Name *</label>
          <input class="form-control" id="mi-name" placeholder="e.g. Margherita Pizza" value="${escHtml(item.name || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Price *</label>
          <input class="form-control" id="mi-price" type="number" step="0.01" min="0" placeholder="0.00" value="${item.price || ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-control" id="mi-category">
            ${cats.map(c => `<option value="${c}" ${c===item.category?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <input class="form-control" id="mi-desc" placeholder="Short description…" value="${escHtml(item.description || '')}">
        </div>
      </div>
    `;
  },

  openAddModal() {
    const body   = this.itemForm();
    const footer = `
      <button class="btn btn-ghost" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="Menu.submitAdd()">Add Item</button>
    `;
    modal.open('Add Menu Item', body, footer);
  },

  openEditModal(id) {
    const item = this.data.find(m => m.id === id);
    if (!item) return;
    const body   = this.itemForm(item);
    const footer = `
      <button class="btn btn-ghost" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="Menu.submitEdit(${id})">Save Changes</button>
    `;
    modal.open(`Edit: ${item.name}`, body, footer);
  },

  collectFormData() {
    return {
      name:        document.getElementById('mi-name')?.value.trim(),
      price:       document.getElementById('mi-price')?.value,
      category:    document.getElementById('mi-category')?.value || 'Main',
      description: document.getElementById('mi-desc')?.value.trim()
    };
  },

  async submitAdd() {
    const d = this.collectFormData();
    if (!d.name || !d.price) {
      toast.show('Name and price are required', 'error');
      return;
    }
    try {
      await api.post('/menu', d);
      modal.close();
      toast.show(`"${d.name}" added to menu!`, 'success');
      this.load();
    } catch(e) { toast.show('Error: ' + e.message, 'error'); }
  },

  async submitEdit(id) {
    const d = this.collectFormData();
    if (!d.name || !d.price) {
      toast.show('Name and price are required', 'error');
      return;
    }
    try {
      await api.put(`/menu/${id}`, d);
      modal.close();
      toast.show('Menu item updated!', 'success');
      this.load();
    } catch(e) { toast.show('Error: ' + e.message, 'error'); }
  },

  async deleteItem(id, name) {
    const body   = `<p style="color:var(--tx2);margin:8px 0">Are you sure you want to delete <strong style="color:var(--tx1)">"${name}"</strong> from the menu? This action cannot be undone.</p>`;
    const footer = `
      <button class="btn btn-ghost" onclick="modal.close()">Cancel</button>
      <button class="btn btn-danger" onclick="Menu.confirmDelete(${id})">Delete Item</button>
    `;
    modal.open('Delete Menu Item', body, footer);
  },

  async confirmDelete(id) {
    try {
      await api.del(`/menu/${id}`);
      modal.close();
      toast.show('Menu item deleted', 'success');
      this.load();
    } catch(e) { toast.show('Error: ' + e.message, 'error'); }
  }
};
