const mongoose = require('mongoose');

async function getDevices() {
  try {
    await mongoose.connect('mongodb://localhost:27017/autovolt');
    console.log('Connected to MongoDB');

    const Device = mongoose.model('Device', new mongoose.Schema({
      name: String,
      macAddress: String,
      deviceType: String,
      classroom: String
    }));

    const devices = await Device.find({});
    console.log('\n=== REGISTERED DEVICES ===');
    devices.forEach((device, index) => {
      console.log(`${index + 1}. ${device.name}`);
      console.log(`   MAC: ${device.macAddress}`);
      console.log(`   Type: ${device.deviceType}`);
      console.log(`   Classroom: ${device.classroom || 'Not assigned'}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

getDevices();