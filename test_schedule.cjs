// Script to manually test schedule execution
const mongoose = require('mongoose');
const Schedule = require('./backend/models/Schedule');
const scheduleService = require('./backend/services/scheduleService');

async function testSchedule() {
  try {
    await mongoose.connect('mongodb://localhost:27017/autovolt');
    console.log('Connected to MongoDB');

    // Initialize schedule service
    await scheduleService.initialize();

    // Get first enabled schedule
    const schedule = await Schedule.findOne({ enabled: true });
    if (!schedule) {
      console.log('No enabled schedules found');
      process.exit(0);
    }

    console.log(`\nTesting schedule: ${schedule.name}`);
    console.log(`Action: ${schedule.action}`);
    console.log(`Switches: ${schedule.switches.length}`);
    console.log(`\nExecuting schedule now...\n`);

    // Execute the schedule
    await scheduleService.executeSchedule(schedule);

    console.log('\n✓ Schedule execution completed');
    console.log('Check the backend logs and ESP32 serial monitor for results');

    setTimeout(() => {
      mongoose.connection.close();
      process.exit(0);
    }, 2000);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testSchedule();
