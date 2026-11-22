import cron from 'node-cron';
import { prisma } from './lib/prisma';
import { getBotInstance } from './bot';
import { InlineKeyboard } from 'grammy';

export function startCronJobs() {
  // Check hourly
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Cron: Checking for due review reminders...');

    const now = new Date();

    // 1. Check Tashkent time (UTC+5 / Asia/Tashkent)
    const tashkentHour = parseInt(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Tashkent',
        hour: 'numeric',
        hour12: false,
      }).format(now),
      10
    );

    // Only allow sending between 09:00 and 21:00 Tashkent time
    if (tashkentHour < 9 || tashkentHour >= 21) {
      console.log(`🌙 Cron: Current Tashkent hour is ${tashkentHour}:00 (outside 09:00-21:00 window). Skipping reminders.`);
      return;
    }

    const webAppUrl = process.env.WEBAPP_URL || 'https://your-webapp-url.com';
    const bot = getBotInstance();

    if (!bot) {
      console.log('⚠️ Bot not initialized, skipping cron');
      return;
    }

    try {
      // 2. Only users who haven't received a reminder in the last 20 hours (max 1 reminder per day)
      const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);

      const candidateUsers = await prisma.user.findMany({
        where: {
          OR: [
            { lastReminderAt: null },
            { lastReminderAt: { lte: twentyHoursAgo } },
          ],
          progress: {
            some: {
              nextReviewAt: { lte: now },
              isMastered: false,
            },
          },
        },
        include: {
          progress: {
            where: {
              nextReviewAt: { lte: now },
              isMastered: false,
            },
          },
        },
      });

      for (const user of candidateUsers) {
        const dueCount = user.progress.length;
        if (dueCount === 0) continue;

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

          // 3. Update lastReminderAt so user won't get spammed within 20 hours
          await prisma.user.update({
            where: { id: user.id },
            data: { lastReminderAt: new Date() },
          });

          console.log(`✅ Reminder sent to user ${user.id} (${dueCount} due words)`);
        } catch (err) {
          console.error(`❌ Failed to send reminder to user ${user.id}:`, err);
        }
      }

      console.log(`⏰ Cron complete: processed ${candidateUsers.length} users`);
    } catch (err) {
      console.error('❌ Cron error:', err);
    }
  });

  console.log('⏰ Cron jobs started (hourly review reminders, Tashkent 09:00-21:00, max 1/day)');
}
