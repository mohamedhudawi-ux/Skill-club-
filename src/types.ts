export type UserRole = 'student' | 'staff' | 'safa' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  photoURL?: string;
  admissionNumber?: string;
}

export interface Student {
  admissionNumber: string;
  name: string;
  dob: string;
  fatherName: string;
  address: string;
  phone: string;
  email: string;
  photoURL?: string;
  class: string; // Added class field
  totalPoints: number;
  categoryPoints: Record<string, number>;
}

export interface SkillClubEntry {
  id?: string;
  studentAdmissionNumber: string;
  category: string;
  points: number;
  description: string;
  addedBy: string;
  timestamp: any;
}

export interface Program {
  id?: string;
  title: string;
  date: string;
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

export interface WorkSubmission {
  id: string;
  studentAdmissionNumber: string;
  title: string;
  description: string;
  fileUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  pointsAwarded?: number;
  reviewedBy?: string;
  timestamp: any;
}

export interface OfficeBearer {
  id: string;
  name: string;
  position: string;
  photoUrl?: string;
}

export interface SiteContent {
  id: string;
  key: 'about_college' | 'about_union' | 'college_logo' | 'safa_logo' | 'skillclub_logo';
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

export const SKILL_CLUB_CATEGORIES = [
  'Exam', 'Artsfest', 'Sports', 'Safa Programs', 'Class Programs', 
  'Speakers Forum', 'Digital Skills', 'Social Works', 'Publishing', 'Mentor’s Marks'
];

export const SAFA_CLUBS = [
  'Arabic Club', 'English Club', 'Urdu Club', 'Telugu Club', 
  'Science & Maths Club', 'Arts Club', 'IT Club', 'SAB'
];
