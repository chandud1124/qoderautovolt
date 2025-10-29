const ActivityLog = require('../models/ActivityLog');
const Device = require('../models/Device');
const EnergyConsumption = require('../models/EnergyConsumption');
const { logger } = require('../middleware/logger');
const fs = require('fs').promises;
const path = require('path');

/**
 * Power Consumption Tracker Service
 * 
 * Tracks power consumption in real-time when devices are ON and ESP32 is ONLINE
 * Stores data incrementally by:
 * - ESP32 Device
 * - Classroom/Location
 * - Switch Type (light, fan, ac, etc.)
 */

class PowerConsumptionTracker {
  constructor() {
    this.activeSwitches = new Map(); // Track active switches: switchId -> { startTime, power, type, deviceId, ... }
    this.electricityRate = 7.5; // Default: ₹7.5 per kWh (loaded from settings)
    this.devicePowerSettings = {}; // Power consumption by device type
    this.isInitialized = false;
  }

  /**
   * Initialize the tracker - load power settings
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await this.loadPowerSettings();
      logger.info('[PowerTracker] Initialized successfully');
      this.isInitialized = true;
      
      // Reload settings every 30 seconds
      setInterval(() => this.loadPowerSettings(), 30000);
    } catch (error) {
      logger.error('[PowerTracker] Initialization error:', error);
    }
  }

  /**
   * Load power settings from file
   */
  async loadPowerSettings() {
    try {
      const settingsPath = path.join(__dirname, '..', 'data', 'powerSettings.json');
      const data = await fs.readFile(settingsPath, 'utf8');
      const settings = JSON.parse(data);
      
      if (settings.electricityPrice) {
        this.electricityRate = settings.electricityPrice;
      }
      
      if (settings.deviceTypes && Array.isArray(settings.deviceTypes)) {
        settings.deviceTypes.forEach(deviceType => {
          if (deviceType.type && typeof deviceType.powerConsumption === 'number') {
            this.devicePowerSettings[deviceType.type] = deviceType.powerConsumption;
          }
        });
      }
      
      logger.debug('[PowerTracker] Loaded settings:', {
        electricityRate: this.electricityRate,
        deviceTypes: Object.keys(this.devicePowerSettings).length
      });
    } catch (error) {
      logger.warn('[PowerTracker] Using default power settings:', error.message);
    }
  }

  /**
   * Get power consumption for a switch type
   */
  getPowerConsumption(switchName, switchType) {
    const name = (switchName || '').toLowerCase();
    const type = (switchType || '').toLowerCase();
    
    // Priority lookup: type > name keywords
    if (this.devicePowerSettings[type]) {
      return this.devicePowerSettings[type];
    }
    
    // Fallback: lookup by keywords in name
    const powerTable = {
      light: 20, bulb: 20, lamp: 25, led: 15,
      fan: 75, ceiling: 80, exhaust: 60,
      projector: 250, display: 150, monitor: 30,
      ac: 1200, air: 1200, conditioner: 1200,
      outlet: 100, socket: 100
    };
    
    for (const [keyword, power] of Object.entries(powerTable)) {
      if (name.includes(keyword) || type.includes(keyword)) {
        return power;
      }
    }
    
    return 50; // Default: 50W
  }

