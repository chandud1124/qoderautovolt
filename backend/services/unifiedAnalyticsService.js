
const PowerReading = require('../models/PowerReading');
const EnergyConsumption = require('../models/EnergyConsumption');
const Device = require('../models/Device');
const mongoose = require('mongoose');

class UnifiedAnalyticsService {
  /**
   * Get a unified view of daily consumption for a device
   */
  async getUnifiedDailyConsumption(deviceId, startDate, endDate) {
    // 1. Get data from PowerReading
    const powerReadingData = await PowerReading.getDailyAggregation(deviceId, startDate, endDate);

    // 2. Get data from EnergyConsumption
    const energyConsumptionData = await EnergyConsumption.getDeviceConsumption(deviceId, startDate, endDate);

    // 3. Combine and reconcile the data
    const unifiedData = this.reconcileData(powerReadingData, energyConsumptionData);

    return unifiedData;
  }

  /**
   * Reconcile data from PowerReading and EnergyConsumption
   */
  reconcileData(powerReadingData, energyConsumptionData) {
    const dataMap = new Map();

    // Process PowerReading data first
    powerReadingData.forEach(item => {
      dataMap.set(item.date, {
        ...item,
        source: 'PowerReading'
      });
    });

    // Merge EnergyConsumption data
    energyConsumptionData.forEach(item => {
      const date = item.date.toISOString().split('T')[0];
      if (dataMap.has(date)) {
        // If date already exists, you might want to merge or prioritize
        // For now, we'll assume PowerReading is more accurate and skip
      } else {
        dataMap.set(date, {
          date: date,
          totalEnergyKwh: item.totalEnergyKwh,
          totalCost: item.totalCost,
          avgPower: item.avgPower,
          maxPower: item.maxPower,
          readingCount: item.readingCount,
          source: 'EnergyConsumption'
        });
      }
    });

    // Convert map to array and sort by date
    return Array.from(dataMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
  }
}

module.exports = new UnifiedAnalyticsService();
