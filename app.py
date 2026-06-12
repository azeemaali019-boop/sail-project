from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3, hashlib

app = Flask(__name__)
CORS(app)
DB = 'sail.db'

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'SAIL Admin'
        );
        CREATE TABLE IF NOT EXISTS dealers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT,
            name TEXT NOT NULL,
            contact TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            pin TEXT,
            gstin TEXT,
            established TEXT,
            location TEXT NOT NULL,
            sales REAL DEFAULT 0,
            status TEXT DEFAULT 'Active'
        );
        CREATE TABLE IF NOT EXISTS distributors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT NOT NULL,
            region TEXT,
            contact TEXT,
            email TEXT,
            sales REAL DEFAULT 0,
            commission REAL DEFAULT 5.0,
            status TEXT DEFAULT 'Active'
        );
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_name TEXT NOT NULL,
            category TEXT,
            quantity INTEGER DEFAULT 0,
            unit TEXT DEFAULT 'Units',
            unit_price REAL DEFAULT 0,
            warehouse TEXT,
            status TEXT DEFAULT 'In Stock'
        );
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            type TEXT NOT NULL,
            party TEXT NOT NULL,
            description TEXT,
            amount REAL NOT NULL,
            status TEXT DEFAULT 'Pending'
        );
    ''')

    pw = hashlib.sha256('admin123'.encode()).hexdigest()
    c.execute("INSERT OR IGNORE INTO users (email,password,role) VALUES (?,?,?)",
              ('admin@sail.com', pw, 'SAIL Admin'))

    # ensure any missing columns are added when upgrading existing DB
    try:
        cols = [r['name'] for r in conn.execute("PRAGMA table_info(dealers)").fetchall()]
    except Exception:
        cols = []
    for col in ('code','contact','phone','email','address','pin','gstin','established'):
        if col not in cols:
            try:
                conn.execute(f"ALTER TABLE dealers ADD COLUMN {col} TEXT")
            except Exception:
                pass

    existing_codes = set(r['code'] for r in conn.execute("SELECT code FROM dealers").fetchall() if r['code'])
    sample_dealers = [
        ('D001','Dealer A','Ravi Kumar','9876543210','ravi@example.com','Andheri West','400053','27AAAAA0000A1Z5','2015-06-12','Mumbai',120000,'Active'),
        ('D002','Dealer B','Anita Sharma','9123456780','anita@example.com','Civil Lines','110054','07BBBBB1111B2Z6','2018-03-20','Delhi',85000,'Active'),
        ('D003','Dealer C','Mohit Singh','9988776655','mohit@example.com','Indiranagar','560038','29CCCCC2222C3Z7','2012-11-01','Bangalore',60000,'Inactive'),
        ('D004','Dealer D','Sonia Rao','9001122334','sonia@example.com','Ranchi Center','834001','20DDDDD3333D4Z8','2019-07-15','Jharkhand',120000,'Active'),
        ('D005','Dealer E','Vikram Patel','9811223344','vikram@example.com','MG Road','400007','29EEEEE4444E5Z9','2020-09-25','Pune',95000,'Active'),
        ('D006','Dealer F','Neha Joshi','9877712345','neha@example.com','Bandra','400050','27FFFFF5555F6Z0','2021-02-18','Mumbai',76000,'Active'),
        ('D007','Dealer G','Arjun Mehta','9900445566','arjun@example.com','Salt Lake','700091','19GGGGG6666G7Z1','2022-05-30','Kolkata',68000,'Active'),
        ('D008','Dealer H','Priya Nair','9966554433','priya@example.com','Banjara Hills','500034','36HHHHH7777H8Z2','2023-08-12','Hyderabad',83000,'Active'),
    ]
    for dealer in sample_dealers:
        if dealer[0] not in existing_codes:
            c.execute(
                "INSERT INTO dealers (code,name,contact,phone,email,address,pin,gstin,established,location,sales,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                dealer
            )

    c.executemany("INSERT OR IGNORE INTO distributors (name,location,region,contact,email,sales,commission,status) VALUES (?,?,?,?,?,?,?,?)", [
        ('Dist Alpha','Chennai','South','9876543210','alpha@dist.com',200000,6.0,'Active'),
        ('Dist Beta','Kolkata','East','9123456780','beta@dist.com',150000,5.5,'Active'),
        ('Dist Gamma','Pune','West','9988776655','gamma@dist.com',90000,4.0,'Inactive'),
        ('Dist Delta','Hyderabad','South','9001122334','delta@dist.com',175000,5.0,'Active'),
    ])

    c.executemany("INSERT OR IGNORE INTO inventory (product_name,category,quantity,unit,unit_price,warehouse,status) VALUES (?,?,?,?,?,?,?)", [
        ('Steel Rod 12mm','Rods',5000,'Kg',45.0,'Warehouse A','In Stock'),
        ('Steel Pipe 2in','Pipes',2000,'Units',120.0,'Warehouse B','In Stock'),
        ('Steel Sheet 4mm','Sheets',800,'Sheets',350.0,'Warehouse A','Low Stock'),
        ('TMT Bar Fe500','Bars',3200,'Kg',52.0,'Warehouse C','In Stock'),
        ('HR Coil 3mm','Coils',150,'Rolls',8500.0,'Warehouse B','Low Stock'),
        ('MS Angle 50x50','Angles',1200,'Kg',48.0,'Warehouse A','In Stock'),
    ])

    c.executemany("INSERT OR IGNORE INTO transactions (date,type,party,description,amount,status) VALUES (?,?,?,?,?,?)", [
        ('2026-01-10','Credit','Dealer A','Steel Rod sale',120000,'Paid'),
        ('2026-01-15','Credit','Dealer B','Steel Pipe sale',85000,'Paid'),
        ('2026-02-01','Debit','Supplier X','Raw material purchase',50000,'Paid'),
        ('2026-02-10','Credit','Dist Alpha','Bulk order',200000,'Paid'),
        ('2026-03-05','Debit','Logistics Co','Transport charges',12000,'Paid'),
        ('2026-03-20','Credit','Dealer C','Steel Sheet sale',60000,'Pending'),
        ('2026-04-01','Debit','Maintenance','Equipment service',8000,'Paid'),
        ('2026-04-15','Credit','Dist Beta','Monthly order',150000,'Paid'),
        ('2026-05-10','Credit','Dealer D','TMT Bar sale',120000,'Pending'),
        ('2026-05-25','Debit','Supplier Y','Steel coil purchase',75000,'Paid'),
    ])

    conn.commit()
    conn.close()

# ── AUTH ──────────────────────────────────────────────────────────────────────
@app.route('/api/login', methods=['POST'])
def login():
    d  = request.json
    pw = hashlib.sha256(d.get('password','').encode()).hexdigest()
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email=? AND password=?",(d.get('email'),pw)).fetchone()
    conn.close()
    if user:
        return jsonify({'success':True,'role':user['role'],'email':user['email']})
    return jsonify({'success':False,'message':'Invalid email or password'}), 401

# ── DEALERS ───────────────────────────────────────────────────────────────────
@app.route('/api/dealers', methods=['GET'])
def get_dealers():
    conn = get_db()
    rows = conn.execute("SELECT * FROM dealers").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/dealers', methods=['POST'])
def add_dealer():
    d = request.json
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO dealers (code,name,contact,phone,email,address,pin,gstin,established,location,sales,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        (d.get('code'), d.get('name'), d.get('contact'), d.get('phone'), d.get('email'), d.get('address'), d.get('pin'), d.get('gstin'), d.get('established'), d.get('location'), d.get('sales',0), d.get('status','Active'))
    )
    conn.commit(); nid = cur.lastrowid; conn.close()
    return jsonify({'id':nid,**d}), 201

@app.route('/api/dealers/<int:did>', methods=['PUT'])
def update_dealer(did):
    d = request.json
    conn = get_db()
    conn.execute(
        "UPDATE dealers SET code=?,name=?,contact=?,phone=?,email=?,address=?,pin=?,gstin=?,established=?,location=?,sales=?,status=? WHERE id=?",
        (d.get('code'), d.get('name'), d.get('contact'), d.get('phone'), d.get('email'), d.get('address'), d.get('pin'), d.get('gstin'), d.get('established'), d.get('location'), d.get('sales',0), d.get('status','Active'), did)
    )
    conn.commit(); conn.close()
    return jsonify({'success':True})

@app.route('/api/dealers/<int:did>', methods=['DELETE'])
def delete_dealer(did):
    conn = get_db()
    conn.execute("DELETE FROM dealers WHERE id=?", (did,))
    conn.commit(); conn.close()
    return jsonify({'success':True})

# ── DISTRIBUTORS ──────────────────────────────────────────────────────────────
@app.route('/api/distributors', methods=['GET'])
def get_distributors():
    conn = get_db()
    rows = conn.execute("SELECT * FROM distributors").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/distributors', methods=['POST'])
def add_distributor():
    d = request.json
    conn = get_db()
    cur = conn.execute("INSERT INTO distributors (name,location,region,contact,email,sales,commission,status) VALUES (?,?,?,?,?,?,?,?)",
                       (d['name'],d['location'],d.get('region',''),d.get('contact',''),d.get('email',''),d.get('sales',0),d.get('commission',5),d.get('status','Active')))
    conn.commit(); nid = cur.lastrowid; conn.close()
    return jsonify({'id':nid,**d}), 201

@app.route('/api/distributors/<int:did>', methods=['PUT'])
def update_distributor(did):
    d = request.json
    conn = get_db()
    conn.execute("UPDATE distributors SET name=?,location=?,region=?,contact=?,email=?,sales=?,commission=?,status=? WHERE id=?",
                 (d['name'],d['location'],d.get('region',''),d.get('contact',''),d.get('email',''),d['sales'],d.get('commission',5),d['status'],did))
    conn.commit(); conn.close()
    return jsonify({'success':True})

@app.route('/api/distributors/<int:did>', methods=['DELETE'])
def delete_distributor(did):
    conn = get_db()
    conn.execute("DELETE FROM distributors WHERE id=?", (did,))
    conn.commit(); conn.close()
    return jsonify({'success':True})

# ── INVENTORY ─────────────────────────────────────────────────────────────────
@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    conn = get_db()
    rows = conn.execute("SELECT * FROM inventory").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/inventory', methods=['POST'])
def add_inventory():
    d = request.json
    conn = get_db()
    cur = conn.execute("INSERT INTO inventory (product_name,category,quantity,unit,unit_price,warehouse,status) VALUES (?,?,?,?,?,?,?)",
                       (d['product_name'],d.get('category',''),d.get('quantity',0),d.get('unit','Units'),d.get('unit_price',0),d.get('warehouse',''),d.get('status','In Stock')))
    conn.commit(); nid = cur.lastrowid; conn.close()
    return jsonify({'id':nid,**d}), 201

@app.route('/api/inventory/<int:iid>', methods=['PUT'])
def update_inventory(iid):
    d = request.json
    conn = get_db()
    conn.execute("UPDATE inventory SET product_name=?,category=?,quantity=?,unit=?,unit_price=?,warehouse=?,status=? WHERE id=?",
                 (d['product_name'],d.get('category',''),d['quantity'],d.get('unit','Units'),d['unit_price'],d.get('warehouse',''),d['status'],iid))
    conn.commit(); conn.close()
    return jsonify({'success':True})

@app.route('/api/inventory/<int:iid>', methods=['DELETE'])
def delete_inventory(iid):
    conn = get_db()
    conn.execute("DELETE FROM inventory WHERE id=?", (iid,))
    conn.commit(); conn.close()
    return jsonify({'success':True})

# ── TRANSACTIONS ──────────────────────────────────────────────────────────────
@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    conn = get_db()
    rows = conn.execute("SELECT * FROM transactions ORDER BY date DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    d = request.json
    conn = get_db()
    cur = conn.execute("INSERT INTO transactions (date,type,party,description,amount,status) VALUES (?,?,?,?,?,?)",
                       (d['date'],d['type'],d['party'],d.get('description',''),d['amount'],d.get('status','Pending')))
    conn.commit(); nid = cur.lastrowid; conn.close()
    return jsonify({'id':nid,**d}), 201

@app.route('/api/transactions/<int:tid>', methods=['PUT'])
def update_transaction(tid):
    d = request.json
    conn = get_db()
    conn.execute("UPDATE transactions SET date=?,type=?,party=?,description=?,amount=?,status=? WHERE id=?",
                 (d['date'],d['type'],d['party'],d.get('description',''),d['amount'],d['status'],tid))
    conn.commit(); conn.close()
    return jsonify({'success':True})

@app.route('/api/transactions/<int:tid>', methods=['DELETE'])
def delete_transaction(tid):
    conn = get_db()
    conn.execute("DELETE FROM transactions WHERE id=?", (tid,))
    conn.commit(); conn.close()
    return jsonify({'success':True})

# ── REPORTS SUMMARY ───────────────────────────────────────────────────────────
@app.route('/api/reports/summary', methods=['GET'])
def reports_summary():
    conn = get_db()
    dealer_sales     = conn.execute("SELECT COALESCE(SUM(sales),0) as t FROM dealers").fetchone()['t']
    dist_sales       = conn.execute("SELECT COALESCE(SUM(sales),0) as t FROM distributors").fetchone()['t']
    total_stock      = conn.execute("SELECT COALESCE(SUM(quantity),0) as t FROM inventory").fetchone()['t']
    pending_payments = conn.execute("SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE status='Pending'").fetchone()['t']
    top_dealer       = conn.execute("SELECT name,sales FROM dealers ORDER BY sales DESC LIMIT 1").fetchone()
    top_dist         = conn.execute("SELECT name,sales FROM distributors ORDER BY sales DESC LIMIT 1").fetchone()
    monthly          = conn.execute("""
        SELECT substr(date,1,7) as month,
               SUM(CASE WHEN type='Credit' THEN amount ELSE 0 END) as income,
               SUM(CASE WHEN type='Debit'  THEN amount ELSE 0 END) as expense
        FROM transactions GROUP BY month ORDER BY month
    """).fetchall()
    conn.close()
    return jsonify({
        'dealer_sales':dealer_sales, 'dist_sales':dist_sales,
        'total_stock':total_stock,   'pending_payments':pending_payments,
        'top_dealer':dict(top_dealer) if top_dealer else {},
        'top_distributor':dict(top_dist) if top_dist else {},
        'monthly_chart':[dict(r) for r in monthly],
    })

if __name__ == '__main__':
    init_db()
    print("\n✅ SAIL Backend running → http://127.0.0.1:5000\n")
    app.run(debug=True, port=5000)