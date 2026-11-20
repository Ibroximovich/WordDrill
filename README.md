# 📚 WordDrill — English Vocabulary Mini App

Telegram Bot + Mini App for learning 4000 Essential English Words with **Active Recall**, **Spelling**, and **Spaced Repetition (SRS)**.

## Loyiha tuzilmasi

```
WordDrill/
├── frontend/          # React + Vite + TypeScript + Tailwind (Telegram Mini App)
├── backend/           # Node.js + Express + grammY + Prisma (Bot + API)
└── README.md
```

## Boshlash

### 1. Backend sozlash

```bash
cd backend
npm install
cp .env.example .env
# .env faylini to'ldiring (DATABASE_URL, BOT_TOKEN, WEBAPP_URL)

# Prisma migrations
npm run db:generate
npm run db:migrate
npm run db:seed

# Dev serverini ishga tushirish
npm run dev
```

### 2. Frontend sozlash

```bash
cd frontend
npm install
cp .env.example .env
# .env: VITE_API_URL=http://localhost:3001

npm run dev
```

## Muhit o'zgaruvchilari

### Backend `.env`
| O'zgaruvchi | Ta'rif |
|-------------|--------|
| `DATABASE_URL` | PostgreSQL ulanish URL |
| `BOT_TOKEN` | @BotFather dan olingan token |
| `WEBAPP_URL` | Mini App joylashgan URL |
| `PORT` | API port (default: 3001) |

### Frontend `.env`
| O'zgaruvchi | Ta'rif |
|-------------|--------|
| `VITE_API_URL` | Backend API URL |

## API Endpointlar

| Method | Endpoint | Ta'rif |
|--------|----------|--------|
| POST | `/api/users/auth` | Telegram auth |
| GET | `/api/users/:id/stats` | Foydalanuvchi statistikasi |
| GET | `/api/units` | Barcha darslar |
| GET | `/api/units/:id/words` | Dars so'zlari |
| GET | `/api/units/review/due` | Takrorlanishi kerak so'zlar |
| POST | `/api/progress/update` | SRS progressni yangilash |
| POST | `/api/progress/bulk-init` | Dars progressini boshlash |

## O'rganish bosqichlari (3-Stage Learning)

| Bosqich | Nomi | Tavsif |
|---------|------|--------|
| 1 | 🌱 Warm-up Quiz | O'zbek ma'nosi ko'rsatiladi, 4 ta variant |
| 2 | ✍️ Spelling | Aniq inglizcha so'z yoziladi |
| 3 | 📝 Context | Jumlada bo'sh joy to'ldiriladi |

## SRS Intervallari

| Bosqich | Interval |
|---------|----------|
| Xato | +2 soat |
| 1-muvaffaqiyat | +1 kun |
| 2-muvaffaqiyat | +3 kun |
| 3-muvaffaqiyat | +7 kun |
| 4-muvaffaqiyat | ✅ O'zlashtirildi |

## Telegram Bot Buyruqlari

- `/start` — Botni ishga tushirish, Mini App tugmasi
- `/stats` — Statistikani ko'rish

## Cron Jobs

**Soatlik**: Takrorlash vaqti kelgan foydalanuvchilarga xabar yuborish.

## Texnologiyalar

**Frontend**: React, Vite, TypeScript, Tailwind CSS, @twa-dev/sdk, React Router  
**Backend**: Node.js, Express, TypeScript, grammY, Prisma, PostgreSQL, node-cron
