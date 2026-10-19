import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB } from './config/db';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  process.on('unhandledRejection', (err: Error) => {
    console.error('Unhandled Rejection:', err.message);
    server.close(() => process.exit(1));
  });

  process.on('uncaughtException', (err: Error) => {
    console.error('Uncaught Exception:', err.message);
    process.exit(1);
  });
};

startServer();
