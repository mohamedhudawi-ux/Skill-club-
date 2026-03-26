import React, { useRef } from 'react';
import { Send } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';

export default function BulkUploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected:', file.name);
      // TODO: Implement file upload and parsing logic
    }
  };

  return (
    <div className="p-8 space-y-6">
      <h2 className="text-3xl font-black text-stone-900">Bulk Data Upload</h2>
      <Card className="p-12 border-2 border-dashed border-stone-200 rounded-3xl text-center">
        <Send className="w-12 h-12 text-stone-300 mx-auto mb-4" />
        <p className="text-stone-500 mb-4">Drag and drop CSV, Excel, or PDF files here to bulk upload students or staff.</p>
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv, .xlsx, .pdf"
          className="hidden"
        />
        <Button onClick={() => fileInputRef.current?.click()}>Select File</Button>
      </Card>
    </div>
  );
}