  /**
   * Track switch turned ON
   * Only tracks if ESP32 device is ONLINE
   */
  async trackSwitchOn(data) {
    const {
      deviceId,
      deviceName,
      macAddress,
      switchId,
      switchName,
      switchType,
      classroom,
      location,
      userId,
      userName,
      triggeredBy = 'user'
    } = data;
    
    try {
      // Check if device is online
      const device = await Device.findById(deviceId).lean();
      if (!device) {
        logger.warn('[PowerTracker] Device not found:', deviceId);
        return null;
      }
      
      if (device.status !== 'online') {
        logger.warn('[PowerTracker] Device offline, not tracking:', deviceName);
        // Still create activity log but mark as offline
        await this.createActivityLog({
          ...data,
          action: switchType === 'manual' ? 'manual_on' : 'on',
          powerConsumption: 0,
          deviceStatus: { isOnline: false }
        });
        return null;
      }
      
      // Get power consumption for this switch
      const powerWatts = this.getPowerConsumption(switchName, switchType);
      
      // Record start time and power
      const trackingData = {
        startTime: new Date(),
        powerWatts,
        switchType: switchType || 'other',
        deviceId,
        deviceName,
        macAddress,
        classroom,
        location,
        switchName
      };
      
      this.activeSwitches.set(switchId, trackingData);
      
      // Create activity log
      await this.createActivityLog({
        deviceId,
        deviceName,
        switchId,
        switchName,
        action: triggeredBy === 'manual_switch' ? 'manual_on' : 'on',
        triggeredBy,
        userId,
        userName,
        classroom,
        location,
        powerConsumption: powerWatts,
        switchType,
        macAddress,
        deviceStatus: { isOnline: true }
      });
      
      logger.info(`[PowerTracker] Started tracking ${switchName} (${powerWatts}W) on ${deviceName}`);
      
      return trackingData;
    } catch (error) {
      logger.error('[PowerTracker] Error tracking switch ON:', error);
      return null;
    }
  }

  /**
   * Track switch turned OFF
   * Calculates and stores consumption from ON to OFF
   */
  async trackSwitchOff(data) {
    const {
      deviceId,
      deviceName,
      macAddress,
      switchId,
      switchName,
      switchType,
      classroom,
      location,
      userId,
      userName,
      triggeredBy = 'user'
    } = data;
    
    try {
      // Get tracking data
      const trackingData = this.activeSwitches.get(switchId);
      
      if (!trackingData) {
        logger.warn('[PowerTracker] Switch was not being tracked:', switchName);
        // Still create activity log
        await this.createActivityLog({
          ...data,
          action: triggeredBy === 'manual_switch' ? 'manual_off' : 'off',
          powerConsumption: 0
        });
        return null;
      }
      
      // Calculate runtime and consumption
      const endTime = new Date();
      const runtimeMs = endTime - trackingData.startTime;
      const runtimeHours = runtimeMs / (1000 * 60 * 60);
      const energyKwh = (trackingData.powerWatts * runtimeHours) / 1000;
      const cost = energyKwh * this.electricityRate;
      
      // Remove from active tracking
      this.activeSwitches.delete(switchId);
      
      // Store consumption data INCREMENTALLY
      await EnergyConsumption.incrementConsumption({
        deviceId: trackingData.deviceId,
        deviceName: trackingData.deviceName,
        macAddress: trackingData.macAddress,
        classroom: trackingData.classroom,
        location: trackingData.location,
        date: trackingData.startTime, // Use start date for accounting
        switchType: trackingData.switchType,
        energyKwh,
        runtimeHours,
        cost,
        electricityRate: this.electricityRate,
        wasOnline: true
      });
      
      // Create activity log
      await this.createActivityLog({
        deviceId,
        deviceName,
        switchId,
        switchName,
        action: triggeredBy === 'manual_switch' ? 'manual_off' : 'off',
        triggeredBy,
        userId,
        userName,
        classroom,
        location,
        powerConsumption: trackingData.powerWatts,
        switchType: trackingData.switchType,
        macAddress,
        duration: runtimeMs / 1000, // seconds
        context: {
          energyKwh,
          cost,
          runtimeHours
        }
      });
      
      logger.info(`[PowerTracker] Recorded ${energyKwh.toFixed(4)}kWh (₹${cost.toFixed(2)}) for ${switchName} on ${deviceName}`);
      
      return {
        energyKwh,
        cost,
        runtimeHours,
        powerWatts: trackingData.powerWatts
      };
    } catch (error) {
      logger.error('[PowerTracker] Error tracking switch OFF:', error);
      return null;
    }
  }

