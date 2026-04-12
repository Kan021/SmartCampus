// ═══════════════════════════════════════════════════════════════════
// seed-all.mjs — Master Seed Script for Smart Campus
// ═══════════════════════════════════════════════════════════════════
// Usage:   node seed-all.mjs
// Flags:   node seed-all.mjs --skip-students   (skip 100 students)
//
// Creates: 1 admin, 12 faculty, 100 students, 1 IEEE event,
//          sample hostel data, library books, academic data.
// ═══════════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const skipStudents = args.includes('--skip-students');

// ─── Shared Data ──────────────────────────────────────────────────
const FIRST_NAMES = [
  'Aarav','Vivaan','Aditya','Vihaan','Arjun','Reyansh','Ayaan','Atharva','Krishna','Ishaan',
  'Shaurya','Dhruv','Kabir','Ritvik','Aarush','Siddharth','Darsh','Advait','Nikhil','Rohan',
  'Priya','Ananya','Diya','Sara','Aarohi','Siya','Riya','Kiara','Shreya','Aisha',
  'Neha','Kavya','Pooja','Simran','Mehak','Tanvi','Divya','Nisha','Anjali','Swati',
  'Rahul','Manish','Vikram','Suresh','Rajesh','Deepak','Pankaj','Sumit','Gaurav','Amit',
  'Harsh','Yash','Parth','Dev','Shiv','Jay','Chirag','Rishi','Karan','Tarun',
  'Priyanka','Sneha','Komal','Poonam','Monika','Shweta','Aarti','Deepika','Nidhi','Pallavi',
  'Varun','Mohit','Sameer','Sunny','Lucky','Happy','Raju','Ramesh','Sunil','Vijay',
  'Jiya','Mia','Sia','Tia','Ria','Pia','Nia','Zara','Liya','Myra',
];
const LAST_NAMES = [
  'Sharma','Verma','Singh','Gupta','Kumar','Mishra','Tiwari','Pandey','Yadav','Joshi',
  'Patel','Shah','Mehta','Srivastava','Agarwal','Saxena','Shukla','Tripathi','Chauhan','Rana',
  'Malhotra','Kapoor','Bajaj','Bose','Das','Roy','Nair','Menon','Iyer','Pillai',
  'Reddy','Naidu','Rao','Jain','Dixit','Dubey','Hegde','Kulkarni','Chandra','Murthy',
];
const COURSES = ['BCA','B.Tech CS','B.Tech IT','BBA','B.Sc CS','MCA'];
const SECTIONS = ['A','B','C','D','E','F'];
const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const HOSTEL_NAMES = ['Saraswati Bhawan','Kaveri Bhawan','Ganga Bhawan','Yamuna Bhawan','Godavari Bhawan'];
const DEPARTMENTS = ['Computer Science & Engineering','Information Technology','Electronics & Communication','Mechanical Engineering','Civil Engineering','Business Administration','Mathematics & Statistics','Physics','Chemistry','Humanities & Social Sciences'];
const DESIGNATIONS = ['Assistant Professor','Associate Professor','Professor','Senior Lecturer','Lecturer','HOD'];
const HOME_ADDRESSES = ['Plot 12, Sector 5, Noida, UP','H-45, Gomti Nagar, Lucknow','Flat 3B, Kalyan Apt, Kanpur','Village Rampur, Barabanki, UP','78 Civil Lines, Allahabad','Near GPO, Hazratganj, Lucknow','12/7 Indira Nagar, Lucknow','Vill+Post Sitapur, UP','23 Model House, Faizabad, UP','A-23, Aliganj, Lucknow'];
const FACULTY_NAMES = [['Dr. Amit','Verma'],['Dr. Priya','Sharma'],['Prof. Rohit','Mehta'],['Dr. Sunita','Singh'],['Prof. Manoj','Kumar'],['Dr. Kavita','Tiwari'],['Dr. Rakesh','Gupta'],['Prof. Nidhi','Joshi'],['Dr. Suresh','Pandey'],['Prof. Anjali','Mishra'],['Dr. Vikas','Yadav'],['Prof. Rekha','Saxena']];
const BIOS_STUDENTS = ['Passionate about coding and technology.','Love solving algorithmic problems.','Interested in AI/ML and data science.','Aspiring software developer.','Web development and open-source enthusiast.','Sports and academics — balance is key.','Future entrepreneur building the next big thing.','Research-oriented, interested in blockchain.','Photography, coding and coffee fuel my day.','Into game development and UI/UX design.'];
const BIOS_FACULTY = ['PhD with 12 years of teaching experience.','Researcher in ML and Neural Networks.','Expert in DBMS and Software Engineering.','Passionate educator, hands-on learning.','Published author of 3 textbooks.','Specialist in Cloud Computing.','Industry veteran turned academician.','Mentor to 200+ placed students.','Research interests: IoT, Embedded Systems.','Teaching Networks and Cybersecurity.','Innovation & Incubation Cell coordinator.','Expert in Web Technologies and HCI.'];

