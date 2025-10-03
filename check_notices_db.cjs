const mongoose = require('mongoose');
const Notice = require('./backend/models/Notice');

async function checkNotices() {
  try {
    await mongoose.connect('mongodb://localhost:27017/autovolt');
    const allNotices = await Notice.find({});
    const totalCount = allNotices.length;
    const publishedCount = allNotices.filter(n => n.status === 'published').length;
    const pendingCount = allNotices.filter(n => n.status === 'pending').length;
    const approvedCount = allNotices.filter(n => n.status === 'approved').length;

    console.log('=== NOTICE DATABASE STATISTICS ===');
    console.log('Total notices in database:', totalCount);
    console.log('Published notices:', publishedCount);
    console.log('Pending approval:', pendingCount);
    console.log('Approved notices:', approvedCount);

    if (totalCount > 0) {
      console.log('\n=== RECENT NOTICES ===');
      const notices = await Notice.find({}).sort({ createdAt: -1 }).limit(5).select('title status createdAt');
      notices.forEach((notice, index) => {
        console.log(`${index + 1}. ${notice.title} (${notice.status}) - ${notice.createdAt.toLocaleDateString()}`);
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Database connection error:', error.message);
  }
  process.exit(0);
}

checkNotices();