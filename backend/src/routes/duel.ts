import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateTelegramInitData } from '../lib/telegramAuth';
import { getBotInstance } from '../bot';

const router = Router();

// Helper to extract or fallback telegram user
function getTelegramUser(req: Request) {
  const initData = req.body?.initData || (req.headers['x-telegram-init-data'] as string);
  if (!initData || initData === 'mock') {
    return { id: 123456789, first_name: 'Test User' };
  }
  const validated = validateTelegramInitData(initData, process.env.BOT_TOKEN || '');
  if (validated) {
    return validated;
  }
  return { id: 123456789, first_name: 'Test User' };
}

// Fisher-Yates shuffle
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// POST /api/duel/create - Create a new duel from unit
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { unitId } = req.body;
    if (!unitId) {
      return res.status(400).json({ success: false, error: 'unitId is required' });
    }

    const user = getTelegramUser(req);

    // Get all words in the unit
    const unitWords = await prisma.word.findMany({
      where: { unitId: Number(unitId) },
    });

    if (unitWords.length === 0) {
      return res.status(404).json({ success: false, error: 'Unitda so\'zlar topilmadi' });
    }

    // Pick 10 random words
    const shuffled = shuffleArray(unitWords);
    const selectedWords = shuffled.slice(0, 10);
    const wordIds = selectedWords.map((w) => w.id);

    // Create duel
    const duel = await prisma.duel.create({
      data: {
        unitId: Number(unitId),
        wordIds,
        creatorId: BigInt(user.id),
        creatorName: user.first_name || 'Foydalanuvchi',
        status: 'WAITING',
      },
    });

    const botUsername = process.env.BOT_USERNAME || 'worddrill_uz_bot';
    const shareLink = `https://t.me/${botUsername}?startapp=duel_${duel.id}`;

    res.json({
      success: true,
      duel: {
        ...duel,
        creatorId: duel.creatorId.toString(),
        opponentId: duel.opponentId?.toString() ?? null,
      },
      shareLink,
    });
  } catch (error) {
    console.error('Error creating duel:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/duel/:id - Get duel details, 10 questions with options, and current score
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const duelId = req.params.id;
    const duel = await prisma.duel.findUnique({
      where: { id: duelId },
    });

    if (!duel) {
      return res.status(404).json({ success: false, error: 'Duel topilmadi' });
    }

    // Get the duel's words
    const words = await prisma.word.findMany({
      where: { id: { in: duel.wordIds } },
    });

    // Also get other words from this unit or other units to use as distractors
    const allDistractors = await prisma.word.findMany({
      where: { unitId: duel.unitId },
      select: { id: true, uzbek: true },
    });

    // If unit has few words, fetch additional from other units
    let extraDistractors: { id: number; uzbek: string }[] = [];
    if (allDistractors.length < 15) {
      extraDistractors = await prisma.word.findMany({
        take: 20,
        select: { id: true, uzbek: true },
      });
    }

    const distractorPool = [...allDistractors, ...extraDistractors];

    // Build question list preserving duel.wordIds order
    const wordMap = new Map(words.map((w) => [w.id, w]));
    const questions = duel.wordIds
      .map((id) => wordMap.get(id))
      .filter((w): w is NonNullable<typeof w> => Boolean(w))
      .map((w) => {
        // Collect 3 wrong options
        const wrongOptions = distractorPool
          .filter((d) => d.id !== w.id && d.uzbek !== w.uzbek)
          .map((d) => d.uzbek);

        const shuffledWrongs = shuffleArray(Array.from(new Set(wrongOptions))).slice(0, 3);
        const options = shuffleArray([w.uzbek, ...shuffledWrongs]);

        return {
          wordId: w.id,
          english: w.english,
          uzbek: w.uzbek,
          options,
          correctAnswer: w.uzbek,
        };
      });

    res.json({
      success: true,
      duel: {
        ...duel,
        creatorId: duel.creatorId.toString(),
        opponentId: duel.opponentId?.toString() ?? null,
      },
      questions,
    });
  } catch (error) {
    console.error('Error fetching duel:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/duel/:id/submit - Submit score and time spent
router.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const duelId = req.params.id;
    const { score, timeSpent } = req.body;

    if (score === undefined || timeSpent === undefined) {
      return res.status(400).json({ success: false, error: 'score and timeSpent are required' });
    }

    const user = getTelegramUser(req);
    const userIdBigInt = BigInt(user.id);

    const duel = await prisma.duel.findUnique({
      where: { id: duelId },
    });

    if (!duel) {
      return res.status(404).json({ success: false, error: 'Duel topilmadi' });
    }

    let updateData: any = {};

    const isCreator = duel.creatorId === userIdBigInt;

    if (isCreator) {
      // Creator submission
      updateData.creatorScore = Number(score);
      updateData.creatorTime = Number(timeSpent);
    } else {
      // Opponent submission
      updateData.opponentId = userIdBigInt;
      updateData.opponentName = user.first_name || 'Raqib';
      updateData.opponentScore = Number(score);
      updateData.opponentTime = Number(timeSpent);
    }

    // Determine if both have finished
    const finalCreatorScore = isCreator ? Number(score) : duel.creatorScore;
    const finalCreatorTime = isCreator ? Number(timeSpent) : duel.creatorTime;
    const finalOpponentScore = !isCreator ? Number(score) : duel.opponentScore;
    const finalOpponentTime = !isCreator ? Number(timeSpent) : duel.opponentTime;
    const finalOpponentId = !isCreator ? userIdBigInt : duel.opponentId;
    const finalOpponentName = !isCreator ? (user.first_name || 'Raqib') : duel.opponentName;

    const bothFinished = finalCreatorScore !== null && finalOpponentScore !== null;

    if (bothFinished) {
      updateData.status = 'COMPLETED';
    }

    const updated = await prisma.duel.update({
      where: { id: duelId },
      data: updateData,
    });

    // If both finished, notify both players via Telegram bot
    if (bothFinished && finalOpponentId) {
      const bot = getBotInstance();
      if (bot) {
        let winnerText = '';
        if (finalCreatorScore! > finalOpponentScore!) {
          winnerText = `🏆 G'olib: *${updated.creatorName}*!`;
        } else if (finalOpponentScore! > finalCreatorScore!) {
          winnerText = `🏆 G'olib: *${finalOpponentName}*!`;
        } else {
          // Score tie - compare time
          if (finalCreatorTime! < finalOpponentTime!) {
            winnerText = `🏆 G'olib: *${updated.creatorName}* (vaqt bo'yicha tezroq: ${finalCreatorTime}s vs ${finalOpponentTime}s)!`;
          } else if (finalOpponentTime! < finalCreatorTime!) {
            winnerText = `🏆 G'olib: *${finalOpponentName}* (vaqt bo'yicha tezroq: ${finalOpponentTime}s vs ${finalCreatorTime}s)!`;
          } else {
            winnerText = '🤝 *Durang!* Ikkala o\'yinchi bir xil ball va vaqt qayd etdi!';
          }
        }

        const msg =
          `⚔️ *WordDrill Duel yakunlandi!*\n\n` +
          `📖 *Unit ${updated.unitId}*\n\n` +
          `👤 *${updated.creatorName}*: ${finalCreatorScore}/10 (${finalCreatorTime} soniya)\n` +
          `👤 *${finalOpponentName}*: ${finalOpponentScore}/10 (${finalOpponentTime} soniya)\n\n` +
          `${winnerText}`;

        // Send to creator
        try {
          await bot.api.sendMessage(updated.creatorId.toString(), msg, { parse_mode: 'Markdown' });
        } catch (e) {
          console.error('Bot send to creator failed:', e);
        }

        // Send to opponent
        try {
          await bot.api.sendMessage(finalOpponentId.toString(), msg, { parse_mode: 'Markdown' });
        } catch (e) {
          console.error('Bot send to opponent failed:', e);
        }
      }
    }

    res.json({
      success: true,
      duel: {
        ...updated,
        creatorId: updated.creatorId.toString(),
        opponentId: updated.opponentId?.toString() ?? null,
      },
    });
  } catch (error) {
    console.error('Error submitting duel score:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
