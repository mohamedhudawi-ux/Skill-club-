export type UserRole = 'student' | 'staff' | 'safa' | 'admin' | 'academic';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  photoURL?: string;
  admissionNumber?: string;
  phone?: string;
  dob?: string;
  address?: string;
  class?: string;
  classTeacher?: string;
  totalPoints?: number;
  badges?: string[];
  createdAt?: string;
}

export interface Student {
  id?: string;
  uid?: string;
  admissionNumber: string;
  name: string;
  dob: string;
  fatherName: string;
  address: string;
  phone: string;
  email?: string;
  photoURL?: string;
  class: string;
  totalPoints: number;
  categoryPoints: Record<string, number>;
  badges: string[];
  timestamp?: any;
}

export type SkillClubCategory = 
  | 'Curricular' 
  | 'Co-Curricular' 
  | 'Social & Projects' 
  | 'Special Recognition'
  | 'Arabic Club'
  | 'English Club'
  | 'Urdu Club'
  | 'Telugu Club'
  | 'Science & Maths Club'
  | 'Arts Club'
  | 'IT Club'
  | 'SAB';

export interface SkillClubEntry {
  id?: string;
  studentAdmissionNumber: string;
  category: SkillClubCategory;
  points: number;
  description: string;
  addedBy: string;
  timestamp: any;
}

export interface WorkSubmission {
  id: string;
  studentUid: string;
  studentName: string;
  admissionNumber: string;
  category: SkillClubCategory;
  subCategory?: string;
  title: string;
  language?: string;
  description: string;
  fileUrl?: string;
  link?: string;
  status: 'pending' | 'approved' | 'rejected';
  pointsAwarded?: number;
  reviewedBy?: string;
  reviewComment?: string;
  timestamp: any;
}

export interface Badge {
  id: string;
  name: 'Champion' | 'Star' | 'Master' | 'Legendary' | 'Topper';
  club: 'Silver' | 'Gold' | 'Emerald' | 'Diamond' | 'Platinum';
  minPoints: number;
  description: string;
}

export const BADGES: Badge[] = [
  { id: 'champion', name: 'Champion', club: 'Silver', minPoints: 300, description: 'Earned by achieving 300 reward points. Entry to Silver Club.' },
  { id: 'star', name: 'Star', club: 'Gold', minPoints: 500, description: 'Earned by achieving 500 reward points. Entry to Gold Club.' },
  { id: 'master', name: 'Master', club: 'Emerald', minPoints: 700, description: 'Earned by achieving 700 reward points. Entry to Emerald Club.' },
  { id: 'legendary', name: 'Legendary', club: 'Diamond', minPoints: 1000, description: 'Earned by achieving 1000 reward points. Entry to Diamond Club.' },
  { id: 'topper', name: 'Topper', club: 'Platinum', minPoints: 1500, description: 'Earned by achieving 1500 reward points. Entry to Platinum Club.' },
];

export const SKILL_CLUB_CATEGORIES: SkillClubCategory[] = [
  'Curricular', 
  'Co-Curricular', 
  'Social & Projects', 
  'Special Recognition',
  'Arabic Club',
  'English Club',
  'Urdu Club',
  'Telugu Club',
  'Science & Maths Club',
  'Arts Club',
  'IT Club',
  'SAB'
];

export interface SkillClubRule {
  category: SkillClubCategory;
  subCategories: {
    name: string;
    points: number;
  }[];
}

