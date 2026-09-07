const express = require('express');
const router = express.Router();
const { dbAsync } = require('../db/database');

// GET /api/units - List all units with latest status and reading
router.get('/', async (req, res) => {
  try {
    const { district, block, status } = req.query;
    let query = `
      SELECT u.*, 
        r.outlet_ph AS latest_ph,
        r.outlet_tds AS latest_tds,
        r.outlet_turbidity AS latest_turbidity,
        r.outlet_temp AS latest_temp,
        r.timestamp AS last_reading_time,
        r.bis_status AS latest_bis_status
      FROM units u
      LEFT JOIN readings r ON r.id = (
        SELECT id FROM readings WHERE unit_id = u.id ORDER BY timestamp DESC LIMIT 1
      )
      WHERE 1=1
    `;
    const params = [];

    if (district) {
      query += ` AND u.district = ?`;
      params.push(district);
    }
    if (block) {
      query += ` AND u.block = ?`;
      params.push(block);
    }
    if (status) {
      query += ` AND u.status = ?`;
      params.push(status.toUpperCase());
    }

    query += ` ORDER BY u.district, u.name`;
    const units = await dbAsync.all(query, params);

    // Compute aggregate statistics
    const stats = {
      total: units.length,
      safe: units.filter(u => u.status === 'SAFE').length,
      unsafe: units.filter(u => u.status === 'UNSAFE').length,
      offline: units.filter(u => u.status === 'OFFLINE').length
    };

    res.json({ success: true, count: units.length, stats, data: units });
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/units/:id - Get unit detail, health %, last maintenance, active alerts
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const unit = await dbAsync.get(`SELECT * FROM units WHERE id = ?`, [id]);
    if (!unit) {
      return res.status(404).json({ success: false, error: 'Unit not found' });
    }

    // Get latest reading
    const latestReading = await dbAsync.get(
      `SELECT * FROM readings WHERE unit_id = ? ORDER BY timestamp DESC LIMIT 1`,
      [id]
    );

    // Get open alerts count
    const openAlerts = await dbAsync.all(
      `SELECT * FROM alerts WHERE unit_id = ? AND status != 'RESOLVED' ORDER BY created_at DESC`,
      [id]
    );

    // Get recent maintenance history
    const maintenanceLogs = await dbAsync.all(
      `SELECT * FROM maintenance_logs WHERE unit_id = ? ORDER BY timestamp DESC LIMIT 5`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...unit,
        latest_reading: latestReading || null,
        active_alerts: openAlerts,
        maintenance_logs: maintenanceLogs
      }
    });
  } catch (error) {
    console.error('Error fetching unit detail:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/units - Onboard new unit (Admin)
router.post('/', async (req, res) => {
  try {
    const {
      id, name, district, block, panchayat, village, location_type,
      latitude, longitude, contact_person, contact_phone, daily_target_litres
    } = req.body;

    if (!id || !name || !district || !block || !latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    await dbAsync.run(
      `INSERT INTO units (
        id, name, district, block, panchayat, village, location_type,
        latitude, longitude, status, filter_health, cartridge_install_date,
        last_maintenance_date, contact_person, contact_phone, daily_target_litres
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SAFE', 100, date('now'), date('now'), ?, ?, ?)`,
      [
        id, name, district, block, panchayat || '', village || '', location_type || 'Hand Pump',
        latitude, longitude, contact_person || '', contact_phone || '', daily_target_litres || 2000
      ]
    );

    const created = await dbAsync.get(`SELECT * FROM units WHERE id = ?`, [id]);
    res.status(201).json({ success: true, message: 'Unit registered successfully', data: created });
  } catch (error) {
    console.error('Error registering unit:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
