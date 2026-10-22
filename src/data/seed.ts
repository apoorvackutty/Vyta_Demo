// All data is fictional. Source: docs/SAMPLE_DATA.md (Testelle M is the synthetic report's demo patient).
import type {
  Staff, Member, FormTemplate, StaticTask, Milestone, IntakeValue,
} from '../types';

export const STAFF: Staff[] = [
  { id: 's-guide', name: 'Maya Ellis', roles: ['guide'], title: 'Vyta Guide' },
  { id: 's-ma', name: 'Jordan Park', roles: ['ma'], title: 'Medical Assistant' },
  { id: 's-np', name: 'Dana Reyes', roles: ['np'], title: 'Nurse Practitioner' },
  { id: 's-coach', name: 'Sienna Clarke', roles: ['coach'], title: 'Wellness Coach' },
  { id: 's-admin', name: 'Quinn Harper', roles: ['admin'], title: 'Clinic Admin' },
];

export const STAFF_BY_ROLE: Record<string, string> = {
  guide: 's-guide', ma: 's-ma', np: 's-np', coach: 's-coach', admin: 's-admin',
};

export const TESTELLE_MILESTONES: Milestone[] = [
  { id: 'ms-energy', label: 'Steady energy for family and travel', score: 1, target: 7, selected: true },
  { id: 'ms-mood', label: 'Steady mood', score: 7, target: 8, selected: true },
  { id: 'ms-strength', label: 'Upper-body strength (grip, carry)', score: 4, target: 7, selected: true },
  { id: 'ms-recovery', label: 'Recovery after exercise', score: 5, target: 7, selected: true },
  { id: 'ms-digestion', label: 'Digestive comfort', score: 5, target: 7, selected: true },
  { id: 'ms-connection', label: 'Feeling connected', score: 2, target: 7, selected: true },
  { id: 'ms-sleep', label: 'Restorative sleep', score: 10, target: 8, selected: false },
  { id: 'ms-focus', label: 'Clear focus at work', score: 6, target: 8, selected: false },
];

export const TESTELLE_GOALS = [
  'Energy for my family, travel and hobbies.',
  'Steadier mood.',
  'Feel strong again, especially upper body.',
  'Recover better after workouts.',
  'Less bloating.',
];

const base = (m: Partial<Member> & Pick<Member, 'id' | 'name'>): Member => ({
  dob: '1978-05-02', menoStatus: 'peri', program: 'discover', phase: 'intake_labs', step: '',
  guideId: 's-guide', npId: 's-np', coachId: 's-coach', maId: 's-ma',
  goals: [], milestones: [], joinedAt: '2026-09-20T10:00', ...m,
});

export const TESTELLE_BASE: Member = base({
  id: 'm-testelle', name: 'Testelle M', dob: '1980-01-01', menoStatus: 'peri', program: 'discover',
  phase: 'join', step: 'Paid · ready to onboard', goals: TESTELLE_GOALS,
  milestones: TESTELLE_MILESTONES.map((m) => ({ ...m })), joinedAt: '2026-10-12T09:58',
  lastContactAt: '2026-10-09T15:00', vytaDayAt: '2026-10-28T08:30', isLead: true,
});

export const ROSTER: Member[] = [
  base({ id: 'm-maren', name: 'Maren Holt', dob: '1977-03-14', step: 'Intake 40%', joinedAt: '2026-10-08T10:00' }),
  base({ id: 'm-priya', name: 'Priya Nandakumar', dob: '1975-11-02', step: 'Blood draw overdue', joinedAt: '2026-10-02T10:00' }),
  base({ id: 'm-celeste', name: 'Celeste Arroyo', dob: '1979-07-21', phase: 'vyta_day', step: 'Your Vyta Day booked', joinedAt: '2026-09-24T10:00' }),
  base({ id: 'm-ingrid', name: 'Ingrid Halvorsen', dob: '1973-02-09', program: 'heal', phase: 'first_30', step: 'Week 2 · consent unsigned', menoStatus: 'post', joinedAt: '2026-09-01T10:00' }),
  base({ id: 'm-joanne', name: 'Joanne Whitaker', dob: '1971-09-30', program: 'heal', phase: 'ongoing', step: 'Missed 2 check-ins', menoStatus: 'post', joinedAt: '2026-06-15T10:00' }),
  base({ id: 'm-renata', name: 'Renata Kowalski', dob: '1972-04-18', program: 'optimize', phase: 'ongoing', step: 'Quarterly review due', menoStatus: 'post', joinedAt: '2026-04-10T10:00' }),
  base({ id: 'm-corinne', name: 'Corinne Dubois', dob: '1976-12-05', program: 'heal', phase: 'first_30', step: 'NP early check due', joinedAt: '2026-09-15T10:00' }),
  base({ id: 'm-hana', name: 'Hana Sato', dob: '1969-08-11', program: 'thrive', phase: 'ongoing', step: 'Message waiting 26 h', menoStatus: 'post', joinedAt: '2025-11-03T10:00' }),
];

