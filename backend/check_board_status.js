const mongoose = require('mongoose');
const Board = require('./models/Board');

async function checkBoardStatus() {
  try {
    await mongoose.connect('mongodb://localhost:27017/autovolt');
    const board = await Board.findById('68db7ae19949ee755662473a');
    console.log('Board status:');
    console.log(`ID: ${board._id}`);
    console.log(`Name: ${board.name}`);
    console.log(`Status: ${board.status}`);
    console.log(`isOnline: ${board.isOnline}`);
    console.log(`Last Seen: ${board.lastSeen}`);
    console.log(`Location: ${board.location}`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkBoardStatus();