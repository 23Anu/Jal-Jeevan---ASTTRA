# Jal-Jeevan - ASTTRA: Smart Water Purification & IoT Quality Monitoring Dashboard
### Department of Drinking Water & Sanitation • Government of Jharkhand
### Smart India Hackathon (SIH 2026) • Problem Statement: SIH26040

Official full-stack IoT telemetry web application developed for **Smart India Hackathon (SIH 2026)** problem statement **SIH26040** (Hardware / Sustainable Energy & Water Purification).

---

## 🏗️ Architecture & Directory Structure

```
ASTTRA - SIH/
├── backend/
│   ├── config/              # Environment variables, ports, API secrets (.env, keys.js)
│   ├── db/                  # SQLite database engine, schema migrations, seeders
│   │   ├── database.js      # Promisified SQLite wrapper
│   │   ├── schema.sql       # Relational & time-series SQL schema
│   │   └── seed.js          # Realistic Jharkhand units & 7-day historical sensor seed
│   ├── routes/              # Express API endpoints
│   │   ├── units.js         # /api/units (Fleet list, unit details)
│   │   ├── readings.js      # /api/units/:id/readings & /sync (ESP32 ingestion)
│   │   ├── alerts.js        # /api/alerts (Incident log & acknowledgment workflow)
│   │   ├── maintenance.js   # /api/maintenance (Predictive maintenance logs)
│   │   ├── auth.js          # /api/auth (Role-Based Access Control)
│   │   ├── waterData.js     # /api/water-data (ESP32 live stream & MongoDB Atlas)
│   │   └── reports.js       # /api/reports (Analytics & CSV regulatory exports)
│   ├── services/
│   │   ├── bisChecker.js    # BIS 10500:2012 Drinking Water standard compliance engine
│   │   └── driftAnalyzer.js # Rolling average trend & predictive filter decay analyzer
│   ├── simulator/
│   │   └── esp32Simulator.js# ESP32 IoT telemetry generator & offline backfill sync
│   ├── package.json
│   └── server.js            # Express server with WebSocket (/ws) live broadcast
│
└── frontend/
    ├── src/
    │   ├── components/      # Reusable Govt UI (GaugeMeter, StatusBadge, FleetMap, Header, Footer)
    │   ├── views/
    │   │   ├── PublicPortal.jsx # Citizen & Household View (Gauges, Safe/Unsafe Banner)
    │   │   └── PhedPortal.jsx   # Institutional / PHED / Admin View (GIS Map, Sensor Logs, Alerts)
    │   ├── context/
    │   │   ├── LanguageContext.jsx # Bilingual English & Hindi (हिन्दी) translations
    │   │   └── AuthContext.jsx     # RBAC user & role state management
    │   ├── styles/
    │   │   └── index.css    # Official Govt. of Jharkhand design system (#0B3D66, #E97132)
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    ├── package.json
    ├── vercel.json          # Vercel deployment config
    └── vite.config.js
```

---

## ⚡ Quick Start

### 1. Run Backend Server
```bash
cd backend
npm install
npm run seed     # Seeds database with Jharkhand units & historical readings
npm start        # Starts Express + WebSocket server on http://localhost:5000
```

### 2. Run Frontend Portal
```bash
cd frontend
npm install
npm run dev      # Starts Vite dev server on http://localhost:3000
```

---

## 📊 Core Features Implemented

1. **Dual Audience Portal**:
   - **Citizen / Public View**: Instant SAFE (Green) / UNSAFE (Red) clarity, intuitive gauges for pH, TDS, Turbidity, Temp with plain-language ticks, 7-day trend track, local Jal Sahiya emergency contact, and nearby safe units map.
   - **PHED Institutional View**: Statewide interactive OpenStreetMap/Leaflet GIS map, dual-stream inlet vs outlet graphs, filter health meter, autonomous solenoid recirculation telemetry (Cycle counts & outcomes), incident workflow (Open ➔ Acknowledged ➔ Resolved), and regulatory CSV export.
2. **BIS 10500 Compliance Engine**: Automatically verifies every ESP32 sensor reading against Indian Drinking Water specifications.
3. **Predictive Drift Analyzer**: Generates amber predictive warnings when TDS/turbidity trends indicate impending filter membrane exhaustion.
4. **Bilingual Support**: Instant toggle between English and Hindi (हिन्दी) across all views.
5. **Cost & Sustainability Analytics**: Compares ASTTRA solar purification (~₹0.08/L) against conventional RO kiosks (~₹0.35/L) and calculates total water saved via zero-reject recirculation.
