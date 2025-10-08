require('dotenv').config();
const express = require('express');
const path = require('path');
console.log('[startup] Starting server.js ...');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');
const { logger } = require('./middleware/logger');
const routeMonitor = require('./middleware/routeMonitor');


// --- MQTT client for Mosquitto broker (for ESP32 communication) ---
const mqtt = require('mqtt');
const MOSQUITTO_PORT = process.env.MQTT_PORT || 1883; // Use standard MQTT port
const MOSQUITTO_HOST = process.env.MQTT_BROKER || '172.16.3.171'; // Use network MQTT broker

const mqttClient = mqtt.connect(`mqtt://${MOSQUITTO_HOST}:${MOSQUITTO_PORT}`, {
  clientId: 'backend_server',
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
  protocolVersion: 4
});

// Import models
const Device = require('./models/Device');
const ActivityLog = require('./models/ActivityLog');
const Counter = require('./models/Counter');

mqttClient.on('connect', () => {
  console.log(`[MQTT] Connected to Aedes broker on port ${MOSQUITTO_PORT}`);
  mqttClient.subscribe('#', (err) => {
    if (!err) {
      console.log('[MQTT] Subscribed to all topics (#) to receive from all devices');
    }
  });
});

mqttClient.on('error', (error) => {
  console.error('[MQTT] Connection error:', error.message);
});

mqttClient.on('offline', () => {
  console.log('[MQTT] Client offline');
});

mqttClient.on('reconnect', () => {
  console.log('[MQTT] Reconnecting...');
});

