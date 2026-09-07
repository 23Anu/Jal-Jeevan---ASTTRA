const { dbAsync } = require('../db/database');

/**
 * Analyzes historical trends and sensor drift for predictive maintenance
 * @param {string} unitId - Unit identifier
 */
async function analyzeUnitDrift(unitId) {
  try {
    // Get last 20 readings for the unit
    const recentReadings = await dbAsync.all(
      `SELECT * FROM readings WHERE unit_id = ? ORDER BY timestamp DESC LIMIT 20`,
      [unitId]
    );

    if (!recentReadings || recentReadings.length < 5) {
      return { hasDrift: false, alertsGenerated: [] };
    }

    const unit = await dbAsync.get(`SELECT * FROM units WHERE id = ?`, [unitId]);
    if (!unit) return { hasDrift: false, alertsGenerated: [] };

    const alertsGenerated = [];

    // Calculate TDS Trend
    const tdsValues = recentReadings.map(r => r.outlet_tds);
    const avgTdsRecent = tdsValues.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const avgTdsOlder = tdsValues.slice(5).reduce((a, b) => a + b, 0) / (tdsValues.length - 5);
    const tdsDriftRate = avgTdsRecent - avgTdsOlder;

    // Predictive Warning if TDS is trending up and nearing 450
    if (avgTdsRecent > 420 && tdsDriftRate > 15) {
      // Check if active alert already exists
      const existingAlert = await dbAsync.get(
        `SELECT id FROM alerts WHERE unit_id = ? AND parameter = 'TDS' AND severity = 'WARNING' AND status = 'OPEN'`,
        [unitId]
      );

      if (!existingAlert) {
        await dbAsync.run(
          `INSERT INTO alerts (unit_id, parameter, severity, message, message_hi, value_observed, threshold_expected, status)
           VALUES (?, 'TDS', 'WARNING', ?, ?, ?, '≤ 500 mg/L', 'OPEN')`,
          [
            unitId,
            `Predictive Warning: Outlet TDS is climbing at +${tdsDriftRate.toFixed(1)} mg/L trend. Filter degradation anticipated.`,
            `पूर्वानुमान चेतावनी: आउटलेट TDS में +${tdsDriftRate.toFixed(1)} mg/L की वृद्धि देखी जा रही है। फ़िल्टर जीवन समाप्त होने की संभावना है।`,
            avgTdsRecent
          ]
        );
        alertsGenerated.push('TDS_PREDICTIVE_DRIFT');
      }
    }

    // Calculate Filter Health Degradation based on volume & turbidity stress
    const totalPurified = unit.purified_today_litres || 0;
    const avgInletTurbidity = recentReadings.reduce((acc, r) => acc + r.inlet_turbidity, 0) / recentReadings.length;
    
    // Gradual decay factor
    const stressFactor = avgInletTurbidity > 5 ? 1.5 : 1.0;
    const calculatedHealth = Math.max(5, Math.round(unit.filter_health - (0.05 * stressFactor)));

    if (calculatedHealth !== unit.filter_health) {
      await dbAsync.run(`UPDATE units SET filter_health = ? WHERE id = ?`, [calculatedHealth, unitId]);

      // If filter health drops below 20%, trigger maintenance alert
      if (calculatedHealth <= 20) {
        const existingHealthAlert = await dbAsync.get(
          `SELECT id FROM alerts WHERE unit_id = ? AND parameter = 'Filter Life' AND status = 'OPEN'`,
          [unitId]
        );

        if (!existingHealthAlert) {
          await dbAsync.run(
            `INSERT INTO alerts (unit_id, parameter, severity, message, message_hi, value_observed, threshold_expected, status)
             VALUES (?, 'Filter Life', 'WARNING', ?, ?, ?, '> 20%', 'OPEN')`,
            [
              unitId,
              `Filter Cartridge Health at ${calculatedHealth}%. Replacement due in ~${Math.round(calculatedHealth * 0.7)} days.`,
              `फ़िल्टर कार्ट्रिज स्वास्थ्य ${calculatedHealth}% पर है। ~${Math.round(calculatedHealth * 0.7)} दिनों में बदलना आवश्यक है।`,
              calculatedHealth
            ]
          );
          alertsGenerated.push('FILTER_HEALTH_LOW');
        }
      }
    }

    return { hasDrift: alertsGenerated.length > 0, alertsGenerated, filterHealth: calculatedHealth };
  } catch (error) {
    console.error('Error in analyzeUnitDrift:', error);
    return { hasDrift: false, error: error.message };
  }
}

module.exports = { analyzeUnitDrift };
