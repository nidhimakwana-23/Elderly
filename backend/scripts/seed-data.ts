// Seed script for Elderly Care App: Users, Family Profiles, Doctor Profiles, Medicines, Medicine Logs, and 1-Year Health Tracking Logs.
// Run: npx ts-node --esm backend/scripts/seed-data.ts [elderlyId]

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { UserModel } from '../src/db/mongoose/user.model';
import { FamilyProfileModel } from '../src/db/mongoose/family-profile.model';
import { DoctorProfileModel } from '../src/db/mongoose/doctor-profile.model';
import { MedicineModel } from '../src/db/mongoose/medicine.model';
import { MedicineLogModel } from '../src/db/mongoose/medicine-log.model';
import { HealthCheckModel } from '../src/db/mongoose/health-check.model';

import type { User } from '../src/auth/auth.types';
import type { FamilyProfile } from '../src/family/family.types';
import type { DoctorProfile } from '../src/doctor/doctor.types';
import type { Medicine } from '../src/medicine/medicine.types';
import type { MedicineLog } from '../src/medicine-logs/medicine-logs.types';

interface HealthCheckSeed {
  _id: string;
  patient_id: string;
  recorded_by_id: string;
  sugar_level?: number;
  weight?: number;
  blood_pressure?: string;
  blood_level?: string;
  bmi?: number;
  date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface NoteTimelineItem {
  dayMin: number;
  dayMax: number;
  note: string;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

function subDays(baseDate: Date, days: number): Date {
  const d = new Date(baseDate);
  d.setDate(d.getDate() - days);
  return d;
}

function addDays(baseDate: Date, days: number): Date {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 1): number {
  const str = (Math.random() * (max - min) + min).toFixed(decimals);
  return parseFloat(str);
}

function getPeriodFromTime(timeStr: string): 'Morning' | 'Afternoon' | 'Evening' | 'Night' {
  const parts = timeStr.split(':');
  const hour = parseInt(parts[0] ?? '0', 10);
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
}

function addMinutesToTime(timeStr: string, mins: number): string {
  const parts = timeStr.split(':');
  const h = parseInt(parts[0] ?? '0', 10);
  const m = parseInt(parts[1] ?? '0', 10);
  const total = h * 60 + m + mins;
  const newH = Math.floor((total / 60) % 24).toString().padStart(2, '0');
  const newM = Math.floor(total % 60).toString().padStart(2, '0');
  return `${newH}:${newM}`;
}

async function seed(primaryElderlyId: string): Promise<void> {
  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/elderly';
  try {
    await mongoose.connect(dbUri);
    console.log(`Connected to MongoDB at ${dbUri}`);
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }

  const today = new Date();
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // Deterministic IDs for reproducibility
  const primaryUserId = primaryElderlyId;
  const gfUserId = 'a1111111-1111-4111-8111-111111111111';
  const gmUserId = 'a2222222-2222-4222-8222-222222222222';

  // Doctor User IDs
  const doc1UserId = 'd1111111-1111-4111-8111-111111111111';
  const doc2UserId = 'd2222222-2222-4222-8222-222222222222';
  const doc3UserId = 'd3333333-3333-4333-8333-333333333333';
  const doc4UserId = 'd4444444-4444-4444-8444-444444444444';

  const patientUserIds = [primaryUserId, gfUserId, gmUserId];
  const doctorUserIds = [doc1UserId, doc2UserId, doc3UserId, doc4UserId];
  const allUserIds = [...patientUserIds, ...doctorUserIds];

  console.log('Cleaning up old seed data for target user accounts...');
  await UserModel.deleteMany({ id: { $in: allUserIds } });
  await FamilyProfileModel.deleteMany({ linkedToUserId: primaryUserId });
  await DoctorProfileModel.deleteMany({ user_id: { $in: doctorUserIds } });
  await MedicineModel.deleteMany({ patient_id: { $in: patientUserIds } });
  await MedicineLogModel.deleteMany({ elderlyId: { $in: patientUserIds } });
  await HealthCheckModel.deleteMany({ patient_id: { $in: patientUserIds } });

  // 1. Create Users (Patients + Doctors)
  const users: User[] = [
    {
      id: primaryUserId,
      fullName: 'Nidhi Makwana',
      birthdate: '2001-09-23',
      email: 'nidhi@gmail.com',
      passwordHash,
      phone: '+1-555-0100',
      createdAt: formatDate(subDays(today, 400)) + 'T08:00:00.000Z',
      role: 'normal',
    },
    {
      id: gfUserId,
      fullName: 'Arthur Makwana (Grandfather)',
      birthdate: '1948-03-15',
      email: 'arthur@gmail.com',
      passwordHash,
      phone: '+1-555-0101',
      createdAt: formatDate(subDays(today, 400)) + 'T08:00:00.000Z',
      role: 'family',
    },
    {
      id: gmUserId,
      fullName: 'Eleanor Makwana (Grandmother)',
      birthdate: '1951-07-22',
      email: 'eleanor@gmail.com',
      passwordHash,
      phone: '+1-555-0102',
      createdAt: formatDate(subDays(today, 400)) + 'T08:00:00.000Z',
      role: 'family',
    },
    // Doctor Accounts
    {
      id: doc1UserId,
      fullName: 'Dr. Harish Sharma',
      birthdate: '1975-04-12',
      email: 'dr.sharma@elderlycare.com',
      passwordHash,
      phone: '+1-555-0199',
      createdAt: formatDate(subDays(today, 400)) + 'T08:00:00.000Z',
      role: 'doctor',
    },
    {
      id: doc2UserId,
      fullName: 'Dr. Ananya Kapoor',
      birthdate: '1982-08-25',
      email: 'dr.kapoor@elderlycare.com',
      passwordHash,
      phone: '+1-555-0142',
      createdAt: formatDate(subDays(today, 400)) + 'T08:00:00.000Z',
      role: 'doctor',
    },
    {
      id: doc3UserId,
      fullName: 'Dr. Rajesh Mehta',
      birthdate: '1970-11-18',
      email: 'dr.mehta@elderlycare.com',
      passwordHash,
      phone: '+1-555-0177',
      createdAt: formatDate(subDays(today, 400)) + 'T08:00:00.000Z',
      role: 'doctor',
    },
    {
      id: doc4UserId,
      fullName: 'Dr. Sunita Roy',
      birthdate: '1980-03-30',
      email: 'dr.roy@elderlycare.com',
      passwordHash,
      phone: '+1-555-0188',
      createdAt: formatDate(subDays(today, 400)) + 'T08:00:00.000Z',
      role: 'doctor',
    },
  ];

  await UserModel.insertMany(users);
  console.log(`Inserted ${users.length} Users`);

  // 2. Create Family Profiles
  const familyProfiles: FamilyProfile[] = [
    {
      id: 'fp-gf-001',
      userId: gfUserId,
      linkedToUserId: primaryUserId,
      medicalCondition: 'Type 2 Diabetes Mellitus, Right Radius Fracture (Healing), Mild Hypertension',
      emergencyContacts: [
        'Daughter - Nidhi Makwana (+1-555-0100)',
        'Endocrinologist - Dr. H. Sharma (+1-555-0199)',
        'Ortho Clinic - Dr. A. Kapoor (+1-555-0142)',
      ],
    },
    {
      id: 'fp-gm-002',
      userId: gmUserId,
      linkedToUserId: primaryUserId,
      medicalCondition: 'Essential Hypertension, Atopic Dermatitis / Eczema flare-ups',
      emergencyContacts: [
        'Daughter - Nidhi Makwana (+1-555-0100)',
        'Cardiologist - Dr. R. Mehta (+1-555-0177)',
        'Dermatology Clinic - Dr. S. Roy (+1-555-0188)',
      ],
    },
  ];

  await FamilyProfileModel.insertMany(familyProfiles);
  console.log(`Inserted ${familyProfiles.length} Family Profiles`);

  // 3. Create Doctor Profiles
  const doctorProfiles: DoctorProfile[] = [
    {
      id: 'doc-prof-001',
      user_id: doc1UserId,
      specialization: 'Endocrinologist & Diabetes Specialist',
      license_number: 'MD-END-99201',
      phone: '+1-555-0199',
      bio: 'Senior Endocrinologist with 18+ years experience managing geriatric diabetes and metabolic health.',
      location: { type: 'Point', coordinates: [-73.98513, 40.748817] },
      is_available_for_emergency: true,
      availability: [
        { id: 'slot-101', day_of_week: 1, start_time: '09:00', end_time: '12:00', is_booked: false },
        { id: 'slot-102', day_of_week: 1, start_time: '14:00', end_time: '17:00', is_booked: false },
        { id: 'slot-103', day_of_week: 3, start_time: '09:00', end_time: '12:00', is_booked: false },
        { id: 'slot-104', day_of_week: 5, start_time: '09:00', end_time: '12:00', is_booked: false },
      ],
      created_at: formatDate(subDays(today, 365)) + 'T08:00:00.000Z',
      updated_at: formatDate(today) + 'T08:00:00.000Z',
    },
    {
      id: 'doc-prof-002',
      user_id: doc2UserId,
      specialization: 'Orthopedic Surgeon & Bone Health Specialist',
      license_number: 'MD-ORT-88104',
      phone: '+1-555-0142',
      bio: 'Specialist in fracture management, bone osteoporosis, and joint mobility care for elderly patients.',
      location: { type: 'Point', coordinates: [-73.9782, 40.7527] },
      is_available_for_emergency: true,
      availability: [
        { id: 'slot-201', day_of_week: 2, start_time: '10:00', end_time: '13:00', is_booked: false },
        { id: 'slot-202', day_of_week: 4, start_time: '10:00', end_time: '13:00', is_booked: false },
        { id: 'slot-203', day_of_week: 6, start_time: '10:00', end_time: '13:00', is_booked: false },
      ],
      created_at: formatDate(subDays(today, 365)) + 'T08:00:00.000Z',
      updated_at: formatDate(today) + 'T08:00:00.000Z',
    },
    {
      id: 'doc-prof-003',
      user_id: doc3UserId,
      specialization: 'Cardiologist & Hypertension Specialist',
      license_number: 'MD-CAR-77309',
      phone: '+1-555-0177',
      bio: 'Board-certified cardiologist specializing in senior blood pressure management, preventive cardiology, and ECG monitoring.',
      location: { type: 'Point', coordinates: [-73.981, 40.745] },
      is_available_for_emergency: true,
      availability: [
        { id: 'slot-301', day_of_week: 1, start_time: '08:30', end_time: '12:30', is_booked: false },
        { id: 'slot-302', day_of_week: 2, start_time: '08:30', end_time: '12:30', is_booked: false },
        { id: 'slot-303', day_of_week: 3, start_time: '08:30', end_time: '12:30', is_booked: false },
        { id: 'slot-304', day_of_week: 4, start_time: '08:30', end_time: '12:30', is_booked: false },
      ],
      created_at: formatDate(subDays(today, 365)) + 'T08:00:00.000Z',
      updated_at: formatDate(today) + 'T08:00:00.000Z',
    },
    {
      id: 'doc-prof-004',
      user_id: doc4UserId,
      specialization: 'Consultant Dermatologist',
      license_number: 'MD-DER-66120',
      phone: '+1-555-0188',
      bio: 'Expert in eczema, psoriasis, skin rash treatments, and sensitive skin disorders in older adults.',
      location: { type: 'Point', coordinates: [-73.989, 40.741] },
      is_available_for_emergency: false,
      availability: [
        { id: 'slot-401', day_of_week: 1, start_time: '09:30', end_time: '14:00', is_booked: false },
        { id: 'slot-402', day_of_week: 3, start_time: '09:30', end_time: '14:00', is_booked: false },
        { id: 'slot-403', day_of_week: 5, start_time: '09:30', end_time: '14:00', is_booked: false },
      ],
      created_at: formatDate(subDays(today, 365)) + 'T08:00:00.000Z',
      updated_at: formatDate(today) + 'T08:00:00.000Z',
    },
  ];

  await DoctorProfileModel.insertMany(doctorProfiles);
  console.log(`Inserted ${doctorProfiles.length} Doctor Profiles`);

  // 4. Create Medicines
  const medicines: Medicine[] = [
    // --- Grandfather Medicines (Diabetic + Minor Fracture) ---
    {
      id: 'med-gf-01',
      patient_id: gfUserId,
      medicine_name: 'Metformin HCl 500mg',
      medicine_type: 'Tablet',
      dosage: '1 tablet',
      strength: '500mg',
      frequency: 'Twice Daily',
      timing: ['Morning', 'Evening'],
      start_date: formatDate(subDays(today, 365)),
      end_date: formatDate(addDays(today, 30)),
      reminder_enabled: true,
      reminder_times: ['08:00', '20:00'],
      quantity: 60,
      doctor_name: 'Dr. Harish Sharma',
      prescription_number: 'RX-DIA-8821',
      notes: 'Take twice daily after meals for diabetes blood sugar management.',
      status: 'Active',
      created_at: formatDate(subDays(today, 365)) + 'T08:00:00.000Z',
      updated_at: formatDate(today) + 'T08:00:00.000Z',
    },
    {
      id: 'med-gf-02',
      patient_id: gfUserId,
      medicine_name: 'Glipizide 5mg',
      medicine_type: 'Tablet',
      dosage: '1 tablet',
      strength: '5mg',
      frequency: 'Once Daily',
      timing: ['Morning'],
      start_date: formatDate(subDays(today, 365)),
      end_date: formatDate(addDays(today, 30)),
      reminder_enabled: true,
      reminder_times: ['08:00'],
      quantity: 30,
      doctor_name: 'Dr. Harish Sharma',
      prescription_number: 'RX-DIA-8822',
      notes: 'Take once daily 30 minutes before breakfast.',
      status: 'Active',
      created_at: formatDate(subDays(today, 365)) + 'T08:00:00.000Z',
      updated_at: formatDate(today) + 'T08:00:00.000Z',
    },
    {
      id: 'med-gf-03',
      patient_id: gfUserId,
      medicine_name: 'Calcium + Vitamin D3 1000IU',
      medicine_type: 'Tablet',
      dosage: '1 tablet',
      strength: '1000IU',
      frequency: 'Once Daily',
      timing: ['Afternoon'],
      start_date: formatDate(subDays(today, 120)),
      end_date: formatDate(addDays(today, 60)),
      reminder_enabled: true,
      reminder_times: ['13:00'],
      quantity: 60,
      doctor_name: 'Dr. Ananya Kapoor',
      prescription_number: 'RX-ORT-3391',
      notes: 'Prescribed for right radius bone fracture recovery and bone density support.',
      status: 'Active',
      created_at: formatDate(subDays(today, 120)) + 'T10:00:00.000Z',
      updated_at: formatDate(today) + 'T10:00:00.000Z',
    },
    {
      id: 'med-gf-04',
      patient_id: gfUserId,
      medicine_name: 'Acetaminophen (Paracetamol) 500mg',
      medicine_type: 'Tablet',
      dosage: '1 tablet',
      strength: '500mg',
      frequency: 'Twice Daily',
      timing: ['Morning', 'Evening'],
      start_date: formatDate(subDays(today, 120)),
      end_date: formatDate(subDays(today, 60)),
      reminder_enabled: false,
      reminder_times: ['08:00', '20:00'],
      quantity: 120,
      doctor_name: 'Dr. Ananya Kapoor',
      prescription_number: 'RX-ORT-3392',
      notes: 'Pain management for right arm wrist hairline fracture.',
      status: 'Completed',
      created_at: formatDate(subDays(today, 120)) + 'T10:00:00.000Z',
      updated_at: formatDate(subDays(today, 60)) + 'T10:00:00.000Z',
    },

    // --- Grandmother Medicines (BP Problem + Skin Diseases) ---
    {
      id: 'med-gm-01',
      patient_id: gmUserId,
      medicine_name: 'Amlodipine Besylate 5mg',
      medicine_type: 'Tablet',
      dosage: '1 tablet',
      strength: '5mg',
      frequency: 'Once Daily',
      timing: ['Morning'],
      start_date: formatDate(subDays(today, 365)),
      end_date: formatDate(addDays(today, 30)),
      reminder_enabled: true,
      reminder_times: ['08:00'],
      quantity: 30,
      doctor_name: 'Dr. Rajesh Mehta',
      prescription_number: 'RX-CAR-5510',
      notes: 'Take once daily in the morning for blood pressure management.',
      status: 'Active',
      created_at: formatDate(subDays(today, 365)) + 'T08:00:00.000Z',
      updated_at: formatDate(today) + 'T08:00:00.000Z',
    },
    {
      id: 'med-gm-02',
      patient_id: gmUserId,
      medicine_name: 'Lisinopril 10mg',
      medicine_type: 'Tablet',
      dosage: '1 tablet',
      strength: '10mg',
      frequency: 'Once Daily',
      timing: ['Night'],
      start_date: formatDate(subDays(today, 365)),
      end_date: formatDate(addDays(today, 30)),
      reminder_enabled: true,
      reminder_times: ['20:00'],
      quantity: 30,
      doctor_name: 'Dr. Rajesh Mehta',
      prescription_number: 'RX-CAR-5511',
      notes: 'Bedtime dose for 24-hour hypertension control.',
      status: 'Active',
      created_at: formatDate(subDays(today, 365)) + 'T08:00:00.000Z',
      updated_at: formatDate(today) + 'T08:00:00.000Z',
    },
    {
      id: 'med-gm-03',
      patient_id: gmUserId,
      medicine_name: 'Triamcinolone Acetonide Ointment 0.1%',
      medicine_type: 'Cream',
      dosage: 'Thin layer application',
      strength: '0.1%',
      frequency: 'Twice Daily',
      timing: ['Morning', 'Night'],
      start_date: formatDate(subDays(today, 200)),
      end_date: formatDate(addDays(today, 30)),
      reminder_enabled: false,
      reminder_times: ['09:00', '21:00'],
      quantity: 1,
      doctor_name: 'Dr. Sunita Roy',
      prescription_number: 'RX-DER-1044',
      notes: 'Apply topically during skin eczema/dermatitis flare-ups on forearms and neck.',
      status: 'Active',
      created_at: formatDate(subDays(today, 200)) + 'T09:00:00.000Z',
      updated_at: formatDate(today) + 'T09:00:00.000Z',
    },
    {
      id: 'med-gm-04',
      patient_id: gmUserId,
      medicine_name: 'Cetirizine Hydrochloride 10mg',
      medicine_type: 'Tablet',
      dosage: '1 tablet',
      strength: '10mg',
      frequency: 'Once Daily',
      timing: ['Night'],
      start_date: formatDate(subDays(today, 200)),
      end_date: formatDate(addDays(today, 30)),
      reminder_enabled: true,
      reminder_times: ['21:00'],
      quantity: 30,
      doctor_name: 'Dr. Sunita Roy',
      prescription_number: 'RX-DER-1045',
      notes: 'Antihistamine to reduce severe skin itching during dermatitis flare-ups.',
      status: 'Active',
      created_at: formatDate(subDays(today, 200)) + 'T09:00:00.000Z',
      updated_at: formatDate(today) + 'T09:00:00.000Z',
    },

    // --- Primary User Medicines ---
    {
      id: 'med-pri-01',
      patient_id: primaryUserId,
      medicine_name: 'Daily Multivitamin Complex',
      medicine_type: 'Tablet',
      dosage: '1 tablet',
      strength: 'Standard',
      frequency: 'Once Daily',
      timing: ['Morning'],
      start_date: formatDate(subDays(today, 365)),
      end_date: formatDate(addDays(today, 30)),
      reminder_enabled: true,
      reminder_times: ['08:00'],
      quantity: 90,
      doctor_name: 'Dr. P. Jones',
      prescription_number: 'OTC-VITA-1',
      notes: 'General wellness multivitamin supplement.',
      status: 'Active',
      created_at: formatDate(subDays(today, 365)) + 'T08:00:00.000Z',
      updated_at: formatDate(today) + 'T08:00:00.000Z',
    },
    {
      id: 'med-pri-02',
      patient_id: primaryUserId,
      medicine_name: 'Vitamin D3 2000IU',
      medicine_type: 'Capsule',
      dosage: '1 capsule',
      strength: '2000IU',
      frequency: 'Once Daily',
      timing: ['Morning'],
      start_date: formatDate(subDays(today, 180)),
      end_date: formatDate(addDays(today, 30)),
      reminder_enabled: true,
      reminder_times: ['08:00'],
      quantity: 60,
      doctor_name: 'Dr. P. Jones',
      prescription_number: 'RX-VIT-901',
      notes: 'Supplement for bone health and sunshine vitamin boost.',
      status: 'Active',
      created_at: formatDate(subDays(today, 180)) + 'T08:00:00.000Z',
      updated_at: formatDate(today) + 'T08:00:00.000Z',
    },
  ];

  await MedicineModel.insertMany(medicines);
  console.log(`Inserted ${medicines.length} Medicines`);

  // 5. Generate 1 Year of Medicine Logs
  const medicineLogs: MedicineLog[] = [];
  const skipReasonsList: string[] = [
    'Fasting for morning routine blood test',
    'Slept early / missed dose window',
    'Felt mild stomach nausea',
    'Traveling without pill organizer',
    'Doctor advised temporary pause',
    'Dermatitis symptom free today',
  ];

  for (let dayOffset = 365; dayOffset >= 0; dayOffset--) {
    const current = subDays(today, dayOffset);
    const dateStr = formatDate(current);

    for (const med of medicines) {
      if (dateStr < med.start_date || (med.end_date && dateStr > med.end_date)) {
        continue;
      }

      // If skin medicine for Grandmother, only active during flare-up windows (days 200-140 ago and 50-0 days ago)
      if (med.id === 'med-gm-03' || med.id === 'med-gm-04') {
        const isFlareUpWindow1 = dayOffset >= 140 && dayOffset <= 200;
        const isFlareUpWindow2 = dayOffset <= 50;
        if (!isFlareUpWindow1 && !isFlareUpWindow2) {
          continue;
        }
      }

      for (const timeStr of med.reminder_times) {
        const randVal = Math.random();
        let status: 'Taken' | 'Missed' | 'Skipped' = 'Taken';
        let takenTime: string | null = addMinutesToTime(timeStr, randomInt(5, 25));
        let skippedReason: string | undefined = undefined;

        if (randVal > 0.92) {
          status = 'Missed';
          takenTime = null;
        } else if (randVal > 0.85) {
          status = 'Skipped';
          takenTime = null;
          const reasonIdx = randomInt(0, skipReasonsList.length - 1);
          skippedReason = skipReasonsList[reasonIdx];
        }

        const createdAtISO = `${dateStr}T${timeStr}:00.000Z`;

        medicineLogs.push({
          id: randomUUID(),
          medicineId: med.id,
          elderlyId: med.patient_id,
          medicineName: med.medicine_name,
          dosage: med.dosage,
          scheduledDate: dateStr,
          scheduledTime: timeStr,
          takenTime,
          status,
          ...(skippedReason ? { skippedReason } : {}),
          period: getPeriodFromTime(timeStr),
          ...(status === 'Taken' ? { remarks: 'Dose taken on schedule' } : {}),
          createdAt: createdAtISO,
          updatedAt: createdAtISO,
        });
      }
    }
  }

  // Insert medicine logs in batches of 1000
  const BATCH_SIZE = 1000;
  for (let i = 0; i < medicineLogs.length; i += BATCH_SIZE) {
    const chunk = medicineLogs.slice(i, i + BATCH_SIZE);
    await MedicineLogModel.insertMany(chunk);
  }
  console.log(`Inserted ${medicineLogs.length} Medicine Logs spanning 1 year`);

  // 6. Generate 1 Year of Health Tracking Logs (HealthChecks)
  const healthChecks: HealthCheckSeed[] = [];

  // Notes timeline for Grandfather (Arthur) - Diabetes + Wrist Fracture
  const gfNotesTimeline: NoteTimelineItem[] = [
    { dayMin: 350, dayMax: 365, note: 'Routine morning blood sugar check. Feeling energetic.' },
    { dayMin: 300, dayMax: 310, note: 'Fasting glucose test done at clinic. Diabetes under control.' },
    { dayMin: 240, dayMax: 255, note: 'Fasting sugar slightly high after family gathering sweets.' },
    { dayMin: 115, dayMax: 120, note: 'Fell in garden - right wrist swollen. Emergency X-ray confirmed hairline fracture of radius.' },
    { dayMin: 105, dayMax: 114, note: 'Arm cast applied. Prescribed Calcium & D3. Resting right arm.' },
    { dayMin: 85, dayMax: 95, note: 'Right wrist X-ray review shows good bone callus formation. Mild stiffness.' },
    { dayMin: 55, dayMax: 65, note: 'Arm cast removed! Wrist mobility improving, starting light therapy exercises.' },
    { dayMin: 20, dayMax: 30, note: 'Fasting sugar well within target range. Fracture fully healed.' },
    { dayMin: 0, dayMax: 10, note: 'Morning blood glucose in normal range. Right wrist pain completely free.' },
  ];

  // Notes timeline for Grandmother (Eleanor) - BP + Eczema
  const gmNotesTimeline: NoteTimelineItem[] = [
    { dayMin: 340, dayMax: 365, note: 'Morning BP reading normal. Walked 30 mins in park.' },
    { dayMin: 195, dayMax: 200, note: 'Noticed intense itching and red patches on forearm skin (eczema flare).' },
    { dayMin: 180, dayMax: 194, note: 'Dermatologist visit: started Triamcinolone ointment & Cetirizine.' },
    { dayMin: 155, dayMax: 170, note: 'Skin rash redness fading, itching significantly reduced.' },
    { dayMin: 135, dayMax: 145, note: 'Skin completely clear. Paused topical ointment. BP stable at 124/80.' },
    { dayMin: 45, dayMax: 50, note: 'Autumn skin flare-up: mild itchiness on neck and forearms.' },
    { dayMin: 25, dayMax: 40, note: 'Resumed topical eczema ointment. Skin redness cooling down.' },
    { dayMin: 0, dayMax: 15, note: 'Skin inflammation well controlled. BP stable at 122/78 mmHg.' },
  ];

  for (let dayOffset = 365; dayOffset >= 0; dayOffset -= 2) {
    const current = subDays(today, dayOffset);
    const dateStr = formatDate(current);
    const createdAtISO = `${dateStr}T08:30:00.000Z`;

    // --- Grandfather Health Check ---
    let gfSugar = randomInt(115, 145);
    if (dayOffset >= 240 && dayOffset <= 255) {
      gfSugar = randomInt(168, 185);
    }
    const gfSystolic = randomInt(126, 138);
    const gfDiastolic = randomInt(80, 88);
    const gfWeight = randomFloat(77.2, 78.6, 1);
    const gfBmi = randomFloat(26.0, 26.4, 1);

    const gfNoteObj = gfNotesTimeline.find((n) => dayOffset >= n.dayMin && dayOffset <= n.dayMax);
    const gfNote = gfNoteObj ? gfNoteObj.note : (dayOffset % 10 === 0 ? 'Fasting glucose and BP recorded.' : undefined);

    healthChecks.push({
      _id: randomUUID(),
      patient_id: gfUserId,
      recorded_by_id: primaryUserId,
      sugar_level: gfSugar,
      weight: gfWeight,
      blood_pressure: `${gfSystolic}/${gfDiastolic}`,
      blood_level: dayOffset % 60 === 0 ? 'HbA1c: 6.9%' : 'Hb: 13.8 g/dL',
      bmi: gfBmi,
      date: dateStr,
      ...(gfNote ? { notes: gfNote } : {}),
      created_at: createdAtISO,
      updated_at: createdAtISO,
    });

    // --- Grandmother Health Check ---
    const gmSystolic = randomInt(118, 138);
    const gmDiastolic = randomInt(76, 88);
    const gmSugar = randomInt(90, 106);
    const gmWeight = randomFloat(61.8, 62.8, 1);
    const gmBmi = randomFloat(24.0, 24.4, 1);

    const gmNoteObj = gmNotesTimeline.find((n) => dayOffset >= n.dayMin && dayOffset <= n.dayMax);
    const gmNote = gmNoteObj ? gmNoteObj.note : (dayOffset % 10 === 0 ? 'Routine morning BP and vital sign check.' : undefined);

    healthChecks.push({
      _id: randomUUID(),
      patient_id: gmUserId,
      recorded_by_id: primaryUserId,
      sugar_level: gmSugar,
      weight: gmWeight,
      blood_pressure: `${gmSystolic}/${gmDiastolic}`,
      ...(dayOffset % 60 === 0 ? { blood_level: 'Hb: 12.8 g/dL' } : {}),
      bmi: gmBmi,
      date: dateStr,
      ...(gmNote ? { notes: gmNote } : {}),
      created_at: createdAtISO,
      updated_at: createdAtISO,
    });

    // --- Primary User Health Check ---
    const priSystolic = randomInt(116, 124);
    const priDiastolic = randomInt(74, 82);
    const priSugar = randomInt(86, 98);
    const priWeight = randomFloat(74.5, 75.6, 1);
    const priBmi = randomFloat(23.4, 23.8, 1);

    healthChecks.push({
      _id: randomUUID(),
      patient_id: primaryUserId,
      recorded_by_id: primaryUserId,
      sugar_level: priSugar,
      weight: priWeight,
      blood_pressure: `${priSystolic}/${priDiastolic}`,
      ...(dayOffset % 90 === 0 ? { blood_level: 'Vit D: 34 ng/mL' } : {}),
      bmi: priBmi,
      date: dateStr,
      ...(dayOffset % 14 === 0 ? { notes: 'Weekly personal health check. All vitals optimal.' } : {}),
      created_at: createdAtISO,
      updated_at: createdAtISO,
    });
  }

  for (let i = 0; i < healthChecks.length; i += BATCH_SIZE) {
    const chunk = healthChecks.slice(i, i + BATCH_SIZE);
    await HealthCheckModel.insertMany(chunk);
  }
  console.log(`Inserted ${healthChecks.length} Health Check Records spanning 1 year`);

  console.log('\n--- DATA SEEDING COMPLETE ---');
  console.log(`Primary User ID: ${primaryUserId}`);
  console.log(`Grandfather User ID (Patient 1): ${gfUserId}`);
  console.log(`Grandmother User ID (Patient 2): ${gmUserId}`);
  console.log(`Seeded Doctors (${doctorProfiles.length}): Dr. Sharma, Dr. Kapoor, Dr. Mehta, Dr. Roy`);
}

const targetElderlyId = process.argv[2] || 'e7a16b93-3af7-47e6-9331-2e7ddd4efd50';
seed(targetElderlyId)
  .then(() => {
    console.log('Seed script finished successfully.');
    mongoose.disconnect();
  })
  .catch((err) => {
    console.error('Seed script failed:', err);
    mongoose.disconnect();
    process.exit(1);
  });
