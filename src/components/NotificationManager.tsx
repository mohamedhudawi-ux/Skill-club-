import React, { useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { toast, Toaster } from 'sonner';
import { User } from 'lucide-react';

export default function NotificationManager() {
  const { isAdmin, user } = useAuth();

  useEffect(() => {
    if (!isAdmin || !user) return;

    // Listen for new login notifications
    // We only want notifications created AFTER the admin has logged in to avoid old pops
    const now = Timestamp.now();
    const q = query(
      collection(db, 'loginNotifications'),
      where('timestamp', '>', now),
      orderBy('timestamp', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const roleLabel = data.role ? `[${data.role.toUpperCase()}] ` : '';
          toast.info(`${roleLabel}User Active: ${data.userName}`, {
            description: `${data.userEmail} has logged in.`,
            icon: <User className="text-emerald-600" size={18} />,
            duration: 8000,
          });
        }
      });
    });

    return () => unsubscribe();
  }, [isAdmin, user]);

  return <Toaster position="top-right" expand={true} richColors />;
}
