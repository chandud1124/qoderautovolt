const mongoose = require('mongoose');
const Device = require('./models/Device');

async function checkDeviceStatus() {
  try {
    await mongoose.connect('mongodb://localhost:27017/autovolt');

    const device = await Device.findOne({ name: 'Test Device4' });
    if (!device) {
      console.log('Device not found');
      return;
    }

    const now = new Date();
    const timeSinceLastSeen = device.lastSeen ? now - device.lastSeen : Infinity;
    const isOnline = timeSinceLastSeen < (1 * 60 * 1000); // 1 minute timeout

    console.log('Current device status:', {
      name: device.name,
      status: device.status,
      lastSeen: device.lastSeen,
      timeSinceLastSeen: Math.floor(timeSinceLastSeen / 1000) + ' seconds',
      isOnline: isOnline,
      shouldBeStatus: isOnline ? 'online' : 'offline'
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDeviceStatus();