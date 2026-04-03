import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Resource } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { FileUpload } from '../components/FileUpload';
import { FileText, Trash2, Plus, Download } from 'lucide-react';
import { useSettings } from '../SettingsContext';

export default function ResourceLibrary() {
  const { isAdmin, isStaff } = useAuth();
  const { siteContent } = useSettings();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [newResource, setNewResource] = useState({ title: '', description: '', fileUrl: '', category: 'Study Material' as const });

  useEffect(() => {
    const q = query(collection(db, 'resources'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource)));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleUpload = async () => {
    if (!newResource.title || !newResource.fileUrl) return;
    await addDoc(collection(db, 'resources'), {
      ...newResource,
      timestamp: serverTimestamp(),
      uploadedBy: 'Admin/Staff' // Should be dynamic
    });
    setNewResource({ title: '', description: '', fileUrl: '', category: 'Study Material' });
    setShowUpload(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this resource?')) {
      await deleteDoc(doc(db, 'resources', id));
    }
  };

  const collegeLogo = siteContent.find(c => c.key === 'college_logo')?.value;

  return (
    <div className="space-y-8">
      {/* College Logo Header */}
      {collegeLogo && (
        <div className="flex justify-center mb-8">
          <img 
            src={collegeLogo} 
            alt="College Logo" 
            className="h-24 md:h-32 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-stone-900">Resource Library</h2>
        {(isAdmin || isStaff) && (
          <Button onClick={() => setShowUpload(!showUpload)} className="flex items-center gap-2">
            <Plus size={16} /> Add Resource
          </Button>
        )}
      </div>

      {showUpload && (
        <Card className="p-6 space-y-4" role="form" aria-labelledby="upload-title">
          <h3 id="upload-title" className="text-lg font-bold">Upload New Resource</h3>
          <input 
            type="text" 
            placeholder="Title" 
            className="w-full p-2 border rounded" 
            value={newResource.title} 
            onChange={e => setNewResource({...newResource, title: e.target.value})} 
            aria-label="Resource Title"
          />
          <textarea 
            placeholder="Description" 
            className="w-full p-2 border rounded" 
            value={newResource.description} 
            onChange={e => setNewResource({...newResource, description: e.target.value})} 
            aria-label="Resource Description"
          />
          <FileUpload label="Resource File" onUpload={(url) => setNewResource({...newResource, fileUrl: url})} />
          <select 
            className="w-full p-2 border rounded" 
            value={newResource.category} 
            onChange={e => setNewResource({...newResource, category: e.target.value as any})}
            aria-label="Resource Category"
          >
            <option>Study Material</option>
            <option>Club Guideline</option>
            <option>Union Document</option>
            <option>Other</option>
          </select>
          <Button onClick={handleUpload}>Save Resource</Button>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map(res => (
          <Card key={res.id} className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <FileText className="text-emerald-600" />
                <h3 className="font-bold text-lg">{res.title}</h3>
              </div>
              <p className="text-stone-600 text-sm mb-4">{res.description}</p>
              <span className="text-xs font-bold bg-stone-100 px-2 py-1 rounded">{res.category}</span>
            </div>
            <div className="flex justify-between items-center mt-6">
              <a 
                href={res.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 text-emerald-600 font-bold text-sm"
                aria-label={`Download ${res.title}`}
              >
                <Download size={16} /> Download
              </a>
              {(isAdmin || isStaff) && (
                <Button 
                  variant="ghost" 
                  onClick={() => handleDelete(res.id!)} 
                  className="text-red-500"
                  aria-label={`Delete ${res.title}`}
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
