const express = require('express');
const router = express.Router({ mergeParams: true });
const { dbAsync } = require('../db/database');
const { evaluateBIS10500 } = require('../services/bisChecker');
const { analyzeUnitDrift } = require('../services/driftAnalyzer');

// Injected WebSocket broadcast hook
let broadcastWebSocket = () => {};
router.setWebSocketBroadcaster = (fn) => {
  broadcastWebSocket = fn;
};

// POST /api/units/:id/readings - ESP32 pushes a new inlet/outlet reading batch
router.post('/:id/readings', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      timestamp = new Date().toISOString(),
      inlet_ph,
      inlet_tds,
      inlet_turbidity,
      inlet_temp,
      outlet_ph,
      outlet_tds,
      outlet_turbidity,
      outlet_temp,
      recirculation_cycle = 1,
      recirculation_outcome = 'RELEASED',
      is_buffered = 0
    } = req.body;

    // Check if unit exists
    const unit = await dbAsync.get(`SELECT * FROM units WHERE id = ?`, [id]);
    if (!unit) {
      return res.status(404).json({ success: false, error: `Unit ${id} not found in registry` });
    }

    // Evaluate BIS 10500 Compliance for outlet water
    const evaluation = evaluateBIS10500({
      ph: Number(outlet_ph),
      tds: Number(outlet_tds),
      turbidity: Number(outlet_turbidity),
      temperature: Number(outlet_temp)
    });

    const bisStatus = evaluation.isSafe ? 'SAFE' : 'UNSAFE';

    // Insert reading record
    const result = await dbAsync.run(
      `INSERT INTO readings (
        unit_id, timestamp, inlet_ph, inlet_tds, inlet_turbidity, inlet_temp,
        outlet_ph, outlet_tds, outlet_turbidity, outlet_temp, bis_status,
        recirculation_cycle, recirculation_outcome, is_buffered
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, timestamp, inlet_ph, inlet_tds, inlet_turbidity, inlet_temp,
        outlet_ph, outlet_tds, outlet_turbidity, outlet_temp, bisStatus,
        recirculation_cycle, recirculation_outcome, is_buffered ? 1 : 0
      ]
    );

    // Update unit status & purified volume
    const newStatus = bisStatus === 'SAFE' ? 'SAFE' : 'UNSAFE';
    const updatedPurified = (unit.purified_today_litres || 0) + (bisStatus === 'SAFE' ? 50 : 0);
    await dbAsync.run(
      `UPDATE units SET status = ?, purified_today_litres = ? WHERE id = ?`,
      [newStatus, updatedPurified, id]
    );

    // If Unsafe, create Critical Alert if not already open
    if (!evaluation.isSafe) {
      for (const fail of evaluation.failureReasons) {
        const existingAlert = await dbAsync.get(
          `SELECT id FROM alerts WHERE unit_id = ? AND parameter = ? AND status = 'OPEN'`,
          [id, fail.param]
        );

        if (!existingAlert) {
          await dbAsync.run(
            `INSERT INTO alerts (unit_id, parameter, severity, message, message_hi, value_observed, threshold_expected, status)
             VALUES (?, ?, 'CRITICAL', ?, ?, ?, ?, 'OPEN')`,
            [id, fail.param, fail.message, fail.message_hi, fail.value, fail.expected]
          );
        }
      }
    }

    // Run Predictive Drift and Filter Health Check
    await analyzeUnitDrift(id);

    const createdReading = {
      id: result.lastID,
      unit_id: id,
      timestamp,
      inlet_ph,
      inlet_tds,
      inlet_turbidity,
      inlet_temp,
      outlet_ph,
      outlet_tds,
      outlet_turbidity,
      outlet_temp,
      bis_status: bisStatus,
      recirculation_cycle,
      recirculation_outcome,
      is_buffered: is_buffered ? 1 : 0,
      evaluation
    };

    // Broadcast to live WebSocket clients
    broadcastWebSocket({
      type: 'NEW_READING',
      unit_id: id,
      reading: createdReading,
      unit_status: newStatus
    });

    res.status(201).json({
      success: true,
      message: 'Reading ingested and evaluated successfully',
      data: createdReading
    });
  } catch (error) {
    console.error('Error inserting reading:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/units/:id/sync - Bulk-ingest buffered records after reconnection (no data loss)
router.post('/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    const { batch } = req.body;

    if (!Array.isArray(batch) || batch.length === 0) {
      return res.status(400).json({ success: false, error: 'Valid batch array required' });
    }

    let insertedCount = 0;
    // Sort batch by timestamp ascending
    batch.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    for (const item of batch) {
      const evaluation = evaluateBIS10500({
        ph: Number(item.outlet_ph),
        tds: Number(item.outlet_tds),
        turbidity: Number(item.outlet_turbidity),
        temperature: Number(item.outlet_temp)
      });

      const bisStatus = evaluation.isSafe ? 'SAFE' : 'UNSAFE';

      await dbAsync.run(
        `INSERT INTO readings (
          unit_id, timestamp, inlet_ph, inlet_tds, inlet_turbidity, inlet_temp,
          outlet_ph, outlet_tds, outlet_turbidity, outlet_temp, bis_status,
          recirculation_cycle, recirculation_outcome, is_buffered
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          id, item.timestamp, item.inlet_ph, item.inlet_tds, item.inlet_turbidity, item.inlet_temp,
          item.outlet_ph, item.outlet_tds, item.outlet_turbidity, item.outlet_temp, bisStatus,
          item.recirculation_cycle || 1, item.recirculation_outcome || 'RELEASED'
        ]
      );
      insertedCount++;
    }

    // Update unit status to latest reading in batch
    const latestItem = batch[batch.length - 1];
    const latestEval = evaluateBIS10500({
      ph: Number(latestItem.outlet_ph),
      tds: Number(latestItem.outlet_tds),
      turbidity: Number(latestItem.outlet_turbidity),
      temperature: Number(latestItem.outlet_temp)
    });
    await dbAsync.run(`UPDATE units SET status = ? WHERE id = ?`, [latestEval.isSafe ? 'SAFE' : 'UNSAFE', id]);

    broadcastWebSocket({
      type: 'BATCH_SYNC_COMPLETED',
      unit_id: id,
      count: insertedCount
    });

    res.json({
      success: true,
      message: `Successfully synchronized ${insertedCount} buffered records`,
      insertedCount
    });
  } catch (error) {
    console.error('Error syncing buffered readings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/units/:id/readings/latest - Get latest reading for a unit
router.get('/:id/readings/latest', async (req, res) => {
  try {
    const { id } = req.params;
    const reading = await dbAsync.get(
      `SELECT * FROM readings WHERE unit_id = ? ORDER BY timestamp DESC LIMIT 1`,
      [id]
    );

    if (!reading) {
      return res.status(404).json({ success: false, error: 'No readings found for unit' });
    }

    const evaluation = evaluateBIS10500({
      ph: reading.outlet_ph,
      tds: reading.outlet_tds,
      turbidity: reading.outlet_turbidity,
      temperature: reading.outlet_temp
    });

    res.json({
      success: true,
      data: {
        ...reading,
        evaluation
      }
    });
  } catch (error) {
    console.error('Error getting latest reading:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/units/:id/readings/history - Historical readings with timeframe / pagination
router.get('/:id/readings/history', async (req, res) => {
  try {
    const { id } = req.params;
    const { timeframe = '7d', limit = 100 } = req.query;

    let timeFilter = "datetime('now', '-7 days')";
    if (timeframe === '24h') timeFilter = "datetime('now', '-1 day')";
    else if (timeframe === '30d') timeFilter = "datetime('now', '-30 days')";
    else if (timeframe === 'all') timeFilter = "datetime('now', '-1000 days')";

    const readings = await dbAsync.all(
      `SELECT * FROM readings 
       WHERE unit_id = ? AND timestamp >= ${timeFilter}
       ORDER BY timestamp ASC LIMIT ?`,
      [id, parseInt(limit, 10)]
    );

    // Compute daily aggregation summary for 7-day view
    const dailyMap = {};
    readings.forEach(r => {
      const day = r.timestamp.slice(0, 10);
      if (!dailyMap[day]) {
        dailyMap[day] = { date: day, total: 0, safe: 0, unsafe: 0, avgPh: 0, avgTds: 0, avgTurb: 0, bufferedCount: 0 };
      }
      dailyMap[day].total++;
      if (r.bis_status === 'SAFE') dailyMap[day].safe++;
      else dailyMap[day].unsafe++;
      if (r.is_buffered) dailyMap[day].bufferedCount++;
      dailyMap[day].avgPh += r.outlet_ph;
      dailyMap[day].avgTds += r.outlet_tds;
      dailyMap[day].avgTurb += r.outlet_turbidity;
    });

    const dailySummary = Object.values(dailyMap).map(d => ({
      date: d.date,
      status: d.unsafe > 0 ? 'UNSAFE' : 'SAFE',
      safePercentage: Math.round((d.safe / d.total) * 100),
      avgPh: Number((d.avgPh / d.total).toFixed(2)),
      avgTds: Math.round(d.avgTds / d.total),
      avgTurb: Number((d.avgTurb / d.total).toFixed(2)),
      bufferedCount: d.bufferedCount
    }));

    res.json({
      success: true,
      unit_id: id,
      count: readings.length,
      timeframe,
      data: readings,
      dailySummary
    });
  } catch (error) {
    console.error('Error fetching reading history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
