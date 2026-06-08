# from flask import Flask

# app = Flask(__name__)

# @app.route('/')
# def home():
    # return "Backend Working"

# app.run(debug=True)


from flask import Flask, jsonify

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

dealers = [
    {"id": 1, "name": "Dealer A", "location": "Mumbai", "sales": 120000, "status": "Active"},
    {"id": 2, "name": "Dealer B", "location": "Delhi", "sales": 85000, "status": "Active"},
    {"id": 3, "name": "Dealer C", "location": "Bangalore", "sales": 60000, "status": "Inactive"},
    {"id": 4, "name": "Dealer D", "location": "Jharkhand", "sales": 120000, "status": "Active"}
]

@app.route('/')
def home():
    return jsonify({
        "message": "Backend Working"
    })

@app.route('/dealer')
def dealer():
    return jsonify({
        "dealer_id": "SDL101",
        "name": "SAIL Dealer",
        "status": "Active"
    })

@app.route('/dealers')
def dealer_list():
    return jsonify(dealers)

if __name__ == '__main__':
    app.run(debug=True)
