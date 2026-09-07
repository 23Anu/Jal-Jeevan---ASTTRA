const keys = require('../config/keys');

/**
 * Evaluates water quality against Bureau of Indian Standards (BIS 10500:2012)
 * and returns status: 'SAFE' | 'WARNING' | 'UNSAFE' along with reasons.
 */
function evaluateWaterQuality({ ph, tds, turbidity, temperature }) {
  const reasons = [];
  let isUnsafe = false;
  let isWarning = false;

  // 1. pH Evaluation (Permissible: 6.5 - 8.5)
  const phVal = Number(ph);
  if (phVal < 6.5) {
    if (phVal < 6.0) {
      isUnsafe = true;
      reasons.push(`pH ${phVal} is critically acidic (BIS acceptable: 6.5 - 8.5)`);
    } else {
      isWarning = true;
      reasons.push(`pH ${phVal} is slightly acidic (BIS acceptable: 6.5 - 8.5)`);
    }
  } else if (phVal > 8.5) {
    if (phVal > 9.0) {
      isUnsafe = true;
      reasons.push(`pH ${phVal} is critically alkaline (BIS acceptable: 6.5 - 8.5)`);
    } else {
      isWarning = true;
      reasons.push(`pH ${phVal} is slightly alkaline (BIS acceptable: 6.5 - 8.5)`);
    }
  }

  // 2. TDS Evaluation (Permissible: ≤ 500 ppm, Cause for Rejection: > 2000 ppm)
  const tdsVal = Number(tds);
  if (tdsVal > 500) {
    if (tdsVal > 1000) {
      isUnsafe = true;
      reasons.push(`TDS ${tdsVal} ppm exceeds safe threshold (BIS acceptable limit: ≤ 500 ppm)`);
    } else {
      isWarning = true;
      reasons.push(`TDS ${tdsVal} ppm is elevated (BIS desirable limit: ≤ 500 ppm)`);
    }
  }

  // 3. Turbidity Evaluation (Permissible: ≤ 1.0 NTU, Cause for Rejection: > 5.0 NTU)
  const turbVal = Number(turbidity);
  if (turbVal > 1.0) {
    if (turbVal > 5.0) {
      isUnsafe = true;
      reasons.push(`Turbidity ${turbVal} NTU exceeds maximum permissible limit (BIS: ≤ 1.0 NTU)`);
    } else {
      isWarning = true;
      reasons.push(`Turbidity ${turbVal} NTU is slightly cloudy (BIS desirable: ≤ 1.0 NTU)`);
    }
  }

  // 4. Temperature Evaluation (Desirable: 10°C - 35°C)
  const tempVal = Number(temperature);
  if (tempVal > 38 || tempVal < 5) {
    isWarning = true;
    reasons.push(`Water temperature ${tempVal}°C is abnormal`);
  }

  let status = 'SAFE';
  if (isUnsafe) {
    status = 'UNSAFE';
  } else if (isWarning) {
    status = 'WARNING';
  }

  return {
    status,
    status_reasons: reasons,
    isCompliant: status === 'SAFE'
  };
}

/**
 * Validates incoming JSON payload from ESP32
 */
function validateEsp32Payload(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return { isValid: false, errors: ['Request body must be a JSON object'] };
  }

  // Check device_id
  if (!body.device_id || typeof body.device_id !== 'string' || body.device_id.trim() === '') {
    errors.push('device_id is required and must be a non-empty string (e.g., "ESP32_001")');
  }

  // Helper for numeric fields
  const validateNumber = (field, min, max, name) => {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      errors.push(`${name} (${field}) is required`);
    } else {
      const num = Number(body[field]);
      if (isNaN(num)) {
        errors.push(`${name} (${field}) must be a valid numeric value`);
      } else if (min !== null && num < min) {
        errors.push(`${name} (${field}) cannot be less than ${min}`);
      } else if (max !== null && num > max) {
        errors.push(`${name} (${field}) cannot be greater than ${max}`);
      }
    }
  };

  validateNumber('ph', 0, 14, 'pH Value');
  validateNumber('tds', 0, 10000, 'TDS');
  validateNumber('turbidity', 0, 1000, 'Turbidity');
  validateNumber('temperature', -20, 100, 'Temperature');

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  evaluateWaterQuality,
  validateEsp32Payload
};
