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
    const username = ctx.from?.username || null;

    // Upsert user with username
    await prisma.user.upsert({
      where: { telegramId },
      update: { firstName, username },
      create: { telegramId, firstName, username },
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

  function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // /stats command - only for admin
  bot.command('stats', async (ctx) => {
    const senderId = ctx.from?.id;

    // 1. Ignore non-admin users completely
    if (senderId !== ADMIN_TELEGRAM_ID) {
      return;
    }

    try {
      const now = new Date();

      // 2. Prisma statistics
      // Total users
      const totalUsers = await prisma.user.count();

      // Today's registrations (Asia/Tashkent UTC+5)
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

      // Total duels
      const totalDuels = await prisma.duel.count();

      // 3. User list (up to 50 latest active users)
      const users = await prisma.user.findMany({
        take: 50,
        orderBy: { lastActiveAt: 'desc' },
        include: {
          _count: {
            select: {
              progress: {
                where: { isMastered: true },
              },
            },
          },
        },
      });

      const userLines = users.map((u, idx) => {
        const safeName = escapeHtml(u.firstName);
        const rawUsername = u.username
          ? (u.username.startsWith('@') ? u.username : `@${u.username}`)
          : "username yo'q";
        const safeUsername = escapeHtml(rawUsername);
        const masteredCount = u._count.progress;
        return `${idx + 1}. ${safeName} (${safeUsername}) — ${masteredCount} ta so'z`;
      });

      const userListText = userLines.length > 0
        ? userLines.join('\n')
        : "Hali foydalanuvchilar mavjud emas.";

      const timeString = new Intl.DateTimeFormat('uz-UZ', {
        timeZone: 'Asia/Tashkent',
        dateStyle: 'short',
        timeStyle: 'medium',
      }).format(now);

      const message =
        `📊 <b>WordDrill — Admin Statistikasi</b>\n\n` +
        `👥 <b>Jami foydalanuvchilar:</b> ${totalUsers} ta\n` +
        `🆕 <b>Bugun ro'yxatdan o'tganlar:</b> ${todayRegistered} ta\n` +
        `⚔️ <b>Jami o'ynalgan Duellar:</b> ${totalDuels} ta\n\n` +
        `📋 <b>Oxirgi faol foydalanuvchilar (50 tagacha):</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `${userListText}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🕒 <i>Toshkent vaqti: ${timeString}</i>`;

      // Telegram messages max length is 4096 characters
      if (message.length > 4000) {
        // If message is too long, split header and list
        const header =
          `📊 <b>WordDrill — Admin Statistikasi</b>\n\n` +
          `👥 <b>Jami foydalanuvchilar:</b> ${totalUsers} ta\n` +
          `🆕 <b>Bugun ro'yxatdan o'tganlar:</b> ${todayRegistered} ta\n` +
          `⚔️ <b>Jami o'ynalgan Duellar:</b> ${totalDuels} ta\n\n` +
          `📋 <b>Oxirgi faol foydalanuvchilar:</b>`;
        await ctx.reply(header, { parse_mode: 'HTML' });
        await ctx.reply(userListText, { parse_mode: 'HTML' });
      } else {
        await ctx.reply(message, { parse_mode: 'HTML' });
      }
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