mqttClient.on('message', (topic, message) => {
  console.log(`[MQTT] Received message on ${topic}: ${message.toString()}`);
  // Handle ESP32 state updates
  if (topic === 'esp32/state') {
    try {
      const payload = message.toString();
      let data;
      try {
        data = JSON.parse(payload);
      } catch (e) {
        console.warn('[MQTT] esp32/state: Not JSON, skipping device update');
        return;
      }
      if (!data.mac) {
        console.warn('[MQTT] esp32/state: No mac field in payload, skipping');
        return;
      }
      // Normalize MAC address: remove colons, make lowercase
      function normalizeMac(mac) {
        return mac.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
      }
      const normalizedMac = normalizeMac(data.mac);
      Device.findOne({
        $or: [
          { macAddress: data.mac },
          { macAddress: data.mac.toUpperCase() },
          { macAddress: data.mac.toLowerCase() },
          { macAddress: normalizedMac },
          { macAddress: normalizedMac.toUpperCase() },
          { macAddress: normalizedMac.toLowerCase() }
        ]
      }).select('+deviceSecret').then(device => {
        if (!device) {
          console.warn('[MQTT] esp32/state: Device not found for MAC:', data.mac);
          return;
        }

        if (data.secret && data.secret !== device.deviceSecret) {
          console.warn('[MQTT] esp32/state: Invalid secret for device:', device.macAddress);
          return;
        }

        // Update device status
        device.status = 'online';
        device.lastSeen = new Date();

        let stateChanged = false;

        // Update switch states from ESP32 payload if switches array is present
        if (data.switches && Array.isArray(data.switches)) {
          data.switches.forEach(esp32Switch => {
            const deviceSwitch = device.switches.find(s => (s.relayGpio || s.gpio) === esp32Switch.gpio);
            if (deviceSwitch && deviceSwitch.state !== esp32Switch.state) {
              deviceSwitch.state = esp32Switch.state;
              deviceSwitch.manualOverride = esp32Switch.manual_override || false;
              deviceSwitch.lastStateChange = new Date();
              stateChanged = true;
              console.log(`[MQTT] Updated switch GPIO ${esp32Switch.gpio} to state ${esp32Switch.state} for device ${device.macAddress}`);
            }
          });
        }

        // Save device
        device.save().then(() => {
          console.log(`[MQTT] Marked device ${device.macAddress} as online`);

          // Send current configuration to ESP32
          sendDeviceConfigToESP32(device.macAddress);

          // Only emit events if state actually changed or this is the first time we're seeing the device online
          if (stateChanged || device.status !== 'online') {
            // Emit to frontend via Socket.IO if available
            if (global.io) {
              // 1. Legacy event for backward compatibility
              global.io.emit('deviceStatusUpdate', {
                macAddress: device.macAddress,
                status: 'online',
                lastSeen: device.lastSeen
              });
              // 2. device_state_changed for React UI (with debouncing)
              emitDeviceStateChanged(device, { source: 'mqtt_online' });
              // 3. device_connected event for real-time UI feedback
              global.io.emit('device_connected', {
                deviceId: device.id || device._id?.toString(),
                deviceName: device.name,
                location: device.location || '',
                macAddress: device.macAddress,
                lastSeen: device.lastSeen
              });
            }
          }
        }).catch(err => {
          console.error('[MQTT] Error saving device:', err);
        });
      }).catch(err => {
        console.error('[MQTT] Error finding device:', err);
      });
    } catch (e) {
      console.error('[MQTT] Exception in esp32/state handler:', e);
    }
  }
  if (topic === 'esp32/telemetry') {
    // Parse and process telemetry
    const telemetry = message.toString();
    console.log('[MQTT] ESP32 telemetry:', telemetry);

    try {
      const data = JSON.parse(telemetry);
      if (data.type === 'manual_switch') {
        // Handle manual switch event for logging and state update
        console.log('[MQTT] Manual switch event:', data);
        // Find the device and update switch state + log the manual operation
        const Device = require('./models/Device');
        const ActivityLog = require('./models/ActivityLog');
        const ManualSwitchLog = require('./models/ManualSwitchLog');

        // Normalize MAC address: remove colons, make lowercase (same as esp32/state handler)
        function normalizeMac(mac) {
          return mac.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
        }
        const normalizedMac = normalizeMac(data.mac);

        Device.findOne({ $or: [
          { macAddress: data.mac },
          { macAddress: data.mac.toUpperCase() },
          { macAddress: data.mac.toLowerCase() },
          { macAddress: normalizedMac },
          { macAddress: normalizedMac.toUpperCase() },
          { macAddress: normalizedMac.toLowerCase() }
        ] })
          .then(async (device) => {
            if (device) {
              console.log(`[DEBUG] Found device: ${device.name}, switches: ${device.switches.length}`);
              // Find the switch by GPIO
              const switchInfo = device.switches.find(sw => (sw.relayGpio || sw.gpio) === data.gpio);
              console.log(`[DEBUG] Looking for switch with GPIO ${data.gpio}, found:`, switchInfo ? switchInfo.name : 'NOT FOUND');
              if (switchInfo) {
                // Update the switch state in database
                const updatedDevice = await Device.findOneAndUpdate(
                  { _id: device._id, 'switches._id': switchInfo._id },
                  {
                    $set: {
                      'switches.$.state': data.state,
                      'switches.$.lastStateChange': new Date(),
                      lastModifiedBy: null, // Manual switch from ESP32
                      lastSeen: new Date(),
                      status: 'online'
                    }
                  },
                  { new: true }
                );

                // Log the manual operation
                await ActivityLog.create({
                  deviceId: device._id,
                  deviceName: device.name,
                  switchId: switchInfo._id,
                  switchName: switchInfo.name,
                  action: data.state ? 'manual_on' : 'manual_off',
                  triggeredBy: 'manual_switch',
                  classroom: device.classroom,
                  location: device.location,
                  ip: 'ESP32',
                  userAgent: 'ESP32 Manual Switch'
                });

                console.log(`[ACTIVITY] Logged manual switch: ${device.name} - ${switchInfo.name} -> ${data.state ? 'ON' : 'OFF'}`);

                // Emit real-time update to frontend
                console.log(`[DEBUG] global.io available: ${!!global.io}, updatedDevice available: ${!!updatedDevice}`);
                if (global.io && updatedDevice) {
                  console.log('[DEBUG] Emitting device_state_changed for manual switch:', {
                    deviceId: updatedDevice._id,
                    switchId: switchInfo._id,
                    newState: data.state,
                    source: 'mqtt_manual_switch'
                  });
                  emitDeviceStateChanged(updatedDevice, {
                    source: 'mqtt_manual_switch',
                    note: `Manual switch ${switchInfo.name} changed to ${data.state ? 'ON' : 'OFF'}`
                  });
                  console.log(`[MQTT] Emitted device_state_changed for manual switch: ${device.name}`);
                } else {
                  console.log(`[DEBUG] NOT emitting - global.io: ${!!global.io}, updatedDevice: ${!!updatedDevice}`);
                }
              }
            }
          })
          .catch(err => console.error('[MQTT] Error processing manual switch:', err.message));
      } else if (data.status === 'heartbeat') {
        // Handle heartbeat telemetry to keep device online
        console.log('[MQTT] Heartbeat received from device:', data.mac);
        const Device = require('./models/Device');

        // Normalize MAC address
        function normalizeMac(mac) {
          return mac.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
        }
        const normalizedMac = normalizeMac(data.mac);

        Device.findOneAndUpdate(
          { $or: [
            { macAddress: data.mac },
            { macAddress: data.mac.toUpperCase() },
            { macAddress: data.mac.toLowerCase() },
            { macAddress: normalizedMac },
            { macAddress: normalizedMac.toUpperCase() },
            { macAddress: normalizedMac.toLowerCase() }
          ] },
          {
            $set: {
              status: 'online',
              lastSeen: new Date(),
              heap: data.heap // Store heap info if available
            }
          },
          { new: true }
        ).then(device => {
          if (device) {
            console.log(`[MQTT] Updated heartbeat for device: ${device.name} (${device.macAddress})`);
            // Emit real-time update if status was previously offline
            if (global.io && device.status !== 'online') {
              emitDeviceStateChanged(device, { source: 'mqtt_heartbeat' });
            }
          } else {
            console.warn(`[MQTT] Heartbeat from unknown device: ${data.mac}`);
          }
        }).catch(err => console.error('[MQTT] Error processing heartbeat:', err.message));
      }
    } catch (err) {
      console.warn('[MQTT] Failed to parse telemetry JSON:', err.message);
    }
  }
});

mqttClient.on('error', (error) => {
  console.error('[MQTT] Connection error:', error);
});

// Make MQTT client available globally (routes will access it after app init)
global.mqttClient = mqttClient;

