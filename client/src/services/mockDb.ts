/**
 * mockDb.ts — Client-side localStorage database
 * Seeds realistic BBDU data on first load.
 * Provides CRUD helpers for all modules.
 */

const STORAGE_KEY = 'sc_mock_db_v2';

// ─── ID Generator ─────────────────────────────────────────────────
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ─── Seed Data ────────────────────────────────────────────────────
function createSeed() {
  const now = new Date().toISOString();
  const adminId = 'usr-admin-001';
  const facId1  = 'usr-fac-001';
  const facId2  = 'usr-fac-002';
  const stuId1  = 'usr-stu-001';
  const stuId2  = 'usr-stu-002';
  const stuId3  = 'usr-stu-003';

  return {
    // ── Users ──────────────────────────────────────────────────────
    users: [
      { id: adminId, email: 'admin@bbdu.ac.in',      password: 'Admin@123',   fullName: 'Dr. Rajesh Kumar',   role: 'admin',   isVerified: true, createdAt: now, lastLoginAt: null },
      { id: facId1,  email: 'dr.sharma@bbdu.ac.in',  password: 'Faculty@123', fullName: 'Dr. Priya Sharma',   role: 'faculty', isVerified: true, createdAt: now, lastLoginAt: null },
      { id: facId2,  email: 'prof.gupta@bbdu.ac.in', password: 'Faculty@123', fullName: 'Prof. Anand Gupta',  role: 'faculty', isVerified: true, createdAt: now, lastLoginAt: null },
      { id: stuId1,  email: '22cse001@bbdu.ac.in',   password: 'Student@123', fullName: 'Rahul Verma',        role: 'student', isVerified: true, createdAt: now, lastLoginAt: null },
      { id: stuId2,  email: '22cse002@bbdu.ac.in',   password: 'Student@123', fullName: 'Priya Agarwal',      role: 'student', isVerified: true, createdAt: now, lastLoginAt: null },
      { id: stuId3,  email: '22it001@bbdu.ac.in',    password: 'Student@123', fullName: 'Amit Singh',         role: 'student', isVerified: true, createdAt: now, lastLoginAt: null },
    ],

    // ── Profiles ───────────────────────────────────────────────────
    profiles: [
      { userId: adminId, idCardNumber: 'SC-ADM-2025-10001', department: 'Administration', designation: 'Vice Chancellor', phone: '9876543210', bio: null, avatarBase64: null, rollNumber: null, employeeId: 'EMP-ADM-001', year: null, section: null, course: null, bloodGroup: 'O+', hostelName: null, isWarden: false },
      { userId: facId1,  idCardNumber: 'SC-FAC-2025-10002', department: 'Computer Science', designation: 'Associate Professor', phone: '9876543211', bio: 'PhD in Machine Learning from IIT Delhi.', avatarBase64: null, rollNumber: null, employeeId: 'EMP-FAC-001', year: null, section: null, course: null, bloodGroup: 'A+', hostelName: null, isWarden: false },
      { userId: facId2,  idCardNumber: 'SC-FAC-2025-10003', department: 'Information Technology', designation: 'Assistant Professor', phone: '9876543212', bio: 'Specializes in Web Technologies.', avatarBase64: null, rollNumber: null, employeeId: 'EMP-FAC-002', year: null, section: null, course: null, bloodGroup: 'B+', hostelName: null, isWarden: true },
      { userId: stuId1,  idCardNumber: 'SC-STU-2025-20001', department: 'Computer Science', designation: null, phone: '9123456789', bio: null, avatarBase64: null, rollNumber: '22CSE001', employeeId: null, year: 3, section: 'A', course: 'B.Tech CSE', bloodGroup: 'B+', hostelName: 'Vivekananda Block', hostelRoom: 'A-201' },
      { userId: stuId2,  idCardNumber: 'SC-STU-2025-20002', department: 'Computer Science', designation: null, phone: '9123456790', bio: null, avatarBase64: null, rollNumber: '22CSE002', employeeId: null, year: 3, section: 'A', course: 'B.Tech CSE', bloodGroup: 'O-', hostelName: 'Saraswati Block', hostelRoom: 'B-105' },
      { userId: stuId3,  idCardNumber: 'SC-STU-2025-20003', department: 'Information Technology', designation: null, phone: '9123456791', bio: null, avatarBase64: null, rollNumber: '22IT001',  employeeId: null, year: 3, section: 'A', course: 'B.Tech IT', bloodGroup: 'A-', hostelName: null, hostelRoom: null },
    ],

    // ── Notices ────────────────────────────────────────────────────
    notices: [
      { id: uid(), title: 'Mid-Semester Examination Schedule — April 2026', content: 'The mid-semester examinations for all programs (B.Tech, BCA, MCA, MBA) will commence from April 21, 2026. Students are advised to check their timetables on the university portal and carry their identity cards to the examination hall. No electronic devices are permitted.', category: 'exam', authorId: adminId, authorName: 'Dr. Rajesh Kumar', pdfFileName: null, pdfBase64: null, createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
      { id: uid(), title: 'Annual Tech Fest "TECHNOVA 2026" — Registrations Open', content: 'TECHNOVA 2026, the annual technical festival of BBDU, is scheduled for May 10–12, 2026. Events include Hackathon, Robotics, Paper Presentation, Quiz, and Gaming. Register your teams at the Student Affairs Office or online. Cash prizes worth ₹2,00,000. All students are encouraged to participate.', category: 'cultural', authorId: facId1, authorName: 'Dr. Priya Sharma', pdfFileName: null, pdfBase64: null, createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
      { id: uid(), title: 'Hostel Fee Payment — Last Date Extended to April 20', content: 'The last date for hostel fee payment for the Academic Year 2025–26 has been extended to April 20, 2026. Students residing in university hostels are required to pay the fee through the university finance portal or at the accounts office between 10:00 AM and 3:00 PM on working days. Late fee of ₹500 per day will be applicable after the due date.', category: 'hostel', authorId: adminId, authorName: 'Dr. Rajesh Kumar', pdfFileName: null, pdfBase64: null, createdAt: new Date(Date.now() - 6 * 86400000).toISOString() },
      { id: uid(), title: 'Library Extended Hours — Examination Period', content: 'The Central Library will remain open from 7:00 AM to 11:00 PM during the examination period (April 21 – May 15, 2026). Students can access all reading rooms, digital resources, and reference materials. Book issue/return services will be available from 9:00 AM to 7:00 PM.', category: 'general', authorId: adminId, authorName: 'Dr. Rajesh Kumar', pdfFileName: null, pdfBase64: null, createdAt: new Date(Date.now() - 8 * 86400000).toISOString() },
      { id: uid(), title: 'Scholarship Applications — National Merit Scholarship 2026', content: 'Applications are invited for the National Merit-cum-Means Scholarship for students with family income below ₹4.5 lakhs per annum. Eligible students must have secured at least 80% marks in their previous year examination. Applications along with required documents must be submitted to the Scholarship Cell by April 30, 2026.', category: 'finance', authorId: adminId, authorName: 'Dr. Rajesh Kumar', pdfFileName: null, pdfBase64: null, createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
      { id: uid(), title: 'Sports Day 2026 — Inter-College Tournament', content: 'BBDU Sports Day 2026 will be held on April 25–26. Events include Cricket, Football, Basketball, Badminton, Table Tennis, Athletics, and Chess. Students interested in participating must register with the Sports Department by April 18. Medals and certificates will be awarded.', category: 'sports', authorId: facId2, authorName: 'Prof. Anand Gupta', pdfFileName: null, pdfBase64: null, createdAt: new Date(Date.now() - 12 * 86400000).toISOString() },
    ],

    // ── Library Books ──────────────────────────────────────────────
    books: [
      { id: uid(), title: 'Data Structures and Algorithms in C++', author: 'Michael T. Goodrich', isbn: '9780470383278', category: 'Computer Science', publisher: 'Wiley', publishYear: 2011, totalCopies: 5, availableCopies: 3, shelfLocation: 'CS-A1', description: 'Comprehensive guide to data structures and algorithm design.', createdAt: now },
      { id: uid(), title: 'Operating System Concepts', author: 'Abraham Silberschatz', isbn: '9781118063330', category: 'Computer Science', publisher: 'Wiley', publishYear: 2018, totalCopies: 8, availableCopies: 5, shelfLocation: 'CS-A2', description: 'The standard OS textbook used worldwide.', createdAt: now },
      { id: uid(), title: 'Database System Concepts', author: 'Henry F. Korth', isbn: '9780073523323', category: 'Computer Science', publisher: 'McGraw-Hill', publishYear: 2019, totalCopies: 6, availableCopies: 4, shelfLocation: 'CS-B1', description: 'Complete coverage of database design and management.', createdAt: now },
      { id: uid(), title: 'Computer Networks', author: 'Andrew Tanenbaum', isbn: '9780132126953', category: 'Computer Science', publisher: 'Pearson', publishYear: 2010, totalCopies: 7, availableCopies: 6, shelfLocation: 'CS-B2', description: 'Definitive guide to computer networking concepts.', createdAt: now },
      { id: uid(), title: 'Artificial Intelligence: A Modern Approach', author: 'Stuart Russell & Peter Norvig', isbn: '9780136042594', category: 'Computer Science', publisher: 'Pearson', publishYear: 2020, totalCopies: 4, availableCopies: 2, shelfLocation: 'AI-A1', description: 'The leading AI textbook used at top universities globally.', createdAt: now },
      { id: uid(), title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', isbn: '9780262033848', category: 'Computer Science', publisher: 'MIT Press', publishYear: 2009, totalCopies: 10, availableCopies: 7, shelfLocation: 'CS-C1', description: 'CLRS — the bible of algorithms.', createdAt: now },
      { id: uid(), title: 'Engineering Mathematics — Vol. I', author: 'Dr. B.S. Grewal', isbn: '9788174091955', category: 'Mathematics', publisher: 'Khanna Publishers', publishYear: 2021, totalCopies: 15, availableCopies: 10, shelfLocation: 'MA-A1', description: 'Most popular engineering mathematics textbook in India.', createdAt: now },
      { id: uid(), title: 'Engineering Physics', author: 'Dr. S.K. Gupta', isbn: '9780071077378', category: 'Physics', publisher: 'Dhanpat Rai', publishYear: 2018, totalCopies: 12, availableCopies: 9, shelfLocation: 'PH-A1', description: 'Covers all topics of engineering physics syllabus.', createdAt: now },
      { id: uid(), title: 'Engineering Chemistry', author: 'Jain & Jain', isbn: '9789385676260', category: 'Chemistry', publisher: 'Dhanpat Rai', publishYear: 2019, totalCopies: 10, availableCopies: 7, shelfLocation: 'CH-A1', description: 'Complete chemistry for engineering students.', createdAt: now },
      { id: uid(), title: 'Principles of Management', author: 'P.C. Tripathi', isbn: '9781259097645', category: 'Management', publisher: 'McGraw-Hill', publishYear: 2017, totalCopies: 8, availableCopies: 6, shelfLocation: 'MB-A1', description: 'Fundamental principles of business management.', createdAt: now },
      { id: uid(), title: 'Digital Electronics', author: 'Morris Mano', isbn: '9780132103748', category: 'Electronics', publisher: 'Pearson', publishYear: 2013, totalCopies: 6, availableCopies: 5, shelfLocation: 'EC-A1', description: 'Digital logic and circuit design.', createdAt: now },
      { id: uid(), title: 'Signals and Systems', author: 'Alan Oppenheim', isbn: '9780138147570', category: 'Electronics', publisher: 'Pearson', publishYear: 1996, totalCopies: 5, availableCopies: 3, shelfLocation: 'EC-A2', description: 'Classic text on continuous and discrete time signals.', createdAt: now },
    ],

    // ── Library Issues ─────────────────────────────────────────────
    issues: [],

    // ── Events ─────────────────────────────────────────────────────
    events: [
      { id: uid(), title: 'TECHNOVA 2026 — Annual Tech Fest', description: 'Three-day technical extravaganza featuring Hackathon (24 hrs), Robotics Challenge, Paper Presentation, AI/ML Workshop, Gaming Tournament, and Startup Pitch. Open to all engineering and management students. Cash prizes worth ₹2,00,000. Register your teams now!', venue: 'Main Auditorium & CS Block', eventDate: new Date(Date.now() + 27 * 86400000).toISOString(), endDate: new Date(Date.now() + 29 * 86400000).toISOString(), category: 'technical', organizerType: 'club', organizerName: 'TECHNOVA Committee', clubName: 'Technical Society BBDU', clubContact: '9876543300', facultyName: 'Dr. Priya Sharma', facultyPhone: '9876543211', registrationLink: null, maxParticipants: 500, tags: 'hackathon,robotics,AI,tech', isPublished: true, createdById: facId1, createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
      { id: uid(), title: 'BBDU Sports Day 2026', description: 'Annual Inter-College Sports Tournament. Events: Cricket, Football (5-a-side), Basketball, Badminton, Table Tennis, 100m Sprint, 400m Race, Shot Put, Chess, and Carrom. Medals and certificates for top 3 positions in each event. Free participation for all BBDU students.', venue: 'University Sports Ground & Indoor Stadium', eventDate: new Date(Date.now() + 12 * 86400000).toISOString(), endDate: new Date(Date.now() + 13 * 86400000).toISOString(), category: 'sports', organizerType: 'department', organizerName: 'Sports Department', clubName: null, clubContact: null, facultyName: 'Prof. Anand Gupta', facultyPhone: '9876543212', registrationLink: null, maxParticipants: 800, tags: 'cricket,football,sports,tournament', isPublished: true, createdById: facId2, createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
      { id: uid(), title: 'Career Guidance Workshop — Campus Placements 2026', description: 'Exclusive workshop for final-year students covering Resume Building, LinkedIn Optimization, Technical Interview Preparation, HR Round Tips, and Group Discussion strategies. Guest speakers from TCS, Infosys, and Wipro HR teams. Attendance mandatory for placement-eligible students.', venue: 'Seminar Hall, Admin Block', eventDate: new Date(Date.now() + 5 * 86400000).toISOString(), endDate: null, category: 'academic', organizerType: 'department', organizerName: 'Training & Placement Cell', clubName: null, clubContact: null, facultyName: 'Dr. Rajesh Kumar', facultyPhone: '9876543210', registrationLink: null, maxParticipants: 200, tags: 'placements,career,TCS,Infosys', isPublished: true, createdById: adminId, createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
      { id: uid(), title: 'Cultural Fest "TARANG 2026"', description: 'Celebrate art and culture at TARANG 2026! Events include Classical Dance, Western Dance, Solo Singing, Band Performance, Street Play, Photography, and Fashion Show. Open to all BBDU students and faculty. Professional judges. Exciting prizes and a night of entertainment!', venue: 'Open Air Theatre, BBDU Campus', eventDate: new Date(Date.now() + 20 * 86400000).toISOString(), endDate: new Date(Date.now() + 21 * 86400000).toISOString(), category: 'cultural', organizerType: 'club', organizerName: 'Cultural Committee', clubName: 'BBDU Cultural Club', clubContact: '9876543301', facultyName: 'Prof. Anand Gupta', facultyPhone: '9876543212', registrationLink: null, maxParticipants: 600, tags: 'dance,music,culture,fest', isPublished: true, createdById: facId2, createdAt: now },
    ],

    // ── Management Directory ────────────────────────────────────────
    management: [
      { id: uid(), name: 'Prof. Atul Kumar', designation: 'Vice Chancellor', department: 'Office of the Vice Chancellor', school: 'BBDU', office: 'VC Secretariat, Admin Block', phone: '0522-6177800', email: 'vc@bbdu.ac.in', photoBase64: null, order: 1 },
      { id: uid(), name: 'Dr. R.K. Singh', designation: 'Registrar', department: 'Registrar\'s Office', school: 'BBDU', office: 'Admin Block, Room 101', phone: '0522-6177801', email: 'registrar@bbdu.ac.in', photoBase64: null, order: 2 },
      { id: uid(), name: 'Prof. Meena Agarwal', designation: 'Dean — Student Affairs', department: 'Student Affairs', school: 'BBDU', office: 'Admin Block, Room 201', phone: '0522-6177802', email: 'dean.students@bbdu.ac.in', photoBase64: null, order: 3 },
      { id: uid(), name: 'Dr. Priya Sharma', designation: 'Head of Department — Computer Science', department: 'Computer Science & Engineering', school: 'School of Engineering', office: 'CS Block, Room 301', phone: '9876543211', email: 'hod.cse@bbdu.ac.in', photoBase64: null, order: 4 },
      { id: uid(), name: 'Prof. Anand Gupta', designation: 'Head of Department — Information Technology', department: 'Information Technology', school: 'School of Engineering', office: 'IT Block, Room 201', phone: '9876543212', email: 'hod.it@bbdu.ac.in', photoBase64: null, order: 5 },
      { id: uid(), name: 'Dr. Sanjay Mishra', designation: 'Chief Librarian', department: 'Central Library', school: 'BBDU', office: 'Library Building, Ground Floor', phone: '0522-6177810', email: 'library@bbdu.ac.in', photoBase64: null, order: 6 },
    ],

    // ── Communities ─────────────────────────────────────────────────
    communities: [
      { id: uid(), name: 'BBDU Technical Society', description: 'The official technical club of BBDU promoting coding, robotics, AI/ML, and innovation. Hosts TECHNOVA every year. Open to all engineering students.', type: 'technical', logoBase64: null, isRecruitmentActive: true, formUrl: null, memberCount: 245, foundedYear: 2015, tags: 'coding,robotics,AI,hackathon', createdAt: now },
      { id: uid(), name: 'Cultural Club BBDU', description: 'Celebrates art, music, dance, drama, and cultural diversity. Organizes TARANG — the annual cultural fest. All students are welcome.', type: 'cultural', logoBase64: null, isRecruitmentActive: true, formUrl: null, memberCount: 312, foundedYear: 2013, tags: 'dance,music,theatre,art', createdAt: now },
      { id: uid(), name: 'NSS Unit BBDU', description: 'National Service Scheme unit focused on social service, blood donation camps, tree plantation drives, and rural development activities.', type: 'social', logoBase64: null, isRecruitmentActive: false, formUrl: null, memberCount: 180, foundedYear: 2012, tags: 'NSS,social service,volunteer', createdAt: now },
      { id: uid(), name: 'Sports Club', description: 'Promotes physical fitness and sportsmanship. Organizes intra and inter-college tournaments for cricket, football, badminton, and athletics.', type: 'sports', logoBase64: null, isRecruitmentActive: true, formUrl: null, memberCount: 289, foundedYear: 2014, tags: 'cricket,football,badminton,fitness', createdAt: now },
      { id: uid(), name: 'E-Cell BBDU', description: 'Entrepreneurship Cell fostering the spirit of startups and innovation. Organizes pitch competitions, startup weekends, and mentorship programs.', type: 'entrepreneurship', logoBase64: null, isRecruitmentActive: true, formUrl: null, memberCount: 134, foundedYear: 2018, tags: 'startup,entrepreneurship,innovation', createdAt: now },
    ],

    // ── Hostel ──────────────────────────────────────────────────────
    hostelBlocks: [
      { id: 'blk-001', name: 'Vivekananda Block', type: 'boys', totalFloors: 5, address: 'North Campus, BBDU', wardenName: 'Prof. Anand Gupta', wardenPhone: '9876543212', isActive: true },
      { id: 'blk-002', name: 'Saraswati Block', type: 'girls', totalFloors: 4, address: 'South Campus, BBDU', wardenName: 'Dr. Meena Tiwari', wardenPhone: '9876543220', isActive: true },
      { id: 'blk-003', name: 'APJ Abdul Kalam Block', type: 'boys', totalFloors: 3, address: 'East Campus, BBDU', wardenName: 'Mr. Deepak Verma', wardenPhone: '9876543221', isActive: true },
    ],
    hostelRooms: [
      { id: 'rm-001', blockId: 'blk-001', roomNumber: 'A-101', floor: 1, capacity: 2, type: 'double', amenities: 'WiFi, Attached Bathroom, Study Table, Cupboard', isAvailable: false },
      { id: 'rm-002', blockId: 'blk-001', roomNumber: 'A-102', floor: 1, capacity: 2, type: 'double', amenities: 'WiFi, Attached Bathroom, Study Table, Cupboard', isAvailable: true },
      { id: 'rm-003', blockId: 'blk-001', roomNumber: 'A-201', floor: 2, capacity: 2, type: 'double', amenities: 'WiFi, Common Bathroom, Study Table, Cupboard, AC', isAvailable: false },
      { id: 'rm-004', blockId: 'blk-002', roomNumber: 'B-101', floor: 1, capacity: 3, type: 'triple', amenities: 'WiFi, Common Bathroom, Study Table, Almirah', isAvailable: true },
      { id: 'rm-005', blockId: 'blk-002', roomNumber: 'B-105', floor: 1, capacity: 2, type: 'double', amenities: 'WiFi, Attached Bathroom, Study Table, Cupboard', isAvailable: false },
    ],
    roomAllocations: [
      { id: 'alloc-001', studentId: stuId1, roomId: 'rm-003', academicYear: '2025-26', status: 'active', checkInDate: new Date(Date.now() - 180 * 86400000).toISOString(), checkOutDate: null, remarks: 'Regular allocation' },
      { id: 'alloc-002', studentId: stuId2, roomId: 'rm-005', academicYear: '2025-26', status: 'active', checkInDate: new Date(Date.now() - 180 * 86400000).toISOString(), checkOutDate: null, remarks: 'Regular allocation' },
    ],
    gatePasses: [],
    hostelFees: [
      { id: uid(), studentId: stuId1, amount: 45000, feeType: 'hostel', period: 'Sem 2 2025-26', dueDate: new Date(Date.now() + 7 * 86400000).toISOString(), status: 'pending', paidDate: null, paymentRef: null, remarks: 'Hostel + Mess fee' },
      { id: uid(), studentId: stuId2, amount: 45000, feeType: 'hostel', period: 'Sem 2 2025-26', dueDate: new Date(Date.now() + 7 * 86400000).toISOString(), status: 'pending', paidDate: null, paymentRef: null, remarks: 'Hostel + Mess fee' },
    ],
    messMenu: [
      { id: uid(), blockId: 'COMMON', day: 'Monday',    meal: 'breakfast', items: 'Aloo Paratha, Curd, Pickle, Tea/Coffee' },
      { id: uid(), blockId: 'COMMON', day: 'Monday',    meal: 'lunch',     items: 'Rice, Dal Tadka, Sabzi, Roti, Salad, Curd' },
      { id: uid(), blockId: 'COMMON', day: 'Monday',    meal: 'dinner',    items: 'Rice, Rajma, Sabzi, Roti, Kheer' },
      { id: uid(), blockId: 'COMMON', day: 'Tuesday',   meal: 'breakfast', items: 'Poha, Banana, Tea/Coffee' },
      { id: uid(), blockId: 'COMMON', day: 'Tuesday',   meal: 'lunch',     items: 'Rice, Chhole, Roti, Salad, Buttermilk' },
      { id: uid(), blockId: 'COMMON', day: 'Tuesday',   meal: 'dinner',    items: 'Rice, Dal Makhani, Paneer Sabzi, Roti' },
      { id: uid(), blockId: 'COMMON', day: 'Wednesday', meal: 'breakfast', items: 'Idli Sambar, Coconut Chutney, Tea/Coffee' },
      { id: uid(), blockId: 'COMMON', day: 'Wednesday', meal: 'lunch',     items: 'Rice, Arhar Dal, Aloo Gobi, Roti, Salad' },
      { id: uid(), blockId: 'COMMON', day: 'Wednesday', meal: 'dinner',    items: 'Biryani (Veg), Raita, Papad, Sweet' },
      { id: uid(), blockId: 'COMMON', day: 'Thursday',  meal: 'breakfast', items: 'Puri Sabzi, Halwa, Tea/Coffee' },
      { id: uid(), blockId: 'COMMON', day: 'Thursday',  meal: 'lunch',     items: 'Rice, Dal, Mixed Veg, Roti, Salad' },
      { id: uid(), blockId: 'COMMON', day: 'Thursday',  meal: 'dinner',    items: 'Rice, Kadhi Pakoda, Roti, Ice Cream' },
      { id: uid(), blockId: 'COMMON', day: 'Friday',    meal: 'breakfast', items: 'Bread Butter, Omelette/Boiled Egg, Tea/Coffee' },
      { id: uid(), blockId: 'COMMON', day: 'Friday',    meal: 'lunch',     items: 'Rice, Masoor Dal, Bhindi Sabzi, Roti, Salad' },
      { id: uid(), blockId: 'COMMON', day: 'Friday',    meal: 'dinner',    items: 'Noodles/Pasta, Manchurian, Soup' },
      { id: uid(), blockId: 'COMMON', day: 'Saturday',  meal: 'breakfast', items: 'Dosa, Sambar, Chutney, Tea/Coffee' },
      { id: uid(), blockId: 'COMMON', day: 'Saturday',  meal: 'lunch',     items: 'Special Thali — Rice, Dal, 2 Sabzi, Puri, Sweet' },
      { id: uid(), blockId: 'COMMON', day: 'Saturday',  meal: 'dinner',    items: 'Chole Bhature, Lassi' },
      { id: uid(), blockId: 'COMMON', day: 'Sunday',    meal: 'breakfast', items: 'Aloo Puri, Halwa, Tea/Coffee, Juice' },
      { id: uid(), blockId: 'COMMON', day: 'Sunday',    meal: 'lunch',     items: 'Special Sunday Lunch — Paneer, Dal, Pulao, Raita, Sweet' },
      { id: uid(), blockId: 'COMMON', day: 'Sunday',    meal: 'dinner',    items: 'Pizza/Pasta, French Fries, Cold Drink' },
    ],
    hostelComplaints: [],

    // ── Attendance ─────────────────────────────────────────────────
    attendanceSessions: [],
    attendanceRecords: [],

    // ── Classroom ──────────────────────────────────────────────────
    classrooms: [
      { id: 'cls-001', name: 'B.Tech CSE - Section A (Year 3)', course: 'B.Tech CSE', section: 'A', facultyId: facId1, createdAt: now },
    ],
    classroomMembers: [
      { id: uid(), classroomId: 'cls-001', userId: facId1,  role: 'faculty', joinedAt: now },
      { id: uid(), classroomId: 'cls-001', userId: stuId1,  role: 'student', joinedAt: now },
      { id: uid(), classroomId: 'cls-001', userId: stuId2,  role: 'student', joinedAt: now },
    ],
    classroomNotes: [
      { id: uid(), classroomId: 'cls-001', uploaderId: facId1, uploaderName: 'Dr. Priya Sharma', title: 'Unit 1 — Introduction to Machine Learning', description: 'Covers supervised and unsupervised learning concepts, linear regression, and decision trees.', fileName: 'ML_Unit1_Notes.pdf', fileBase64: null, fileType: 'application/pdf', createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
      { id: uid(), classroomId: 'cls-001', uploaderId: facId1, uploaderName: 'Dr. Priya Sharma', title: 'Unit 2 — Neural Networks and Deep Learning', description: 'Forward propagation, backpropagation, activation functions, and CNN architecture.', fileName: 'ML_Unit2_Neural_Networks.pdf', fileBase64: null, fileType: 'application/pdf', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    ],
    classroomMessages: [
      { id: uid(), classroomId: 'cls-001', senderId: facId1, senderName: 'Dr. Priya Sharma', content: 'Dear students, your Unit Test 2 is scheduled for April 20. The syllabus includes Units 3 and 4. Please complete the assignments before the test.', sentAt: new Date(Date.now() - 1 * 86400000).toISOString() },
      { id: uid(), classroomId: 'cls-001', senderId: facId1, senderName: 'Dr. Priya Sharma', content: 'I have uploaded the Unit 2 notes. Please go through them before our next class on Thursday.', sentAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    ],

    // ── Assignments ────────────────────────────────────────────────
    assignments: [
      { id: 'asgn-001', classroomId: 'cls-001', title: 'Assignment 1 — Linear Regression Implementation', description: 'Implement Linear Regression using Python (NumPy/Pandas). Dataset will be provided. Submit Jupyter Notebook.', pdfBase64: null, pdfFileName: null, dueDate: new Date(Date.now() + 7 * 86400000).toISOString(), createdById: facId1, createdByName: 'Dr. Priya Sharma', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
    ],
    assignmentSubmissions: [],

    // ── Lost & Found ───────────────────────────────────────────────
    lostFound: [
      { id: uid(), type: 'lost', title: 'Blue Jansport Backpack', description: 'Lost near the canteen on April 10. Contains notes, calculator, and a water bottle. Name written inside: Rahul Verma. Reward on return.', category: 'bag', location: 'University Canteen Area', reporterId: stuId1, reporterName: 'Rahul Verma', status: 'open', images: [], createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
      { id: uid(), type: 'found', title: 'Casio Scientific Calculator (FX-991EX)', description: 'Found in Lecture Hall 201, CS Block on April 11. Please contact the college security office to claim.', category: 'electronics', location: 'CS Block — Lecture Hall 201', reporterId: facId1, reporterName: 'Dr. Priya Sharma', status: 'open', images: [], createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
      { id: uid(), type: 'lost', title: 'Student ID Card', description: 'Lost ID Card of Roll No. 22IT001 — Amit Singh. Lost somewhere between Library and Sports Ground on April 12. Please reach out to Amit or Security Office.', category: 'documents', location: 'Library — Sports Ground Route', reporterId: stuId3, reporterName: 'Amit Singh', status: 'open', images: [], createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
    ],

    // ── Chat ───────────────────────────────────────────────────────
    chatConversations: [],
    chatMessages: [],
    blockedUsers: [],

    // ── Academics ─────────────────────────────────────────────────
    subjects: [
      { id: uid(), name: 'Machine Learning', code: 'CS601', semester: 6, department: 'Computer Science', credits: 4, maxInternal: 40, maxExternal: 60 },
      { id: uid(), name: 'Data Communication & Networks', code: 'CS602', semester: 6, department: 'Computer Science', credits: 4, maxInternal: 40, maxExternal: 60 },
      { id: uid(), name: 'Software Engineering', code: 'CS603', semester: 6, department: 'Computer Science', credits: 3, maxInternal: 40, maxExternal: 60 },
      { id: uid(), name: 'Cloud Computing', code: 'CS604', semester: 6, department: 'Computer Science', credits: 3, maxInternal: 40, maxExternal: 60 },
      { id: uid(), name: 'Compiler Design', code: 'CS605', semester: 6, department: 'Computer Science', credits: 4, maxInternal: 40, maxExternal: 60 },
    ],
    marks: [],
    calendarEvents: [
      { id: uid(), title: 'Mid-Semester Exams Begin', date: new Date(Date.now() + 8 * 86400000).toISOString(), description: 'Mid-semester examinations commence for all programs', category: 'exam', createdById: adminId },
      { id: uid(), title: 'Career Guidance Workshop', date: new Date(Date.now() + 5 * 86400000).toISOString(), description: 'T&P Cell workshop on campus placement preparation', category: 'event', createdById: adminId },
      { id: uid(), title: 'BBDU Sports Day', date: new Date(Date.now() + 12 * 86400000).toISOString(), description: 'Annual inter-college sports tournament', category: 'event', createdById: adminId },
      { id: uid(), title: 'Last Date — Hostel Fee', date: new Date(Date.now() + 7 * 86400000).toISOString(), description: 'Last date for hostel fee payment without penalty', category: 'deadline', createdById: adminId },
      { id: uid(), title: 'TECHNOVA 2026', date: new Date(Date.now() + 27 * 86400000).toISOString(), description: 'Annual tech fest TECHNOVA 2026', category: 'event', createdById: adminId },
    ],
    feeStructures: [],
    feePayments: [],

    // ── Map Pins ───────────────────────────────────────────────────
    mapPins: [
      { id: uid(), title: 'Main Gate', description: 'University main entrance', lat: 26.8740, lng: 80.9920, category: 'landmark', createdById: adminId },
      { id: uid(), title: 'Central Library', description: 'BBDU Central Library — open 7AM to 11PM during exams', lat: 26.8745, lng: 80.9925, category: 'library', createdById: adminId },
      { id: uid(), title: 'CS Block', description: 'Computer Science & IT Department building', lat: 26.8748, lng: 80.9930, category: 'academic', createdById: adminId },
      { id: uid(), title: 'University Canteen', description: 'Main cafeteria serving breakfast, lunch and dinner', lat: 26.8742, lng: 80.9915, category: 'dining', createdById: adminId },
      { id: uid(), title: 'Sports Ground', description: 'Cricket ground, football field, and athletics track', lat: 26.8755, lng: 80.9935, category: 'sports', createdById: adminId },
    ],
  };
}

// ─── DB Access ────────────────────────────────────────────────────
export function getDb(): any {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return initDb();
}

export function saveDb(db: any): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn('[MockDB] Failed to save:', e);
  }
}

export function initDb(): any {
  const db = createSeed();
  saveDb(db);
  return db;
}

export function resetDb(): void {
  localStorage.removeItem(STORAGE_KEY);
  initDb();
}

// ─── Generic helpers ──────────────────────────────────────────────
export function findById(collection: any[], id: string) {
  return collection.find((x: any) => x.id === id) ?? null;
}

export function findByField(collection: any[], field: string, value: any) {
  return collection.filter((x: any) => x[field] === value);
}
