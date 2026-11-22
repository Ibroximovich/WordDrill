import { Bot, InlineKeyboard } from 'grammy';
import { prisma } from './lib/prisma';

let bot: Bot | null = null;

export function startBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.error('❌ BOT_TOKEN is not set');
    return;
  }

  bot = new Bot(token);
  const webAppUrl = process.env.WEBAPP_URL || 'https://your-webapp-url.com';

  // /start command
  bot.command('start', async (ctx) => {
    const telegramId = BigInt(ctx.from?.id || 0);
    const firstName = ctx.from?.first_name || 'O\'quvchi';

    // Upsert user
    await prisma.user.upsert({
      where: { telegramId },
      update: { firstName },
      create: { telegramId, firstName },
    });

    const keyboard = new InlineKeyboard().webApp(
      '📚 WordDrill\'ni ochish',
      webAppUrl
    );

    await ctx.reply(
      `Salom, ${firstName}! 👋\n\n` +
      `🎯 *WordDrill* — ingliz so'zlarini o'rganish uchun eng yaxshi usul!\n\n` +
      `✅ Active Recall (faol eslab qolish)\n` +
      `✅ Spelling (imlo) mashqlari\n` +
      `✅ Spaced Repetition (intervals bilan takrorlash)\n\n` +
      `Hoziroq boshlang! 🚀`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  });

  // Admin Telegram ID
  const ADMIN_TELEGRAM_ID = 1100274830;

  // /stats command - only for admin
  bot.command('stats', async (ctx) => {
    const senderId = ctx.from?.id;

    // Ignore non-admin users completely
    if (senderId !== ADMIN_TELEGRAM_ID) {
      return;
    }

    try {
      const now = new Date();

      // 1. Total users
      const totalUsers = await prisma.user.count();

      // 2. Today's registrations (Asia/Tashkent UTC+5)
      const tashkentOffset = 5 * 60 * 60 * 1000;
      const tashkentNow = new Date(now.getTime() + tashkentOffset);
      const todayStart = new Date(
        Date.UTC(
          tashkentNow.getUTCFullYear(),
          tashkentNow.getUTCMonth(),
          tashkentNow.getUTCDate(),
          0,
          0,
          0,
          0
        ) - tashkentOffset
      );

      const todayRegistered = await prisma.user.count({
        where: {
          createdAt: { gte: todayStart },
        },
      });

      // 3. Total duels (and completed count)
      const totalDuels = await prisma.duel.count();
      const completedDuels = await prisma.duel.count({
        where: { status: 'COMPLETED' },
      });

      // 4. Active users who studied at least 1 word
      const activeLearners = await prisma.user.count({
        where: {
          progress: {
            some: {
              OR: [
                { srsStage: { gt: 0 } },
                { mistakeCount: { gt: 0 } },
                { isMastered: true },
              ],
            },
          },
        },
      });

      const message =
        `👑 *WordDrill — Admin Statistikasi*\n\n` +
        `👥 *Jami foydalanuvchilar:* ${totalUsers} ta\n` +
        `🆕 *Bugun ro'yxatdan o'tganlar:* ${todayRegistered} ta\n` +
        `⚔️ *Jami Duellar soni:* ${totalDuels} ta (tugallangan: ${completedDuels})\n` +
        `📚 *Faol o'quvchilar (kamida 1 ta so'z):* ${activeLearners} ta\n\n` +
        `🕒 _Toshkent vaqti: ${new Intl.DateTimeFormat('uz-UZ', {
          timeZone: 'Asia/Tashkent',
          dateStyle: 'short',
          timeStyle: 'medium',
        }).format(now)}_`;

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Admin /stats error:', error);
      await ctx.reply('❌ Statistikani olishda xatolik yuz berdi.');
    }
  });

  bot.start();
  console.log('🤖 Telegram Bot started');
}

export function getBotInstance() {
  return bot;
}
