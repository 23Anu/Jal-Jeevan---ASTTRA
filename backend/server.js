const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const WebSocket = require('ws');
const config = require('./config/keys');
const { dbAsync } = require('./db/database');
const { seedDatabase } = require('./db/seed');
const { connectMongoDB } = require('./db/mongodb');

// Import routes
const unitsRouter = require('./routes/units');
const readingsRouter = require('./routes/readings');
const alertsRouter = require('./routes/alerts');
const maintenanceRouter = require('./routes/maintenance');
const authRouter = require('./routes/auth');
const reportsRouter = require('./routes/reports');
const aiAssistantRouter = require('./routes/aiAssistant');
const waterDataRouter = require('./routes/waterData');
const { generateTelemetryCycle } = require('./simulator/esp32Simulator');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws' });

// Active WebSocket clients set
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`🔌 New WebSocket client connected. Total clients: ${clients.size}`);

  // Send initial welcome & system status
  ws.send(JSON.stringify({
    type: 'SYSTEM_STATUS',
    message: 'Connected to Jharkhand Jal Jeevan Mission Live Telemetry Gateway',
    timestamp: new Date().toISOString()
  }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`🔌 WebSocket client disconnected. Total clients: ${clients.size}`);
  });

  ws.on('error', (err) => {
    console.error('WebSocket client error:', err.message);
    clients.delete(ws);
  });
});

// Broadcast helper
function broadcast(data) {
  const payload = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// Hook WebSocket broadcaster to Express app & routers
app.set('broadcastWs', broadcast);
readingsRouter.setWebSocketBroadcaster(broadcast);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// API Routes
app.use('/api/water-data', waterDataRouter); // ESP32 IoT endpoint & MongoDB Atlas
app.use('/api/units', unitsRouter);
app.use('/api/units', readingsRouter); // Handles /api/units/:id/readings & /api/units/:id/sync
app.use('/api/alerts', alertsRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/auth', authRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/ai', aiAssistantRouter);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    project: 'SIH26040 Smart Water Purification Dashboard',
    state: 'Govt. of Jharkhand - Drinking Water & Sanitation Dept.',
    timestamp: new Date().toISOString(),
    clientsConnected: clients.size
  });
});

// Serve Frontend Static Assets (Production / Tunnel)
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
    return next();
  }
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Manual trigger for simulator test
app.post('/api/simulator/trigger', async (req, res) => {
  try {
    const reading = await generateTelemetryCycle(broadcast);
    res.json({ success: true, message: 'Simulated telemetry pulse generated', reading });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Background ESP32 Simulated IoT Stream
let simulatorTimer = null;
function startSimulator() {
  if (config.ENABLE_AUTO_SIMULATOR) {
    console.log(`📡 ESP32 IoT Live Telemetry Simulator active (Pulse interval: ${config.SIMULATOR_INTERVAL_MS}ms)`);
    simulatorTimer = setInterval(() => {
      generateTelemetryCycle(broadcast);
    }, config.SIMULATOR_INTERVAL_MS);
  }
}

// Start Server & Self-Initialize if database is empty
server.listen(config.PORT, async () => {
  console.log(`================================================================`);
  console.log(`🚀 SIH26040 Water Dashboard Backend running on port ${config.PORT}`);
  console.log(`📡 ESP32 Endpoint: POST http://localhost:${config.PORT}/api/water-data`);
  console.log(`🌐 Latest Data API: GET http://localhost:${config.PORT}/api/water-data/latest`);
  console.log(`📊 History API: GET http://localhost:${config.PORT}/api/water-data/history`);
  console.log(`⚡ WebSocket: ws://localhost:${config.PORT}/ws`);
  console.log(`================================================================`);

  // Connect to MongoDB Atlas
  await connectMongoDB();

  try {
    // Check if SQLite units table is populated
    const unitCount = await dbAsync.get(`SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='units'`);
    if (!unitCount || unitCount.count === 0) {
      console.log('⚡ Initializing and seeding database schema...');
      await seedDatabase();
    } else {
      const units = await dbAsync.all(`SELECT count(*) as count FROM units`);
      if (units[0].count === 0) {
        await seedDatabase();
      }
    }
  } catch (err) {
    console.log('⚡ Running initial database seed...');
    await seedDatabase();
  }

  startSimulator();
});

module.exports = { app, server };
