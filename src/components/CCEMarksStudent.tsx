import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Student, CCEMark, CCE_TERMS } from '../types';
import { Card } from './Card';
import { ClipboardList, Award, Loader2 } from 'lucide-react';

export function CCEMarksStudent({ student }: { student: Student }) {
  const [marks, setMarks] = useState<Record<string, Record<string, number>>>({});
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarks = async () => {
      try {
        const q = query(
          collection(db, 'cceMarks'),
          where('studentId', '==', student.admissionNumber)
        );
        const snap = await getDocs(q);
        const marksMap: Record<string, Record<string, number>> = {};
        const subjectSet = new Set<string>();

        snap.docs.forEach(doc => {
          const data = doc.data() as CCEMark;
          if (!marksMap[data.subject]) {
            marksMap[data.subject] = {};
          }
          marksMap[data.subject][data.term] = Number(data.mark);
          subjectSet.add(data.subject);
        });

        setMarks(marksMap);
        setSubjects(Array.from(subjectSet).sort());
      } catch (error) {
        console.error('Error fetching student marks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarks();
  }, [student.admissionNumber]);

  if (loading) return (
    <div className="p-12 text-center">
      <Loader2 className="animate-spin mx-auto text-indigo-600 mb-4" size={32} />
      <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px]">Loading your CCE marks...</p>
    </div>
  );

  if (subjects.length === 0) return (
    <Card className="p-12 text-center text-stone-400 italic bg-stone-50 border-dashed border-2">
      No CCE marks uploaded yet.
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
          <Award size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black text-stone-900 uppercase tracking-tight">CCE Marks Overview</h2>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Academic Performance</p>
        </div>
      </div>

      <Card className="p-6 bg-white shadow-xl shadow-stone-200/50 border-stone-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-6 bg-stone-50 rounded-3xl">
          <div>
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Student Name</p>
            <p className="font-bold text-stone-900">{student.name}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Admission Number</p>
            <p className="font-bold text-stone-900">{student.admissionNumber}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Class</p>
            <p className="font-bold text-stone-900">{student.class}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">S.No.</th>
                <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Subject</th>
                {CCE_TERMS.map(term => (
                  <th key={term} className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest text-center">{term}</th>
                ))}
                <th className="px-6 py-4 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center bg-indigo-50/50">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {subjects.map((subject, index) => {
                const termMarks = marks[subject] || {};
                const total = Object.values(termMarks).reduce((a, b) => a + b, 0);
                return (
                  <tr key={subject} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-stone-400">{index + 1}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-stone-900">{subject}</p>
                    </td>
                    {CCE_TERMS.map(term => (
                      <td key={term} className="px-6 py-4 text-center">
                        {termMarks[term] !== undefined ? (
                          <span className="font-bold text-stone-900">{termMarks[term]}</span>
                        ) : (
                          <span className="text-stone-300">-</span>
                        )}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-center bg-indigo-50/30">
                      <span className="font-black text-indigo-600 text-lg">{total}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
