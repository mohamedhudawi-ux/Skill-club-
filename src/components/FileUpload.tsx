import React, { useState, useRef } from 'react';
import { Upload, X, File, CheckCircle } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

interface FileUploadProps {
  label: string;
  onUpload: (url: string) => void;
  currentFileUrl?: string;
  className?: string;
  accept?: string;
  maxSizeMB?: number;
}

export function FileUpload({ label, onUpload, currentFileUrl, className = '', accept = '.pdf,image/*', maxSizeMB = 100 }: FileUploadProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(currentFileUrl || null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload failed:", error);
          setError('Failed to upload file. Please try again.');
          setIsUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setFileUrl(downloadURL);
          onUpload(downloadURL);
          setIsUploading(false);
        }
      );
    } catch (err) {
      console.error("Upload error:", err);
      setError('An error occurred during upload.');
      setIsUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">{label}</label>
      
      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`relative group cursor-pointer border-2 border-dashed rounded-2xl transition-all overflow-hidden p-6 flex flex-col items-center justify-center text-center ${
          isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:border-stone-300 bg-stone-50'
        } ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}
        style={{ minHeight: '150px' }}
      >
        {isUploading ? (
          <div className="w-full max-w-xs space-y-4">
            <div className="flex justify-between text-xs font-bold text-stone-500">
              <span>Uploading...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : fileUrl ? (
          <div className="space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={32} />
            </div>
            <p className="text-sm font-bold text-emerald-700">File Uploaded Successfully</p>
            <p className="text-xs text-stone-500">Click or drag to replace</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFileUrl(null);
                onUpload('');
              }}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
              title="Remove file"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-12 h-12 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mx-auto group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
              <Upload size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-700">Click or drag file to upload</p>
              <p className="text-xs text-stone-500 mt-1">PDF or Image (max {maxSizeMB}MB)</p>
            </div>
          </div>
        )}
      </div>
      
      {error && <p className="text-xs font-bold text-red-500">{error}</p>}
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        accept={accept}
        className="hidden"
      />
    </div>
  );
}
