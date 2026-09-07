const mongoose = require('mongoose');
const keys = require('../config/keys');

let isConnected = false;

async function connectMongoDB() {
  const uri = process.env.MONGODB_URI || keys.MONGODB_URI;

  if (!uri) {
    console.warn('⚠️  [MongoDB] MONGODB_URI not found in environment variables (.env).');
    console.warn('ℹ️  [MongoDB] Running with in-memory buffer. To store permanently in MongoDB Atlas, add MONGODB_URI to backend/config/.env');
    return false;
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    isConnected = true;
    console.log('🍃 [MongoDB Atlas] Connected successfully to cloud database.');
    return true;
  } catch (error) {
    console.error('❌ [MongoDB Atlas] Connection error:', error.message);
    console.warn('ℹ️  [MongoDB Atlas] Backend will continue running and retry connection.');
    isConnected = false;
    return false;
  }
}

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('⚠️  [MongoDB Atlas] Disconnected from cloud database.');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  console.log('🔄 [MongoDB Atlas] Reconnected to cloud database.');
});

module.exports = {
  connectMongoDB,
  isMongoConnected: () => isConnected,
  mongoose
};