// -----------------------------------------------------------------------------
// Device state sequencing & unified emit helper
// -----------------------------------------------------------------------------
// Adds a monotonically increasing per-device sequence number to every
// device_state_changed event for deterministic ordering + easier debug of
// stale/ out-of-order UI updates.
const deviceSeqMap = new Map(); // deviceId -> last seq
function nextDeviceSeq(deviceId) {
  const prev = deviceSeqMap.get(deviceId) || 0;
  const next = prev + 1;
  deviceSeqMap.set(deviceId, next);
  return next;
}

// Debouncing for MQTT state messages to prevent spam
const deviceStateDebounce = new Map(); // deviceId -> {timeoutId, lastStateHash}
const DEBOUNCE_MS = 500; // 500ms debounce window for faster UI updates

function emitDeviceStateChanged(device, meta = {}) {
  console.log(`[DEBUG] emitDeviceStateChanged called for device: ${device?.name || 'unknown'}`);
  if (!device) return;
  const deviceId = device.id || device._id?.toString();
  if (!deviceId) return;

  // Create a simple hash of the device state for debouncing
  const stateHash = JSON.stringify({
    status: device.status,
    switches: device.switches?.map(s => ({ id: s.id, state: s.state })) || []
  });

  // Check if we have a pending debounce for this device
  const existing = deviceStateDebounce.get(deviceId);
  if (existing) {
    // If state hasn't changed, extend the debounce
    if (existing.lastStateHash === stateHash) {
      clearTimeout(existing.timeoutId);
      existing.timeoutId = setTimeout(() => {
        deviceStateDebounce.delete(deviceId);
        emitDeviceStateChangedNow(device, meta);
      }, DEBOUNCE_MS);
      return;
    }
    // If state changed, clear the old timeout
    clearTimeout(existing.timeoutId);
  }

  // Set up new debounce
  const timeoutId = setTimeout(() => {
    deviceStateDebounce.delete(deviceId);
    emitDeviceStateChangedNow(device, meta);
  }, DEBOUNCE_MS);

  deviceStateDebounce.set(deviceId, { timeoutId, lastStateHash: stateHash });
}

function emitDeviceStateChangedNow(device, meta = {}) {
  const deviceId = device.id || device._id?.toString();
  if (!deviceId) return;

  const seq = nextDeviceSeq(deviceId);
  const payload = {
    deviceId,
    state: device,
    ts: Date.now(),
    seq,
    source: meta.source || 'unknown',
    note: meta.note
  };
  console.log(`[DEBUG] Emitting device_state_changed payload:`, { deviceId, seq, source: payload.source });
  io.emit('device_state_changed', payload);
  // Focused debug log (avoid dumping entire device doc unless explicitly enabled)
  if (process.env.DEVICE_SEQ_LOG === 'verbose') {
    logger.info('[emitDeviceStateChanged]', { deviceId, seq, source: payload.source, note: payload.note });
  } else if (process.env.DEVICE_SEQ_LOG === 'basic') {
    logger.debug('[emitDeviceStateChanged]', { deviceId, seq, source: payload.source });
  }
}

// Function to send switch commands to ESP32 via MQTT
function sendMqttSwitchCommand(macAddress, gpio, state) {
  console.log(`[MQTT] sendMqttSwitchCommand called: MAC=${macAddress}, GPIO=${gpio}, state=${state}`);
  
  // Get device secret from database
  Device.findOne({ macAddress: new RegExp('^' + macAddress + '$', 'i') }).select('+deviceSecret').then(device => {
    console.log(`[MQTT] Database query result: device found=${!!device}`);
    
    if (!device || !device.deviceSecret) {
      console.warn('[MQTT] Device not found or no secret for MAC:', macAddress);
      return;
    }
    
    const command = {
      mac: macAddress, // Include MAC address to target specific device
      secret: device.deviceSecret, // Include device secret for authentication
      gpio: gpio,
      state: state
    };
    const message = JSON.stringify(command);
    
    console.log(`[MQTT] Publishing to esp32/switches:`, message);
    const result = mqttClient.publish('esp32/switches', message);
    console.log(`[MQTT] Sent switch command:`, command, 'publish result:', result);
  }).catch(err => {
    console.error('[MQTT] Error getting device secret:', err.message, err.stack);
  });
}

// Send device configuration to ESP32 via MQTT
function sendDeviceConfigToESP32(macAddress) {
  // Get device config from database
  Device.findOne({ macAddress: new RegExp('^' + macAddress + '$', 'i') }).select('+deviceSecret').then(device => {
    if (!device || !device.deviceSecret) {
      console.warn('[MQTT] Device not found or no secret for MAC:', macAddress);
      return;
    }

    const config = {
      mac: macAddress,
      secret: device.deviceSecret,
      switches: device.switches.map(sw => ({
        gpio: sw.relayGpio || sw.gpio,
        manualGpio: sw.manualSwitchGpio,
        manualMode: sw.manualMode || 'maintained'
      }))
    };

    const message = JSON.stringify(config);
    const result = mqttClient.publish('esp32/config', message);
    console.log(`[MQTT] Sent device config to ESP32:`, config, 'result:', result);
  }).catch(err => {
    console.error('[MQTT] Error getting device config:', err.message);
  });
}

// Make MQTT functions available globally (if needed elsewhere)
global.sendMqttSwitchCommand = sendMqttSwitchCommand;
global.sendDeviceConfigToESP32 = sendDeviceConfigToESP32;

