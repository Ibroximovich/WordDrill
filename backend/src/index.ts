import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma';
import { startBot } from './bot';
import { startCronJobs } from './cron';
import userRoutes from './routes/users';
import unitRoutes from './routes/units';
import progressRoutes from './routes/progress';
import ttsRoutes from './routes/tts';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.WEBAPP_URL || '*',
  credentials: true,
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/tts', ttsRoutes);

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 WordDrill API running on port ${PORT}`);
  
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
  }

  if (process.env.BOT_TOKEN && process.env.BOT_TOKEN !== 'your_telegram_bot_token_here') {
    startBot();
    startCronJobs();
  } else {
    console.log('⚠️  BOT_TOKEN not set, skipping bot and cron initialization');
  }
});

export default app;
