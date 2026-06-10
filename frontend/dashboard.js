/* ============================================================
   dashboard.js — Stats · Chart.js Revenue · Recent Orders
   ============================================================ */

const Dashboard = {
  chartInstance: null,

  async load() {
    try {
      const data = await api.get('/dashboard/stats');
      this.renderStats(data);
      this.renderChart(data.weekly_revenue);
      this.renderRecent(data.recent_orders);
    } catch(e) {
      toast.show('Failed to load dashboard: ' + e.message, 'error');
    }
  },

  renderStats(data) {
    document.getElementById('stat-revenue').textContent = formatCurrency(data.revenue);
    document.getElementById('stat-tables').textContent  = data.active_tables;
    document.getElementById('stat-orders').textContent  = data.orders_today;
    document.getElementById('stat-top').textContent     = data.top_item?.name || 'N/A';
    document.getElementById('stat-top-sub').textContent = data.top_item?.qty
      ? `${data.top_item.qty} servings sold`
      : 'No orders yet';
    document.getElementById('stat-tables-sub').textContent =
      `${data.active_tables} of 12 occupied`;
  },

  renderChart(weekly) {
    // Build complete 7-day array (fill missing days with 0)
    const today  = new Date();
    const days   = [];
    const values = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const found = weekly.find(r => r.date === key);
      days.push(d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }));
      values.push(found ? parseFloat(found.revenue) : 0);
    }

    const ctx = document.getElementById('revenue-chart').getContext('2d');

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0,   'rgba(0,212,255,.35)');
    grad.addColorStop(0.6, 'rgba(0,212,255,.08)');
    grad.addColorStop(1,   'rgba(0,212,255,0)');

    if (this.chartInstance) this.chartInstance.destroy();

    Chart.defaults.color = '#475569';
    Chart.defaults.font.family = "'Jost', sans-serif";

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: days,
        datasets: [{
          label: 'Revenue',
          data: values,
          fill: true,
          backgroundColor: grad,
          borderColor: '#00d4ff',
          borderWidth: 2.5,
          pointBackgroundColor: '#00d4ff',
          pointBorderColor: '#030810',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(7,14,28,.95)',
            borderColor: 'rgba(0,212,255,.2)',
            borderWidth: 1,
            padding: 12,
            titleFont: { family: "'Rajdhani', sans-serif", size: 13, weight: '700' },
            bodyFont:  { family: "'Jost', sans-serif", size: 14 },
            callbacks: {
              label: ctx => '  Revenue: ' + formatCurrency(ctx.parsed.y)
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,.04)', drawBorder: false },
            ticks: { color: '#475569', font: { size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,.04)', drawBorder: false },
            ticks: {
              color: '#475569', font: { size: 11 },
              callback: v => '$' + v.toFixed(0)
            }
          }
        }
      }
    });
  },

  renderRecent(orders) {
    const el = document.getElementById('recent-orders-list');
    if (!orders.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">No orders yet</div></div>';
      return;
    }
    el.innerHTML = orders.map(o => `
      <div style="display:flex;align-items:center;gap:14px;padding:12px 22px;border-bottom:1px solid rgba(255,255,255,.04);transition:.14s;"
           onmouseover="this.style.background='rgba(255,255,255,.02)'"
           onmouseout="this.style.background='transparent'">
        <div style="width:36px;height:36px;border-radius:8px;background:var(--bg2);display:grid;place-items:center;flex-shrink:0;font-family:var(--f-brand);font-size:12px;color:var(--tx3)">
          #${o.id}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(o.customer)}</div>
          <div style="font-size:12px;color:var(--tx3);font-family:var(--f-head);letter-spacing:.3px">${formatDateTime(o.timestamp)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:var(--f-brand);font-size:14px;color:var(--cyan)">${formatCurrency(o.total)}</div>
          ${statusBadge(o.status)}
        </div>
      </div>
    `).join('');
  }
};
