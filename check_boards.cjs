const mongoose = require('mongoose');

async function getBoards() {
  try {
    await mongoose.connect('mongodb://localhost:27017/autovolt');
    console.log('Connected to MongoDB');

    const Board = mongoose.model('Board', new mongoose.Schema({
      name: String,
      type: String,
      location: String,
      status: String
    }));

    const boards = await Board.find({});
    console.log('\n=== REGISTERED BOARDS ===');
    if (boards.length === 0) {
      console.log('No boards registered yet.');
      console.log('You need to create a Raspberry Pi board first.');
    } else {
      boards.forEach((board, index) => {
        console.log(`${index + 1}. ${board.name}`);
        console.log(`   Type: ${board.type}`);
        console.log(`   Location: ${board.location}`);
        console.log(`   Status: ${board.status}`);
        console.log(`   ID: ${board._id}`);
        console.log('');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

getBoards();