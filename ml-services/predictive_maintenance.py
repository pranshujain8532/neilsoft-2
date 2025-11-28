import os
import pandas as pd
from datetime import datetime
from flask import Blueprint, request, jsonify
from joblib import dump, load
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error

maintenance_bp = Blueprint('maintenance', __name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml-models", "maintenance_model.joblib")

def load_data() -> pd.DataFrame:
    """Load sensor logs from Supabase (fallback to CSV if env not set)."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if url and key:
        try:
            from supabase import create_client
            supabase = create_client(url, key)
            data = supabase.table("sensor_logs").select("*").execute()
            df = pd.DataFrame(data.data)
            return df
        except Exception as e:
            print(f"Supabase error: {e}")
    # fallback to local CSV for demo purposes
    csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "sensor_logs_demo.csv")
    if not os.path.exists(csv_path):
        # Create dummy data if missing
        return pd.DataFrame({
            'vehicle_id': ['V1', 'V2'],
            'timestamp': [datetime.now(), datetime.now()],
            'mileage': [10000, 20000],
            'engine_temp': [80, 90],
            'oil_pressure': [40, 35],
            'wear_score': [0.1, 0.3]
        })
    return pd.read_csv(csv_path)

def train_model(df: pd.DataFrame):
    # Basic feature engineering
    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"]).astype(int) / 10**9
    X = df[["mileage", "engine_temp", "oil_pressure", "timestamp"]]
    y = df["wear_score"] if "wear_score" in df.columns else df["mileage"] * 0.0001
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = GradientBoostingRegressor(random_state=42)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    rmse = mean_squared_error(y_test, preds, squared=False)
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    dump(model, MODEL_PATH)
    return rmse

def load_model():
    if not os.path.exists(MODEL_PATH):
        df = load_data()
        train_model(df)
    return load(MODEL_PATH)

# Lazy load model
model = None

@maintenance_bp.route('/predict', methods=['POST'])
def predict_maintenance():
    """
    Predict vehicle maintenance wear score
    ---
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            vehicle_id:
              type: string
            timestamp:
              type: string
            mileage:
              type: number
            engine_temp:
              type: number
            oil_pressure:
              type: number
    responses:
      200:
        description: Prediction result
        schema:
          type: object
          properties:
            vehicle_id:
              type: string
            wear_score:
              type: number
            confidence_interval:
              type: array
              items:
                type: number
    """
    global model
    if model is None:
        model = load_model()
        
    data = request.json
    try:
        ts = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00')).timestamp()
        features = [[data['mileage'], data['engine_temp'], data['oil_pressure'], ts]]
        wear = model.predict(features)[0]
        ci = [wear * 0.9, wear * 1.1]
        return jsonify({
            'vehicle_id': data['vehicle_id'],
            'wear_score': wear,
            'confidence_interval': ci
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400