console.log('[MQTT] Using Mosquitto broker for all ESP32 device communication');

// Load secure configuration if available
let secureConfig = {};
try {
    // Temporarily disable secure config loading for debugging
    console.log('⚠️  Secure configuration loading disabled for debugging');
    /*
    const SecureConfigManager = require('./scripts/secure-config');
    const configManager = new SecureConfigManager();
    secureConfig = configManager.loadSecureConfig();
    console.log('✅ Secure configuration loaded successfully');
    */
} catch (error) {
    console.log('⚠️  Secure configuration not available, using environment variables');
    console.log('   Run: node scripts/secure-config.js setup');
}

// Merge secure config with environment variables
process.env = { ...process.env, ...secureConfig };

// Initialize error tracking
process.on('uncaughtException', (error) => {
  if (error.code === 'EPIPE') {
    // Silently ignore EPIPE errors from logging
    return;
  }
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  if (reason && reason.code === 'EPIPE') {
    // Silently ignore EPIPE errors from logging
    return;
  }
  console.error('Unhandled Rejection:', reason);
});

// Enable request logging
const requestLogger = morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
});

// Override console methods in production to prevent EPIPE errors
if (process.env.NODE_ENV === 'production') {
  const noop = () => { };
  console.log = noop;
  console.error = noop;
  console.warn = noop;
  console.info = noop;
  console.debug = noop;
}
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const crypto = require('crypto');

// Import routes
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const deviceApiRoutes = require('./routes/deviceApi');
const esp32Routes = require('./routes/esp32');
const scheduleRoutes = require('./routes/schedules');
const userRoutes = require('./routes/users');  // Using the new users route
const activityRoutes = require('./routes/activities');
const activityLogRoutes = require('./routes/activityLogs');
const logsRoutes = require('./routes/logs');
const systemHealthRoutes = require('./routes/systemHealth');
const aimlRoutes = require('./routes/aiml');
const settingsRoutes = require('./routes/settings');
const ticketRoutes = require('./routes/tickets');
const devicePermissionRoutes = require('./routes/devicePermissions');
const deviceCategoryRoutes = require('./routes/deviceCategories');
const classExtensionRoutes = require('./routes/classExtensions');

// Import auth middleware
// Import auth middleware
const { auth, authorize } = require('./middleware/auth');

// Import services (only those actively used)
const scheduleService = require('./services/scheduleService');
const contentSchedulerService = require('./services/contentSchedulerService');
const deviceMonitoringService = require('./services/deviceMonitoringService');
const EnhancedLoggingService = require('./services/enhancedLoggingService');
const ESP32CrashMonitor = require('./services/esp32CrashMonitor'); // Import ESP32 crash monitor service
const offlineCleanupService = require('./services/offlineCleanupService');
// Import integration services
const rssService = require('./services/rssService');
const socialMediaService = require('./services/socialMediaService');
const weatherService = require('./services/weatherService');
const webhookService = require('./services/webhookService');
const databaseService = require('./services/databaseService');
// Removed legacy DeviceSocketService/TestSocketService/ESP32SocketService for cleanup

// Initialize ESP32 crash monitoring
const crashMonitor = new ESP32CrashMonitor();
crashMonitor.start();

// --- SOCKET.IO SERVER SETUP ---
// Remove duplicate setup. Use the main app/server/io instance below.
// ...existing code...

