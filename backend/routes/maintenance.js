const express = require('express');
const router = express.Router();
const { dbAsync } = require('../db/database');

// GET /api/maintenance - List all maintenance records
router.get('/', async (req, res) => {
  try {
    const logs = await dbAsync.all(`
      SELECT m.*, u.name as unit_name, u.district, u.block
      FROM maintenance_logs m
      JOIN units u ON u.id = m.unit_id
      ORDER BY m.timestamp DESC
    `);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    console.error('Error fetching maintenance logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/maintenance/:unitId - Get logs for specific unit
router.get('/:unitId', async (req, res) => {
  try {
    const { unitId } = req.params;
    const logs = await dbAsync.all(
      `SELECT * FROM maintenance_logs WHERE unit_id = ? ORDER BY timestamp DESC`,
      [unitId]
    );
    const unit = await dbAsync.get(`SELECT * FROM units WHERE id = ?`, [unitId]);
    if (!unit) {
      return res.status(404).json({ success: false, error: 'Unit not found' });
    }

    res.json({
      success: true,
      unit_id: unitId,
      filter_health: unit.filter_health,
      last_maintenance_date: unit.last_maintenance_date,
      cartridge_install_date: unit.cartridge_install_date,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching unit maintenance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/maintenance/:unitId - Log completed maintenance and update filter baseline
router.post('/:unitId', async (req, res) => {
  try {
    const { unitId } = req.params;
    const {
      officer_name,
      officer_role = 'PHED Technician',
      action_type,
      notes = '',
      parts_replaced = '',
      new_filter_health = 100
    } = req.body;

    if (!officer_name || !action_type) {
      return res.status(400).json({ success: false, error: 'Officer name and action type are required' });
    }

    const unit = await dbAsync.get(`SELECT * FROM units WHERE id = ?`, [unitId]);
    if (!unit) {
      return res.status(404).json({ success: false, error: 'Unit not found' });
    }

    const prevHealth = unit.filter_health;
    const today = new Date().toISOString().slice(0, 10);
    const nowTimestamp = new Date().toISOString();

    // 1. Insert maintenance log
    const result = await dbAsync.run(
      `INSERT INTO maintenance_logs (
        unit_id, officer_name, officer_role, action_type, notes,
        parts_replaced, prev_filter_health, new_filter_health, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        unitId, officer_name, officer_role, action_type, notes,
        parts_replaced, prevHealth, parseInt(new_filter_health, 10), nowTimestamp
      ]
    );

    // 2. Update unit baseline
    await dbAsync.run(
      `UPDATE units 
       SET filter_health = ?, last_maintenance_date = ?, cartridge_install_date = CASE WHEN ? LIKE '%Cartridge%' THEN ? ELSE cartridge_install_date END
       WHERE id = ?`,
      [parseInt(new_filter_health, 10), today, action_type, today, unitId]
    );

    // 3. Resolve any active filter health / maintenance alerts for this unit
    await dbAsync.run(
      `UPDATE alerts 
       SET status = 'RESOLVED', resolved_by = ?, resolved_at = ?
       WHERE unit_id = ? AND parameter IN ('Filter Life', 'Maintenance') AND status != 'RESOLVED'`,
      [officer_name, nowTimestamp, unitId]
    );

    const updatedUnit = await dbAsync.get(`SELECT * FROM units WHERE id = ?`, [unitId]);

    res.status(201).json({
      success: true,
      message: 'Maintenance logged and filter baseline updated successfully',
      logId: result.lastID,
      unit: updatedUnit
    });
  } catch (error) {
    console.error('Error logging maintenance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
