# QueueFlow — Complete System Documentation

## Smart QR-Based Queue Management & Ordering System

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Project Folder Structure](#folder-structure)
3. [Database Schema](#database-schema)
4. [REST API Reference](#rest-api-reference)
5. [Socket.io Events](#socketio-events)
6. [ESP32 Integration Guide](#esp32-integration-guide)
7. [AI Service Documentation](#ai-service-documentation)
8. [Deployment Guide](#deployment-guide)
9. [Development Roadmap](#development-roadmap)
10. [Environment Variables](#environment-variables)

---

## Architecture Overview

```
                        ┌─────────────────────────────────────────┐
                        │           CLIENT LAYER                  │
                        │                                         │
                        │  📱 Customer (Mobile) │ 👷 Worker │ 🧑‍💼 Admin │
                        └──────────┬───────────────────┬──────────┘
                                   │ HTTPS/WSS          │
                        ┌──────────▼───────────────────▼──────────┐
                        │         BACKEND (Node.js + Express)      │
                        │                                          │
                        │  ┌──────────┐  ┌──────────┐  ┌────────┐ │
                        │  │  REST    │  │ Socket.io│  │  JWT   │ │
                        │  │  API     │  │ Real-time│  │  Auth  │ │
                        │  └────┬─────┘  └─────┬────┘  └────────┘ │
                        │       │               │                  │
                        │  ┌────▼──────────────▼────┐             │
                        │  │    Business Logic        │             │
                        │  │ Orders│Payments│Queue   │             │
                        │  └────┬──────────────┬─────┘             │
                        └───────┼──────────────┼──────────────────┘
                                │              │
               ┌────────────────▼───┐    ┌─────▼────────────────┐
               │    MongoDB         │    │   External Services   │
               │                    │    │                        │
               │  Users│Orders│     │    │  Razorpay (Payment)  │
               │  Menu│Analytics    │    │  Firebase (FCM Push)  │
               └────────────────────┘    │  AI Service (Python)  │
                                         └───────────────────────┘
                                                    ▲
                                         ┌──────────┴──────┐
                                         │  ESP32 IoT      │
                                         │  Worker Button  │
                                         └─────────────────┘
```

---

## Folder Structure

```
queueflow/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js         # MongoDB connection
│   │   ├── controllers/
│   │   │   ├── authController.js   # Login, register, staff creation
│   │   │   ├── menuController.js   # CRUD for menu items
│   │   │   ├── orderController.js  # Queue logic, order lifecycle
│   │   │   ├── paymentController.js# Razorpay integration
│   │   │   ├── analyticsController.js
│   │   │   └── iotController.js    # ESP32 button handler
│   │   ├── middleware/
│   │   │   └── auth.js             # JWT + role guards + IoT key
│   │   ├── models/
│   │   │   ├── User.js             # Customer, Worker, Admin
│   │   │   ├── MenuItem.js         # Menu catalog
│   │   │   ├── Order.js            # Orders with payment snapshot
│   │   │   └── Analytics.js        # Daily aggregated stats
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── menu.js
│   │   │   ├── order.js
│   │   │   ├── payment.js
│   │   │   ├── analytics.js
│   │   │   ├── qr.js
│   │   │   ├── iot.js
│   │   │   └── notification.js
│   │   ├── services/
│   │   │   ├── notificationService.js  # Firebase FCM
│   │   │   ├── aiService.js            # AI microservice client
│   │   │   └── analyticsService.js     # Background analytics writes
│   │   ├── socket/
│   │   │   └── socketManager.js        # Socket.io rooms & emitters
│   │   ├── utils/
│   │   │   └── logger.js               # Winston logger
│   │   └── server.js                   # Entry point
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── customer/
│       │   │   ├── MenuPage.jsx         # QR landing, menu browse
│       │   │   ├── CartPage.jsx         # Cart + Razorpay checkout
│       │   │   ├── OrderTrackingPage.jsx# Live token tracker
│       │   │   └── OrderHistoryPage.jsx
│       │   ├── worker/
│       │   │   └── WorkerDashboard.jsx  # Live queue + status buttons
│       │   └── admin/
│       │       ├── AdminDashboard.jsx   # KPIs + charts
│       │       ├── AdminMenu.jsx        # Add/edit/toggle items
│       │       ├── AdminAnalytics.jsx   # Deep analytics
│       │       ├── AdminOrders.jsx      # All orders
│       │       └── AdminQR.jsx          # QR generator
│       ├── store/
│       │   ├── authStore.js             # Zustand + persist
│       │   └── cartStore.js             # Cart state
│       ├── services/
│       │   ├── api.js                   # Axios client + all endpoints
│       │   └── socket.js                # Socket.io client
│       └── App.jsx                      # Router + role guards
│
├── ai-service/
│   ├── main.py                          # FastAPI app
│   ├── models/                          # Saved sklearn models
│   └── requirements.txt
│
├── esp32/
│   └── queueflow_button/
│       └── queueflow_button.ino         # Arduino sketch
│
└── docs/
    └── README.md                        # This file
```

---

## Database Schema

### Users Collection
```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string (unique)",
  "password": "string (hashed)",
  "role": "customer | worker | admin",
  "phone": "string",
  "fcmToken": "string | null",
  "isActive": true,
  "orderHistory": ["ObjectId"],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### MenuItems Collection
```json
{
  "_id": "ObjectId",
  "name": "string",
  "description": "string",
  "price": 0.00,
  "category": "beverage | snack | meal | dessert | other",
  "image": "url | null",
  "isAvailable": true,
  "preparationTime": 5,
  "tags": ["bestseller", "veg", "spicy"],
  "soldCount": 0,
  "shop": "default-shop"
}
```

### Orders Collection
```json
{
  "_id": "ObjectId",
  "orderNumber": "A1B2C3D4",
  "tokenNumber": 42,
  "customer": "ObjectId → User",
  "items": [
    {
      "menuItem": "ObjectId → MenuItem",
      "name": "Masala Chai",
      "price": 20,
      "quantity": 2,
      "preparationTime": 3
    }
  ],
  "status": "pending_payment | pending | preparing | ready | completed | cancelled",
  "totalAmount": 40.00,
  "payment": {
    "razorpayOrderId": "order_xxx",
    "razorpayPaymentId": "pay_xxx",
    "razorpaySignature": "sig_xxx",
    "status": "pending | paid | failed | refunded",
    "method": "upi | card | netbanking",
    "paidAt": "Date"
  },
  "estimatedWaitTime": 8,
  "queuePosition": 3,
  "statusTimestamps": {
    "pending": "Date",
    "preparing": "Date",
    "ready": "Date",
    "completed": "Date"
  },
  "workerNotes": "string",
  "shop": "default-shop",
  "notificationSent": false
}
```

### DailyAnalytics Collection
```json
{
  "date": "Date",
  "shop": "default-shop",
  "totalOrders": 143,
  "completedOrders": 138,
  "cancelledOrders": 5,
  "totalRevenue": 4280.00,
  "avgOrderValue": 29.93,
  "avgWaitTime": 7.4,
  "ordersPerHour": [0, 0, 0, 0, 0, 0, 0, 0, 5, 12, 8, 20, 28, 30, 15, 8, 7, 4, 3, 2, 1, 0, 0, 0],
  "revenuePerHour": [0, 0, 0, 0, 0, 0, 0, 0, 120, 300, 200, 580, 840, 900, 450, 240, 210, 120, 90, 60, 30, 0, 0, 0],
  "topItems": [
    { "name": "Masala Chai", "quantitySold": 89, "revenue": 1780 }
  ],
  "peakHour": 13
}
```

---

## REST API Reference

Base URL: `https://your-backend.com/api`

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | None | Customer registration |
| POST | `/auth/login` | None | Login (all roles) |
| GET | `/auth/me` | JWT | Get current user |
| PATCH | `/auth/update-fcm-token` | JWT | Update push token |
| POST | `/auth/create-staff` | Admin | Create worker/admin |

### Menu
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/menu` | None | Get all items (public) |
| GET | `/menu?category=beverage&available=true` | None | Filtered menu |
| POST | `/menu` | Admin | Create item |
| PUT | `/menu/:id` | Admin | Update item |
| DELETE | `/menu/:id` | Admin | Delete item |
| PATCH | `/menu/:id/toggle` | Admin | Toggle availability |

### Orders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/orders/queue` | Worker/Admin | Get active queue |
| GET | `/orders/history` | Any | Order history |
| GET | `/orders/:id` | Any (own) | Get single order |
| POST | `/orders` | Customer | Create order (post-payment) |
| PATCH | `/orders/:id/status` | Worker/Admin | Update status |

### Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/payment/create-order` | Customer | Create Razorpay order |
| POST | `/payment/verify` | Customer | Verify payment signature |
| POST | `/payment/refund` | Admin | Issue refund |

### Analytics
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/analytics/dashboard` | Admin | Today's KPIs |
| GET | `/analytics/weekly` | Admin | 7-day revenue chart |
| GET | `/analytics/peak-hours` | Admin | Hourly order distribution |
| GET | `/analytics/inventory-forecast` | Admin | Item demand forecast |

### QR Code
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/qr/generate` | Admin | Get QR as base64 data URL |
| GET | `/qr/download` | Admin | Download QR as PNG |

### IoT (ESP32)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/iot/status` | API Key | Heartbeat check |
| GET | `/iot/current-order` | API Key | Current active order |
| POST | `/iot/button-press` | API Key | Advance order status |

---

## Socket.io Events

### Client → Server (Outbound)
```javascript
socket.emit('join:worker')       // Worker joins worker room
socket.emit('join:admin')        // Admin joins admin room
socket.emit('join:order', id)    // Track specific order
socket.emit('join:customer', id) // Customer notifications
```

### Server → Client (Inbound)
```javascript
socket.on('order:new', (order) => {})
// Payload: full populated order object
// Sent to: worker-dashboard, admin-dashboard rooms

socket.on('order:status_updated', ({ orderId, status, estimatedWaitTime, queuePosition }) => {})
// Sent to: order-{id} room, worker-dashboard, admin-dashboard

socket.on('queue:updated', ({ queueLength, orders, updatedAt }) => {})
// Sent to: ALL connected clients (broadcast)

socket.on('analytics:updated', (data) => {})
// Sent to: admin-dashboard room
```

---

## ESP32 Integration Guide

### Hardware Setup
```
ESP32 Dev Board
├── GPIO 4  ── [Push Button] ── GND    (pull-up, active LOW)
├── GPIO 2  ── [LED] ── 220Ω ── GND   (status indicator)
└── GPIO 5  ── [Buzzer] ── GND        (confirmation beep)
```

### Flow
```
Worker presses button
       ↓
ESP32 debounces (50ms)
       ↓
POST /api/iot/button-press
  Header: x-esp32-api-key: {key}
  Body: { "workerId": "station-1" }
       ↓
Backend finds oldest "preparing" order
       ↓
Marks as "ready"
       ↓
Socket emits order:status_updated
       ↓
Firebase sends push to customer
       ↓
ESP32 gets 200 OK → blinks LED + beeps
```

### Libraries Required (Arduino IDE)
- WiFi.h (built-in ESP32)
- HTTPClient.h (built-in ESP32)
- ArduinoJson (install via Library Manager: `bblanchon/ArduinoJson`)

---

## AI Service Documentation

### Endpoints

**POST /predict/wait-time**
```json
Request:  { "queue_length": 5, "total_items": 3, "avg_prep_time": 6.0 }
Response: { "estimated_wait_minutes": 12.5, "source": "ml_model", "confidence": "high" }
```

**GET /predict/rush-hours**
```json
Response: {
  "data": [{ "hour": 12, "predicted_orders": 100, "is_peak": true, "recommendation": "..." }],
  "peak_hours": [11, 12, 13]
}
```

**POST /train**
```json
Request: {
  "data": [
    { "queue_length": 3, "total_items": 2, "avg_prep_time": 5, "hour_of_day": 12, "day_of_week": 1, "actual_wait_minutes": 11.0 }
  ]
}
Response: { "success": true, "mae_minutes": 1.8, "samples_trained": 80 }
```

### Model Details
- Algorithm: Gradient Boosting Regressor (scikit-learn)
- Features: queue_length, total_items, avg_prep_time, hour_of_day, day_of_week
- Fallback: Heuristic (queue × 2.5 + avg_prep_time) when model unavailable
- Retrain: Via `/train` endpoint after collecting 20+ real orders

---

## Deployment Guide

### Backend → Render / Railway
```bash
# 1. Push to GitHub
git push origin main

# 2. On Render:
#    Build Command: npm install
#    Start Command: node src/server.js
#    Add all environment variables from .env.example

# 3. MongoDB: Use MongoDB Atlas (free tier)
```

### Frontend → Vercel
```bash
# 1. Connect GitHub repo to Vercel
# 2. Framework: Create React App
# 3. Add environment variables:
REACT_APP_API_URL=https://your-backend.onrender.com/api
REACT_APP_SOCKET_URL=https://your-backend.onrender.com
REACT_APP_RAZORPAY_KEY=rzp_live_xxxx

# 4. Deploy
```

### AI Service → Render (Python)
```bash
# Build Command: pip install -r requirements.txt
# Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Adding Razorpay Script to index.html
```html
<!-- In public/index.html -->
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### Firebase Setup
1. Create project at console.firebase.google.com
2. Enable Cloud Messaging
3. Download service account JSON
4. Add variables to backend .env
5. Add firebase config to frontend for web push

---

## Development Roadmap

### Phase 1 — Foundation (Weeks 1–2)
- [x] Project setup, folder structure
- [x] MongoDB models (User, MenuItem, Order, Analytics)
- [x] JWT auth with roles
- [x] Menu CRUD APIs
- [x] Basic order creation
- [x] React app scaffold + routing

### Phase 2 — Core Flow (Weeks 3–4)
- [ ] Razorpay payment integration (test mode)
- [ ] Order creation post-payment
- [ ] Queue management APIs
- [ ] Customer menu + cart + checkout UI
- [ ] Token + order tracking page

### Phase 3 — Real-Time (Week 5)
- [ ] Socket.io rooms setup
- [ ] Worker dashboard with live queue
- [ ] Admin dashboard with KPIs
- [ ] Real-time status propagation
- [ ] Queue position recalculation

### Phase 4 — Notifications & IoT (Week 6)
- [ ] Firebase FCM integration
- [ ] Order ready push notification
- [ ] ESP32 code + hardware setup
- [ ] IoT API + webhook
- [ ] QR code generation

### Phase 5 — AI & Analytics (Week 7)
- [ ] FastAPI AI microservice
- [ ] Wait time prediction (heuristic → ML)
- [ ] Analytics aggregation cron
- [ ] Weekly / peak hour charts
- [ ] Inventory forecast

### Phase 6 — Polish & Deploy (Week 8)
- [ ] Error handling everywhere
- [ ] Loading states
- [ ] Mobile responsiveness audit
- [ ] Rate limiting + security headers
- [ ] Production deployment (Vercel + Render)
- [ ] Live Razorpay keys
- [ ] Smoke testing end-to-end

---

## Environment Variables

### Backend (.env)
| Variable | Description |
|----------|-------------|
| PORT | Server port (default 5000) |
| MONGODB_URI | MongoDB Atlas connection string |
| JWT_SECRET | Random 256-bit secret |
| JWT_EXPIRES_IN | Token expiry (7d) |
| RAZORPAY_KEY_ID | Razorpay API key |
| RAZORPAY_KEY_SECRET | Razorpay secret |
| FIREBASE_PROJECT_ID | Firebase project ID |
| FIREBASE_PRIVATE_KEY | Firebase admin private key |
| FIREBASE_CLIENT_EMAIL | Firebase admin client email |
| AI_SERVICE_URL | Python AI service URL |
| ESP32_API_KEY | Secret for ESP32 authentication |
| CLIENT_URL | Frontend URL for CORS |
| QR_BASE_URL | Base URL embedded in QR code |

### Frontend (.env)
| Variable | Description |
|----------|-------------|
| REACT_APP_API_URL | Backend API base URL |
| REACT_APP_SOCKET_URL | Socket.io server URL |
| REACT_APP_RAZORPAY_KEY | Razorpay public key (rzp_live_...) |
| REACT_APP_FIREBASE_* | Firebase web config variables |
