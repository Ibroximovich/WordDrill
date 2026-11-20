import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedData = [
  {
    bookNumber: 1,
    unitNumber: 1,
    title: "Unit 1 - The Lion and the Rabbit",
    words: [
      {
        english: "afraid",
        uzbek: "qo'rqqan",
        exampleSentence: "The woman was ___ of what she saw.",
      },
      {
        english: "agree",
        uzbek: "rozi bo'lmoq / fikriga qo'shilmoq",
        exampleSentence: "The food is very good in that restaurant. I ___ with you.",
      },
      {
        english: "angry",
        uzbek: "jahli chiqqan / g'azablangan",
        exampleSentence: "She didn't do her homework, so her father is ___.",
      },
      {
        english: "arrive",
        uzbek: "yetib kelmoq",
        exampleSentence: "The bus always ___s at the corner of my street at 4:00.",
      },
      {
        english: "attack",
        uzbek: "hujum qilmoq",
        exampleSentence: "The man with the sword tried to ___ the other man first.",
      },
      {
        english: "bottom",
        uzbek: "pastki qism / tag",
        exampleSentence: "The ___ of my shoe has a hole in it.",
      },
      {
        english: "clever",
        uzbek: "aqlli / zukko",
        exampleSentence: "The ___ boy thought of a good idea.",
      },
      {
        english: "cruel",
        uzbek: "shafqatsiz / zolim",
        exampleSentence: "The ___ man yelled at his sister.",
      },
      {
        english: "finally",
        uzbek: "nihoyat / oxiri",
        exampleSentence: "He ___ crossed the finish line after five hours of running.",
      },
      {
        english: "hide",
        uzbek: "yashirinmoq / berkitmoq",
        exampleSentence: "The other children will ___ while you count to 100.",
      },
      {
        english: "hunt",
        uzbek: "ov qilmoq",
        exampleSentence: "Long ago, people used to ___ with bows and arrows.",
      },
      {
        english: "lot",
        uzbek: "ko'p",
        exampleSentence: "There are a ___ of apples in the basket.",
      },
      {
        english: "middle",
        uzbek: "o'rta / markaz",
        exampleSentence: "The Canadian flag has a maple leaf in the ___ of it.",
      },
      {
        english: "moment",
        uzbek: "lahza / soniya",
        exampleSentence: "I was only a few ___s late for the meeting.",
      },
      {
        english: "pleased",
        uzbek: "mamnun / xursand",
        exampleSentence: "She was ___ with the phone call she received.",
      },
      {
        english: "promise",
        uzbek: "va'da bermoq",
        exampleSentence: "He promised to return my key by tomorrow. I ___ to be on time.",
      },
      {
        english: "reply",
        uzbek: "javob bermoq",
        exampleSentence: "She asked him what time his meeting was, and he had to ___ quickly.",
      },
      {
        english: "safe",
        uzbek: "xavfsiz",
        exampleSentence: "Put on your seat belt in the car to be ___.",
      },
      {
        english: "trick",
        uzbek: "hiyla / aldov",
        exampleSentence: "His card ___ really surprised us.",
      },
      {
        english: "well",
        uzbek: "yaxshi",
        exampleSentence: "The couple can dance quite ___.",
      },
    ],
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  for (const unitData of seedData) {
    const { words, ...unitInfo } = unitData;
    
    const unit = await prisma.unit.upsert({
      where: {
        bookNumber_unitNumber: {
          bookNumber: unitInfo.bookNumber,
          unitNumber: unitInfo.unitNumber,
        },
      },
      update: { title: unitInfo.title },
      create: unitInfo,
    });

    console.log(`✅ Unit created: ${unit.title}`);

    for (const wordData of words) {
      await prisma.word.upsert({
        where: {
          id: (await prisma.word.findFirst({
            where: { unitId: unit.id, english: wordData.english },
          }))?.id ?? 0,
        },
        update: wordData,
        create: { ...wordData, unitId: unit.id },
      });
    }

    console.log(`  ✅ ${words.length} words seeded for ${unit.title}`);
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
