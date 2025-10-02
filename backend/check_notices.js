const mongoose = require('mongoose');
const Notice = require('./models/Notice');

async function checkNotices() {
  try {
    await mongoose.connect('mongodb://localhost:27017/autovolt');
    const notices = await Notice.find({}).sort({ createdAt: -1 }).limit(5);
    console.log('Recent notices:');
    notices.forEach(notice => {
      console.log(`ID: ${notice._id}, Title: ${notice.title}, Status: ${notice.status}, Target Boards: ${notice.targetBoards.length}`);
      if (notice.targetBoards.length > 0) {
        console.log(`  Board IDs: ${notice.targetBoards.map(tb => tb.boardId).join(', ')}`);
      }
    });
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkNotices();