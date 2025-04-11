import mongoose from 'mongoose';
import colors from 'colors';

const connectDB = async (uri) => {
  try {
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000, // Timeout after 15 seconds
      socketTimeoutMS: 45000, // Socket timeout after 45 seconds
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10,
    });

    console.log(colors.green.bold(`✅ MongoDB Connected: ${conn.connection.host}`));
    return conn;
  } catch (error) {
    console.error(colors.red.bold('❌ MongoDB connection error:'), error.message);
    console.log(colors.yellow('\nTroubleshooting steps:'));
    console.log('1. Check if your IP address is whitelisted in MongoDB Atlas');
    console.log('2. Verify your MongoDB Atlas connection string is correct');
    console.log('3. Ensure your network allows outbound connections to MongoDB Atlas');
    console.log('4. Check if MongoDB Atlas cluster is running and accessible\n');
    process.exit(1);
  }
};

// Handle connection errors after initial connection
mongoose.connection.on('error', (err) => {
  console.error(colors.red.bold('❌ MongoDB connection error:'), err);
});

mongoose.connection.on('disconnected', () => {
  console.log(colors.yellow.bold('⚠️ MongoDB disconnected'));
});

// Handle application termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log(colors.yellow.bold('MongoDB connection closed through app termination'));
    process.exit(0);
  } catch (err) {
    console.error(colors.red.bold('Error during MongoDB connection closure:'), err);
    process.exit(1);
  }
});

export default connectDB; 