export const SKILL_CLUB_RULES: SkillClubRule[] = [
  {
    category: 'Curricular',
    subCategories: [
      { name: 'Exam Topper', points: 50 },
      { name: 'Subject Topper', points: 20 },
      { name: 'Improvement', points: 10 },
      { name: 'Book Review', points: 15 },
      { name: 'Library Usage', points: 5 },
      { name: 'Course Completion', points: 30 },
      { name: 'Project Submission', points: 20 }
    ]
  },
  {
    category: 'Co-Curricular',
    subCategories: [
      { name: 'Arts/Sports First Prize', points: 30 },
      { name: 'Arts/Sports Second Prize', points: 20 },
      { name: 'Arts/Sports Third Prize', points: 10 },
      { name: 'Arts/Sports Participation', points: 5 },
      { name: 'Safa Union Star Program', points: 25 },
      { name: 'Safa Union Organizer', points: 15 },
      { name: 'Safa Union Volunteer', points: 5 },
      { name: 'Class Presentation', points: 15 },
      { name: 'Active Participation', points: 5 },
      { name: 'Best Speaker', points: 20 },
      { name: 'Speech Delivery', points: 10 }
    ]
  },
  {
    category: 'Social & Projects',
    subCategories: [
      { name: 'Community Service', points: 25 },
      { name: 'Awareness Program', points: 15 },
      { name: 'Article Contribution', points: 40 },
      { name: 'Translation', points: 20 },
      { name: 'Leadership Role', points: 30 },
      { name: 'Social Impact Project', points: 50 }
    ]
  },
  {
    category: 'Special Recognition',
    subCategories: [
      { name: 'Mega Hero Award', points: 100 },
      { name: 'Principal Bonus', points: 50 },
      { name: 'Exceptional Conduct', points: 25 },
      { name: 'Excellent Mentoring', points: 20 },
      { name: 'Regular Guidance', points: 10 }
    ]
  }
];

export interface Program {
  id?: string;
  title: string;
  date: string;
  category?: string;
  description?: string;
  addedBy: string;
  timestamp: any;
}

export interface GalleryItem {
  id?: string;
  url: string;
  caption?: string;
  uploadedBy: string;
  timestamp: any;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  totalPoints?: number;
  points?: number;
}

export interface ClubPointEntry {
  id?: string;
  clubId: string;
  points: number;
  description: string;
  addedBy: string;
  timestamp: any;
}

export interface MonthlyReport {
  id?: string;
  month: string;
  performanceReportText: string;
  financialReportText: string;
  submittedBy: string;
  timestamp: any;
}

export interface Transaction {
  id?: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  addedBy: string;
  timestamp: any;
}

export interface ClubMember {
  id: string;
  clubId: string;
  name: string;
  position: string;
  photoUrl?: string;
}

export interface Board {
  id: string;
  name: string;
  description: string;
}

export interface BoardMember {
  id: string;
  boardId: string;
  name: string;
  position: string;
  photoUrl?: string;
}

export interface OfficeBearer {
  id: string;
  name: string;
  position: string;
  photoUrl?: string;
}

export interface SiteContent {
  id: string;
  key: 'about_college' | 'about_union' | 'college_logo' | 'safa_logo' | 'skillclub_logo' | 'about_safa' | 'about_dhpc' | 'about_skillclub' | 'skill_club_rules' | 'whatsapp_link' | 'social_facebook' | 'social_instagram' | 'social_telegram' | 'social_phone' | 'social_gmail' | 'social_whatsapp' | 'payment_qr_code' | 'payment_number' | 'hijri_offset' | 'college_photo';
  value: string;
}

export interface Query {
  id?: string;
  studentUid: string;
  studentName: string;
  message: string;
  voiceUrl?: string;
  reply?: string;
  status: 'pending' | 'replied';
  timestamp: any;
}

export interface Notification {
  id?: string;
  recipientUid: string;
  title: string;
  message: string;
  timestamp: any;
  read: boolean;
}

export interface GraceMarkApplication {
  id?: string;
  studentUid: string;
  studentName: string;
  admissionNumber: string;
  class: string;
  subject: string;
  marksObtained: number;
  marksToAdd: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  timestamp: any;
}

export interface Resource {
  id?: string;
  title: string;
  description: string;
  fileUrl: string;
  category: 'Study Material' | 'Club Guideline' | 'Union Document' | 'Other';
  uploadedBy: string;
  timestamp: any;
}

export const SAFA_UNION_CLUBS = [
  'Arabic Club', 'English Club', 'Urdu Club', 'Telugu Club', 
  'Science & Maths Club', 'Arts Club', 'IT Club', 'SAB'
];

export const CLASS_LIST = ['SS2', 'SS1', 'S5', 'S4', 'S3', 'S2', 'S1A', 'S1B'];
