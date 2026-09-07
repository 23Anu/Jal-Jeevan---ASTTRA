const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'astra_sih26040_jharkhand_water_secret_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  DB_FILE: path.resolve(__dirname, '..', process.env.DB_FILE || './db/water_monitoring.sqlite'),
  SIMULATOR_INTERVAL_MS: parseInt(process.env.SIMULATOR_INTERVAL_MS || '10000', 10),
  ENABLE_AUTO_SIMULATOR: process.env.ENABLE_AUTO_SIMULATOR !== 'false',
  SMS: {
    PROVIDER: process.env.SMS_GATEWAY_PROVIDER || 'Fast2SMS',
    API_KEY: process.env.SMS_API_KEY || 'mock_jharkhand_phed_sms_api_key',
    SENDER_ID: process.env.SMS_SENDER_ID || 'JHPHED',
    HELPLINE: process.env.EMERGENCY_HELPLINE || '1800-345-6555'
  },
  BIS_THRESHOLDS: {
    PH: { min: 6.5, max: 8.5, unit: 'pH' },
    TDS: { min: 0, max: 500, unit: 'mg/L (ppm)' },
    TURBIDITY: { min: 0, max: 1.0, unit: 'NTU' },
    TEMPERATURE: { min: 10, max: 35, unit: '°C' }
  },
  TTS: {
    GOOGLE_API_KEY: process.env.GOOGLE_TTS_API_KEY || '',
    VOICE_HINDI: process.env.TTS_DEFAULT_VOICE_HINDI || 'hi-IN-Neural2-A',
    VOICE_ENGLISH: process.env.TTS_DEFAULT_VOICE_ENGLISH || 'en-IN-Neural2-B'
  }
};
