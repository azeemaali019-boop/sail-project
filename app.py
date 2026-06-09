# Minimal Flask backend with SQLite for distributors, inventory, transactions, and reports
from flask import Flask, jsonify, g
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'data.db')

try:
    from flask_cors import CORS
except ImportError:
    CORS = None

app = Flask(__name__)
if CORS:
    CORS(app)
else:
    @app.after_request
    def add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
        return response

# --- DB helpers --------------------------------------------------------------
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    db = sqlite3.connect(DB_PATH)
    cur = db.cursor()
    # create tables
    cur.execute('''CREATE TABLE IF NOT EXISTS distributors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        contact TEXT,
        location TEXT,
        status TEXT
    )''')

    cur.execute('''CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product TEXT,
        sku TEXT,
        warehouse TEXT,
        stock INTEGER,
        reorder_level INTEGER
    )''')

    cur.execute('''CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        description TEXT,
        amount REAL,
        type TEXT
    )''')

    db.commit()

    # seed sample data if empty
    cur.execute('SELECT COUNT(1) as cnt FROM distributors')
    if cur.fetchone()[0] == 0:
        cur.executemany('INSERT INTO distributors (name,contact,location,status) VALUES (?,?,?,?)', [
            ('SAIL Steel Mumbai','9876543210','Mumbai','Active'),
            ('Delhi Steel Corp','9123456780','Delhi','Active'),
            ('Bangalore Steel Ltd','9988776655','Bangalore','Active'),
            ('Kolkata Distribution Hub','9456123789','Kolkata','Active'),
            ('Hyderabad Steel Traders','9234567890','Hyderabad','Active'),
            ('Chennai Metal Works','9567890123','Chennai','Inactive'),
            ('Pune Industrial Supplies','9876123450','Pune','Active'),
            ('Ahmedabad Steel Center','9645238901','Ahmedabad','Active'),
            ('Jaipur Distributors','9738901234','Jaipur','Active'),
            ('Lucknow Metals','9821345678','Lucknow','Inactive')
        ])

    cur.execute('SELECT COUNT(1) as cnt FROM inventory')
    if cur.fetchone()[0] == 0:
        cur.executemany('INSERT INTO inventory (product,sku,warehouse,stock,reorder_level) VALUES (?,?,?,?,?)', [
            ('Steel Rod 12mm','SR-12','Mumbai WH', 1200, 200),
            ('Steel Coil 1T','SC-1T','Delhi WH', 50, 10),
            ('Nuts & Bolts Pack','NB-100','Bangalore WH', 5000, 1000)
        ])

    cur.execute('SELECT COUNT(1) as cnt FROM transactions')
    if cur.fetchone()[0] == 0:
        now = datetime.utcnow().isoformat()
        cur.executemany('INSERT INTO transactions (date,description,amount,type) VALUES (?,?,?,?)', [
            (now, 'Opening balance', 250000.00, 'credit'),
            (now, 'Payment to Supplier X', -50000.00, 'debit'),
            (now, 'Invoice from Distributor A', 120000.00, 'credit')
        ])

    db.commit()
    db.close()

# initialize DB on startup
if not os.path.exists(DB_PATH):
    init_db()
else:
    # ensure tables exist (safe to call repeatedly)
    init_db()

# --- Simple legacy dealer API preserved ------------------------------------------------
dealers = [
    {"id": 1, "name": "Dealer A", "location": "Mumbai", "sales": 120000, "status": "Active"},
    {"id": 2, "name": "Dealer B", "location": "Delhi", "sales": 85000, "status": "Active"},
    {"id": 3, "name": "Dealer C", "location": "Bangalore", "sales": 60000, "status": "Inactive"},
    {"id": 4, "name": "Dealer D", "location": "Jharkhand", "sales": 120000, "status": "Active"}
]

@app.route('/')
def home():
    return jsonify({"message": "Backend Working"})

@app.route('/dealer')
def dealer():
    return jsonify({"dealer_id": "SDL101", "name": "SAIL Dealer", "status": "Active"})

@app.route('/dealers')
def dealer_list():
    return jsonify(dealers)

# --- New API endpoints -----------------------------------------------------
@app.route('/api/distributors')
def api_distributors():
    db = get_db(); cur = db.cursor()
    cur.execute('SELECT id,name,contact,location,status FROM distributors ORDER BY id DESC')
    rows = [dict(r) for r in cur.fetchall()]
    return jsonify(rows)

@app.route('/api/inventory')
def api_inventory():
    db = get_db(); cur = db.cursor()
    cur.execute('SELECT id, product, sku, warehouse, stock, reorder_level FROM inventory ORDER BY product')
    rows = [dict(r) for r in cur.fetchall()]
    return jsonify(rows)

@app.route('/api/transactions')
def api_transactions():
    db = get_db(); cur = db.cursor()
    cur.execute('SELECT id, date, description, amount, type FROM transactions ORDER BY date DESC')
    rows = [dict(r) for r in cur.fetchall()]
    return jsonify(rows)

@app.route('/api/reports')
def api_reports():
    db = get_db(); cur = db.cursor()
    # simple sales/transactions summary
    cur.execute('SELECT SUM(amount) as total_sales, COUNT(1) as total_transactions FROM transactions')
    s = cur.fetchone()
    summary = { 'total_sales': s['total_sales'] or 0, 'total_transactions': s['total_transactions'] or 0 }
    # report items — simple examples
    items = [
        { 'id': 1, 'title': 'Top Distributor', 'value': 'Distributor A' },
        { 'id': 2, 'title': 'Low Stock SKUs', 'value': 'SC-1T' }
    ]
    return jsonify({ 'summary': summary, 'items': items })

if __name__ == '__main__':
    app.run(debug=True)