export const STATIC_TASKS: StaticTask[] = [
  { id: 't-maren', memberId: 'm-maren', roles: ['guide'], category: 'overdue', label: 'Intake 40% · 3 days', reason: 'Stopped at Sleep & habits', ageLabel: '3d', priority: 2 },
  { id: 't-priya', memberId: 'm-priya', roles: ['guide', 'ma'], category: 'overdue', label: 'Blood draw overdue', reason: 'Booked 9 Oct, not attended', ageLabel: '5d', priority: 2 },
  { id: 't-celeste', memberId: 'm-celeste', roles: ['guide', 'ma', 'np'], category: 'visits', label: 'Your Vyta Day booked', reason: 'Fri 30 Oct · 8:30', ageLabel: '—', priority: 3 },
  { id: 't-ingrid', memberId: 'm-ingrid', roles: ['guide'], category: 'forms', label: 'Treatment consent unsigned', reason: 'Testosterone use consent, sent 6 days ago', ageLabel: '6d', priority: 2 },
  { id: 't-joanne', memberId: 'm-joanne', roles: ['guide', 'coach'], category: 'engagement', label: 'Drifting · missed 2 check-ins', reason: 'Energy trending down for 3 weeks', ageLabel: '14d', priority: 2 },
  { id: 't-renata', memberId: 'm-renata', roles: ['np'], category: 'reviews', label: 'Quarterly review due', reason: 'Retest done 9 Oct · delta report drafted', ageLabel: '4d', priority: 2 },
  { id: 't-corinne', memberId: 'm-corinne', roles: ['np'], category: 'reviews', label: 'NP early check due', reason: 'Week 2 after starting treatment (timing to confirm)', ageLabel: '1d', priority: 2 },
  { id: 't-hana', memberId: 'm-hana', roles: ['guide'], category: 'messages', label: 'Message waiting 26 h', reason: 'Over the 24-hour reply time · SAGE sent a holding reply', ageLabel: '26h', priority: 1 },
  { id: 't-celeste-coach', memberId: 'm-celeste', roles: ['coach'], category: 'reviews', label: 'Wording review', reason: 'Draft report pre-reviewed by NP', ageLabel: '1d', priority: 2 },
];

export const FORMS: FormTemplate[] = [
  {
    id: 'f-recording', title: 'Consent to be recorded', kind: 'onboarding_consent', version: 'v1.2',
    summary: 'Telehealth sessions may be recorded to create an accurate transcript for your practitioner.',
    body: [
      'Purpose of recording. To enhance the quality of our services, your telehealth session will be recorded visually and verbally. Recordings are used only to generate an accurate transcript, which is provided solely to your practitioner so they can stay fully present without taking notes.',
      'Confidentiality and security. Recordings are never used for any other purpose and are never shared, published or distributed. Recordings and transcripts are stored securely to industry standards.',
      'Voluntary consent. Taking part is entirely voluntary. You can decline or withdraw consent at any time before or during a session. If you withdraw, no further recordings take place and existing recordings are deleted under our data retention policy.',
      'Acknowledgement. By typing your name you confirm you have read and understood this form and agree to be recorded for transcription.',
    ],
  },
  {
    id: 'f-informed', title: 'Informed consent for telehealth', kind: 'onboarding_consent', version: 'v1.1',
    summary: 'You agree to consult with your Vyta provider by video, and understand the risks and benefits.',
    body: [
      'Your health and wellness provider would like you to have telehealth consultations through an interactive video connection on the Vyta platform.',
      'Risks: the video connection may not work or may stop during the consultation; the picture or information may not be clear enough to be useful.',
      'Benefits: you do not need to travel to the consultation, and you have access to a specialist.',
      'Other people may need to use the Vyta platform; reasonable steps are taken to keep your information confidential. You have had the chance to ask questions and consent to telehealth sessions under these conditions.',
    ],
  },
  {
    id: 'f-treatment', title: 'Treatment consent', kind: 'onboarding_consent', version: 'v1.0',
    summary: 'You give permission for the evaluation needed to recommend your treatment.',
    body: [
      'You have the right, as a patient, to be informed about your condition and the recommended items, procedures and services. This form gives permission for the evaluation needed to identify the right treatment for any condition found.',
      'This consent continues after a diagnosis is made and treatment is recommended. You have the right to discuss the purpose, risks and benefits of any test or treatment with your clinician.',
    ],
  },
  {
    id: 'f-intake', title: 'Vyta intake', kind: 'intake', version: 'Oct 26',
    summary: '7 short sections about your goals, health, habits and wellbeing. About 25 minutes. You can save and come back.',
    body: [],
  },
  {
    id: 'f-testosterone', title: 'Testosterone use consent', kind: 'treatment_consent', version: 'draft',
    summary: '[CLINIC TO PROVIDE] Consent for testosterone therapy.', body: ['[CLINIC TO PROVIDE] Full consent text for testosterone therapy.'],
  },
  {
    id: 'f-peptides', title: 'Peptides (not FDA-approved) consent', kind: 'treatment_consent', version: 'draft',
    summary: '[CLINIC TO PROVIDE] Consent for peptide therapy.', body: ['[CLINIC TO PROVIDE] Full consent text for peptide therapy.'],
  },
];
export const ONBOARDING_FORM_IDS = ['f-recording', 'f-informed', 'f-treatment'];

