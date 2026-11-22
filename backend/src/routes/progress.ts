import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// SRS intervals in hours for successful recalls:
// Stage 1: +24h (1 day)
// Stage 2: +72h (3 days)
// Stage 3: +168h (7 days)
// Stage > 3: Mastered!
const SRS_SUCCESS_HOURS = [24, 72, 168];
const MISTAKE_REVIEW_HOURS = 4; // 4 hours if mistake

function getNextReviewAt(stage: number, hasMistake: boolean): Date {
  const now = new Date();
  if (hasMistake) {
    now.setHours(now.getHours() + MISTAKE_REVIEW_HOURS); // +4 hours
    return now;
  }

  // stage is 1-based (Stage 1 = +24h, Stage 2 = +72h, Stage 3 = +168h)
  const stageIndex = Math.max(0, Math.min(stage - 1, SRS_SUCCESS_HOURS.length - 1));
  const intervalHours = SRS_SUCCESS_HOURS[stageIndex];
  now.setHours(now.getHours() + intervalHours);
  return now;
}

// POST /api/progress/update - Update word progress after lesson or review
router.post('/update', async (req: Request, res: Response) => {
  try {
    const { userId, wordId, hasMistake } = req.body;

    if (!userId || !wordId) {
      return res.status(400).json({ error: 'userId and wordId are required' });
    }

    const numUserId = Number(userId);
    const numWordId = Number(wordId);

    // Get or create progress record
    let progress = await prisma.userWordProgress.findUnique({
      where: { userId_wordId: { userId: numUserId, wordId: numWordId } },
    });

    if (!progress) {
      // First time learning this word in lesson
      const initialStage = hasMistake ? 0 : 1;
      const nextReviewAt = getNextReviewAt(initialStage, hasMistake);

      const created = await prisma.userWordProgress.create({
        data: {
          userId: numUserId,
          wordId: numWordId,
          mistakeCount: hasMistake ? 1 : 0,
          srsStage: initialStage,
          nextReviewAt,
          isMastered: false,
        },
      });

      return res.json({
        success: true,
        progress: created,
        isMastered: false,
        nextReviewAt: created.nextReviewAt,
      });
    }

    // Subsequent reviews
    const newMistakeCount = hasMistake ? progress.mistakeCount + 1 : progress.mistakeCount;
    const newStage = hasMistake ? 0 : progress.srsStage + 1;
    const isMastered = !hasMistake && newStage > SRS_SUCCESS_HOURS.length;
    const nextReviewAt = isMastered
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year out when mastered
      : getNextReviewAt(newStage, hasMistake);

    const updated = await prisma.userWordProgress.update({
      where: { id: progress.id },
      data: {
        mistakeCount: newMistakeCount,
        srsStage: Math.min(newStage, SRS_SUCCESS_HOURS.length),
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

// Deprecated: bulk-init is disabled so words are never marked as due before being studied
router.post('/bulk-init', async (_req: Request, res: Response) => {
  res.json({ success: true, message: 'bulk-init disabled to prevent artificial review queue spam' });
});

export default router;
