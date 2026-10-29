const mongoose = require('mongoose');

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return true;

  if (!process.env.MONGODB_URI) {
    console.log('⚠️ MONGODB_URI .env file mein nahi mila! (bot DB ke baghair chalega)');
    return false;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log('✅ MongoDB successfully connected! 🇦🇱🕷️');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('   Tip: MongoDB Atlas > Network Access mein 0.0.0.0/0 allow karein, aur password sahi check karein.');
    return false;
  }
};

module.exports = connectDB;
