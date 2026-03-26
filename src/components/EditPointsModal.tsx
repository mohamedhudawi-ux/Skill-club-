import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, X } from 'lucide-react';
import { Button } from './Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (points: number, status: 'approved' | 'rejected') => void;
  title: string;
  initialPoints: number;
  initialStatus: 'approved' | 'rejected';
  label: string;
}

export const EditPointsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  initialPoints,
  initialStatus,
  label
}) => {
  const [points, setPoints] = useState(initialPoints);
  const [status, setStatus] = useState<'approved' | 'rejected'>(initialStatus);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl"
        >
          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                <Edit2 size={24} />
              </div>
              <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <h3 className="text-2xl font-black text-stone-900 mb-2">{title}</h3>
            <div className="space-y-4 mt-6">
              <label className="block text-xs font-bold text-stone-500 uppercase">{label}</label>
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              />
              <label className="block text-xs font-bold text-stone-500 uppercase">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'approved' | 'rejected')}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              >
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          
          <div className="bg-stone-50 p-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl font-bold text-stone-600 hover:bg-stone-200 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(points, status)}
              className="flex-1 px-6 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-lg"
            >
              Update
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
