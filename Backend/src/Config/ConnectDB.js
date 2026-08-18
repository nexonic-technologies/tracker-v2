import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config();
mongoose.set("strictPopulate", false);
mongoose.set("strictQuery", false);

const connectDB = async (retries = 5) => {
  if (!process.env.MONGO_URI) {
    console.error('❎MONGO_URI is not defined in environment variables');
    process.exit(1);
  }

  // Connection options for performance optimization
  const options = {
    maxPoolSize: 50,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 30000, // increased for Atlas SRV resolution
    socketTimeoutMS: 45000,
    bufferCommands: true,
    connectTimeoutMS: 30000,
    // family: 4 removed — forces IPv4 and breaks Node.js SRV DNS lookup
    compressors: ['zlib'],
    zlibCompressionLevel: 6
  };

  while (retries) {
    try {
      await mongoose.connect(process.env.MONGO_URI, options);
      console.log('✅MongoDB connected successfully with optimized settings');
      console.log(`📊 Connection pool: min=${options.minPoolSize}, max=${options.maxPoolSize}`);

      // Connection event handlers
      mongoose.connection.on('error', (err) => {
        console.error('❎MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄MongoDB reconnected');
      });

      break;
    } catch (err) {
      console.error(`❎MongoDB connection failed. Retries left: ${retries - 1}`, err.message);
      retries -= 1;
      await new Promise(res => setTimeout(res, 5000)); // wait 5s before retry
    }
  }

  if (!retries) {
    console.error('❎Failed to connect to MongoDB after all retries');
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  // console.log('\n🔄Gracefully shutting down MongoDB connection...');
  await mongoose.connection.close();
  // console.log('✅MongoDB connection closed');
  process.exit(0);
});

export default connectDB;
