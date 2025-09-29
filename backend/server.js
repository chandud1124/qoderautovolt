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

// Initialize MQTT broker using Aedes (simplified)
const aedes = require('aedes')();
const net = require('net');

const MQTT_PORT = 5200;
const mqttServer = net.createServer(aedes.handle);

mqttServer.listen(MQTT_PORT, '0.0.0.0', () => {
  console.log(`[MQTT] Aedes MQTT broker started and listening on 0.0.0.0:${MQTT_PORT}`);
  console.log(`[MQTT] Broker accessible from network: true`);
});

mqttServer.on('error', (err) => {
  console.error('[MQTT] Aedes server error:', err.message);
});

// Aedes event handlers
aedes.on('client', (client) => {
  console.log(`[MQTT] Aedes client connected: ${client.id}`);
});

aedes.on('clientDisconnect', (client) => {
  console.log(`[MQTT] Aedes client disconnected: ${client.id}`);
});

aedes.on('publish', (packet, client) => {
  if (client) {
    console.log(`[MQTT] Aedes message published by ${client.id} on topic: ${packet.topic}`);
  }
});

aedes.on('subscribe', (subscriptions, client) => {
  console.log(`[MQTT] Aedes client ${client.id} subscribed to topics: ${subscriptions.map(s => s.topic).join(', ')}`);
});

// Initialize MQTT client (connects to our own broker) - DISABLED for device communication
// Keeping MQTT broker running for safety/fallback purposes only
/*
setTimeout(() => {
  const mqtt = require('mqtt');
  const mqttClient = mqtt.connect(`mqtt://localhost:${MQTT_PORT}`, {
    clientId: 'backend_server',
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
    protocolVersion: 4,
  });

  mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    mqttClient.subscribe('esp32/state', (err) => {
      if (!err) {
        console.log('Subscribed to esp32/state');
      }
    });
  });

  mqttClient.on('message', (topic, message) => {
    console.log(`Received MQTT message on ${topic}: ${message.toString()}`);
    // Handle ESP32 state updates here
    if (topic === 'esp32/state') {
      // Process state updates
      const states = message.toString().split(',');
      console.log('ESP32 states:', states);
    }
  });

  mqttClient.on('error', (error) => {
    console.error('MQTT connection error:', error);
  });

  // Function to send switch commands via MQTT
  function sendMqttSwitchCommand(relay, state) {
    const message = `${relay}:${state}`;
    mqttClient.publish('esp32/switches', message);
    console.log(`Sent MQTT command: ${message}`);
  }

  // Make MQTT functions available globally
  global.sendMqttSwitchCommand = sendMqttSwitchCommand;
}, 2000); // Wait 2 seconds for server to fully start
*/

