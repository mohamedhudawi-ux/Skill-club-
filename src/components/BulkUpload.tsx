import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';

export const BulkUpload: React.FC = () => {
  const [csvData, setCsvData] = useState<string>('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string }>({ type: 'idle', message: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvData(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const processCsv = async () => {
    if (!csvData) return;
    setIsProcessing(true);
    setStatus({ type: 'idle', message: 'Processing...' });

    try {
      const lines = csvData.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      let successCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim());
        const data: any = {};
        headers.forEach((header, index) => {
          data[header] = values[index];
        });

        if (data.admissionnumber) {
          const admissionNumber = data.admissionnumber;
          const studentDoc = doc(db, 'students', admissionNumber);
          
          await setDoc(studentDoc, {
            admissionNumber,
            name: data.name || '',
            dob: data.dob || '',
            fatherName: data.fathername || '',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            class: data.class || '',
            totalPoints: 0,
            categoryPoints: {}
          }, { merge: true });
          successCount++;
        } else {
          errorCount++;
        }
      }

      setStatus({ 
        type: 'success', 
        message: `Successfully processed ${successCount} students. ${errorCount} errors.` 
      });
    } catch (error: any) {
      setStatus({ type: 'error', message: `Error: ${error.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Bulk Student Upload</h3>
          <p className="text-sm text-gray-500">Upload a CSV file with student details.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="border-2 border-dashed border-black/10 rounded-2xl p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer relative">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">
            {csvData ? 'File loaded. Click "Process" to start.' : 'Click or drag CSV file here'}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Expected headers: admissionNumber, name, dob, fatherName, address, phone, email, class
          </p>
        </div>

        {status.type !== 'idle' && (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${
            status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-medium">{status.message}</span>
          </div>
        )}

        <button
          onClick={processCsv}
          disabled={!csvData || isProcessing}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : 'Process CSV'}
        </button>
      </div>
    </div>
  );
};