// --- MongoDB Connection with retry logic and fallback ---
let dbConnected = false;
const connectDB = async (retries = 5) => {
  const primaryUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/autovolt';
  console.log('Connecting to MongoDB:', primaryUri);
  const fallbackUri = process.env.MONGODB_URI_FALLBACK || process.env.MONGODB_URI_DIRECT; // optional
  const opts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 4000,
    socketTimeoutMS: 45000,
    directConnection: primaryUri.startsWith('mongodb://') ? true : undefined,
  };
  try {
    await mongoose.connect(primaryUri, opts);
    dbConnected = true;
    logger.info('Connected to MongoDB');
    try {
      await createAdminUser();
    } catch (adminError) {
      logger.error('Admin user creation error:', adminError);
    }
    // Initialize schedule service after DB connection
    logger.info('[DEBUG] About to initialize schedule service...');
    try {
      await scheduleService.initialize();
      logger.info('[DEBUG] Schedule service initialization completed');
    } catch (scheduleError) {
      logger.error('Schedule service initialization error:', scheduleError);
    }
  } catch (err) {
    const msg = err && (err.message || String(err));
    logger.error('MongoDB connection error (continuing in LIMITED MODE):', msg);
    // If SRV lookup fails or DNS issues occur and a fallback URI is provided, try it once per attempt
    const isSrvIssue = /querySrv|ENOTFOUND|ECONNREFUSED|EAI_AGAIN/i.test(msg || '');
    if (fallbackUri && isSrvIssue) {
      try {
        logger.warn('Trying fallback MongoDB URI...');
        await mongoose.connect(fallbackUri, {
          ...opts,
          directConnection: true,
        });
        dbConnected = true;
        logger.info('Connected to MongoDB via fallback URI');
        try { await createAdminUser(); } catch (adminError) { logger.error('Admin user creation error:', adminError); }
        // Initialize schedule service after DB connection
        try {
          await scheduleService.initialize();
        } catch (scheduleError) {
          logger.error('Schedule service initialization error:', scheduleError);
        }
        return;
      } catch (fallbackErr) {
        logger.error('Fallback MongoDB URI connection failed:', fallbackErr.message || fallbackErr);
      }
    }
    if (retries > 0) {
      logger.info(`Retrying connection... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectDB(retries - 1);
    } else {
      logger.warn('MongoDB not connected. API running in LIMITED MODE (DB-dependent routes may fail).');
    }
  }
};

connectDB().catch(() => { });

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB error:', err);
});

const app = express();
const server = http.createServer(app);

// Make MQTT client available to routes
app.set('mqttClient', mqttClient);

// Add request logging to the HTTP server
server.on('request', (req, res) => {
  logger.info(`[HTTP Server] ${req.method} ${req.url}`);
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Manual preflight handler (before cors) to guarantee PATCH visibility
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    // Allow all LAN origins for development
    const devOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
      'http://172.16.3.171:5173', // Windows network IP
      'http://172.16.3.171:5174', // Windows network IP
      'http://172.16.3.171:5175', // Windows network IP
      `http://${require('os').networkInterfaces()['en0']?.find(i => i.family === 'IPv4')?.address}:5173`, // Mac WiFi
      `http://${require('os').networkInterfaces()['eth0']?.find(i => i.family === 'IPv4')?.address}:5173`, // Ethernet
      'http://192.168.1.100:5173', // Example extra network host
      '*'
    ];
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [process.env.FRONTEND_URL || 'https://your-frontend-domain.com']
      : devOrigins;
    const origin = req.headers.origin;
    if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Vary', 'Origin');
    } else {
      // Allow cross-origin requests from localhost and 127.0.0.1
      if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      }
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, User-Agent, DNT, Cache-Control, X-Mx-ReqToken, Keep-Alive, X-Requested-With, If-Modified-Since, X-CSRF-Token');
    // Silenced verbose preflight logging
    return res.status(204).end();
  }
  next();
});

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins for network access in development
    if (process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      // In production, restrict origins
      const allowedOrigins = [process.env.FRONTEND_URL || 'https://your-frontend-domain.com'];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'User-Agent', 'DNT', 'Cache-Control', 'X-Mx-ReqToken', 'Keep-Alive', 'X-Requested-With', 'If-Modified-Since', 'X-CSRF-Token', 'access-control-allow-origin', 'access-control-allow-headers', 'access-control-allow-methods']
}));

// Body parser (single instance)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log all requests (moved after body parser)
app.use((req, res, next) => {
  logger.info(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  logger.debug('Headers:', JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    logger.debug('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Serve static files for uploads with CORS headers
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for static files
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Initialize main Socket.IO instance

// Initialize main Socket.IO instance
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow all origins for network access in development
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        const allowedOrigins = [process.env.FRONTEND_URL || 'https://your-frontend-domain.com'];
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'User-Agent', 'DNT', 'Cache-Control', 'X-Mx-ReqToken', 'Keep-Alive', 'X-Requested-With', 'If-Modified-Since', 'X-CSRF-Token', 'access-control-allow-origin', 'access-control-allow-headers', 'access-control-allow-methods']
  },
  // More conservative WebSocket settings to prevent frame corruption
  perMessageDeflate: false, // Disable compression to avoid frame issues
  httpCompression: false, // Disable HTTP compression
  // Force polling initially, allow WebSocket upgrade
  transports: ['polling', 'websocket'],
  // More conservative timeouts and buffer sizes
  pingTimeout: 60000, // 60 seconds (increased)
  pingInterval: 25000, // 25 seconds (increased)
  upgradeTimeout: 30000, // 30 seconds (increased)
  maxHttpBufferSize: 1e6, // 1MB (reduced from 100MB)
  // Connection stability settings
  allowEIO3: true,
  forceNew: false, // Don't force new connections
  // Additional stability options
  connectTimeout: 45000, // 45 seconds (increased)
  timeout: 45000, // 45 seconds (increased)
  // Disable WebSocket upgrade initially to avoid frame issues
  allowUpgrades: true,
  cookie: false,
  // Add session handling
  allowRequest: (req, callback) => {
    // Allow all requests in development
    callback(null, true);
  }
});

io.engine.on('connection_error', (err) => {
  logger.error('[engine] connection_error', {
    code: err.code,
    message: err.message,
    context: err.context,
    type: err.type,
    description: err.description
  });
});

// Make MQTT client available globally for services
global.mqttClient = mqttClient;

// Log unexpected upgrade attempts that may corrupt websocket frames
server.on('upgrade', (req, socket, head) => {
  const url = req.url || '';
  if (url.startsWith('/socket.io/')) {
    logger.info('[upgrade] Socket.IO upgrade request', {
      url,
      headers: req.headers,
      remoteAddress: req.socket.remoteAddress
    });
    return; // Let Socket.IO handle this
  }
  if (url.startsWith('/esp32-ws')) {
    logger.info('[upgrade] ESP32 WebSocket upgrade request', {
      url,
      headers: req.headers,
      remoteAddress: req.socket.remoteAddress
    });
    return; // Let WebSocketServer handle this
  }
  logger.warn('[upgrade] unexpected websocket upgrade path', { url });
  // Do not write to socket, just let it close if not handled
});

// Additional low-level Engine.IO diagnostics to help trace "Invalid frame header" issues
// These logs are lightweight and only emit on meta events (not every packet) unless NODE_ENV=development
if (process.env.NODE_ENV === 'development') {
  io.engine.on('initial_headers', (headers, req) => {
    logger.info('[engine] initial_headers', {
      ua: req.headers['user-agent'],
      url: req.url,
      transport: req._query && req._query.transport,
      sid: req._query && req._query.sid
    });
  });
  io.engine.on('headers', (headers, req) => {
    // This fires on each HTTP long-polling request; keep it quiet in production
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[engine] headers', {
        transport: req._query && req._query.transport,
        sid: req._query && req._query.sid,
        upgrade: req._query && req._query.upgrade
      });
    }
  });
} else {
  // In production, only log connection events, not every polling request
  io.engine.on('initial_headers', () => {});
  io.engine.on('headers', () => {});
}
io.engine.on('connection', (rawSocket) => {
  logger.info('[engine] connection', {
    id: rawSocket.id,
    transport: rawSocket.transport ? rawSocket.transport.name : 'unknown',
    remoteAddress: rawSocket.request?.socket?.remoteAddress
  });
  rawSocket.on('upgrade', (newTransport) => {
    logger.info('[engine] transport upgrade', {
      id: rawSocket.id,
      from: rawSocket.transport ? rawSocket.transport.name : 'unknown',
      to: newTransport && newTransport.name
    });
  });
  rawSocket.on('transport', (t) => {
    logger.info('[engine] transport set', {
      id: rawSocket.id,
      transport: t && t.name
    });
  });
  rawSocket.on('close', (reason) => {
    logger.info('[engine] connection closed', {
      id: rawSocket.id,
      reason
    });
  });
  rawSocket.on('error', (error) => {
    logger.error('[engine] socket error', {
      id: rawSocket.id,
      error: error.message,
      transport: rawSocket.transport ? rawSocket.transport.name : 'unknown'
    });
  });
});

