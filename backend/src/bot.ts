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

  // /stats command
  bot.command('stats', async (ctx) => {
    const telegramId = BigInt(ctx.from?.id || 0);
    
    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        progress: {
          where: { isMastered: true },
        },
      },
    });

    if (!user) {
      await ctx.reply('Siz hali ro\'yxatdan o\'tmagansiz. /start buyrug\'ini yuboring!');
      return;
    }

    const masteredCount = user.progress.length;
    const dueCount = await prisma.userWordProgress.count({
      where: {
        userId: user.id,
        nextReviewAt: { lte: new Date() },
        isMastered: false,
      },
    });

    await ctx.reply(
      `📊 *Sizning statistikangiz:*\n\n` +
      `🔥 Streak: ${user.streakDays} kun\n` +
      `✅ O'zlashtirilgan so'zlar: ${masteredCount} ta\n` +
      `📝 Takrorlash kerak: ${dueCount} ta\n`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.start();
  console.log('🤖 Telegram Bot started');
}

export function getBotInstance() {
  return bot;
}
