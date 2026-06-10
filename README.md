# 🍽️ NOVA Restaurant Management System

A full-stack restaurant management dashboard with a dark fintech-inspired UI.

**Stack:** HTML · CSS · JavaScript · Python (Flask) · SQLite

---

## 📁 Project Structure

```
restaurant-app/
├── backend/
│   ├── app.py          # Flask REST API
│   ├── schema.sql      # DB schema + seed data
│   └── requirements.txt
└── frontend/
    ├── index.html      # SPA shell
    ├── css/
    │   └── style.css   # Dark fintech theme
    └── js/
        ├── app.js       # Router · API · Modal · Toast
        ├── dashboard.js # Stats + Chart.js chart
        ├── tables.js    # Table grid + management
        ├── orders.js    # Order builder + list
        ├── menu.js      # Menu CRUD
        └── customers.js # Customer directory
```

---

## 🚀 Quick Start

### 1. Clone / Navigate to the project

```bash
cd restaurant-app
```

### 2. Set up the Python backend

```bash
cd backend
python -m venv venv

# macOS / Linux:
source venv/bin/activate

# Windows:
venv\Scripts\activate

pip install -r requirements.txt
```

### 3. Run the server

```bash
python app.py
```

You should see:
```
  🍽️  NOVA Restaurant Management System
  ✅  Database initialised at: .../restaurant.db
  🌐  Open → http://localhost:5000
```

### 4. Open the app

Visit **http://localhost:5000** in your browser.

> The database is automatically created with seed data (12 tables, 15 menu items,
> 5 customers, and a week of sample order history) on first launch.

---

## 🔌 REST API Reference

| Method | Endpoint               | Description                     |
|--------|------------------------|---------------------------------|
| GET    | /api/dashboard/stats   | Revenue, active tables, chart   |
| GET    | /api/customers         | List / search customers         |
| POST   | /api/customers         | Create customer                 |
| GET    | /api/customers/:id     | Customer + order history        |
| PUT    | /api/customers/:id     | Update customer                 |
| DELETE | /api/customers/:id     | Delete customer                 |
| GET    | /api/tables            | All tables with status          |
| PUT    | /api/tables/:id        | Update table status/assignment  |
| GET    | /api/menu              | All menu items                  |
| POST   | /api/menu              | Add menu item                   |
| PUT    | /api/menu/:id          | Update menu item                |
| DELETE | /api/menu/:id          | Delete menu item                |
| GET    | /api/orders            | List orders (filter by status)  |
| POST   | /api/orders            | Create new order                |
| GET    | /api/orders/:id        | Order details + items           |
| PUT    | /api/orders/:id        | Update order status             |

---

## 🎨 Features

### Dashboard
- Live stats (revenue, active tables, today's orders, top item)
- Interactive Chart.js weekly revenue area chart
- Recent orders feed

### Tables
- 12-table grid with color-coded status
  - 🟢 Green = Available
  - 🟣 Purple = Occupied  
  - 🟡 Yellow = Billing Pending
- Click any table to assign customer, place order, generate bill, or mark paid
- Changes instantly update the database

### Orders
- Create orders with multi-item builder
- Link to customer + table
- Filter by status (Active / Billing / Paid)
- Quick actions: request bill, mark paid, cancel

### Menu
- Full CRUD for menu items
- Category filter tabs
- Price, description, category management

### Customers
- Searchable directory
- Full order history per customer
- Total orders and spend tracked

---

## 🛠️ Requirements

- Python 3.8+
- Modern browser (Chrome, Firefox, Edge, Safari)
- No frontend build step needed