let idCardCounter = 10000;
const nextIdCard = () => `BBDU${++idCardCounter}`;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randPhone = () => `9${randInt(100000000, 999999999)}`;
const normEmail = (f, l, s) => `${f.toLowerCase().replace(/[^a-z]/g,'')}.${l.toLowerCase().replace(/[^a-z]/g,'')}${s}@bbdu.edu.in`;

// ─── 1. Admin ─────────────────────────────────────────────────────
async function seedAdmin() {
  console.log('\n🛠️  Seeding admin...');
  const hash = await bcrypt.hash('123456', 12);
  const email = 'skanishk056@gmail.com';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { email }, data: { role: 'admin', passwordHash: hash, isVerified: true } });
    console.log('  ✅ Updated admin: skanishk056@gmail.com / 123456');
  } else {
    await prisma.user.create({ data: { email, fullName: 'Kanishk (Admin)', passwordHash: hash, role: 'admin', isVerified: true } });
    console.log('  ✅ Created admin: skanishk056@gmail.com / 123456');
  }
}

// ─── 2. Faculty ───────────────────────────────────────────────────
async function seedFaculty() {
  console.log('\n👩‍🏫 Seeding 12 faculty...');
  const hash = await bcrypt.hash('Password@123', 10);
  for (let i = 0; i < 12; i++) {
    const [first, last] = FACULTY_NAMES[i];
    const email = normEmail(first.replace('Dr. ','').replace('Prof. ','').split(' ')[0], last, i + 1);
    if (await prisma.user.findUnique({ where: { email } })) { console.log(`  ⚠️  ${email} exists — skipped`); continue; }
    await prisma.user.create({
      data: { email, fullName: `${first} ${last}`, passwordHash: hash, role: 'faculty', isVerified: true,
        profile: { create: { phone: randPhone(), bio: BIOS_FACULTY[i], department: pick(DEPARTMENTS), university: 'BBDU, Lucknow', employeeId: `EMP${2010+i}`, designation: pick(DESIGNATIONS), homeAddress: pick(HOME_ADDRESSES), bloodGroup: pick(BLOOD_GROUPS), idCardNumber: `BBDUF${String(i+1).padStart(4,'0')}` } } },
    });
    console.log(`  ✅ ${first} ${last}`);
  }
}

