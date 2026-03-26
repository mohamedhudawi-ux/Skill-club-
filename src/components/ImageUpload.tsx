import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  label: string;
  onUpload: (base64: string) => void;
  currentImageUrl?: string;
  className?: string;
  maxSize?: number; // in pixels (width or height)
}

export function ImageUpload({ label, onUpload, currentImageUrl, className = '', maxSize = 1200 }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError('File is too large. Maximum size is 100MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL('image/jpeg', 0.7);
        setPreview(base64);
        onUpload(base64);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
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
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`relative group cursor-pointer border-2 border-dashed rounded-2xl transition-all overflow-hidden ${
          isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:border-stone-300 bg-stone-50'
        }`}
        style={{ aspectRatio: '16/9', maxHeight: '200px' }}
      >
        {preview ? (
          <div className="relative w-full h-full">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white">
                <Upload size={24} />
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreview(null);
                onUpload('');
              }}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 gap-2">
            <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
              <ImageIcon size={32} className="text-stone-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-stone-600">Click or drag to upload</p>
              <p className="text-[10px] uppercase tracking-widest font-bold opacity-60">JPG, PNG (Max 100MB)</p>
            </div>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="hidden"
          accept="image/*"
        />
      </div>
      {error && (
        <p className="text-sm text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}