// (Removed old namespace socket services)

// Rate limiting - Very permissive for development
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production'
    ? (parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100)  // 100 requests per minute in production
    : 1000000,  // Essentially unlimited in development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting only in production
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', limiter);
}

// (removed duplicate simple health route; see consolidated one below)

// Mount routes with rate limiting
const apiRouter = express.Router();

// Apply rate limiting only to sensitive auth mutation endpoints (not profile)
apiRouter.use('/auth/register', authLimiter);
apiRouter.use('/auth/login', authLimiter);
apiRouter.use('/auth/forgot-password', authLimiter);
apiRouter.use('/auth/reset-password', authLimiter);
apiRouter.use('/auth', authRoutes);

// Apply API rate limiting to other routes
apiRouter.use('/helper', apiLimiter, require('./routes/helper'));
apiRouter.use('/devices', apiLimiter, deviceRoutes);
apiRouter.use('/device-api', apiLimiter, deviceApiRoutes);
apiRouter.use('/esp32', apiLimiter, esp32Routes);
apiRouter.use('/schedules', apiLimiter, scheduleRoutes);
apiRouter.use('/users', apiLimiter, userRoutes);
apiRouter.use('/activities', apiLimiter, activityRoutes);
apiRouter.use('/activity-logs', apiLimiter, activityLogRoutes);
apiRouter.use('/logs', apiLimiter, logsRoutes);
apiRouter.use('/system-health', apiLimiter, auth, authorize('admin', 'super-admin'), systemHealthRoutes);
apiRouter.use('/analytics', apiLimiter, require('./routes/analytics'));
apiRouter.use('/aiml', apiLimiter, aimlRoutes);
apiRouter.use('/settings', apiLimiter, settingsRoutes);
apiRouter.use('/tickets', apiLimiter, ticketRoutes);
apiRouter.use('/device-permissions', apiLimiter, devicePermissionRoutes);
apiRouter.use('/device-categories', apiLimiter, deviceCategoryRoutes);
apiRouter.use('/class-extensions', apiLimiter, classExtensionRoutes);
apiRouter.use('/role-permissions', apiLimiter, require('./routes/rolePermissions'));
apiRouter.use('/notices', apiLimiter, require('./routes/notices'));
apiRouter.use('/boards', apiLimiter, require('./routes/boards'));
apiRouter.use('/content', apiLimiter, require('./routes/contentScheduler'));
apiRouter.use('/integrations', apiLimiter, require('./routes/integrations'));

// Mount all routes under /api
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbConnected ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/api', apiRouter);

// Public webhook routes (no authentication required)
app.use('/webhooks', require('./routes/publicWebhooks'));

