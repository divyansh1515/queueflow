"""
QueueFlow AI Microservice
Wait time prediction & Rush hour analytics using scikit-learn
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import pandas as pd
import pickle
import os
from datetime import datetime, timedelta

# Optional: sklearn — gracefully fallback if not installed
try:
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
    from sklearn.linear_model import LinearRegression
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import mean_absolute_error
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

app = FastAPI(title="QueueFlow AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

MODEL_PATH = "models/wait_time_model.pkl"
SCALER_PATH = "models/scaler.pkl"

# ─── Load or initialize model ──────────────────────────────────────────────
wait_model = None
scaler = None

def load_models():
    global wait_model, scaler
    if os.path.exists(MODEL_PATH) and SKLEARN_AVAILABLE:
        with open(MODEL_PATH, 'rb') as f:
            wait_model = pickle.load(f)
        with open(SCALER_PATH, 'rb') as f:
            scaler = pickle.load(f)
        print("✅ Models loaded from disk")
    else:
        print("⚠️  No trained model found — using heuristic fallback")

load_models()

# ─── Schemas ───────────────────────────────────────────────────────────────
class WaitTimePredictRequest(BaseModel):
    queue_length: int
    total_items: int
    avg_prep_time: float
    hour_of_day: Optional[int] = None
    day_of_week: Optional[int] = None

class TrainDataPoint(BaseModel):
    queue_length: int
    total_items: int
    avg_prep_time: float
    hour_of_day: int
    day_of_week: int
    actual_wait_minutes: float

class TrainRequest(BaseModel):
    data: List[TrainDataPoint]

# ─── Wait Time Prediction ──────────────────────────────────────────────────
@app.post("/predict/wait-time")
async def predict_wait_time(req: WaitTimePredictRequest):
    hour = req.hour_of_day if req.hour_of_day is not None else datetime.now().hour
    dow = req.day_of_week if req.day_of_week is not None else datetime.now().weekday()

    features = np.array([[
        req.queue_length,
        req.total_items,
        req.avg_prep_time,
        hour,
        dow
    ]])

    if wait_model and scaler and SKLEARN_AVAILABLE:
        try:
            features_scaled = scaler.transform(features)
            prediction = float(wait_model.predict(features_scaled)[0])
            estimated = max(1, round(prediction, 1))
            source = "ml_model"
        except Exception as e:
            estimated = _heuristic_wait(req)
            source = "heuristic_fallback"
    else:
        estimated = _heuristic_wait(req)
        source = "heuristic"

    return {
        "estimated_wait_minutes": estimated,
        "source": source,
        "confidence": "high" if source == "ml_model" else "medium"
    }

def _heuristic_wait(req: WaitTimePredictRequest) -> float:
    """Simple rule-based fallback"""
    base = req.avg_prep_time
    queue_penalty = req.queue_length * 2.5
    item_penalty = req.total_items * 0.5
    return round(base + queue_penalty + item_penalty, 1)

# ─── Rush Hour Predictions ─────────────────────────────────────────────────
@app.get("/predict/rush-hours")
async def predict_rush_hours():
    """
    Returns predicted busy hours based on patterns.
    In production, this uses historical order data from MongoDB.
    Here we return a realistic example pattern.
    """
    hours = []
    # Typical college canteen pattern
    pattern = {
        8: 40, 9: 80, 10: 60, 11: 90, 12: 100, 13: 95, 14: 70,
        15: 50, 16: 75, 17: 85, 18: 60, 19: 45, 20: 30
    }
    for h in range(24):
        volume = pattern.get(h, 10)
        hours.append({
            "hour": h,
            "label": f"{h:02d}:00",
            "predicted_orders": volume,
            "is_peak": volume >= 75,
            "recommendation": _hour_recommendation(volume)
        })
    return {"data": hours, "peak_hours": [h["hour"] for h in hours if h["is_peak"]]}

def _hour_recommendation(volume: int) -> str:
    if volume >= 90: return "Very busy — deploy extra staff"
    if volume >= 75: return "Peak hour — prepare in advance"
    if volume >= 50: return "Moderate — standard staffing"
    return "Quiet — minimal staffing needed"

# ─── Inventory Forecast ────────────────────────────────────────────────────
@app.post("/predict/inventory")
async def predict_inventory(data: dict):
    """
    Given historical daily sales, predict next 7 days demand per item.
    Expects: { "items": [{"name": str, "daily_avg": float}] }
    """
    items = data.get("items", [])
    forecast = []
    for item in items:
        avg = item.get("daily_avg", 0)
        # Simple linear trend with ±10% variance
        forecast.append({
            "name": item["name"],
            "next_7_days": round(avg * 7 * 1.05),  # +5% growth assumption
            "daily_estimate": round(avg),
            "restock_trigger": round(avg * 2),  # restock when stock < 2 days supply
            "confidence": "high" if avg > 5 else "medium"
        })
    return {"forecast": forecast}

# ─── Model Training Endpoint ───────────────────────────────────────────────
@app.post("/train")
async def train_model(req: TrainRequest):
    if not SKLEARN_AVAILABLE:
        raise HTTPException(status_code=501, detail="scikit-learn not installed")
    if len(req.data) < 20:
        raise HTTPException(status_code=400, detail="Need at least 20 data points to train")

    df = pd.DataFrame([d.dict() for d in req.data])
    X = df[['queue_length', 'total_items', 'avg_prep_time', 'hour_of_day', 'day_of_week']].values
    y = df['actual_wait_minutes'].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    global scaler, wait_model
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    wait_model = GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42)
    wait_model.fit(X_train_s, y_train)

    mae = mean_absolute_error(y_test, wait_model.predict(X_test_s))

    # Save models
    os.makedirs("models", exist_ok=True)
    with open(MODEL_PATH, 'wb') as f: pickle.dump(wait_model, f)
    with open(SCALER_PATH, 'wb') as f: pickle.dump(scaler, f)

    return {"success": True, "mae_minutes": round(mae, 2), "samples_trained": len(X_train)}

# ─── Health ────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": wait_model is not None,
        "sklearn": SKLEARN_AVAILABLE
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
