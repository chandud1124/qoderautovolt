// Mock mongoose before any other imports to prevent real DB connections
jest.mock('mongoose', () => {
  const originalMongoose = jest.requireActual('mongoose');
  return {
    ...originalMongoose,
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    connection: {
      ...originalMongoose.connection,
      readyState: 1,
      on: jest.fn(),
      once: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock the MQTT client before any other imports
const mockMqttClient = {
  on: jest.fn(),
  subscribe: jest.fn(),
  publish: jest.fn(),
  end: jest.fn(),
};

jest.mock('mqtt', () => ({
  connect: jest.fn().mockImplementation(() => mockMqttClient),
}));

// Mock TelegramService to prevent it from starting polling and holding tests open
jest.mock('../services/telegramService', () => ({
  initialize: jest.fn().mockResolvedValue(undefined),
  sendMessage: jest.fn().mockResolvedValue(undefined),
  sendAlert: jest.fn().mockResolvedValue(undefined),
}));

// Mock SmartNotificationService to prevent it from starting intervals and holding tests open
jest.mock('../services/smartNotificationService', () => ({
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  setTelegramService: jest.fn(),
}));

// Mock other services that might have timers
jest.mock('../services/powerConsumptionTracker', () => ({
  initialize: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../services/eveningLightsMonitor', () => ({
  start: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../services/afterHoursLightsMonitor', () => ({
  start: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../services/esp32CrashMonitor', () => {
  return jest.fn().mockImplementation(() => {
    return {
      start: jest.fn().mockResolvedValue(undefined),
    };
  });
});
jest.mock('../services/scheduleService', () => ({
  initialize: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../services/deviceMonitoringService', () => ({
  initialize: jest.fn().mockResolvedValue(undefined),
}));

// Enhanced test setup for backend
global.setInterval = jest.fn();
global.clearInterval = jest.fn();
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-testing-only';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/autovolt-test';

// Set a random port to avoid conflicts between test suites
process.env.PORT = Math.floor(Math.random() * 1000) + 4000; // Random port between 4000-5000

// Mock setInterval to prevent open handles in tests
global.originalSetInterval = global.setInterval;
global.setInterval = jest.fn((callback, delay) => {
  // Don't actually set intervals in tests
  return 'mock-interval-id';
});

// Mock clearInterval
global.originalClearInterval = global.clearInterval;
global.clearInterval = jest.fn();

// Mock the secure config for testing
jest.mock('../scripts/secure-config', () => ({
  SecureConfigManager: jest.fn().mockImplementation(() => ({
    loadSecureConfig: jest.fn().mockReturnValue({
      JWT_SECRET: 'test-jwt-secret',
      MONGODB_URI: 'mongodb://localhost:27017/iot_classroom_test',
      ESP32_SECRET_KEY: 'test-esp32-secret'
    })
  }))
}));

// Store server references for cleanup
global.testServers = [];

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeAll(() => {
    console.error = jest.fn();
    console.warn = jest.fn();
    console.log = jest.fn();
});

afterAll(async () => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;

    // Close any servers that were started during tests
    for (const server of global.testServers) {
        if (server && typeof server.close === 'function') {
            await new Promise((resolve) => {
                server.close(resolve);
            });
        }
    }
    global.testServers = [];
});

// Global test utilities
global.testUtils = {
    // Generate test JWT token
    generateTestToken: (userId = 'test-user-id', role = 'student') => {
        const jwt = require('jsonwebtoken');
        return jwt.sign(
            { id: userId, role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
    },

    // Create mock user
    createMockUser: (overrides = {}) => ({
        _id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'student',
        isActive: true,
        isApproved: true,
        ...overrides
    }),

    // Create mock device
    createMockDevice: (overrides = {}) => ({
        _id: 'test-device-id',
        name: 'Test Device',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        ipAddress: '192.168.1.100',
        classroom: 'Test Room',
        type: 'switch',
        status: 'online',
        switches: [{
            _id: 'switch-1',
            name: 'Main Switch',
            gpio: 4,
            state: false
        }],
        ...overrides
    }),

    // Mock response object
    createMockResponse: () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        res.send = jest.fn().mockReturnValue(res);
        return res;
    },

    // Mock request object
    createMockRequest: (body = {}, params = {}, query = {}, user = null) => ({
        body,
        params,
        query,
        user,
        header: jest.fn(),
        get: jest.fn()
    })
};

// Database connection helper for integration tests
global.testDb = {
    connect: async () => {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI);
        }
    },

    disconnect: async () => {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    },

    clear: async () => {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 0) {
            const collections = mongoose.connection.collections;
            for (const key in collections) {
                await collections[key].deleteMany({});
            }
        }
    }
};

// Custom matchers
expect.extend({
    toBeValidJWT(received) {
        const jwt = require('jsonwebtoken');
        try {
            jwt.verify(received, process.env.JWT_SECRET);
            return {
                message: () => `expected ${received} not to be a valid JWT`,
                pass: true
            };
        } catch (error) {
            return {
                message: () => `expected ${received} to be a valid JWT`,
                pass: false
            };
        }
    },

    toHaveStatus(received, expectedStatus) {
        const pass = received.status === expectedStatus;
        return {
            message: () => `expected status ${received.status} to be ${expectedStatus}`,
            pass
        };
    }
});