import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { Button } from './Button';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const StudentBulkUpload = ({ onComplete }: { onComplete?: () => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [preview, setPreview] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setStatus(null);
      
      // Basic CSV parsing for preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        if (lines.length > 1) {
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          const nameIdx = headers.indexOf('name');
          const admIdx = headers.indexOf('admissionnumber');
          const classIdx = headers.indexOf('class');
          
          if (nameIdx === -1 || admIdx === -1 || classIdx === -1) {
            setStatus({ type: 'error', msg: 'Invalid CSV format. Required columns: Name, AdmissionNumber, Class' });
            setPreview([]);
            return;
          }

          const parsed = lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
              const values = line.split(',').map(v => v.trim());
              return {
                name: values[nameIdx],
                admissionNumber: values[admIdx],
                class: values[classIdx]
              };
            })
            .filter(item => item.name && item.admissionNumber && item.class);
            
          setPreview(parsed.slice(0, 5)); // Show first 5
        }
      };
      reader.readAsText(selected);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setStatus(null);

      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const nameIdx = headers.indexOf('name');
      const admIdx = headers.indexOf('admissionnumber');
      const classIdx = headers.indexOf('class');

      if (nameIdx === -1 || admIdx === -1 || classIdx === -1) {
        throw new Error('Invalid CSV format. Required columns: Name, AdmissionNumber, Class');
      }

      const students = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            name: values[nameIdx],
            admissionNumber: values[admIdx],
            class: values[classIdx]
          };
        })
        .filter(item => item.name && item.admissionNumber && item.class);

      if (students.length === 0) {
        throw new Error('No valid student records found in the CSV.');
      }

      let successCount = 0;
      let errorCount = 0;

      for (const student of students) {
        try {
          await setDoc(doc(db, 'students', student.admissionNumber), {
            name: student.name,
            admissionNumber: student.admissionNumber,
            class: student.class,
            totalPoints: 0,
            badges: [],
            uid: '', // Will be linked when they register
            createdAt: new Date().toISOString()
          });
          successCount++;
        } catch (err) {
          console.error(`Error processing ${student.name}:`, err);
          errorCount++;
        }
      }

      setStatus({ 
        type: errorCount === 0 ? 'success' : 'error', 
        msg: `Processed ${students.length} students. ${successCount} successful, ${errorCount} failed.` 
      });
      
      if (successCount > 0 && onComplete) {
        onComplete();
      }
      
      if (errorCount === 0) {
        setFile(null);
        setPreview([]);
      }

    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || 'Failed to process CSV file.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <Upload size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-stone-900">Bulk Upload Students</h3>
          <p className="text-sm text-stone-500">Upload a CSV file to add multiple students at once.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100 mb-6">
            <h4 className="text-sm font-bold text-stone-900 mb-2 flex items-center gap-2">
              <FileText size={16} className="text-stone-400" /> CSV Format Requirements
            </h4>
            <p className="text-xs text-stone-500 mb-4">
              Your CSV file must include a header row with exactly these column names (case-insensitive):
            </p>
            <ul className="text-xs text-stone-600 space-y-2 font-mono bg-white p-4 rounded-xl border border-stone-200">
              <li>Name</li>
              <li>AdmissionNumber</li>
              <li>Class</li>
            </ul>
            <p className="text-[10px] text-stone-400 mt-4 italic flex items-center gap-1">
              <AlertCircle size={10} /> Accounts will be automatically created using student_&lt;AdmNo&gt;@skill.edu
            </p>
          </div>

          <div className="space-y-4">
            <label className="block w-full cursor-pointer">
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileChange}
                className="hidden" 
              />
              <div className="w-full px-4 py-8 rounded-2xl border-2 border-dashed border-stone-300 hover:border-emerald-500 hover:bg-emerald-50 transition-colors flex flex-col items-center justify-center gap-2 text-stone-500 hover:text-emerald-600">
                <Upload size={24} />
                <span className="text-sm font-bold">
                  {file ? file.name : 'Click to select CSV file'}
                </span>
              </div>
            </label>

            {status && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold ${
                status.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}>
                {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {status.msg}
              </div>
            )}

            <Button 
              onClick={handleUpload} 
              disabled={!file || loading || preview.length === 0}
              className="w-full py-4"
            >
              {loading ? 'Processing Upload...' : 'Upload Students'}
            </Button>
          </div>
        </div>

        <div>
          {preview.length > 0 && (
            <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100 h-full">
              <h4 className="text-sm font-bold text-stone-900 mb-4">Data Preview (First 5 rows)</h4>
              <div className="space-y-3">
                {preview.map((student, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-stone-200 text-sm">
                    <div className="font-bold text-stone-900">{student.name}</div>
                    <div className="flex justify-between text-xs text-stone-500 mt-1">
                      <span>Adm: {student.admissionNumber}</span>
                      <span>Class: {student.class}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-stone-400 mt-4 text-center">
                Review the data above before uploading.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
