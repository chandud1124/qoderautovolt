const mongoose = require('mongoose');
const Board = require('./models/Board');

async function checkBoards() {
  try {
    await mongoose.connect('mongodb://localhost:27017/autovolt');
    const boards = await Board.find({});
    console.log('Boards:');
    boards.forEach(board => {
      console.log(`ID: ${board._id}, Name: ${board.name}, Location: ${board.location}`);
    });
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkBoards();