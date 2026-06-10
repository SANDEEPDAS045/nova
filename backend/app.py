"""
NOVA Restaurant Management System — Flask Backend
Run:  python app.py
Then: http://localhost:5000
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime, timedelta
import random

BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
DB_PATH      = os.path.join(BASE_DIR, 'restaurant.db')
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'frontend'))

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
CORS(app)

# ─────────────────────────── DB HELPERS ────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def get_json_data():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}

def init_db():
    conn = get_db()
    schema = os.path.join(BASE_DIR, 'schema.sql')
    with open(schema, encoding='utf-8') as f:
        conn.executescript(f.read())

    # Generate 7 days of realistic historical order data if DB is fresh
    if conn.execute("SELECT COUNT(*) as c FROM orders").fetchone()['c'] == 0:
        popular = [(1,12.99),(2,14.99),(6,22.99),(7,13.99),(9,15.99),(11,6.99)]
        today   = datetime.now()
        for day_offset in range(7):
            day = today - timedelta(days=6 - day_offset)
            for _ in range(random.randint(4, 10)):
                cid   = random.randint(1, 5)
                ts    = day.strftime('%Y-%m-%d') + ' {:02d}:{:02d}:00'.format(
                            random.randint(11, 21), random.randint(0, 59))
                picks = random.sample(popular, random.randint(1, 3))
                total = round(sum(p * random.randint(1, 2) for _, p in picks), 2)
                cur   = conn.execute(
                    "INSERT INTO orders (customer_id,table_id,timestamp,status,total)"
                    " VALUES (?,NULL,?,'paid',?)", (cid, ts, total))
                oid = cur.lastrowid
                for item_id, price in picks:
                    conn.execute(
                        "INSERT INTO order_items (order_id,item_id,quantity,price)"
                        " VALUES (?,?,?,?)",
                        (oid, item_id, random.randint(1, 2), price))

    conn.commit()
    conn.close()

# ─────────────────────────── STATIC ────────────────────────────────

@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

# ─────────────────────────── DASHBOARD ─────────────────────────────

@app.route('/api/dashboard/stats')
def dashboard_stats():
    conn  = get_db()
    today = datetime.now().strftime('%Y-%m-%d')

    revenue = conn.execute(
        "SELECT COALESCE(SUM(total),0) as v FROM orders WHERE status='paid'"
    ).fetchone()['v']

    active_tables = conn.execute(
        "SELECT COUNT(*) as v FROM tables WHERE status='occupied'"
    ).fetchone()['v']

    orders_today = conn.execute(
        "SELECT COUNT(*) as v FROM orders WHERE DATE(timestamp)=?", (today,)
    ).fetchone()['v']

    top = conn.execute("""
        SELECT m.name, SUM(oi.quantity) as qty
        FROM order_items oi JOIN menu m ON m.id=oi.item_id
        GROUP BY oi.item_id ORDER BY qty DESC LIMIT 1
    """).fetchone()

    weekly = conn.execute("""
        SELECT DATE(timestamp) as date,
               COALESCE(SUM(total), 0) as revenue
        FROM orders
        WHERE timestamp >= DATE('now','-6 days') AND status='paid'
        GROUP BY DATE(timestamp)
        ORDER BY date
    """).fetchall()

    recent = conn.execute("""
        SELECT o.id,
               COALESCE(c.name,'Walk-in') as customer,
               o.timestamp, o.total, o.status,
               COALESCE(t.id, 0) as table_num
        FROM orders o
        LEFT JOIN customers c ON c.id = o.customer_id
        LEFT JOIN tables    t ON t.id = o.table_id
        ORDER BY o.timestamp DESC LIMIT 8
    """).fetchall()

    conn.close()
    return jsonify({
        'revenue':        round(revenue, 2),
        'active_tables':  active_tables,
        'orders_today':   orders_today,
        'top_item':       dict(top) if top else {'name': 'N/A', 'qty': 0},
        'weekly_revenue': [dict(r) for r in weekly],
        'recent_orders':  [dict(r) for r in recent],
    })

# ─────────────────────────── CUSTOMERS ─────────────────────────────

@app.route('/api/customers', methods=['GET', 'POST'])
def customers():
    conn = get_db()

    if request.method == 'GET':
        q = request.args.get('search', '').strip()
        base = """
            SELECT c.*,
                   COUNT(o.id)              as order_count,
                   COALESCE(SUM(o.total),0) as total_spent
            FROM customers c
            LEFT JOIN orders o ON o.customer_id = c.id
        """
        if q:
            rows = conn.execute(
                base + " WHERE c.name LIKE ? OR c.phone LIKE ?"
                     + " GROUP BY c.id ORDER BY c.id DESC",
                (f'%{q}%', f'%{q}%')
            ).fetchall()
        else:
            rows = conn.execute(
                base + " GROUP BY c.id ORDER BY c.id DESC"
            ).fetchall()
        conn.close()
        return jsonify([dict(r) for r in rows])

    d = get_json_data()
    if not d.get('name', '').strip():
        return jsonify({'error': 'Name is required'}), 400
    conn.execute("INSERT INTO customers (name,phone) VALUES (?,?)",
                 (d['name'].strip(), d.get('phone', '').strip()))
    conn.commit()
    new_id = conn.execute("SELECT last_insert_rowid() as id").fetchone()['id']
    conn.close()
    return jsonify({'success': True, 'id': new_id}), 201


@app.route('/api/customers/<int:cid>', methods=['GET', 'PUT', 'DELETE'])
def customer_detail(cid):
    conn = get_db()

    if request.method == 'GET':
        row = conn.execute("""
            SELECT c.*,
                   COUNT(o.id)              as order_count,
                   COALESCE(SUM(o.total),0) as total_spent
            FROM customers c
            LEFT JOIN orders o ON o.customer_id=c.id
            WHERE c.id=? GROUP BY c.id
        """, (cid,)).fetchone()
        if not row:
            return jsonify({'error': 'Not found'}), 404
        orders = conn.execute("""
            SELECT o.*, COALESCE(t.id,0) as table_num
            FROM orders o
            LEFT JOIN tables t ON t.id=o.table_id
            WHERE o.customer_id=?
            ORDER BY o.timestamp DESC LIMIT 20
        """, (cid,)).fetchall()
        conn.close()
        return jsonify({'customer': dict(row), 'orders': [dict(o) for o in orders]})

    if request.method == 'PUT':
        d = get_json_data()
        if not d.get('name', '').strip():
            conn.close()
            return jsonify({'error': 'Name is required'}), 400
        conn.execute("UPDATE customers SET name=?,phone=? WHERE id=?",
                     (d['name'].strip(), d.get('phone', '').strip(), cid))
        conn.commit()
        conn.close()
        return jsonify({'success': True})

    # Preserve order history by detaching it from the customer before deletion.
    conn.execute("UPDATE orders SET customer_id=NULL WHERE customer_id=?", (cid,))
    conn.execute("UPDATE tables SET customer_id=NULL WHERE customer_id=?", (cid,))
    conn.execute("DELETE FROM customers WHERE id=?", (cid,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ─────────────────────────── TABLES ────────────────────────────────

@app.route('/api/tables', methods=['GET'])
def tables_list():
    conn = get_db()
    rows = conn.execute("""
        SELECT t.*,
               COALESCE(c.name,'') as customer_name,
               (SELECT COUNT(*) FROM orders o
                WHERE o.table_id=t.id AND o.status IN ('active','billing'))
               as active_orders
        FROM tables t
        LEFT JOIN customers c ON c.id=t.customer_id
        ORDER BY t.id
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/tables/<int:tid>', methods=['PUT'])
def update_table(tid):
    conn = get_db()
    d = get_json_data()
    conn.execute("UPDATE tables SET status=?,customer_id=? WHERE id=?",
                 (d.get('status', 'available'), d.get('customer_id'), tid))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ─────────────────────────── MENU ──────────────────────────────────

