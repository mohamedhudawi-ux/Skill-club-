import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, writeBatch, doc, getDocs, where, limit, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Club, Student, ClubPointEntry, SkillClubEntry, SKILL_CLUB_CATEGORIES } from '../types';
import { BarChart3, Trophy, Medal, Award, Trash2, Users, BookOpen, Download, BarChart as BarChartIcon } from 'lucide-react';
import { Card } from '../components/Card';
import { useAuth } from '../AuthContext';
import { Button } from '../components/Button';
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
  const { profile, isSafa, isStaff, isStudent, isAdmin } = useAuth();
  const chartRef = React.useRef<HTMLDivElement>(null);
  const clubChartRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribers: (() => void)[] = [];

    const setupListeners = () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startTimestamp = Timestamp.fromDate(startOfMonth);

      // Clubs
      unsubscribers.push(onSnapshot(query(collection(db, 'clubs'), limit(50)), (snap) => {
        setClubs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'clubs')));

      // Student Rankings
      unsubscribers.push(onSnapshot(query(collection(db, 'students'), orderBy('totalPoints', 'desc'), limit(50)), (snap) => {
        setRankings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'students')));

      // Club Point Entries (Current Month)
      unsubscribers.push(onSnapshot(query(collection(db, 'clubPointEntries'), where('timestamp', '>=', startTimestamp), limit(100)), (snap) => {
        setClubPointEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClubPointEntry)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'clubPointEntries')));

      // Skill Club Entries (Current Month)
      unsubscribers.push(onSnapshot(query(collection(db, 'skillClubEntries'), where('timestamp', '>=', startTimestamp), limit(100)), (snap) => {
        setSkillClubEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SkillClubEntry)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'skillClubEntries')));

      setLoading(false);
    };

    setupListeners();
    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  const handleClearPoints = async () => {
    try {
      setLoading(true);
      
      // Only fetch entries that exist
      const [clubEntriesSnap, skillEntriesSnap] = await Promise.all([
        getDocs(collection(db, 'clubPointEntries')),
        getDocs(collection(db, 'skillClubEntries'))
      ]);

      // Only fetch clubs with points
      const clubsSnap = await getDocs(query(collection(db, 'clubs'), where('totalPoints', '>', 0)));
      
      // Only fetch students with points or badges
      const studentsSnap = await getDocs(query(collection(db, 'students'), where('totalPoints', '>', 0)));
      
      // Only fetch users (students) with points or badges
      const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student'), where('totalPoints', '>', 0)));
      
      const batches = [];
      let currentBatch = writeBatch(db);
      let operationCount = 0;

      const addOperation = (op: () => void) => {
        op();
        operationCount++;
        if (operationCount === 500) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      };

      // Clear Clubs
      clubsSnap.docs.forEach(docSnap => {
        addOperation(() => currentBatch.update(docSnap.ref, { totalPoints: 0 }));
      });

      // Clear Club Entries
      clubEntriesSnap.docs.forEach(docSnap => {
        addOperation(() => currentBatch.delete(docSnap.ref));
      });

      // Clear Students
      studentsSnap.docs.forEach(docSnap => {
        addOperation(() => currentBatch.update(docSnap.ref, { 
          totalPoints: 0, 
          categoryPoints: {}, 
          badges: [] 
        }));
      });

      // Clear Skill Club Entries
      skillEntriesSnap.docs.forEach(docSnap => {
        addOperation(() => currentBatch.delete(docSnap.ref));
      });

      // Clear Users (mirrored points)
      usersSnap.docs.forEach(docSnap => {
        addOperation(() => currentBatch.update(docSnap.ref, { 
          totalPoints: 0, 
          badges: [] 
        }));
      });

      if (operationCount > 0) {
        batches.push(currentBatch);
      }

      for (const batch of batches) {
        await batch.commit();
      }

      alert('All points and entries cleared successfully!');
      setShowConfirm(false);
      window.location.reload(); // Refresh to show updated state
    } catch (error) {
      console.error('Error clearing points:', error);
      alert('Failed to clear points: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

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
    .sort((a, b) => b.monthlyPoints - a.monthlyPoints);

  const sortedClubs = [...clubs].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

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
  const categoryToppers = SKILL_CLUB_CATEGORIES.map(category => {
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
        
        {isAdmin && (
          <div className="flex justify-center gap-2 mt-4">
            {!showConfirm ? (
              <Button onClick={() => setShowConfirm(true)} variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50">
                <Trash2 size={16} className="mr-2" /> Clear All Points
              </Button>
            ) : (
              <div className="flex items-center gap-2 animate-in zoom-in duration-200">
                <span className="text-xs font-bold text-rose-600 uppercase tracking-widest">Are you sure?</span>
                <Button onClick={handleClearPoints} variant="danger" className="text-xs py-1">
                  Yes, Clear
                </Button>
                <Button onClick={() => setShowConfirm(false)} variant="secondary" className="text-xs py-1">
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}

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
