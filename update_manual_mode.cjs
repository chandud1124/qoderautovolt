const { MongoClient } = require('mongodb');

async function updateManualMode() {
  const client = new MongoClient('mongodb://localhost:27017');
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('autovolt');
    const devices = db.collection('devices');

    // Update Computer_Lab to momentary
    const result = await devices.updateOne(
      { name: 'Computer_Lab' },
      { $set: { 'switches.$[].manualMode': 'momentary' } }
    );

    console.log('Update result:', result);

    // Verify
    const device = await devices.findOne({ name: 'Computer_Lab' });
    console.log('Updated device:');
    console.log(`MAC: ${device.macAddress}, Name: ${device.name}`);
    device.switches.forEach((sw, index) => {
      console.log(`  Switch ${index}: GPIO ${sw.gpio}, Manual GPIO ${sw.manualSwitchGpio || 'N/A'}, Manual Mode: ${sw.manualMode}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

updateManualMode();