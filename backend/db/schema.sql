-- SIH26040 Database Schema (SQLite)
-- Smart Water Purification & Quality Monitoring System

CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  block TEXT NOT NULL,
  panchayat TEXT NOT NULL,
  village TEXT NOT NULL,
  location_type TEXT NOT NULL, -- 'Hand Pump', 'Primary School', 'Community Health Centre', 'Anganwadi', 'Village Square'
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  status TEXT DEFAULT 'SAFE', -- 'SAFE', 'UNSAFE', 'OFFLINE'
  filter_health INTEGER DEFAULT 100, -- 0-100%
  cartridge_install_date TEXT NOT NULL,
  last_maintenance_date TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  daily_target_litres INTEGER DEFAULT 2000,
  purified_today_litres INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  inlet_ph REAL NOT NULL,
  inlet_tds REAL NOT NULL,
  inlet_turbidity REAL NOT NULL,
  inlet_temp REAL NOT NULL,
  outlet_ph REAL NOT NULL,
  outlet_tds REAL NOT NULL,
  outlet_turbidity REAL NOT NULL,
  outlet_temp REAL NOT NULL,
  bis_status TEXT NOT NULL, -- 'SAFE' or 'UNSAFE'
  recirculation_cycle INTEGER DEFAULT 1, -- e.g., 1, 2, 3
  recirculation_outcome TEXT DEFAULT 'RELEASED', -- 'RELEASED', 'RECIRCULATING', 'HELD'
  is_buffered INTEGER DEFAULT 0, -- 0 = Live stream, 1 = Backfilled from offline SD card
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (unit_id) REFERENCES units(id)
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id TEXT NOT NULL,
  parameter TEXT NOT NULL, -- 'pH', 'TDS', 'Turbidity', 'Temperature', 'Filter Life', 'Power'
  severity TEXT NOT NULL, -- 'CRITICAL' (Red), 'WARNING' (Amber), 'INFO' (Blue)
  message TEXT NOT NULL,
  message_hi TEXT,
  value_observed REAL,
  threshold_expected TEXT,
  status TEXT DEFAULT 'OPEN', -- 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'
  acknowledged_by TEXT,
  acknowledged_at TEXT,
  resolved_by TEXT,
  resolved_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (unit_id) REFERENCES units(id)
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id TEXT NOT NULL,
  officer_name TEXT NOT NULL,
  officer_role TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'Filter Cartridge Replacement', 'UV Lamp Change', 'Sensor Calibration', 'Routine Inspection', 'Solenoid Valve Service'
  notes TEXT,
  parts_replaced TEXT,
  prev_filter_health INTEGER,
  new_filter_health INTEGER,
  timestamp TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (unit_id) REFERENCES units(id)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'PUBLIC', 'GP_VWSC', 'PHED_OFFICER', 'ADMIN'
  designation TEXT,
  id_card_no TEXT,
  department TEXT,
  district TEXT,
  block TEXT,
  assigned_units TEXT, -- comma-separated unit IDs or '*'
  phone TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
