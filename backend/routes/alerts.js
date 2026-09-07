const express = require('express');
const router = express.Router();
const { dbAsync } = require('../db/database');

// GET /api/alerts - List & filter alerts
router.get('/', async (req, res) => {
  try {
    const { unit_id, severity, status, limit = 100 } = req.query;
    let query = `
      SELECT a.*, u.name as unit_name, u.district, u.block, u.location_type
      FROM alerts a
      JOIN units u ON u.id = a.unit_id
      WHERE 1=1
    `;
    const params = [];

    if (unit_id) {
      query += ` AND a.unit_id = ?`;
      params.push(unit_id);
    }
    if (severity) {
      query += ` AND a.severity = ?`;
      params.push(severity.toUpperCase());
    }
    if (status) {
      query += ` AND a.status = ?`;
      params.push(status.toUpperCase());
    }

    query += ` ORDER BY a.created_at DESC LIMIT ?`;
    params.push(parseInt(limit, 10));

    const alerts = await dbAsync.all(query, params);

    const stats = {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'CRITICAL' && a.status === 'OPEN').length,
      warning: alerts.filter(a => a.severity === 'WARNING' && a.status === 'OPEN').length,
      open: alerts.filter(a => a.status === 'OPEN').length,
      acknowledged: alerts.filter(a => a.status === 'ACKNOWLEDGED').length,
      resolved: alerts.filter(a => a.status === 'RESOLVED').length
    };

    res.json({ success: true, count: alerts.length, stats, data: alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/alerts/:id/status - Acknowledge or Resolve an alert
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, officer_name = 'PHED Field Officer', resolution_notes } = req.body;

    if (!['ACKNOWLEDGED', 'RESOLVED', 'OPEN'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value' });
    }

    const alert = await dbAsync.get(`SELECT * FROM alerts WHERE id = ?`, [id]);
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    const now = new Date().toISOString();
    let query = `UPDATE alerts SET status = ?`;
    const params = [status];

    if (status === 'ACKNOWLEDGED') {
      query += `, acknowledged_by = ?, acknowledged_at = ?`;
      params.push(officer_name, now);
    } else if (status === 'RESOLVED') {
      query += `, resolved_by = ?, resolved_at = ?`;
      params.push(officer_name, now);
    }

    query += ` WHERE id = ?`;
    params.push(id);

    await dbAsync.run(query, params);
    const updated = await dbAsync.get(`SELECT * FROM alerts WHERE id = ?`, [id]);

    res.json({ success: true, message: `Alert marked as ${status}`, data: updated });
  } catch (error) {
    console.error('Error updating alert status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
