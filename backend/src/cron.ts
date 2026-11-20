import cron from 'node-cron';
import { prisma } from './lib/prisma';
import { getBotInstance } from './bot';
import { InlineKeyboard } from 'grammy';

export function startCronJobs() {
  // Every hour: check for users with due words
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Cron: Checking for due words...');
    
    const webAppUrl = process.env.WEBAPP_URL || 'https://your-webapp-url.com';
    const bot = getBotInstance();
    
    if (!bot) {
      console.log('⚠️  Bot not initialized, skipping cron');
      return;
    }

    try {
      // Find all users who have due words
      const usersWithDueWords = await prisma.user.findMany({
        where: {
          progress: {
            some: {
              nextReviewAt: { lte: new Date() },
              isMastered: false,
            },
          },
        },
        include: {
          progress: {
            where: {
              nextReviewAt: { lte: new Date() },
              isMastered: false,
            },
          },
        },
      });

      for (const user of usersWithDueWords) {
        const dueCount = user.progress.length;
        
        const keyboard = new InlineKeyboard().webApp(
          `📝 ${dueCount} ta so'zni takrorlash`,
          `${webAppUrl}?mode=review`
        );

        try {
          await bot.api.sendMessage(
            Number(user.telegramId),
            `🔔 *Takrorlash vaqti keldi!*\n\n` +
            `Sizda takrorlash uchun *${dueCount} ta so'z* tayyor.\n\n` +
            `So'zlarni takrorlash — ularni uzoq muddatli xotirada saqlashning yagona usuli! 💪`,
            {
              parse_mode: 'Markdown',
              reply_markup: keyboard,
            }
          );
          console.log(`✅ Reminder sent to user ${user.id} (${dueCount} due words)`);
        } catch (err) {
          console.error(`❌ Failed to send reminder to user ${user.id}:`, err);
        }
      }

      console.log(`⏰ Cron complete: notified ${usersWithDueWords.length} users`);
    } catch (err) {
      console.error('❌ Cron error:', err);
    }
  });

  console.log('⏰ Cron jobs started (hourly review reminders)');
}
