import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2, Play, Pause, Trash2 } from 'lucide-react';
import { GalleryItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface GalleryViewerProps {
  items: GalleryItem[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export function GalleryViewer({ items, initialIndex = 0, isOpen, onClose, onDelete }: GalleryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    if (isOpen) setIsPlaying(true);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && isOpen) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isOpen, items.length]);

  const handlePrevious = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  if (!isOpen || items.length === 0) return null;

  const currentItem = items[currentIndex];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-stone-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 md:p-8"
        onClick={onClose}
      >
        {/* Top Controls */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <span className="text-white/60 font-mono text-sm">
              {currentIndex + 1} / {items.length}
            </span>
            {currentItem.caption && (
              <p className="text-white font-medium hidden md:block">{currentItem.caption}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(currentItem.id); }}
                className="p-3 bg-red-500/80 hover:bg-red-600 text-white rounded-2xl transition-all"
                title="Delete Photo"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all"
              title={isPlaying ? "Pause Slideshow" : "Start Slideshow"}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button 
              onClick={onClose}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Image Container */}
        <div className="relative w-full max-w-5xl aspect-video md:aspect-auto md:h-[70vh] flex items-center justify-center group" onClick={(e) => e.stopPropagation()}>
          <AnimatePresence mode="wait">
            <motion.img
              key={currentItem.id}
              src={currentItem.url}
              alt={currentItem.caption}
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 1.1, x: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>

          {/* Navigation Arrows */}
          <button 
            onClick={handlePrevious}
            className="absolute left-4 p-4 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0"
          >
            <ChevronLeft size={32} />
          </button>
          <button 
            onClick={handleNext}
            className="absolute right-4 p-4 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0"
          >
            <ChevronRight size={32} />
          </button>
        </div>

        {/* Bottom Caption (Mobile) */}
        {currentItem.caption && (
          <p className="text-white/80 text-center mt-6 md:hidden px-4">{currentItem.caption}</p>
        )}

        {/* Thumbnails */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto pb-2 no-scrollbar" onClick={(e) => e.stopPropagation()}>
          {items.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setCurrentIndex(idx)}
              className={`relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 transition-all duration-300 ${
                currentIndex === idx ? 'ring-2 ring-emerald-500 scale-110' : 'opacity-40 hover:opacity-100'
              }`}
            >
              <img src={item.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