console.log('[MQTT] MQTT client disabled for device communication - using WebSocket only');
console.log('[MQTT] MQTT broker kept running for safety/fallback purposes');

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
const { WebSocketServer } = require('ws');
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
const deviceMonitoringService = require('./services/deviceMonitoringService');
const EnhancedLoggingService = require('./services/enhancedLoggingService');
const ESP32CrashMonitor = require('./services/esp32CrashMonitor'); // Import ESP32 crash monitor service
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
    // try {
    //   await scheduleService.initialize();
    // } catch (scheduleError) {
    //   logger.error('Schedule service initialization error:', scheduleError);
    // }
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

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
    try {
      console.log('[SOCKET] Received switch_intent:', data);
      const { deviceId, switchId, gpio, desiredState, ts } = data;

      if (!deviceId || gpio === undefined || desiredState === undefined) {
        console.warn('[SOCKET] Invalid switch_intent data:', data);
        return;
      }

      // Get device from database to find MAC address
      const Device = require('./models/Device');
      const device = await Device.findById(deviceId);

      if (!device || !device.macAddress) {
        console.warn('[SOCKET] Device not found or no MAC address:', deviceId);
        return;
      }

      // Find WebSocket connection for this device
      const macKey = device.macAddress.toUpperCase();
      const ws = global.wsDevices ? global.wsDevices.get(macKey) : null;

      if (!ws) {
        console.warn('[SOCKET] No WebSocket connection found for device:', macKey);
        return;
      }

      // Send command to ESP32
      const command = {
        type: 'switch_command',
        gpio: gpio,
        state: desiredState,
        switchId: switchId,
        ts: ts || Date.now()
      };

      ws.send(JSON.stringify(command));
      console.log('[SOCKET] Sent switch command to ESP32:', macKey, command);

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
      const devices = await Device.find({ _id: { $in: deviceIds } });

      if (!devices || devices.length === 0) {
        console.warn('[SOCKET] No devices found for bulk operation:', deviceIds);
        return;
      }

      // Send commands to each device
      let commandCount = 0;
      for (const device of devices) {
        if (!device.macAddress) continue;

        const macKey = device.macAddress.toUpperCase();
        const ws = global.wsDevices ? global.wsDevices.get(macKey) : null;

        if (!ws) {
          console.warn('[SOCKET] No WebSocket connection found for device:', macKey);
          continue;
        }

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

        // Send command for each switch
        for (const switchInfo of switchesToToggle) {
          const command = {
            type: 'switch_command',
            gpio: switchInfo.gpio,
            state: desiredState,
            switchId: switchInfo._id?.toString(),
            ts: ts || Date.now()
          };

          ws.send(JSON.stringify(command));
          commandCount++;
        }
      }

      console.log(`[SOCKET] Sent ${commandCount} bulk switch commands to ${devices.length} devices`);

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

function emitDeviceStateChanged(device, meta = {}) {
  if (!device) return;
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
  io.emit('device_state_changed', payload);
  // Focused debug log (avoid dumping entire device doc unless explicitly enabled)
  if (process.env.DEVICE_SEQ_LOG === 'verbose') {
    logger.info('[emitDeviceStateChanged]', { deviceId, seq, source: payload.source, note: payload.note });
  } else if (process.env.DEVICE_SEQ_LOG === 'basic') {
    logger.debug('[emitDeviceStateChanged]', { deviceId, seq, source: payload.source });
  }
}

// -----------------------------------------------------------------------------
// Raw WebSocket server for ESP32 devices (simpler than Socket.IO on microcontroller)
const wsDevices = new Map(); // mac -> ws
global.wsDevices = wsDevices;

// --- RAW WEBSOCKET SERVER FOR ESP32 DEVICES ---
const wss = new WebSocketServer({ server, path: '/esp32-ws' });
console.log('Raw WebSocket /esp32-ws endpoint ready');
logger.info('Raw WebSocket /esp32-ws endpoint ready');

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`[ESP32 WS] New connection from ${ip}`);
  logger.info(`[ESP32 WS] New connection from ${ip}`);

  ws.on('message', async (msg) => {
    try {
      const data = JSON.parse(msg);
      console.log(`[ESP32 WS] Received message: ${JSON.stringify(data)}`);
      // Log identify messages and check secret key
      if (data.type === 'identify') {
        console.log(`[ESP32 WS] Identify from MAC: ${data.mac}, secret: ${data.secret}`);
        try {
          const Device = require('./models/Device');
          let device = await Device.findOne({ macAddress: data.mac });

          if (device) {
            // Device exists - verify secret matches stored deviceSecret
            if (device.deviceSecret && device.deviceSecret === data.secret) {
              console.log('[ESP32 WS] >>> Device authenticated successfully!');
            } else if (!device.deviceSecret) {
              // Device exists but no secret stored - store this secret
              device.deviceSecret = data.secret;
              await device.save();
              console.log('[ESP32 WS] >>> Device secret stored and authenticated!');
            } else {
              console.warn(`[ESP32 WS] Invalid secret key for existing device MAC: ${data.mac}`);
              try {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid secret key' }));
              } catch (sendErr) {
                console.error('[ESP32 WS] Error sending error response:', sendErr.message);
              }
              return;
            }
          } else {
            // New device - register it with the provided secret
            console.log('[ESP32 WS] >>> Registering new device with MAC:', data.mac);
            device = new Device({
              name: `ESP32-${data.mac.replace(/:/g, '')}`,
              macAddress: data.mac,
              ipAddress: req.socket.remoteAddress,
              deviceSecret: data.secret,
              status: 'online',
              lastSeen: new Date(),
              deviceType: 'esp32',
              location: 'Unknown', // Will be updated later
              switches: [],
            });
            await device.save();
            console.log(`[ESP32 WS] Registered new device: ${data.mac}`);
          }

          // Store WebSocket connection in global map
          const macKey = data.mac.toUpperCase();
          wsDevices.set(macKey, ws);
          console.log(`[ESP32 WS] Stored WebSocket connection for MAC: ${macKey}`);

          // Update device status to online
          device.status = 'online';
          device.lastSeen = new Date();
          device.ipAddress = req.socket.remoteAddress;
          await device.save();
          console.log(`[ESP32 WS] Updated device online: ${data.mac}`);

          // Send identified response
          try {
            ws.send(JSON.stringify({ type: 'identified', mode: 'online' }));
            console.log(`[ESP32 WS] Sent identified response to MAC: ${data.mac}`);
          } catch (sendErr) {
            console.error('[ESP32 WS] Error sending identified response:', sendErr.message);
          }
        } catch (err) {
          console.error('[ESP32 WS] Error during device authentication:', err.message);
          try {
            ws.send(JSON.stringify({ type: 'error', message: 'Authentication failed' }));
          } catch (sendErr) {
            console.error('[ESP32 WS] Error sending error response:', sendErr.message);
          }
        }
      }
      // Handle heartbeat messages to keep devices online
      else if (data.type === 'heartbeat') {
        console.log(`[ESP32 WS] Heartbeat from MAC: ${data.mac}, uptime: ${data.uptime}s`);
        try {
          const Device = require('./models/Device');
          const device = await Device.findOne({ macAddress: data.mac });

          if (device) {
            // Update lastSeen timestamp and IP address
            device.lastSeen = new Date();
            device.ipAddress = req.socket.remoteAddress;
            // Ensure device stays online if it was marked offline by the scan
            if (device.status === 'offline') {
              device.status = 'online';
              console.log(`[ESP32 WS] Device ${data.mac} back online via heartbeat`);
            }
            await device.save();
            console.log(`[ESP32 WS] Updated heartbeat for device: ${data.mac}`);
          } else {
            console.warn(`[ESP32 WS] Heartbeat from unknown device MAC: ${data.mac}`);
          }
        } catch (err) {
          console.error('[ESP32 WS] Error processing heartbeat:', err.message);
        }
      }
      // Handle state_update messages (device activity)
      else if (data.type === 'state_update') {
        console.log(`[ESP32 WS] State update from MAC: ${data.mac}`);
        try {
          const Device = require('./models/Device');
          const device = await Device.findOne({ macAddress: data.mac });

          if (device) {
            // Update lastSeen timestamp to show device is active
            device.lastSeen = new Date();
            device.ipAddress = req.socket.remoteAddress;
            if (device.status === 'offline') {
              device.status = 'online';
              console.log(`[ESP32 WS] Device ${data.mac} back online via state update`);
            }
            await device.save();
            console.log(`[ESP32 WS] Updated activity for device: ${data.mac}`);
          }
        } catch (err) {
          console.error('[ESP32 WS] Error processing state_update:', err.message);
        }
      }
      // Handle manual_switch messages (device activity)
      else if (data.type === 'manual_switch') {
        console.log(`[ESP32 WS] Manual switch event from MAC: ${data.mac}`);
        try {
          const Device = require('./models/Device');
          const device = await Device.findOne({ macAddress: data.mac });

          if (device) {
            // Update lastSeen timestamp to show device is active
            device.lastSeen = new Date();
            device.ipAddress = req.socket.remoteAddress;
            if (device.status === 'offline') {
              device.status = 'online';
              console.log(`[ESP32 WS] Device ${data.mac} back online via manual switch`);
            }
            await device.save();
            console.log(`[ESP32 WS] Updated activity for device: ${data.mac}`);
          }
        } catch (err) {
          console.error('[ESP32 WS] Error processing manual_switch:', err.message);
        }
      }
      // Log all other messages for debugging
      else {
        console.log('[ESP32 WS] Message:', data);
      }
    } catch (e) {
      console.warn('[ESP32 WS] Invalid message:', msg);
    }
  });

  ws.on('close', async () => {
    console.log(`[ESP32 WS] Connection closed from ${ip}`);
    
    // Remove WebSocket connection from global map
    let disconnectedMac = null;
    for (const [macKey, storedWs] of wsDevices.entries()) {
      if (storedWs === ws) {
        wsDevices.delete(macKey);
        disconnectedMac = macKey;
        console.log(`[ESP32 WS] Removed WebSocket connection for MAC: ${macKey}`);
        break;
      }
    }
    
    // Mark device as offline in database when connection closes
    if (disconnectedMac) {
      try {
        const Device = require('./models/Device');
        const device = await Device.findOne({ macAddress: disconnectedMac.toLowerCase() });
        if (device) {
          device.status = 'offline';
          device.lastSeen = new Date();
          await device.save();
          emitDeviceStateChanged(device, { source: 'websocket-disconnect' });
          console.log(`[ESP32 WS] Marked device offline: ${disconnectedMac}`);
        }
      } catch (err) {
        console.error('[ESP32 WS] Error marking device offline:', err.message);
      }
    }
  });
});


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
if (io && io.opts) {
  io.opts.cors = {
    origin: '*', // You can restrict this to your frontend URLs
    methods: ['GET', 'POST']
  };
}
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] Listen callback executed`);
  console.log(`[DEBUG] Server listening on 0.0.0.0:${PORT}`);
  const host = '0.0.0.0';
  console.log(`Server running on ${host}:${PORT}`);
  console.log(`Server accessible on localhost:${PORT} and network IPs`);
  console.log(`Environment: ${process.env.NODE_ENV}`);

  // Debug: Check if server is actually listening
  console.log(`[DEBUG] Server address:`, server.address());

  // Connect to database after server starts
  connectDB().catch(() => { });

  // Start enhanced services after successful startup
  setTimeout(() => {
    // Initialize metrics service after database connection
    try {
      const metricsService = require('./metricsService');
      (async () => {
        await metricsService.initializeMetrics();
      })();
    } catch (error) {
      console.error('Error initializing metrics service:', error);
    }

    // Start device monitoring service (5-minute checks)
    // deviceMonitoringService.start(); // Temporarily disabled for debugging

    console.log('[SERVICES] Enhanced logging and monitoring services started');
  }, 5000); // Wait 5 seconds for database connection
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

console.log(`[SERVER] server.listen called, PORT=${PORT}`);
module.exports = { app, io, server, mqttServer };

server.on('error', (error) => {
  console.error('Server error:', error);
});

console.log('Server.js file execution completed');

// Keep the process alive
setInterval(() => {
  // Keep-alive ping every 30 seconds
}, 30000);
