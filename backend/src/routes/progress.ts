import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// SRS intervals in hours
const SRS_INTERVALS = [2, 24, 72, 168]; // 2h, 1d, 3d, 7d

function getNextReviewAt(stage: number, hasMistake: boolean): Date {
  const now = new Date();
  
  if (hasMistake) {
    // Reset to 2 hours if mistake
    now.setHours(now.getHours() + 2);
    return now;
  }

  const intervalHours = SRS_INTERVALS[Math.min(stage, SRS_INTERVALS.length - 1)];
  now.setHours(now.getHours() + intervalHours);
  return now;
}

// POST /api/progress/update - Update word progress after review
router.post('/update', async (req: Request, res: Response) => {
  try {
    const { userId, wordId, hasMistake } = req.body;

    if (!userId || !wordId) {
      return res.status(400).json({ error: 'userId and wordId are required' });
    }

    // Get or create progress record
    let progress = await prisma.userWordProgress.findUnique({
      where: { userId_wordId: { userId, wordId } },
    });

    if (!progress) {
      progress = await prisma.userWordProgress.create({
        data: {
          userId,
          wordId,
          mistakeCount: 0,
          srsStage: 0,
          nextReviewAt: new Date(),
          isMastered: false,
        },
      });
    }

    const newMistakeCount = hasMistake ? progress.mistakeCount + 1 : progress.mistakeCount;
    const newStage = hasMistake ? Math.max(0, progress.srsStage - 1) : progress.srsStage + 1;
    const isMastered = !hasMistake && newStage > SRS_INTERVALS.length;
    const nextReviewAt = isMastered ? new Date() : getNextReviewAt(newStage, hasMistake);

    const updated = await prisma.userWordProgress.update({
      where: { id: progress.id },
      data: {
        mistakeCount: newMistakeCount,
        srsStage: Math.min(newStage, SRS_INTERVALS.length),
        nextReviewAt,
        isMastered,
        updatedAt: new Date(),
      },
    });

    res.json({ 
      success: true, 
      progress: updated,
      isMastered,
      nextReviewAt: updated.nextReviewAt,
    });
  } catch (error) {
    console.error('Progress update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/progress/bulk-init - Initialize progress for all words in a unit
router.post('/bulk-init', async (req: Request, res: Response) => {
  try {
    const { userId, unitId } = req.body;

    const words = await prisma.word.findMany({ where: { unitId } });
    
    const progressRecords = await Promise.all(
      words.map((word) =>
        prisma.userWordProgress.upsert({
          where: { userId_wordId: { userId, wordId: word.id } },
          update: {},
          create: {
            userId,
            wordId: word.id,
            nextReviewAt: new Date(),
          },
        })
      )
    );

    res.json({ success: true, initialized: progressRecords.length });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
