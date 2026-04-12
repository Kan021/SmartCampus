import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding Communities & Management...\n');

  // ─── Communities ───────────────────────────────────────────────
  const communities = [
    {
      name: 'IEEE Branch',
      description: 'The Institute of Electrical and Electronics Engineers (IEEE) Student Branch at BBD University promotes technical excellence through workshops, hackathons, paper presentations, and industry-connect sessions. Members get access to IEEE digital library, certifications, and global networking opportunities.',
      type: 'technical',
      isRecruitmentActive: true,
      formUrl: '',
      memberCount: 85,
      foundedYear: 2018,
      tags: 'IEEE,Electronics,Robotics,AI,Research',
    },
    {
      name: 'AAINA Cultural Forum',
      description: 'AAINA is the premier cultural forum of BBD University that celebrates art, music, dance, drama, and literary talent. The forum organizes annual cultural fests, inter-college competitions, and stage performances. AAINA provides a platform for every student to showcase their creative side and develop artistic skills.',
      type: 'cultural',
      isRecruitmentActive: true,
      formUrl: '',
      memberCount: 120,
      foundedYear: 2015,
      tags: 'Dance,Music,Drama,Art,Literature',
    },
    {
      name: 'Innosphere Technical Forum',
      description: 'Innosphere is the official technical forum of BBD University dedicated to fostering innovation and technical skills among students. The forum conducts coding competitions, tech talks, project exhibitions, and startup mentoring sessions. Members collaborate on real-world projects and participate in national-level hackathons.',
      type: 'technical',
      isRecruitmentActive: true,
      formUrl: '',
      memberCount: 95,
      foundedYear: 2016,
      tags: 'Coding,Hackathons,Innovation,Startups,WebDev',
    },
  ];

  for (const c of communities) {
    await prisma.community.upsert({
      where: { name: c.name },
      update: c,
      create: c,
    });
    console.log(`  ✅ Community: ${c.name}`);
  }

  // ─── Management ────────────────────────────────────────────────
  const mgmt = [
    {
      name: 'Dr. Praveen Shukla',
      designation: 'Dean',
      school: 'School of Engineering, BBDU',
      department: 'Engineering',
      office: '5th Floor, Room 507, BBDU',
      phone: '',
      email: '',
      order: 1,
    },
  ];

  for (const m of mgmt) {
    const exists = await prisma.management.findFirst({ where: { name: m.name } });
    if (!exists) {
      await prisma.management.create({ data: m });
      console.log(`  ✅ Management: ${m.name}`);
    } else {
      console.log(`  ⏭️  Management: ${m.name} (already exists)`);
    }
  }

  console.log('\n✨ Seed complete!');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
