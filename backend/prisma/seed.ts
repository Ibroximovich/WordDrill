import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface WordEntry {
  en: string;
  uz: string;
}

interface UnitEntry {
  unit: number;
  words: WordEntry[];
}

function loadJsonFile(filename: string): UnitEntry[] {
  const filePath = path.join(__dirname, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as UnitEntry[];
}

async function main() {
  console.log('🌱 Seeding database from JSON files...');

  // Load all 3 JSON files and merge into one array
  const allUnits: UnitEntry[] = [
    ...loadJsonFile('words_1_10.json'),
    ...loadJsonFile('words_11_20.json'),
    ...loadJsonFile('words_21_30.json'),
  ];

  console.log(`📦 Loaded ${allUnits.length} units, ${allUnits.reduce((s, u) => s + u.words.length, 0)} words total`);

  let totalWords = 0;

  for (const unitEntry of allUnits) {
    const bookNumber = 1;
    const unitNumber = unitEntry.unit;
    const title = `Essential 1 — Unit ${unitNumber}`;

    // Upsert the Unit (create if not exists, update title if exists)
    const unit = await prisma.unit.upsert({
      where: {
        bookNumber_unitNumber: { bookNumber, unitNumber },
      },
      update: { title },
      create: { bookNumber, unitNumber, title },
    });

    // Upsert each word (safe: won't delete existing progress)
    for (const w of unitEntry.words) {
      const existing = await prisma.word.findFirst({
        where: { unitId: unit.id, english: w.en },
      });

      if (existing) {
        await prisma.word.update({
          where: { id: existing.id },
          data: {
            uzbek: w.uz,
            exampleSentence: existing.exampleSentence || `Use the word ___ in a sentence.`,
          },
        });
      } else {
        await prisma.word.create({
          data: {
            unitId: unit.id,
            english: w.en,
            uzbek: w.uz,
            exampleSentence: `Use the word ___ in a sentence.`,
          },
        });
      }

      totalWords++;
    }

    console.log(`  ✅ Unit ${unitNumber}: "${title}" — ${unitEntry.words.length} words`);
  }

  console.log(`\n🎉 Seeding complete! ${allUnits.length} units, ${totalWords} words total.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