@app.route('/api/menu', methods=['GET', 'POST'])
def menu_list():
    conn = get_db()

    if request.method == 'GET':
        rows = conn.execute(
            "SELECT * FROM menu ORDER BY category, name"
        ).fetchall()
        conn.close()
        return jsonify([dict(r) for r in rows])

    d = get_json_data()
    if not d.get('name') or not d.get('price'):
        return jsonify({'error': 'Name and price are required'}), 400
    conn.execute("INSERT INTO menu (name,price,description,category) VALUES (?,?,?,?)",
                 (d['name'], float(d['price']),
                  d.get('description', ''), d.get('category', 'Main')))
    conn.commit()
    conn.close()
    return jsonify({'success': True}), 201


@app.route('/api/menu/<int:mid>', methods=['PUT', 'DELETE'])
def menu_item(mid):
    conn = get_db()

    if request.method == 'PUT':
        d = get_json_data()
        if not d.get('name') or not d.get('price'):
            conn.close()
            return jsonify({'error': 'Name and price are required'}), 400
        conn.execute(
            "UPDATE menu SET name=?,price=?,description=?,category=? WHERE id=?",
            (d['name'], float(d['price']),
             d.get('description', ''), d.get('category', 'Main'), mid))
        conn.commit()
        conn.close()
        return jsonify({'success': True})

    linked = conn.execute(
        "SELECT 1 FROM order_items WHERE item_id=? LIMIT 1", (mid,)
    ).fetchone()
    if linked:
        conn.close()
        return jsonify({'error': 'Menu item cannot be deleted because it exists in past orders'}), 400

    conn.execute("DELETE FROM menu WHERE id=?", (mid,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ─────────────────────────── ORDERS ────────────────────────────────

@app.route('/api/orders', methods=['GET', 'POST'])
def orders_list():
    conn = get_db()

    if request.method == 'GET':
        status = request.args.get('status', '')
        q = """
            SELECT o.*,
                   COALESCE(c.name,'Walk-in') as customer_name,
                   COALESCE(t.id,0)           as table_num
            FROM orders o
            LEFT JOIN customers c ON c.id=o.customer_id
            LEFT JOIN tables    t ON t.id=o.table_id
        """
        if status:
            rows = conn.execute(q + " WHERE o.status=? ORDER BY o.timestamp DESC",
                                (status,)).fetchall()
        else:
            rows = conn.execute(q + " ORDER BY o.timestamp DESC LIMIT 100"
                                ).fetchall()
        conn.close()
        return jsonify([dict(r) for r in rows])

    d = get_json_data()
    items = d.get('items', [])
    if not items:
        return jsonify({'error': 'Order must contain at least one item'}), 400

    total = round(sum(float(i['price']) * int(i['quantity']) for i in items), 2)
    ts    = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    cur = conn.execute(
        "INSERT INTO orders (customer_id,table_id,timestamp,status,total)"
        " VALUES (?,?,?,'active',?)",
        (d.get('customer_id'), d.get('table_id'), ts, total))
    oid = cur.lastrowid

    for it in items:
        conn.execute(
            "INSERT INTO order_items (order_id,item_id,quantity,price)"
            " VALUES (?,?,?,?)",
            (oid, it['item_id'], int(it['quantity']), float(it['price'])))

    if d.get('table_id'):
        conn.execute(
            "UPDATE tables SET status='occupied',customer_id=? WHERE id=?",
            (d.get('customer_id'), d.get('table_id')))

    conn.commit()
    conn.close()
    return jsonify({'success': True, 'order_id': oid}), 201


@app.route('/api/orders/<int:oid>', methods=['GET', 'PUT'])
def order_detail(oid):
    conn = get_db()

    if request.method == 'GET':
        row = conn.execute("""
            SELECT o.*,
                   COALESCE(c.name,'Walk-in') as customer_name,
                   COALESCE(t.id,0)           as table_num
            FROM orders o
            LEFT JOIN customers c ON c.id=o.customer_id
            LEFT JOIN tables    t ON t.id=o.table_id
            WHERE o.id=?
        """, (oid,)).fetchone()
        if not row:
            conn.close()
            return jsonify({'error': 'Not found'}), 404
        items = conn.execute("""
            SELECT oi.*, m.name as item_name
            FROM order_items oi JOIN menu m ON m.id=oi.item_id
            WHERE oi.order_id=?
        """, (oid,)).fetchall()
        conn.close()
        return jsonify({'order': dict(row), 'items': [dict(i) for i in items]})

    d          = get_json_data()
    new_status = d.get('status')
    if new_status not in ('active', 'billing', 'paid', 'cancelled'):
        conn.close()
        return jsonify({'error': 'Invalid order status'}), 400
    order_row  = conn.execute(
        "SELECT table_id FROM orders WHERE id=?", (oid,)
    ).fetchone()

    conn.execute("UPDATE orders SET status=? WHERE id=?", (new_status, oid))

    if order_row and order_row['table_id']:
        if new_status in ('paid', 'cancelled'):
            conn.execute(
                "UPDATE tables SET status='available',customer_id=NULL WHERE id=?",
                (order_row['table_id'],))
        elif new_status == 'billing':
            conn.execute(
                "UPDATE tables SET status='billing' WHERE id=?",
                (order_row['table_id'],))

    conn.commit()
    conn.close()
    return jsonify({'success': True})


# ───────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    init_db()
    print("\n  🍽️  NOVA Restaurant Management System")
    print("  ✅  Database initialised at:", DB_PATH)
    print("  🌐  Open → http://localhost:5000\n")
    app.run(debug=True, port=5000, host='0.0.0.0')