// Optional same-origin static serving (set SERVE_FRONTEND=1 after building frontend into ../dist)
try {
  if (process.env.SERVE_FRONTEND === '1') {
    const distPath = path.join(__dirname, '..', 'dist');
    const fs = require('fs');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('/', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
      logger.info('[static] Serving frontend dist/ assets same-origin');
    } else {
      logger.warn('[static] SERVE_FRONTEND=1 but dist folder not found at', distPath);
    }
  }
} catch (e) {
  logger.error('[static] error enabling same-origin serving', e.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}


// Create default admin user
const createAdminUser = async () => {
  try {
    const User = require('./models/User');
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (!existingAdmin) {
      // IMPORTANT: Provide the plain password here so the pre-save hook hashes it ONCE.
      // Previously this code hashed manually AND the pre-save hook re-hashed, breaking login.
      await User.create({
        name: process.env.ADMIN_NAME || 'System Administrator',
        email: process.env.ADMIN_EMAIL || 'admin@company.com',
        password: process.env.ADMIN_PASSWORD || 'admin123456',
        role: 'admin',
        department: 'IT Department',
        accessLevel: 'full'
      });
      logger.info('Default admin user created (single-hash)');
    }
  } catch (error) {
    logger.error('Error creating admin user:', error);
  }
};

// Socket.IO for real-time updates with additional diagnostics
// io.engine.on('connection_error', (err) => {
//   logger.error('[socket.io engine connection_error]', {
//     code: err.code,
//     message: err.message,
//     context: err.context
//   });
// });

io.on('connection', (socket) => {
  logger.info('Client connected:', socket.id);
  // Emit a hello for quick handshake debug
  socket.emit('server_hello', { ts: Date.now() });

  // Join user-specific room if authenticated
  if (socket.handshake.auth && socket.handshake.auth.token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
      if (decoded && decoded.id) {
        socket.join(`user_${decoded.id}`);
        logger.info(`Socket ${socket.id} joined user room: user_${decoded.id}`);
      }
    } catch (error) {
      logger.warn(`Failed to join user room for socket ${socket.id}:`, error.message);
    }
  }

  socket.on('join-room', (room) => {
    try {
      socket.join(room);
      logger.info(`Socket ${socket.id} joined room ${room}`);
    } catch (e) {
      logger.error('[join-room error]', e.message);
    }
  });

  socket.on('ping_test', (cb) => {
    if (typeof cb === 'function') cb({ pong: Date.now() });
  });

  // Handle individual switch commands from frontend
  socket.on('switch_intent', async (data) => {
    console.log('[DEBUG] switch_intent handler called with:', data);
    try {
      console.log('[SOCKET] Received switch_intent:', data);
      const { deviceId, switchId, gpio, desiredState, ts } = data;

      if (!deviceId || gpio === undefined || desiredState === undefined) {
        console.warn('[SOCKET] Invalid switch_intent data:', data);
        return;
      }

      // Get device from database to find MAC address
      const Device = require('./models/Device');
      const device = await Device.findById(deviceId).select('+deviceSecret');

      if (!device || !device.macAddress) {
        console.warn('[SOCKET] Device not found or no MAC address:', deviceId);
        return;
      }

      // Send MQTT command to ESP32 (JSON format)
      const command = {
        mac: device.macAddress, // Include MAC address
        secret: device.deviceSecret, // Include device secret for authentication
        gpio: gpio,
        state: desiredState
      };

      const message = JSON.stringify(command);
      console.log('[DEBUG] About to publish MQTT message:', message);
      const result = mqttClient.publish('esp32/switches', message);
      console.log('[DEBUG] MQTT publish result:', result);
      console.log('[MQTT] Sent switch command to ESP32:', device.macAddress, command);

    } catch (error) {
      console.error('[SOCKET] Error processing switch_intent:', error.message);
    }
  });

  // Handle bulk switch commands from frontend
  socket.on('bulk_switch_intent', async (data) => {
    try {
      console.log('[SOCKET] Received bulk_switch_intent:', data);
      const { desiredState, deviceIds, filter, ts } = data;

      if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
        console.warn('[SOCKET] Invalid bulk_switch_intent data:', data);
        return;
      }

      // Get devices from database
      const Device = require('./models/Device');
      const devices = await Device.find({ _id: { $in: deviceIds } }).select('+deviceSecret');

      if (!devices || devices.length === 0) {
        console.warn('[SOCKET] No devices found for bulk operation:', deviceIds);
        return;
      }

      // Send MQTT commands to each device
      let commandCount = 0;
      for (const device of devices) {
        if (!device.macAddress) continue;

        // For bulk operations, we need to determine which switches to toggle
        // This depends on the filter (type, location, etc.)
        let switchesToToggle = [];

        if (filter && filter.type) {
          // Toggle all switches of a specific type
          switchesToToggle = device.switches.filter(s => s.type === filter.type);
        } else if (filter && filter.location) {
          // Toggle all switches in a specific location
          switchesToToggle = device.switches.filter(s => s.location === filter.location);
        } else {
          // Toggle all switches on the device
          switchesToToggle = device.switches;
        }

        // Send MQTT command for each switch
        for (const switchInfo of switchesToToggle) {
          const command = {
            mac: device.macAddress, // Include MAC address
            secret: device.deviceSecret, // Include device secret for authentication
            gpio: switchInfo.gpio,
            state: desiredState
          };

          const message = JSON.stringify(command);
          mqttClient.publish('esp32/switches', message);
          commandCount++;
          console.log('[MQTT] Sent bulk switch command to ESP32:', device.macAddress, command);
        }
      }

      console.log(`[MQTT] Sent ${commandCount} bulk switch commands to ${devices.length} devices`);

    } catch (error) {
      console.error('[SOCKET] Error processing bulk_switch_intent:', error.message);
    }
  });

  socket.on('disconnect', (reason) => {
    logger.info('Client disconnected:', socket.id, 'reason:', reason);
  });
});

