// Test script to manually trigger schedule execution and test MQTT command sending
require('dotenv').config();
const mongoose = require('mongoose');
const Schedule = require('./models/Schedule');
const Device = require('./models/Device');

// Import the schedule service
const scheduleService = require('./services/scheduleService');

async function testScheduleTrigger() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/autovolt', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Initialize schedule service
    await scheduleService.initialize();
    console.log('Schedule service initialized');

    // Wait a bit for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get first active schedule
    const schedule = await Schedule.findOne({ active: true });
    if (!schedule) {
      console.log('No active schedules found');
      process.exit(0);
    }

    console.log(`Found schedule: ${schedule.name}`);
    console.log(`Executing schedule...`);

    // Execute the schedule
    await scheduleService.executeSchedule(schedule);

    console.log('Schedule execution completed');
    console.log('Waiting 5 seconds for MQTT commands to be sent...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Test completed');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testScheduleTrigger();
