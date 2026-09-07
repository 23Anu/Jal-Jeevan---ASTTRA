const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const config = require('../config/keys');

const dbDir = path.dirname(config.DB_FILE);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(config.DB_FILE, (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite database:', err.message);
  } else {
    console.log(`✅ SQLite Database connected at: ${config.DB_FILE}`);
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Promisified database helpers
const dbAsync = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  exec(sql) {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

module.exports = { db, dbAsync };
