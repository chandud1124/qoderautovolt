// Script to fix schedule switch references
const mongoose = require('mongoose');

async function fixSchedules() {
  try {
    await mongoose.connect('mongodb://localhost:27017/autovolt');
    console.log('Connected to MongoDB');

    const Schedule = mongoose.model('Schedule', new mongoose.Schema({}, { strict: false }));
    const Device = mongoose.model('Device', new mongoose.Schema({}, { strict: false }));

    // Get all schedules
    const schedules = await Schedule.find({});
    console.log(`Found ${schedules.length} schedules`);

    for (const schedule of schedules) {
      console.log(`\nChecking schedule: ${schedule.name}`);
      let updated = false;

      // Get unique device IDs from the schedule
      const deviceIds = [...new Set(schedule.switches.map(sw => sw.deviceId.toString()))];
      
      for (const deviceId of deviceIds) {
        const device = await Device.findById(deviceId);
        if (!device) {
          console.log(`  Device ${deviceId} not found`);
          continue;
        }

        console.log(`  Device: ${device.name} (${device.macAddress})`);
        console.log(`  Current switches in device:`);
        device.switches.forEach((sw, idx) => {
          console.log(`    [${idx}] ${sw.name} - ID: ${sw._id} - GPIO: ${sw.gpio}`);
        });

        // Update switch references for this device
        for (let i = 0; i < schedule.switches.length; i++) {
          const switchRef = schedule.switches[i];
          if (switchRef.deviceId.toString() !== deviceId) continue;

          // Check if this switch ID exists in the device
          const switchExists = device.switches.some(sw => sw._id.toString() === switchRef.switchId);
          
          if (!switchExists) {
            console.log(`  ⚠️  Switch ${switchRef.switchId} not found in device`);
            
            // Try to match by index (assuming switches are in the same order)
            const switchIndex = schedule.switches
              .filter(sw => sw.deviceId.toString() === deviceId)
              .indexOf(switchRef);
            
            if (switchIndex >= 0 && switchIndex < device.switches.length) {
              const newSwitchId = device.switches[switchIndex]._id.toString();
              console.log(`  ✓ Updating to: ${newSwitchId} (${device.switches[switchIndex].name})`);
              schedule.switches[i].switchId = newSwitchId;
              updated = true;
            } else {
              console.log(`  ✗ Could not auto-fix (index ${switchIndex} out of range)`);
            }
          } else {
            const sw = device.switches.find(s => s._id.toString() === switchRef.switchId);
            console.log(`  ✓ Switch ${switchRef.switchId} OK (${sw.name})`);
          }
        }
      }

      if (updated) {
        await schedule.save();
        console.log(`✓ Schedule "${schedule.name}" updated successfully`);
      } else {
        console.log(`✓ Schedule "${schedule.name}" is already correct`);
      }
    }

    console.log('\n✓ All schedules checked and fixed');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixSchedules();