// ─── 3. Students ──────────────────────────────────────────────────
async function seedStudents() {
  if (skipStudents) { console.log('\n🎓 Skipping students (--skip-students)'); return; }
  console.log('\n🎓 Seeding 100 students...');
  const hash = await bcrypt.hash('Password@123', 10);
  for (let i = 1; i <= 100; i++) {
    const section = SECTIONS[(i-1) % SECTIONS.length];
    const course  = pick(COURSES);
    const first = pick(FIRST_NAMES), last = pick(LAST_NAMES);
    const email = normEmail(first, last, i);
    if (await prisma.user.findUnique({ where: { email } })) continue;
    const hasHostel = Math.random() > 0.4;
    await prisma.user.create({
      data: { email, fullName: `${first} ${last}`, passwordHash: hash, role: 'student', isVerified: true,
        profile: { create: { phone: randPhone(), bio: pick(BIOS_STUDENTS), department: course.includes('BCA')||course.includes('B.Sc') ? 'Computer Science & Engineering' : course.includes('B.Tech') ? pick(['Computer Science & Engineering','Information Technology']) : course.includes('BBA') ? 'Business Administration' : pick(DEPARTMENTS), rollNumber: `${course.replace(/[^A-Z]/g,'').substring(0,3)}22${String(i).padStart(3,'0')}`, year: 4, section, course, bloodGroup: pick(BLOOD_GROUPS), universityRollNo: `21BBDU${String(i).padStart(4,'0')}`, university: 'BBDU, Lucknow', hostelName: hasHostel ? pick(HOSTEL_NAMES) : null, hostelRoom: hasHostel ? `${pick(['A','B','C','D'])}${randInt(101,312)}` : null, homeAddress: pick(HOME_ADDRESSES), idCardNumber: nextIdCard() } } },
    });
    if (i % 25 === 0) console.log(`  ✅ ${i}/100`);
  }
  console.log('  ✔ Students done.');
}

// ─── 4. IEEE Event ────────────────────────────────────────────────
async function seedEvent() {
  console.log('\n🎉 Seeding IEEE HackBlitz event...');
  if (await prisma.event.findFirst({ where: { title: { contains: 'HackBlitz' } } })) { console.log('  ⚠️  Already exists — skipped'); return; }
  const author = await prisma.user.findFirst({ where: { role: { in: ['admin','faculty'] } }, orderBy: { createdAt: 'asc' } });
  if (!author) { console.log('  ❌ No author found — skipped'); return; }
  const eventDate = new Date(); eventDate.setDate(eventDate.getDate() + 10); eventDate.setHours(9,0,0,0);
  const endDate = new Date(eventDate); endDate.setDate(endDate.getDate() + 1); endDate.setHours(17,0,0,0);
  await prisma.event.create({
    data: {
      title: 'HackBlitz 2026 — IEEE BBDU Annual Hackathon',
      description: '🚀 30-hour hackathon at BBDU! Tracks: Smart Campus, AI/ML, Cybersecurity, IoT, Healthcare. Prize Pool: ₹1,00,000. Open to all B.Tech / MCA / MBA Tech students.',
      venue: 'CS Seminar Hall & Innovation Lab, Block B',
      eventDate, endDate, category: 'technical', organizerType: 'club', organizerName: 'IEEE BBDU Student Branch',
      clubName: 'IEEE BBDU Student Branch', clubContact: '+91 98765 43210',
      facultyName: 'Dr. Amit Verma', facultyPhone: '+91 94155 67890', facultyEmail: 'amit.verma@bbdu.ac.in',
      registrationLink: 'https://forms.gle/ieeehackblitz2026bbdu', maxParticipants: 200,
      tags: 'hackathon,coding,prizes,ieee,innovation', isPublished: true, authorId: author.id,
    },
  });
  console.log('  ✅ IEEE HackBlitz 2026 created.');
}

// ─── Run ──────────────────────────────────────────────────────────
async function main() {
  console.log('══════════════════════════════════════════════════');
  console.log('  Smart Campus — Master Seed');
  console.log('══════════════════════════════════════════════════');

  await seedAdmin();
  await seedFaculty();
  await seedStudents();
  await seedEvent();

  const total = await prisma.user.count();
  console.log(`\n🎉 Done! Total users: ${total}`);
  console.log('  Admin:    skanishk056@gmail.com / 123456');
  console.log('  Everyone: Password@123\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
