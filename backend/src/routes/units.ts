import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/units - Get all units with word counts
router.get('/', async (req: Request, res: Response) => {
  try {
    const units = await prisma.unit.findMany({
      orderBy: [{ bookNumber: 'asc' }, { unitNumber: 'asc' }],
      include: {
        _count: { select: { words: true } },
      },
    });

    res.json({ units });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/units/:id/words - Get words for a unit with user progress
router.get('/:id/words', async (req: Request, res: Response) => {
  try {
    const unitId = parseInt(req.params.id);
    const userId = parseInt(req.query.userId as string);

    const words = await prisma.word.findMany({
      where: { unitId },
      include: userId
        ? {
            progress: {
              where: { userId },
            },
          }
        : undefined,
    });

    // Get 4 random options for quiz from all words
    const allWords = await prisma.word.findMany({
      select: { english: true },
    });

    const wordsWithOptions = words.map((word) => {
      const correctAnswer = word.english;
      const otherOptions = allWords
        .map((w) => w.english)
        .filter((e) => e !== correctAnswer)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      
      const options = [...otherOptions, correctAnswer].sort(() => Math.random() - 0.5);
      
      return {
        ...word,
        options,
        progress: (word as any).progress?.[0] || null,
      };
    });

    res.json({ words: wordsWithOptions });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to get due review words for a user
export async function getDueWords(userId: number) {
  const now = new Date();
  const dueProgress = await prisma.userWordProgress.findMany({
    where: {
      userId,
      nextReviewAt: { lte: now },
      isMastered: false,
      // Only words actually studied in lessons (stage > 0 or has mistakes)
      OR: [
        { srsStage: { gt: 0 } },
        { mistakeCount: { gt: 0 } },
      ],
    },
    include: {
      word: {
        include: { unit: true },
      },
    },
    orderBy: { nextReviewAt: 'asc' },
  });

  const allWords = await prisma.word.findMany({
    select: { english: true },
  });

  const reviewWords = dueProgress.map((p) => {
    const correctAnswer = p.word.english;
    const otherOptions = allWords
      .map((w) => w.english)
      .filter((e) => e !== correctAnswer)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const options = [...otherOptions, correctAnswer].sort(() => Math.random() - 0.5);

    return {
      progressId: p.id,
      word: p.word,
      mistakeCount: p.mistakeCount,
      srsStage: p.srsStage,
      nextReviewAt: p.nextReviewAt,
      options,
    };
  });

  return { reviewWords, count: reviewWords.length };
}

// GET /api/units/review/due - Get due words for review
router.get('/review/due', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.query.userId as string);
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await getDueWords(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/units/review - Alias for review
router.get('/review', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.query.userId as string);
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await getDueWords(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