// Make io accessible to routes and globally (for services without req)
app.set('io', io);
global.io = io;

// Initialize Socket Service for user tracking
const SocketService = require('./services/socketService');
const socketService = new SocketService(io);
io.socketService = socketService;

// Expose sequence-aware emitter to controllers
app.set('emitDeviceStateChanged', emitDeviceStateChanged);



// Offline detection every 60s (mark devices offline if stale)
setInterval(async () => {
  try {
    const Device = require('./models/Device');

    // Use consistent 2-minute threshold to match monitoring service
    const thresholdSeconds = 120; // 2 minutes (consistent with monitoring service)
    const cutoff = Date.now() - (thresholdSeconds * 1000);

    const stale = await Device.find({ lastSeen: { $lt: new Date(cutoff) }, status: { $ne: 'offline' } });
    for (const d of stale) {
      d.status = 'offline';
      await d.save();
      emitDeviceStateChanged(d, { source: 'offline-scan' });
      logger.info(`[offline-scan] marked device offline: ${d.macAddress} (lastSeen: ${d.lastSeen})`);
    }

    if (stale.length > 0) {
      logger.info(`[offline-scan] marked ${stale.length} devices as offline`);
    }
  } catch (e) {
    logger.error('[offline-scan] error', e.message);
  }
}, 60000);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.send('Server is running!');
});

// Global error handling middleware
app.use((error, req, res, next) => {
  // Log the error
  logger.error('Global error handler:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user ? req.user.id : 'unauthenticated'
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Handle different types of errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: isDevelopment ? error.message : 'Invalid input data',
      details: isDevelopment ? error.errors : undefined
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID',
      message: isDevelopment ? error.message : 'Invalid resource ID'
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate Entry',
      message: 'Resource already exists'
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    error: 'Internal Server Error',
    message: isDevelopment ? error.message : 'Something went wrong',
    ...(isDevelopment && { stack: error.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.info('404 handler reached for:', req.method, req.url);
  res.status(404).json({ message: 'Route not found' });
});

// Start the server (single attempt)
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Listen on all network interfaces (allows network access)
if (io && io.opts) {
  io.opts.cors = {
    origin: '*', // You can restrict this to your frontend URLs
    methods: ['GET', 'POST']
  };
}
server.listen(PORT, HOST, () => {
  console.log(`[SERVER] Listen callback executed`);
  console.log(`[DEBUG] Server listening on ${HOST}:${PORT}`);
  console.log(`Server running on ${HOST}:${PORT}`);
  console.log(`Server accessible on localhost:${PORT} and all network interfaces`);
  console.log(`Environment: ${process.env.NODE_ENV}`);

  // Debug: Check if server is actually listening
  console.log(`[DEBUG] Server address:`, server.address());

  // Connect to database after server starts
  logger.info('[DEBUG] About to call connectDB...');
  connectDB().catch(() => { });

  // Start enhanced services after successful startup
  setTimeout(async () => {
    // Only initialize metrics if not running tests
    if (process.env.NODE_ENV !== 'test') {
      try {
        // const metricsService = require('./metricsService');
        // (async () => {
        //   await metricsService.initializeMetrics();
        // })();
        console.log('Metrics service disabled for debugging');
      } catch (error) {
        console.error('Error initializing metrics service:', error);
      }
    }

    // Start device monitoring service (5-minute checks)
    // const deviceMonitoringService = require('./services/deviceMonitoringService');
    // deviceMonitoringService.start();
    console.log('Device monitoring service disabled for debugging');

    // Initialize content scheduler service
    try {
      // (async () => {
      //   await contentSchedulerService.initialize();
      // })();
      // console.log('[SERVICES] Content scheduler service started');
      console.log('Content scheduler service disabled for debugging');
    } catch (error) {
      console.error('Error initializing content scheduler service:', error);
    }

    // Start offline cleanup service
    try {
      offlineCleanupService.startCleanupSchedule();
      console.log('[SERVICES] Offline cleanup service started');
    } catch (error) {
      console.error('Error starting offline cleanup service:', error);
    }

    // Initialize integration services
    try {
      await rssService.initialize();
      console.log('[SERVICES] RSS integration service initialized');
    } catch (error) {
      console.error('Error initializing RSS service:', error);
    }

    try {
      await socialMediaService.initialize();
      console.log('[SERVICES] Social media integration service initialized');
    } catch (error) {
      console.error('Error initializing social media service:', error);
    }

    try {
      await weatherService.initialize();
      console.log('[SERVICES] Weather integration service initialized');
    } catch (error) {
      console.error('Error initializing weather service:', error);
    }

    try {
      await webhookService.initialize();
      console.log('[SERVICES] Webhook integration service initialized');
    } catch (error) {
      console.error('Error initializing webhook service:', error);
    }

    try {
      await databaseService.initialize();
      console.log('[SERVICES] Database integration service initialized');
    } catch (error) {
      console.error('Error initializing database service:', error);
    }

    // console.log('[SERVICES] Enhanced logging and monitoring services started');
    console.log('Enhanced services disabled for debugging');
  }, 5000); // Wait 5 seconds for database connection
});

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});



module.exports = { app, io, server };
