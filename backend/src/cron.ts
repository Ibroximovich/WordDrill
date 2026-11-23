import cron from 'node-cron';
import { prisma } from './lib/prisma';
import { getBotInstance } from './bot';
import { InlineKeyboard } from 'grammy';

// Helper to get current hour in Asia/Tashkent (UTC+5)
function getTashkentHour(date: Date = new Date()): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tashkent',
      hour: 'numeric',
      hour12: false,
    }).format(date),
    10
  );
}

export function startCronJobs() {
  const webAppUrl = process.env.WEBAPP_URL || 'https://your-webapp-url.com';

  // 1. Hourly: check for users with due words to review (09:00 - 21:00 Tashkent time)
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Cron: Checking for due review reminders...');

    const now = new Date();
    const tashkentHour = getTashkentHour(now);

    // Only allow sending between 09:00 and 21:00 Tashkent time
    if (tashkentHour < 9 || tashkentHour >= 21) {
      console.log(`🌙 Cron: Current Tashkent hour is ${tashkentHour}:00 (outside 09:00-21:00 window). Skipping review reminders.`);
      return;
    }

    const bot = getBotInstance();
    if (!bot) {
      console.log('⚠️ Bot not initialized, skipping review reminders cron');
      return;
    }

    try {
      // Only users who haven't received a reminder in the last 20 hours (max 1 reminder per day)
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
              // Only words actually studied in lessons
              OR: [
                { srsStage: { gt: 0 } },
                { mistakeCount: { gt: 0 } },
              ],
            },
          },
        },
        include: {
          progress: {
            where: {
              nextReviewAt: { lte: now },
              isMastered: false,
              OR: [
                { srsStage: { gt: 0 } },
                { mistakeCount: { gt: 0 } },
              ],
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

          // Update lastReminderAt so user won't get spammed within 20 hours
          await prisma.user.update({
            where: { id: user.id },
            data: { lastReminderAt: new Date() },
          });

          console.log(`✅ Reminder sent to user ${user.id} (${dueCount} due words)`);
        } catch (err: any) {
          console.error(`❌ Failed to send reminder to user ${user.id}:`, err?.message || err);
        }
      }

      console.log(`⏰ Cron complete: processed ${candidateUsers.length} review candidate users`);
    } catch (err) {
      console.error('❌ Cron error (review reminders):', err);
    }
  });

  // 2. Every 30 minutes: Onboarding nudge for new users with 0 words studied (registered >= 2h ago, 09:00 - 21:00 Tashkent time)
  cron.schedule('*/30 * * * *', async () => {
    console.log('⏰ Cron: Checking for inactive new users (onboarding nudge)...');

    const now = new Date();
    const tashkentHour = getTashkentHour(now);

    // Only allow sending between 09:00 and 21:00 Tashkent time
    if (tashkentHour < 9 || tashkentHour >= 21) {
      console.log(`🌙 Cron: Current Tashkent hour is ${tashkentHour}:00 (outside 09:00-21:00 window). Skipping onboarding nudge.`);
      return;
    }

    const bot = getBotInstance();
    if (!bot) {
      console.log('⚠️ Bot not initialized, skipping onboarding nudge cron');
      return;
    }

    try {
      // Registered at least 2 hours ago
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Find users where nudgeSent is false, registered >= 2 hours ago, and have 0 word progress
      const inactiveUsers = await prisma.user.findMany({
        where: {
          nudgeSent: false,
          createdAt: { lte: twoHoursAgo },
          progress: {
            none: {}, // 0 words studied
          },
        },
      });

      if (inactiveUsers.length === 0) {
        return;
      }

      console.log(`🎯 Found ${inactiveUsers.length} inactive new users for onboarding nudge`);

      const keyboard = new InlineKeyboard().webApp(
        '🚀 Ilk 5 ta so\'zni boshlash',
        webAppUrl
      );

      const nudgeMessage =
        "Salom! 👋 Essential 1 dagi ilk 5 ta so'zni ovozli talaffuzi bilan yodlashga atigi 2 daqiqa ketadi. Hozir sinab ko'ramizmi?";

      for (const user of inactiveUsers) {
        try {
          await bot.api.sendMessage(Number(user.telegramId), nudgeMessage, {
            reply_markup: keyboard,
          });
          console.log(`✅ Onboarding nudge sent to user ${user.id} (${user.telegramId})`);
        } catch (err: any) {
          // Handles 403 Forbidden (bot blocked by user) or chat not found gracefully
          console.warn(`⚠️ Failed to send nudge to user ${user.id} (${user.telegramId}):`, err?.message || err);
        } finally {
          // Always mark nudgeSent as true so they are never contacted again
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { nudgeSent: true },
            });
          } catch (dbErr) {
            console.error(`❌ Failed to update nudgeSent for user ${user.id}:`, dbErr);
          }
        }
      }

      console.log(`⏰ Cron complete: processed ${inactiveUsers.length} onboarding nudges`);
    } catch (err) {
      console.error('❌ Cron error (onboarding nudge):', err);
    }
  });

  console.log('⏰ Cron jobs started (hourly review reminders + 30m onboarding nudges, Tashkent 09:00-21:00)');
}
