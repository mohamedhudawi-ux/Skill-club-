import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-stone-50">
      <AlertTriangle size={64} className="text-amber-500 mb-6" />
      <h1 className="text-4xl font-black text-stone-900 mb-4">Under Maintenance</h1>
      <p className="text-stone-500 text-lg max-w-md">
        We are currently performing scheduled maintenance. Please check back soon.
      </p>
    </div>
  );
}
