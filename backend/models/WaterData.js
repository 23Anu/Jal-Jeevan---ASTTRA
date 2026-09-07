const mongoose = require('mongoose');

const WaterDataSchema = new mongoose.Schema(
  {
    device_id: {
      type: String,
      required: [true, 'Device ID is required (e.g., ESP32_001)'],
      trim: true,
      index: true
    },
    ph: {
      type: Number,
      required: [true, 'pH value is required'],
      min: [0, 'pH cannot be less than 0'],
      max: [14, 'pH cannot be greater than 14']
    },
    tds: {
      type: Number,
      required: [true, 'TDS value is required (in mg/L or ppm)'],
      min: [0, 'TDS cannot be negative']
    },
    turbidity: {
      type: Number,
      required: [true, 'Turbidity value is required (in NTU)'],
      min: [0, 'Turbidity cannot be negative']
    },
    temperature: {
      type: Number,
      required: [true, 'Temperature value is required (in °C)']
    },
    status: {
      type: String,
      enum: ['SAFE', 'WARNING', 'UNSAFE'],
      default: 'SAFE',
      index: true
    },
    status_reasons: {
      type: [String],
      default: []
    },
    raw_payload: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    versionKey: false
  }
);

// Compound index for high-speed time-series queries
WaterDataSchema.index({ device_id: 1, createdAt: -1 });

module.exports = mongoose.model('WaterData', WaterDataSchema);
