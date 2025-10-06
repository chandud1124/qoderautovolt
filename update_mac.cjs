const { MongoClient } = require('mongodb');

async function updateDeviceMac() {
  const client = new MongoClient('mongodb://localhost:27017');
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('autovolt');
    const devices = db.collection('devices');

    // Update Computer_Lab with MAC from ESP32 logs
    // Replace '88572179c54c' with the correct MAC for Computer_Lab
    const result = await devices.updateOne(
      { name: 'Computer_Lab' },
      { $set: { mac: '88572179c54c' } }  // Change this MAC if needed
    );

    console.log(`Updated ${result.modifiedCount} device(s)`);

    // Verify the update
    const updatedDevice = await devices.findOne({ name: 'Computer_Lab' });
    console.log('Updated Computer_Lab:', updatedDevice);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

updateDeviceMac();