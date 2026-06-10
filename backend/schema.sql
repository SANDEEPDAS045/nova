-- ============================================
-- NOVA Restaurant Management System
-- Database Schema (SQLite)
-- ============================================

CREATE TABLE IF NOT EXISTS customers (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL,
    phone TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tables (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    status      TEXT DEFAULT 'available'
                CHECK(status IN ('available','occupied','billing')),
    customer_id INTEGER REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS menu (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT  NOT NULL,
    price       REAL  NOT NULL,
    description TEXT  DEFAULT '',
    category    TEXT  DEFAULT 'Main'
);

CREATE TABLE IF NOT EXISTS orders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER REFERENCES customers(id),
    table_id    INTEGER REFERENCES tables(id),
    timestamp   TEXT NOT NULL,
    status      TEXT DEFAULT 'active'
                CHECK(status IN ('active','billing','paid','cancelled')),
    total       REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS order_items (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES orders(id),
    item_id  INTEGER REFERENCES menu(id),
    quantity INTEGER DEFAULT 1,
    price    REAL NOT NULL
);

-- ============================================
-- SEED: 12 Restaurant Tables
-- ============================================
INSERT OR IGNORE INTO tables (id, status) VALUES
(1,'available'),(2,'available'),(3,'available'),(4,'available'),
(5,'available'),(6,'available'),(7,'available'),(8,'available'),
(9,'available'),(10,'available'),(11,'available'),(12,'available');

-- ============================================
-- SEED: Menu Items
-- ============================================
INSERT OR IGNORE INTO menu (id, name, price, description, category) VALUES
(1,  'Margherita Pizza',    12.99, 'Classic tomato with fresh mozzarella & basil',         'Pizza'),
(2,  'Pepperoni Pizza',     14.99, 'Loaded with premium pepperoni slices',                 'Pizza'),
(3,  'BBQ Chicken Pizza',   15.99, 'Smoky BBQ sauce with grilled chicken & red onion',     'Pizza'),
(4,  'Caesar Salad',         8.99, 'Crispy romaine, parmesan, classic caesar dressing',    'Salads'),
(5,  'Greek Salad',          9.99, 'Tomatoes, cucumber, olives, feta cheese',              'Salads'),
(6,  'Grilled Salmon',      22.99, 'Fresh Atlantic salmon fillet with herb butter',        'Mains'),
(7,  'Beef Burger',         13.99, 'Juicy 200g beef patty, lettuce, tomato, fries',        'Burgers'),
(8,  'Veggie Burger',       11.99, 'House-made plant-based patty, fresh veggies',          'Burgers'),
(9,  'Pasta Carbonara',     15.99, 'Creamy egg sauce, crispy pancetta, parmesan',          'Pasta'),
(10, 'Penne Arrabbiata',    12.99, 'Spicy tomato sauce, garlic, fresh basil',              'Pasta'),
(11, 'Tiramisu',             6.99, 'Classic Italian coffee & mascarpone dessert',          'Desserts'),
(12, 'Chocolate Fondant',    7.99, 'Warm dark chocolate cake, vanilla ice cream',          'Desserts'),
(13, 'House Wine',           8.99, 'Red or white, 175ml',                                 'Drinks'),
(14, 'Craft IPA',            5.99, 'Local craft India Pale Ale, 500ml draught',            'Drinks'),
(15, 'Fresh Juice',          4.99, 'Orange, apple or mixed berry, 350ml',                 'Drinks');

-- ============================================
-- SEED: Sample Customers
-- ============================================
INSERT OR IGNORE INTO customers (id, name, phone) VALUES
(1, 'Alex Rivera',   '555-0101'),
(2, 'Sam Chen',      '555-0102'),
(3, 'Jordan Blake',  '555-0103'),
(4, 'Morgan Walsh',  '555-0104'),
(5, 'Taylor Kim',    '555-0105');
