const config = require('../config/keys');

/**
 * Evaluates water readings against Indian Standard BIS 10500 : 2012 Drinking Water Specification
 * @param {Object} reading - { ph, tds, turbidity, temperature }
 * @returns {Object} evaluation - { isSafe, parameters: { ... }, failureReasons: [] }
 */
function evaluateBIS10500(reading) {
  const { ph, tds, turbidity, temperature } = reading;
  const limits = config.BIS_THRESHOLDS;
  const failureReasons = [];
  const warnings = [];

  // 1. pH Check (Acceptable: 6.5 - 8.5)
  const phSafe = ph >= limits.PH.min && ph <= limits.PH.max;
  if (!phSafe) {
    failureReasons.push({
      param: 'pH',
      value: ph,
      expected: '6.5 - 8.5',
      message: ph < 6.5 ? 'Water is acidic (pH < 6.5)' : 'Water is alkaline (pH > 8.5)',
      message_hi: ph < 6.5 ? 'पानी अम्लीय है (pH < 6.5)' : 'पानी क्षारीय है (pH > 8.5)'
    });
  }

  // 2. TDS Check (Acceptable: <= 500 mg/L)
  const tdsSafe = tds <= limits.TDS.max;
  if (!tdsSafe) {
    failureReasons.push({
      param: 'TDS',
      value: tds,
      expected: '≤ 500 mg/L',
      message: `Total Dissolved Solids (${tds} mg/L) exceeds BIS safe drinking limit of 500 mg/L`,
      message_hi: `कुल घुलित ठोस (${tds} mg/L) सुरक्षित सीमा 500 mg/L से अधिक है`
    });
  } else if (tds > 400) {
    warnings.push({
      param: 'TDS',
      value: tds,
      expected: '≤ 500 mg/L',
      message: `TDS level (${tds} mg/L) is approaching permissible threshold limit`,
      message_hi: `TDS स्तर (${tds} mg/L) अनुमेय सीमा के करीब पहुंच रहा है`
    });
  }

  // 3. Turbidity Check (Acceptable: <= 1.0 NTU)
  const turbSafe = turbidity <= limits.TURBIDITY.max;
  if (!turbSafe) {
    failureReasons.push({
      param: 'Turbidity',
      value: turbidity,
      expected: '≤ 1.0 NTU',
      message: `Turbidity (${turbidity} NTU) indicates excessive cloudiness/particulate matter`,
      message_hi: `गंदलापन/Turbidity (${turbidity} NTU) मानक सीमा 1.0 NTU से अधिक है`
    });
  } else if (turbidity > 0.8) {
    warnings.push({
      param: 'Turbidity',
      value: turbidity,
      expected: '≤ 1.0 NTU',
      message: `Turbidity (${turbidity} NTU) is nearing warning threshold`,
      message_hi: `गंदलापन (${turbidity} NTU) चेतावनी सीमा के पास है`
    });
  }

  // 4. Temperature Check (Standard: 10 - 35 °C)
  const tempSafe = temperature >= limits.TEMPERATURE.min && temperature <= limits.TEMPERATURE.max;
  if (!tempSafe) {
    failureReasons.push({
      param: 'Temperature',
      value: temperature,
      expected: '10 - 35 °C',
      message: `Temperature (${temperature} °C) is outside normal potable range`,
      message_hi: `तापमान (${temperature} °C) सामान्य सीमा से बाहर है`
    });
  }

  const isSafe = phSafe && tdsSafe && turbSafe && tempSafe;

  return {
    isSafe,
    status: isSafe ? 'SAFE' : 'UNSAFE',
    parameters: {
      ph: { value: ph, isSafe: phSafe, threshold: '6.5 - 8.5', unit: 'pH' },
      tds: { value: tds, isSafe: tdsSafe, threshold: '≤ 500', unit: 'mg/L' },
      turbidity: { value: turbidity, isSafe: turbSafe, threshold: '≤ 1.0', unit: 'NTU' },
      temperature: { value: temperature, isSafe: tempSafe, threshold: '10 - 35', unit: '°C' }
    },
    failureReasons,
    warnings
  };
}

module.exports = { evaluateBIS10500 };
