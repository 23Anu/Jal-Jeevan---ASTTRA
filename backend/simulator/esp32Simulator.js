const { dbAsync } = require('../db/database');
const { evaluateBIS10500 } = require('../services/bisChecker');

/**
 * Generates realistic real-time telemetry from ESP32 units in the field
 */
async function generateTelemetryCycle(ioBroadcastCallback) {
  try {
    const units = await dbAsync.all(`SELECT * FROM units WHERE status != 'OFFLINE'`);
    if (!units || units.length === 0) return;

    // Pick a random online unit
    const unit = units[Math.floor(Math.random() * units.length)];
    const now = new Date().toISOString();

    let inletPh, inletTds, inletTurb, inletTemp;
    let outletPh, outletTds, outletTurb, outletTemp;
    let cycle = 1;
    let outcome = 'RELEASED';

    if (unit.id === 'JH-DHN-001') {
      // Contaminated unit
      inletPh = Number((5.8 + (Math.random() * 0.4 - 0.2)).toFixed(2));
      inletTds = Math.round(720 + (Math.random() * 40 - 20));
      inletTurb = Number((9.2 + (Math.random() * 2.0 - 1.0)).toFixed(2));
      inletTemp = Number((28.0 + (Math.random() * 1.0)).toFixed(1));

      outletPh = Number((6.3 + (Math.random() * 0.2 - 0.1)).toFixed(2));
      outletTds = Math.round(535 + (Math.random() * 30 - 15)); // Unsafe TDS
      outletTurb = Number((1.3 + (Math.random() * 0.3)).toFixed(2));
      outletTemp = inletTemp;
      cycle = 3;
      outcome = 'HELD'; // Recirculation failed, solenoid holds back water
    } else {
      // Clean / Normal Unit with multi-stage recirculation purification
      const isMuddyInlet = Math.random() < 0.25; // 25% chance of turbid raw borewell water
      inletPh = Number((7.0 + (Math.random() * 0.6 - 0.3)).toFixed(2));
      inletTds = Math.round(360 + (Math.random() * 80 - 40));
      inletTurb = isMuddyInlet ? Number((6.5 + Math.random() * 3.0).toFixed(2)) : Number((2.2 + Math.random() * 1.5).toFixed(2));
      inletTemp = Number((25.5 + Math.random() * 2.0).toFixed(1));

      // After automated purification & recirculation
      outletPh = Number((7.2 + (Math.random() * 0.3 - 0.15)).toFixed(2));
      outletTds = Math.round(185 + (Math.random() * 40 - 20));
      outletTurb = Number((0.28 + (Math.random() * 0.15)).toFixed(2));
      outletTemp = inletTemp;
      cycle = isMuddyInlet ? 2 : 1;
      outcome = 'RELEASED';
    }

    const evaluation = evaluateBIS10500({
      ph: outletPh,
      tds: outletTds,
      turbidity: outletTurb,
      temperature: outletTemp
    });

    const bisStatus = evaluation.isSafe ? 'SAFE' : 'UNSAFE';

    // Insert reading
    const res = await dbAsync.run(
      `INSERT INTO readings (
        unit_id, timestamp, inlet_ph, inlet_tds, inlet_turbidity, inlet_temp,
        outlet_ph, outlet_tds, outlet_turbidity, outlet_temp, bis_status,
        recirculation_cycle, recirculation_outcome, is_buffered
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        unit.id, now, inletPh, inletTds, inletTurb, inletTemp,
        outletPh, outletTds, outletTurb, outletTemp, bisStatus,
        cycle, outcome
      ]
    );

    // Update unit status & daily purified volume
    const newPurified = (unit.purified_today_litres || 0) + (bisStatus === 'SAFE' ? 25 : 0);
    await dbAsync.run(
      `UPDATE units SET status = ?, purified_today_litres = ? WHERE id = ?`,
      [bisStatus, newPurified, unit.id]
    );

    const payload = {
      id: res.lastID,
      unit_id: unit.id,
      unit_name: unit.name,
      timestamp: now,
      inlet_ph: inletPh,
      inlet_tds: inletTds,
      inlet_turbidity: inletTurb,
      inlet_temp: inletTemp,
      outlet_ph: outletPh,
      outlet_tds: outletTds,
      outlet_turbidity: outletTurb,
      outlet_temp: outletTemp,
      bis_status: bisStatus,
      recirculation_cycle: cycle,
      recirculation_outcome: outcome,
      is_buffered: 0,
      evaluation
    };

    if (ioBroadcastCallback) {
      ioBroadcastCallback({
        type: 'NEW_READING',
        data: payload
      });
    }

    return payload;
  } catch (error) {
    console.error('Error in simulator cycle:', error);
  }
}

module.exports = { generateTelemetryCycle };
