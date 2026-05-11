import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CCEMark } from '../types';
import { Card } from './Card';

import { CLASS_LIST, normalizeClass } from '../constants';

export function ClassPerformanceChart({ marks, classCounts }: { marks: CCEMark[], classCounts: Record<string, number> }) {
  const chartData = useMemo(() => {
    const classData: Record<string, { total: number }> = {};
    
    marks.forEach(m => {
        const markVal = typeof m.mark === 'string' ? parseFloat(m.mark) : m.mark;
        if (isNaN(markVal)) return;

        const normalized = normalizeClass(m.class);
        if (!classData[normalized]) {
            classData[normalized] = { total: 0 };
        }
        classData[normalized].total += markVal;
    });

    return Object.entries(classData)
      .map(([className, data]) => {
        const studentCount = classCounts[className] || 1;
        return {
          name: className,
          average: parseFloat((data.total / studentCount).toFixed(2))
        };
      })
      .sort((a, b) => b.average - a.average);
  }, [marks, classCounts]);
  
  if (chartData.length === 0) return <div className="text-center p-8 text-stone-400">No mark data available.</div>;

  return (
    <Card className="p-8">
      <h3 className="text-2xl font-black text-stone-900 mb-6">Class Performance (Average Marks)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            cursor={{ fill: 'transparent' }}
            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey="average" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#6366f1'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
