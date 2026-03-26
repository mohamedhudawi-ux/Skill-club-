import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';

export const ClubMemberBulkUpload: React.FC = () => {
  const [csvData, setCsvData] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<{ name: string; position: string; photoURL: string }>({
    name: '',
    position: '',
    photoURL: ''
  });
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string }>({ type: 'idle', message: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvData(text);
      const lines = text.split('\n');
      if (lines.length > 0) {
        setHeaders(lines[0].split(',').map(h => h.trim()));
      }
    };
    reader.readAsText(file);
  };

  const processCsv = async () => {
    if (!csvData || !mapping.name || !mapping.position) {
      setStatus({ type: 'error', message: 'Please upload a file and map Name and Position columns.' });
      return;
    }
    setIsProcessing(true);
    setStatus({ type: 'idle', message: 'Processing...' });

    try {
      const lines = csvData.split('\n');
      const dataHeaders = lines[0].split(',').map(h => h.trim());
      
      let successCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim());
        const data: any = {};
        dataHeaders.forEach((header, index) => {
          data[header] = values[index];
        });

        if (data[mapping.name] && data[mapping.position]) {
          await addDoc(collection(db, 'clubMembers'), {
            name: data[mapping.name],
            position: data[mapping.position],
            photoURL: data[mapping.photoURL] || ''
          });
          successCount++;
        } else {
          errorCount++;
        }
      }

      setStatus({ 
        type: 'success', 
        message: `Successfully processed ${successCount} members. ${errorCount} errors.` 
      });
      setCsvData('');
      setHeaders([]);
    } catch (error: any) {
      setStatus({ type: 'error', message: `Error: ${error.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-stone-900">Bulk Member Upload</h3>
          <p className="text-sm text-stone-500">Upload a CSV file and map columns.</p>
        </div>
      </div>

      <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />

      {headers.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-bold text-sm text-stone-900">Map Columns</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['name', 'position', 'photoURL'].map((field) => (
              <div key={field}>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">{field}</label>
                <select 
                  value={mapping[field as keyof typeof mapping]}
                  onChange={(e) => setMapping({...mapping, [field]: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200"
                >
                  <option value="">Select Column</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button 
            onClick={processCsv} 
            disabled={isProcessing}
            className="bg-brand-green text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-900 transition-all disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Upload Members'}
          </button>
        </div>
      )}

      {status.message && (
        <div className={`p-4 rounded-xl flex items-center gap-2 text-sm font-bold ${status.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
          {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {status.message}
        </div>
      )}
    </div>
  );
};
