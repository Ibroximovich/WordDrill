import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateTelegramInitData } from '../lib/telegramAuth';

const router = Router();

// POST /api/users/auth - Authenticate via Telegram WebApp initData
router.post('/auth', async (req: Request, res: Response) => {
  try {
    const { initData } = req.body;

    // Mock user for local development
    if (!initData || initData === 'mock') {
      const mockUser = await prisma.user.upsert({
        where: { telegramId: BigInt(123456789) },
        update: {},
        create: {
          telegramId: BigInt(123456789),
          firstName: 'Test User',
        },
      });
      return res.json({ success: true, user: { ...mockUser, telegramId: mockUser.telegramId.toString() } });
    }

    const userData = validateTelegramInitData(initData, process.env.BOT_TOKEN || '');
    
    if (!userData) {
      return res.status(401).json({ success: false, error: 'Invalid initData' });
    }

    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(userData.id) },
      update: {
        firstName: userData.first_name,
        lastActiveAt: new Date(),
      },
      create: {
        telegramId: BigInt(userData.id),
        firstName: userData.first_name,
      },
    });

    // Update streak
    const updatedUser = await updateStreak(user.id);

    res.json({ 
      success: true, 
      user: { ...updatedUser, telegramId: updatedUser.telegramId.toString() } 
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/users/:id/stats
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const masteredCount = await prisma.userWordProgress.count({
      where: { userId, isMastered: true },
    });

    const dueCount = await prisma.userWordProgress.count({
      where: {
        userId,
        nextReviewAt: { lte: new Date() },
        isMastered: false,
      },
    });

    const totalProgress = await prisma.userWordProgress.count({
      where: { userId },
    });

    res.json({
      user: { ...user, telegramId: user.telegramId.toString() },
      stats: { masteredCount, dueCount, totalProgress },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function updateStreak(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const now = new Date();
  const lastActive = user.lastActiveAt;
  const hoursDiff = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);

  let newStreak = user.streakDays;
  
  if (hoursDiff >= 48) {
    // Streak broken
    newStreak = 1;
  } else if (hoursDiff >= 24) {
    // New day, increment streak
    newStreak = user.streakDays + 1;
  }

  return prisma.user.update({
    where: { id: userId },
    data: { streakDays: newStreak, lastActiveAt: now },
  });
}

export default router;
