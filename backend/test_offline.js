const mongoose = require('mongoose');
const Device = require('./models/Device');

async function simulateOfflineDevice() {
  try {
    await mongoose.connect('mongodb://localhost:27017/autovolt');

    const device = await Device.findOne({ name: 'Test Device4' });
    if (!device) {
      console.log('Device not found');
      return;
    }

    console.log('Before:', {
      name: device.name,
      status: device.status,
      lastSeen: device.lastSeen
    });

    // Set lastSeen to 2 minutes ago
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    await Device.findByIdAndUpdate(device._id, { lastSeen: twoMinutesAgo });

    const updated = await Device.findById(device._id);
    console.log('After setting lastSeen to 2 minutes ago:', {
      name: updated.name,
      status: updated.status,
      lastSeen: updated.lastSeen
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

simulateOfflineDevice();