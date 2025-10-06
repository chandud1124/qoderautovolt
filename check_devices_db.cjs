const { MongoClient } = require('mongodb');

async function checkDevices() {
  const client = new MongoClient('mongodb://localhost:27017');
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('autovolt');
    const devices = db.collection('devices');

    const deviceList = await devices.find({}).toArray();

    console.log('Devices in database:');
    deviceList.forEach(device => {
      console.log(`MAC: ${device.mac}, Name: ${device.name || 'N/A'}`);
      if (device.switches) {
        device.switches.forEach((sw, index) => {
          console.log(`  Switch ${index}: GPIO ${sw.gpio}, Manual GPIO ${sw.manualGpio || 'N/A'}, Manual Mode: ${sw.manualMode || 'N/A'}`);
        });
      } else {
        console.log('  No switches configured');
      }
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkDevices();
