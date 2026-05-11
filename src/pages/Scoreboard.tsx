import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, writeBatch, doc, getDocs, where, limit, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Club, Student, ClubPointEntry, SkillClubEntry, SKILL_CLUB_CATEGORIES } from '../types';
import { BarChart3, Trophy, Medal, Award, Trash2, Users, BookOpen, Download, BarChart as BarChartIcon } from 'lucide-react';
import { Card } from '../components/Card';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { Button } from '../components/Button';
import { toast } from 'sonner';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, ImageRun, AlignmentType, VerticalAlign, BorderStyle, ShadingType } from 'docx';
import { saveAs } from 'file-saver';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { domToPng } from 'modern-screenshot';
import { safeToDate } from '../utils/date';

export default function Scoreboard() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [rankings, setRankings] = useState<Student[]>([]);
  const [clubPointEntries, setClubPointEntries] = useState<ClubPointEntry[]>([]);
  const [skillClubEntries, setSkillClubEntries] = useState<SkillClubEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const { profile, isSafa, isStaff, isStudent, isAdmin, campusId } = useAuth();
  const { currentCampus } = useSettings();
  const chartRef = React.useRef<HTMLDivElement>(null);
  const clubChartRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!campusId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribers: (() => void)[] = [];

    const setupListeners = () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startTimestamp = Timestamp.fromDate(startOfMonth);

      // Clubs
      unsubscribers.push(onSnapshot(query(collection(db, 'clubs'), where('campusId', '==', campusId), limit(50)), (snap) => {
        setClubs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'clubs')));

      // Student Rankings
      unsubscribers.push(onSnapshot(query(collection(db, 'students'), where('campusId', '==', campusId)), (snap) => {
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        docs.sort((a,b) => (b.totalPoints || 0) - (a.totalPoints || 0));
        setRankings(docs.slice(0, 50));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'students')));

      // Club Point Entries (Current Month)
      unsubscribers.push(onSnapshot(query(collection(db, 'clubPointEntries'), where('campusId', '==', campusId)), (snap) => {
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClubPointEntry));
        const filtered = docs.filter(d => safeToDate(d.timestamp) && safeToDate(d.timestamp)! >= startOfMonth);
        setClubPointEntries(filtered.slice(0, 500));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'clubPointEntries')));

      // Skill Club Entries (Current Month)
      unsubscribers.push(onSnapshot(query(collection(db, 'skillClubEntries'), where('campusId', '==', campusId)), (snap) => {
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SkillClubEntry));
        const filtered = docs.filter(d => safeToDate(d.timestamp) && safeToDate(d.timestamp)! >= startOfMonth);
        setSkillClubEntries(filtered.slice(0, 500));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'skillClubEntries')));

      setLoading(false);
    };

    setupListeners();
    return () => unsubscribers.forEach(unsub => unsub());
  }, [campusId]);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyClubPoints = clubPointEntries
    .filter(entry => {
      const date = safeToDate(entry.timestamp);
      return date?.getMonth() === currentMonth && date?.getFullYear() === currentYear;
    })
    .reduce((acc, entry) => {
      acc[entry.clubId] = (acc[entry.clubId] || 0) + entry.points;
      return acc;
    }, {} as Record<string, number>);

  const monthlyClubRankings = clubs
    .map(club => ({ ...club, monthlyPoints: monthlyClubPoints[club.id] || 0 }))
    .filter(c => c.monthlyPoints > 0)
    .sort((a, b) => b.monthlyPoints - a.monthlyPoints);

  const monthlyStudentPoints = skillClubEntries
    .filter(entry => {
      const date = safeToDate(entry.timestamp);
      return date?.getMonth() === currentMonth && date?.getFullYear() === currentYear;
    })
    .reduce((acc, entry) => {
      acc[entry.studentAdmissionNumber] = (acc[entry.studentAdmissionNumber] || 0) + entry.points;
      return acc;
    }, {} as Record<string, number>);

  const monthlyStudentRankings = rankings
    .map(student => ({ ...student, monthlyPoints: monthlyStudentPoints[student.admissionNumber] || 0 }))
    .filter(s => s.monthlyPoints > 0)
    .sort((a, b) => b.monthlyPoints - a.monthlyPoints);

  // Focus Metrics
  const overallHighestStudent = rankings[0] || null;
  
  const monthlyClassPoints = monthlyStudentRankings.reduce((acc, student) => {
    const className = student.class || 'Unassigned';
    if(className !== 'Unassigned') {
      acc[className] = (acc[className] || 0) + (student.monthlyPoints || 0);
    }
    return acc;
  }, {} as Record<string, number>);
  const monthlyTopClass = Object.entries(monthlyClassPoints).sort((a,b) => b[1] - a[1])[0] || null;

  const sortedClubs = [...clubs].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

  // Dynamic Categories from Campus Settings
  const categories = currentCampus?.skillClubRules?.map(r => r.category) || SKILL_CLUB_CATEGORIES;

  // Class-wise
  const studentsByClass = rankings.reduce((acc, student) => {
    const className = student.class || 'Unassigned';
    if (!acc[className]) acc[className] = [];
    acc[className].push(student);
    return acc;
  }, {} as Record<string, Student[]>);

  Object.keys(studentsByClass).forEach(className => {
    studentsByClass[className].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
  });

  // Category-wise
  const categoryToppers = categories.map(category => {
    const topStudents = rankings
      .filter(s => (s.categoryPoints?.[category] || 0) > 0)
      .sort((a, b) => (b.categoryPoints?.[category] || 0) - (a.categoryPoints?.[category] || 0))
      .slice(0, 5);
    return { category, topStudents };
  }).filter(c => c.topStudents.length > 0);

  const handleDownloadReport = async () => {
    let studentChartImage: Uint8Array | undefined;
    let clubChartImage: Uint8Array | undefined;

    if (chartRef.current) {
      const dataUrl = await domToPng(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      const base64 = dataUrl.split(',')[1];
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      studentChartImage = bytes;
    }

    if (clubChartRef.current) {
      const dataUrl = await domToPng(clubChartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      const base64 = dataUrl.split(',')[1];
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      clubChartImage = bytes;
    }

    const createStyledCell = (text: string, isHeader = false, alignment: any = AlignmentType.CENTER) => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ 
          text: text || " ", 
          bold: isHeader, 
          color: isHeader ? "FFFFFF" : "1F2937", 
          size: 22,
          font: "Calibri"
        })],
        alignment: alignment,
      })],
      shading: isHeader ? { fill: "059669", type: ShadingType.CLEAR } : { fill: "F9FAFB", type: ShadingType.CLEAR },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 100, bottom: 100, left: 100, right: 100 },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
      }
    });

    const tableBorders = {
      top: { style: BorderStyle.SINGLE, size: 2, color: "E5E7EB" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "E5E7EB" },
      left: { style: BorderStyle.SINGLE, size: 2, color: "E5E7EB" },
      right: { style: BorderStyle.SINGLE, size: 2, color: "E5E7EB" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
    };

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ 
            text: "Skill Club Scoreboard Report", 
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          new Paragraph({ 
            text: `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),

          new Paragraph({ text: "Executive Summary", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createStyledCell("Metric", true, AlignmentType.LEFT),
                  createStyledCell("Value", true, AlignmentType.LEFT),
                ]
              }),
              new TableRow({
                children: [
                  createStyledCell("Total Students", false, AlignmentType.LEFT),
                  createStyledCell(rankings.length.toString(), false, AlignmentType.LEFT),
                ]
              }),
              new TableRow({
                children: [
                  createStyledCell("Total Clubs", false, AlignmentType.LEFT),
                  createStyledCell(clubs.length.toString(), false, AlignmentType.LEFT),
                ]
              }),
              new TableRow({
                children: [
                  createStyledCell("Top Student", false, AlignmentType.LEFT),
                  createStyledCell(rankings[0]?.name || "N/A", false, AlignmentType.LEFT),
                ]
              }),
              new TableRow({
                children: [
                  createStyledCell("Top Club", false, AlignmentType.LEFT),
                  createStyledCell(sortedClubs[0]?.name || "N/A", false, AlignmentType.LEFT),
                ]
              }),
            ]
          }),
          
          new Paragraph({ text: "Student Performance Analytics", heading: HeadingLevel.HEADING_2, spacing: { before: 600, after: 200 } }),
          ...(studentChartImage ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: studentChartImage,
                  transformation: { width: 600, height: 300 },
                } as any),
              ],
              spacing: { after: 400 }
            }),
          ] : []),

          new Paragraph({ text: "Club Performance Analytics", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          ...(clubChartImage ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: clubChartImage,
                  transformation: { width: 600, height: 300 },
                } as any),
              ],
              spacing: { after: 400 }
            }),
          ] : []),

          new Paragraph({ text: "Overall Student Rankings (Top 10)", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            rows: [
              new TableRow({ 
                children: [
                  createStyledCell("Rank", true),
                  createStyledCell("Student Name", true),
                  createStyledCell("Class", true),
                  createStyledCell("Total Points", true)
                ] 
              }),
              ...rankings.slice(0, 10).map((s, i) => new TableRow({ 
                children: [
                  createStyledCell((i + 1).toString()),
                  createStyledCell(s.name),
                  createStyledCell(s.class || "N/A"),
                  createStyledCell((s.totalPoints || 0).toString())
                ] 
              })),
            ],
          }),

          new Paragraph({ text: "Overall Club Rankings", heading: HeadingLevel.HEADING_2, spacing: { before: 600, after: 200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            rows: [
              new TableRow({ 
                children: [
                  createStyledCell("Rank", true),
                  createStyledCell("Club Name", true),
                  createStyledCell("Total Points", true)
                ] 
              }),
              ...sortedClubs.slice(0, 5).map((c, i) => new TableRow({ 
                children: [
                  createStyledCell((i + 1).toString()),
                  createStyledCell(c.name),
                  createStyledCell((c.totalPoints || 0).toString())
                ] 
              })),
            ],
          }),

          new Paragraph({ text: "Monthly Student Performance (Top 10)", heading: HeadingLevel.HEADING_2, spacing: { before: 600, after: 200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            rows: [
              new TableRow({ 
                children: [
                  createStyledCell("Rank", true),
                  createStyledCell("Student Name", true),
                  createStyledCell("Monthly Points", true)
                ] 
              }),
              ...monthlyStudentRankings.slice(0, 10).map((s, i) => new TableRow({ 
                children: [
                  createStyledCell((i + 1).toString()),
                  createStyledCell(s.name),
                  createStyledCell((s.monthlyPoints || 0).toString())
                ] 
              })),
            ],
          }),

          new Paragraph({ text: "Monthly Club Performance", heading: HeadingLevel.HEADING_2, spacing: { before: 600, after: 200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            rows: [
              new TableRow({ 
                children: [
                  createStyledCell("Rank", true),
                  createStyledCell("Club Name", true),
                  createStyledCell("Monthly Points", true)
                ] 
              }),
              ...monthlyClubRankings.slice(0, 5).map((c, i) => new TableRow({ 
                children: [
                  createStyledCell((i + 1).toString()),
                  createStyledCell(c.name),
                  createStyledCell((c.monthlyPoints || 0).toString())
                ] 
              })),
            ],
          }),

          new Paragraph({ text: "Class-wise Performance Breakdown", heading: HeadingLevel.HEADING_2, spacing: { before: 600, after: 200 } }),
          ...Object.entries(studentsByClass).flatMap(([className, students]) => [
            new Paragraph({ text: `Class: ${className}`, heading: HeadingLevel.HEADING_3, spacing: { before: 300, after: 150 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              rows: [
                new TableRow({ 
                  children: [
                    createStyledCell("Rank", true),
                    createStyledCell("Student Name", true),
                    createStyledCell("Points", true)
                  ] 
                }),
                ...(students as Student[]).slice(0, 3).map((s, i) => new TableRow({ 
                  children: [
                    createStyledCell((i + 1).toString()),
                    createStyledCell(s.name),
                    createStyledCell((s.totalPoints || 0).toString())
                  ] 
                })),
              ],
            }),
          ]),

          new Paragraph({ text: "Category-wise Performance Breakdown", heading: HeadingLevel.HEADING_2, spacing: { before: 600, after: 200 } }),
          ...categoryToppers.flatMap(({ category, topStudents }) => [
            new Paragraph({ text: `Category: ${category}`, heading: HeadingLevel.HEADING_3, spacing: { before: 300, after: 150 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              rows: [
                new TableRow({ 
                  children: [
                    createStyledCell("Rank", true),
                    createStyledCell("Student Name", true),
                    createStyledCell("Category Points", true)
                  ] 
                }),
                ...topStudents.map((s, i) => new TableRow({ 
                  children: [
                    createStyledCell((i + 1).toString()),
                    createStyledCell(s.name),
                    createStyledCell((s.categoryPoints?.[category] || 0).toString())
                  ] 
                })),
              ],
            }),
          ]),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "ScoreboardReport.docx");
  };

  if (loading && rankings.length === 0) return <div className="p-8 text-center">Loading Scoreboard...</div>;

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-4xl font-black text-stone-900">SkillClub Scoreboard</h2>
          <p className="text-stone-500">Celebrating excellence and active participation in college life.</p>
        </div>
        <Button onClick={handleDownloadReport} className="flex items-center gap-2">
          <Download size={18} /> Download Report
        </Button>
      </div>

      {/* Hero Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <Card className="p-8 bg-amber-50 border-amber-200">
          <p className="text-amber-800 text-xs font-black uppercase tracking-widest mb-2">Monthly Best Student</p>
          <div className="flex items-center gap-4">
            <img src={monthlyStudentRankings[0]?.photoURL || `https://ui-avatars.com/api/?name=${monthlyStudentRankings[0]?.name || '?'}&background=random`} className="w-16 h-16 rounded-full shadow-md" alt="" />
            <div>
              <h4 className="text-2xl font-black text-amber-950">{monthlyStudentRankings[0]?.name || 'N/A'}</h4>
              <p className="text-amber-700 font-bold">{monthlyStudentRankings[0]?.monthlyPoints || 0} Monthly Pts</p>
            </div>
          </div>
        </Card>

        <Card className="p-8 bg-emerald-50 border-emerald-200">
          <p className="text-emerald-800 text-xs font-black uppercase tracking-widest mb-2">Monthly Best Class</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-200 text-emerald-700">
              <Users size={32} />
            </div>
            <div>
              <h4 className="text-3xl font-black text-emerald-950">{monthlyTopClass?.[0] || 'N/A'}</h4>
              <p className="text-emerald-700 font-bold">{monthlyTopClass?.[1] || 0} Monthly Pts</p>
            </div>
          </div>
        </Card>

        <Card className="p-8 bg-blue-50 border-blue-200">
          <p className="text-blue-800 text-xs font-black uppercase tracking-widest mb-2">Total Highest Points</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-200 text-blue-700">
              <Medal size={32} />
            </div>
            <div>
              <h4 className="text-2xl font-black text-blue-950">{overallHighestStudent?.name || 'N/A'}</h4>
              <p className="text-blue-700 font-bold">{overallHighestStudent?.totalPoints || 0} Total Overall</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        <Card className="p-8">
          <h3 className="text-xl font-black text-stone-900 mb-6 flex items-center gap-2">
            <BarChartIcon className="text-emerald-600" /> Student Performance Chart
          </h3>
          <div ref={chartRef} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankings.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }} 
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="totalPoints" fill="#10b981" radius={[4, 4, 0, 0]}>
                  {rankings.slice(0, 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#059669' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-8">
          <h3 className="text-xl font-black text-stone-900 mb-6 flex items-center gap-2">
            <BarChartIcon className="text-emerald-600" /> Club Performance Chart
          </h3>
          <div ref={clubChartRef} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedClubs.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="totalPoints" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {sortedClubs.slice(0, 5).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Overall Toppers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-8">
          <h3 className="text-xl font-black text-stone-900 mb-6 flex items-center gap-2">
            <Trophy className="text-emerald-600" /> Overall Club Toppers
          </h3>
          <div className="space-y-4">
            {sortedClubs.slice(0, 5).map((club, idx) => (
              <div key={club.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                <span className="font-bold text-stone-900">{idx + 1}. {club.name}</span>
                <span className="font-black text-emerald-600">{club.totalPoints || 0} pts</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-8">
          <h3 className="text-xl font-black text-stone-900 mb-6 flex items-center gap-2">
            <Trophy className="text-emerald-600" /> Overall Student Toppers
          </h3>
          <div className="space-y-4">
            {rankings.slice(0, 5).map((student, idx) => (
              <div key={student.admissionNumber} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                <span className="font-bold text-stone-900">{idx + 1}. {student.name}</span>
                <span className="font-black text-emerald-600">{student.totalPoints || 0} pts</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Monthly Toppers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-8">
          <h3 className="text-xl font-black text-stone-900 mb-6 flex items-center gap-2">
            <Award className="text-emerald-600" /> Monthly Club Toppers
          </h3>
          <div className="space-y-4">
            {monthlyClubRankings.slice(0, 5).map((club, idx) => (
              <div key={club.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                <span className="font-bold text-stone-900">{idx + 1}. {club.name}</span>
                <span className="font-black text-emerald-600">{club.monthlyPoints || 0} pts</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-8">
          <h3 className="text-xl font-black text-stone-900 mb-6 flex items-center gap-2">
            <Award className="text-emerald-600" /> Monthly Student Toppers
          </h3>
          <div className="space-y-4">
            {monthlyStudentRankings.slice(0, 10).map((student, idx) => (
              <div key={student.admissionNumber} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-stone-400">#{idx + 1}</span>
                  <img src={student.photoURL || `https://ui-avatars.com/api/?name=${student.name}&background=random`} className="w-8 h-8 rounded-full" alt="" />
                  <span className="font-bold text-stone-900">{student.name}</span>
                </div>
                <span className="font-black text-emerald-600">{student.monthlyPoints || 0} pts</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Class-wise Toppers */}
      <Card className="p-8">
        <h3 className="text-xl font-black text-stone-900 mb-6 flex items-center gap-2">
          <Users className="text-emerald-600" /> Class-wise Toppers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(studentsByClass).map(([className, students]: [string, Student[]]) => (
            <div key={className} className="bg-stone-50 p-6 rounded-2xl">
              <h4 className="font-black text-stone-900 mb-4 border-b border-stone-200 pb-2">Class {className}</h4>
              <div className="space-y-2">
                {students.slice(0, 3).map((s, idx) => (
                  <div key={s.admissionNumber} className="flex justify-between text-sm">
                    <span className="font-bold text-stone-700">{idx + 1}. {s.name}</span>
                    <span className="font-black text-emerald-600">{s.totalPoints || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Category-wise Toppers */}
      <Card className="p-8">
        <h3 className="text-xl font-black text-stone-900 mb-6 flex items-center gap-2">
          <BookOpen className="text-emerald-600" /> Pointwise (Category) Toppers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryToppers.map(({ category, topStudents }) => (
            <div key={category} className="bg-stone-50 p-6 rounded-2xl">
              <h4 className="font-black text-stone-900 mb-4 border-b border-stone-200 pb-2">{category}</h4>
              <div className="space-y-2">
                {topStudents.map((s, idx) => (
                  <div key={s.admissionNumber} className="flex justify-between text-sm">
                    <span className="font-bold text-stone-700">{idx + 1}. {s.name}</span>
                    <span className="font-black text-emerald-600">{s.categoryPoints?.[category] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