export const BLOOD_DRAW_SLOTS = [
  { id: 'slot-1', at: '2026-10-14T07:30', label: 'Wed 14 Oct · 7:30 am' },
  { id: 'slot-2', at: '2026-10-15T07:30', label: 'Thu 15 Oct · 7:30 am' },
  { id: 'slot-3', at: '2026-10-16T08:00', label: 'Fri 16 Oct · 8:00 am' },
];
export const CLINIC_LOCATION = 'Vyta MenoClinic · Lab room, Salt Lake City';

export const BLOOD_DRAW_PREP = [
  'Fast for 12 hours before your draw. Water and black coffee are fine. [CLINIC TO CONFIRM]',
  'Take your morning supplements after the draw, not before. [CLINIC TO CONFIRM]',
  'If you use hormone cream or a patch, check with your Guide about timing. [CLINIC TO CONFIRM]',
  'Drink water the evening before so the draw is easier.',
];

// Fictional intake answers for Testelle (SAMPLE_DATA.md §3). Used by the "Fill sample answers" demo helper.
export const TESTELLE_INTAKE: Record<string, IntakeValue> = {
  Q02: ['Low energy or fatigue', 'Mood changes (anxiety, irritability, sadness)', 'Weight or body composition challenges', 'Sleep issues / night sweats', 'Low libido or sexual health concerns'],
  Q03: '1–3 years', Q04: '2 = Often disruptive',
  Q05: 'Energy for my family, travel and hobbies. Steadier mood. Feel strong again, especially upper body.',
  Q06: 'Osteopenia', Q07: 'No', Q08: '', Q09: ['None'], Q10: '', Q11: 'No', Q12: '', Q13: 'None reported', Q14: 'No', Q15: '',
  Q16: 'Irregular', Q17: '24–35 days, varies', Q18: '2026-09-02', Q19: 'No', Q20: 'No', Q21: '', Q22: 'None', Q23: '', Q24: 'None', Q25: '',
  Q26: 'Vitamin D3; magnesium; B12; fish oil', Q27: 'No', Q28: '',
  Q29: 'Good', Q30: '7–8',
  Q31: { '60-minute wind-down': '1–2 days/week', 'Last meal 4+ hours before bed': '5+', 'Same bedtime (30-min window)': '5+', 'No stimulants within 10 hours of bed': '5+' },
  Q32: ['None'], Q33: ['None'], Q34: 'Never', Q35: 'No', Q36: 'Not right now', Q37: 'Good', Q38: 'Mostly whole foods, Mediterranean style',
  Q39: { 'Fiber (35 g)': '1–2 days/week', 'Processed food / refined sugar': 'Rarely', 'Fruits & vegetables (5+ servings)': '5+', 'Hydration (90 oz + electrolytes)': '5+', 'Protein (1 g per lb)': '3–4 days/week', 'Healthy fats (60 g)': '3–4 days/week' },
  Q40: ['Bloating'],
  Q41: 'Good', Q42: { 'Strength training (20 min)': '1–2 days/week', 'Other movement (20 min)': '1–2 days/week', 'Zone 2 cardio (20 min)': '3–4 days/week' },
  Q43: '6 hours', Q44: 'Mild left-knee discomfort with high-impact activity', Q45: 'Average', Q46: 'No', Q47: 'No', Q48: '', Q49: 3,
  Q50: ['Work', 'Caregiving'], Q51: 'Yes', Q52: ['Exercise', 'Time outdoors'],
  Q53: 'Married or long-term partnership', Q54: 'Somewhat', Q55: 'Woman', Q56: 'Yes', Q57: 5, Q58: ['Desire'],
  Q59: 'Family, travel, hiking, cooking', Q60: 'Somewhat', Q61: 'Energy, adventure, strength', Q62: 'Fatigue and brain fog',
  Q63: 'Strong, energetic, present with my family', Q64: 'Organised and dependable', Q65: 'Saying no', Q66: 'Yes', Q67: '',
  Q68: 'How tired I have been', Q69: "I'm rebuilding myself",
  Q70: 1, Q71: 10, Q72: 7, Q73: 4, Q74: 6, Q75: 5, Q76: 5, Q77: 5, Q78: 2, Q79: 1,
  Q80: 'No', Q81: 'No', Q82: 'No', Q83: 'No', Q84: 9, Q85: 'Time', Q86: 'Help me understand what my body needs at this stage.',
  Q87: '5 ft 6 in', Q88: '171 lb', Q89: 'I want to feel like myself again and keep up with my family.',
};
