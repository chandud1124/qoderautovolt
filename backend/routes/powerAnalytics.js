const express = require('express');
const router = express.Router();
const powerAnalyticsService = require('../services/powerAnalyticsService');
const { auth } = require('../middleware/auth');

// Apply authentication to all routes
router.use(auth);

/**
 * Get current power consumption for a device
 * GET /api/power-analytics/current/:deviceId
 */
router.get('/current/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const currentPower = await powerAnalyticsService.getCurrentPower(deviceId);
    res.json(currentPower);
  } catch (error) {
    console.error('Error getting current power:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Get daily consumption
 * GET /api/power-analytics/daily/:deviceId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/daily/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { startDate, endDate, page, limit } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    let dailyData = await powerAnalyticsService.getDailyConsumption(deviceId, startDate, endDate);
    
    // Apply pagination if requested
    if (page && limit) {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;
      const total = dailyData.length;
      
      dailyData = dailyData.slice(skip, skip + limitNum);
      
      res.json({
        data: dailyData,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
          hasMore: skip + limitNum < total
        }
      });
    } else {
      res.json(dailyData);
    }
  } catch (error) {
    console.error('Error getting daily consumption:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Get monthly consumption
 * GET /api/power-analytics/monthly/:deviceId?year=YYYY
 */
router.get('/monthly/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { year, page, limit } = req.query;

    if (!year) {
      return res.status(400).json({ error: 'year is required' });
    }

    let monthlyData = await powerAnalyticsService.getMonthlyConsumption(deviceId, parseInt(year));
    
    // Apply pagination if requested
    if (page && limit) {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;
      const total = monthlyData.length;
      
      monthlyData = monthlyData.slice(skip, skip + limitNum);
      
      res.json({
        data: monthlyData,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
          hasMore: skip + limitNum < total
        }
      });
    } else {
      res.json(monthlyData);
    }
  } catch (error) {
    console.error('Error getting monthly consumption:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Get yearly consumption
 * GET /api/power-analytics/yearly/:deviceId?startYear=YYYY&endYear=YYYY
 */
router.get('/yearly/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { startYear, endYear } = req.query;

    if (!startYear || !endYear) {
      return res.status(400).json({ error: 'startYear and endYear are required' });
    }

    const yearlyData = await powerAnalyticsService.getYearlyConsumption(
      deviceId, 
      parseInt(startYear), 
      parseInt(endYear)
    );
    res.json(yearlyData);
  } catch (error) {
    console.error('Error getting yearly consumption:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Get today's hourly consumption
 * GET /api/power-analytics/today-hourly/:deviceId
 */
router.get('/today-hourly/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const hourlyData = await powerAnalyticsService.getTodayHourly(deviceId);
    res.json(hourlyData);
  } catch (error) {
    console.error('Error getting today hourly consumption:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Get classroom consumption
 * GET /api/power-analytics/classroom/:classroom?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/classroom/:classroom', async (req, res) => {
  try {
    const { classroom } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const classroomData = await powerAnalyticsService.getClassroomConsumption(classroom, startDate, endDate);
    res.json(classroomData);
  } catch (error) {
    console.error('Error getting classroom consumption:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Get all devices consumption summary
 * GET /api/power-analytics/all-devices?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/all-devices', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const devicesData = await powerAnalyticsService.getAllDevicesConsumption(startDate, endDate);
    res.json(devicesData);
  } catch (error) {
    console.error('Error getting all devices consumption:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Get cost comparison
 * GET /api/power-analytics/cost-comparison/:deviceId?period=day|week|month
 */
router.get('/cost-comparison/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { period } = req.query;

    const comparison = await powerAnalyticsService.getCostComparison(deviceId, period || 'month');
    res.json(comparison);
  } catch (error) {
    console.error('Error getting cost comparison:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Get peak usage hours
 * GET /api/power-analytics/peak-hours/:deviceId?days=7
 */
router.get('/peak-hours/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { days } = req.query;

    const peakHours = await powerAnalyticsService.getPeakUsageHours(deviceId, parseInt(days) || 7);
    res.json(peakHours);
  } catch (error) {
    console.error('Error getting peak usage hours:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * System health check
 * GET /api/power-analytics/health
 */
router.get('/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const PowerReading = require('../models/PowerReading');
    const Device = require('../models/Device');
    
    // Check database connectivity
    const dbStatus = mongoose.connection.readyState === 1;
    
    // Check recent readings (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentCount = await PowerReading.countDocuments({
      timestamp: { $gte: fiveMinutesAgo }
    });
    
    // Get total readings count
    const totalReadings = await PowerReading.countDocuments();
    
    // Check for stuck/offline devices
    const devices = await Device.find();
    const deviceStatuses = [];
    
    for (const device of devices) {
      const lastReading = await PowerReading.findOne({ deviceId: device._id })
        .sort({ timestamp: -1 })
        .limit(1);
      
      if (lastReading) {
        const minutesAgo = (Date.now() - lastReading.timestamp) / (1000 * 60);
        const status = minutesAgo > 5 ? 'offline' : 'online';
        
        deviceStatuses.push({
          id: device._id,
          name: device.name,
          macAddress: device.macAddress,
          status,
          lastSeen: lastReading.timestamp,
          minutesSinceLastReading: Math.floor(minutesAgo)
        });
      } else {
        deviceStatuses.push({
          id: device._id,
          name: device.name,
          macAddress: device.macAddress,
          status: 'no_data',
          lastSeen: null,
          minutesSinceLastReading: null
        });
      }
    }
    
    const onlineDevices = deviceStatuses.filter(d => d.status === 'online').length;
    const offlineDevices = deviceStatuses.filter(d => d.status === 'offline').length;
    const noDataDevices = deviceStatuses.filter(d => d.status === 'no_data').length;
    
    // Calculate system health score
    let healthScore = 100;
    if (!dbStatus) healthScore -= 50;
    if (recentCount === 0 && onlineDevices > 0) healthScore -= 30;
    if (offlineDevices > devices.length / 2) healthScore -= 20;
    
    const status = healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'degraded' : 'unhealthy';
    
    res.json({
      status,
      healthScore,
      timestamp: new Date().toISOString(),
      database: {
        connected: dbStatus,
        totalReadings,
        recentReadings: recentCount
      },
      devices: {
        total: devices.length,
        online: onlineDevices,
        offline: offlineDevices,
        noData: noDataDevices,
        list: deviceStatuses
      },
      system: {
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
      }
    });
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({
      status: 'unhealthy',
      healthScore: 0,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