  /**
   * Handle device going offline
   * Stops tracking all switches and records consumption up to offline time
   */
  async handleDeviceOffline(deviceId, macAddress) {
    try {
      logger.info(`[PowerTracker] Device going offline: ${macAddress}`);
      
      const device = await Device.findById(deviceId).lean();
      if (!device) return;
      
      // Find all active switches for this device
      const deviceSwitches = Array.from(this.activeSwitches.entries())
        .filter(([_, data]) => data.deviceId.toString() === deviceId.toString());
      
      // Process each active switch
      for (const [switchId, trackingData] of deviceSwitches) {
        const offlineTime = new Date();
        const runtimeMs = offlineTime - trackingData.startTime;
        const runtimeHours = runtimeMs / (1000 * 60 * 60);
        const energyKwh = (trackingData.powerWatts * runtimeHours) / 1000;
        const cost = energyKwh * this.electricityRate;
        
        // Store consumption up to offline time
        await EnergyConsumption.incrementConsumption({
          deviceId: trackingData.deviceId,
          deviceName: trackingData.deviceName,
          macAddress: trackingData.macAddress,
          classroom: trackingData.classroom,
          location: trackingData.location,
          date: trackingData.startTime,
          switchType: trackingData.switchType,
          energyKwh,
          runtimeHours,
          cost,
          electricityRate: this.electricityRate,
          wasOnline: true
        });
        
        // Create activity log for offline
        await this.createActivityLog({
          deviceId,
          deviceName: device.name,
          switchId,
          switchName: trackingData.switchName,
          action: 'off',
          triggeredBy: 'system',
          classroom: device.classroom,
          location: device.location,
          powerConsumption: trackingData.powerWatts,
          switchType: trackingData.switchType,
          macAddress,
          duration: runtimeMs / 1000,
          deviceStatus: { isOnline: false },
          context: {
            reason: 'device_offline',
            energyKwh,
            cost,
            runtimeHours
          }
        });
        
        // Remove from active tracking
        this.activeSwitches.delete(switchId);
        
        logger.info(`[PowerTracker] Stopped tracking ${trackingData.switchName} due to offline (${energyKwh.toFixed(4)}kWh recorded)`);
      }
    } catch (error) {
      logger.error('[PowerTracker] Error handling device offline:', error);
    }
  }

  /**
   * Create activity log entry
   */
  async createActivityLog(data) {
    try {
      await ActivityLog.create({
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        switchId: data.switchId,
        switchName: data.switchName,
        action: data.action,
        triggeredBy: data.triggeredBy || 'user',
        userId: data.userId,
        userName: data.userName,
        classroom: data.classroom,
        location: data.location,
        timestamp: new Date(),
        powerConsumption: data.powerConsumption,
        switchType: data.switchType,
        macAddress: data.macAddress,
        duration: data.duration,
        deviceStatus: data.deviceStatus,
        context: data.context || {}
      });
    } catch (error) {
      logger.error('[PowerTracker] Error creating activity log:', error);
    }
  }

  /**
   * Get consumption report by classroom
   */
  async getClassroomReport(classroom, startDate, endDate) {
    return await EnergyConsumption.getClassroomConsumption(classroom, startDate, endDate);
  }

  /**
   * Get consumption report by ESP32 device
   */
  async getDeviceReport(deviceId, startDate, endDate) {
    return await EnergyConsumption.getDeviceConsumption(deviceId, startDate, endDate);
  }

  /**
   * Get currently active switches
   */
  getActiveSwitches() {
    const active = [];
    for (const [switchId, data] of this.activeSwitches.entries()) {
      const runtime = (new Date() - data.startTime) / 1000; // seconds
      active.push({
        switchId,
        switchName: data.switchName,
        deviceName: data.deviceName,
        classroom: data.classroom,
        powerWatts: data.powerWatts,
        runtimeSeconds: runtime,
        estimatedCost: ((data.powerWatts * runtime) / (3600 * 1000)) * this.electricityRate
      });
    }
    return active;
  }
}

// Export singleton instance
const powerTracker = new PowerConsumptionTracker();

module.exports = powerTracker;
