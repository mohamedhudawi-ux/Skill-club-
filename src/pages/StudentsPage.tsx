import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Student } from '../types';
import { CLASS_LIST } from '../constants';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ImageUpload } from '../components/ImageUpload';
import { Trash2, Plus, Edit2 } from 'lucide-react';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudent, setNewStudent] = useState<Partial<Student>>({ 
    name: '', 
    admissionNumber: '', 
    class: '', 
    fatherName: '', 
    dob: '', 
    photoURL: '', 
    phone: '', 
    address: '' 
  });
  const [editingStudent, setEditingStudent] = useState<Student & { id: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');

  const filteredStudents = students.filter(s => 
    (s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (selectedClass === 'All' || s.class === selectedClass)
  );

  const classCounts = CLASS_LIST.reduce((acc, cls) => {
    acc[cls] = students.filter(s => s.class === cls).length;
    return acc;
  }, {} as Record<string, number>);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'students'), limit(100)));
        setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student & { id: string })));
      } catch (error) {
        console.error('Firestore Error (students):', error);
      }
    };
    fetchStudents();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const studentData = { ...newStudent, totalPoints: 0, categoryPoints: {}, badges: [] };
      const docRef = await addDoc(collection(db, 'students'), studentData);
      setStudents(prev => [{ id: docRef.id, ...studentData } as any, ...prev]);
      setNewStudent({ name: '', admissionNumber: '', class: '', fatherName: '', dob: '', photoURL: '', phone: '', address: '' });
    } catch (error) {
      console.error('Error adding student:', error);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      const { id, ...data } = editingStudent;
      await updateDoc(doc(db, 'students', id), {
        ...data,
        photoURL: data.photoURL || null
      });
      setStudents(prev => prev.map(s => s.id === id ? editingStudent : s));
      setEditingStudent(null);
    } catch (error) {
      console.error('Error editing student:', error);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'students', id));
      setStudents(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <h2 className="text-3xl font-black text-stone-900">Manage Students</h2>

      <div className="flex gap-4">
        <input 
          placeholder="Search by name or admission number..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          className="flex-grow px-4 py-3 rounded-xl border" 
        />
        <select 
          value={selectedClass}
          onChange={e => setSelectedClass(e.target.value)}
          className="px-4 py-3 rounded-xl border"
        >
          <option value="All">All Classes</option>
          {CLASS_LIST.map(cls => <option key={cls} value={cls}>{cls} ({classCounts[cls] || 0})</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {CLASS_LIST.map(cls => (
          <Card key={cls} className="p-4">
            <p className="text-[10px] font-black text-stone-400 uppercase">{cls}</p>
            <p className="text-2xl font-bold text-stone-900">{classCounts[cls] || 0}</p>
          </Card>
        ))}
      </div>
      
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Add New Student</h3>
        <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input placeholder="Name" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} className="px-4 py-2 rounded-xl border" required />
          <input placeholder="Admission Number" value={newStudent.admissionNumber} onChange={e => setNewStudent({...newStudent, admissionNumber: e.target.value})} className="px-4 py-2 rounded-xl border" required />
          <select value={newStudent.class} onChange={e => setNewStudent({...newStudent, class: e.target.value})} className="px-4 py-2 rounded-xl border" required>
            <option value="">Select Class</option>
            {CLASS_LIST.map(cls => <option key={cls} value={cls}>{cls}</option>)}
          </select>
          <input placeholder="Father's Name" value={newStudent.fatherName} onChange={e => setNewStudent({...newStudent, fatherName: e.target.value})} className="px-4 py-2 rounded-xl border" />
          <input type="date" placeholder="Date of Birth" value={newStudent.dob} onChange={e => setNewStudent({...newStudent, dob: e.target.value})} className="px-4 py-2 rounded-xl border" />
          <input placeholder="Phone Number" value={newStudent.phone} onChange={e => setNewStudent({...newStudent, phone: e.target.value})} className="px-4 py-2 rounded-xl border" />
          <input placeholder="Address" value={newStudent.address} onChange={e => setNewStudent({...newStudent, address: e.target.value})} className="px-4 py-2 rounded-xl border" />
          <div className="md:col-span-2 lg:col-span-4">
            <ImageUpload
              label="Student Photo"
              onUpload={(base64) => setNewStudent({...newStudent, photoURL: base64})}
              currentImageUrl={newStudent.photoURL}
            />
          </div>
          <Button type="submit"><Plus size={18} /> Add Student</Button>
        </form>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((student: any) => (
          <Card key={student.id} className="p-4 flex flex-col gap-2">
            <div className="flex items-center gap-4">
              {student.photoURL && <img src={student.photoURL} alt={student.name} className="w-16 h-16 rounded-full object-cover" />}
              <div>
                <h4 className="font-bold text-lg">{student.name}</h4>
                <p className="text-sm text-stone-500">{student.admissionNumber} - {student.class}</p>
              </div>
            </div>
            <div className="text-sm text-stone-600">
              <p>Father: {student.fatherName}</p>
              <p>DOB: {student.dob}</p>
              <p>Phone: {student.phone}</p>
              <p>Address: {student.address}</p>
            </div>
            <div className="flex gap-2 mt-2">
              <Button variant="secondary" onClick={() => setEditingStudent(student as Student & { id: string })} className="flex-1">
                <Edit2 size={18} /> Edit
              </Button>
              <Button variant="danger" onClick={() => handleDeleteStudent(student.id)} className="flex-1">
                <Trash2 size={18} /> Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-4">
        <Button variant="secondary">Import CSV/Excel/PDF</Button>
      </div>

      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="p-8 max-w-lg w-full shadow-2xl relative">
            <h3 className="text-2xl font-bold mb-6">Edit Student</h3>
            <form onSubmit={handleEditStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="Name" value={editingStudent.name} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} className="px-4 py-2 rounded-xl border" required />
              <input placeholder="Admission Number" value={editingStudent.admissionNumber} onChange={e => setEditingStudent({...editingStudent, admissionNumber: e.target.value})} className="px-4 py-2 rounded-xl border" required />
              <select value={editingStudent.class} onChange={e => setEditingStudent({...editingStudent, class: e.target.value})} className="px-4 py-2 rounded-xl border" required>
                <option value="">Select Class</option>
                {CLASS_LIST.map(cls => <option key={cls} value={cls}>{cls}</option>)}
              </select>
              <input placeholder="Father's Name" value={editingStudent.fatherName} onChange={e => setEditingStudent({...editingStudent, fatherName: e.target.value})} className="px-4 py-2 rounded-xl border" />
              <input type="date" placeholder="Date of Birth" value={editingStudent.dob} onChange={e => setEditingStudent({...editingStudent, dob: e.target.value})} className="px-4 py-2 rounded-xl border" />
              <input placeholder="Phone Number" value={editingStudent.phone} onChange={e => setEditingStudent({...editingStudent, phone: e.target.value})} className="px-4 py-2 rounded-xl border" />
              <input placeholder="Address" value={editingStudent.address} onChange={e => setEditingStudent({...editingStudent, address: e.target.value})} className="px-4 py-2 rounded-xl border" />
              <div className="md:col-span-2">
                <ImageUpload
                  label="Student Photo"
                  onUpload={(base64) => setEditingStudent({...editingStudent, photoURL: base64})}
                  currentImageUrl={editingStudent.photoURL}
                />
              </div>
              <div className="md:col-span-2 flex gap-4">
                <Button type="submit" className="flex-1">Save Changes</Button>
                <Button variant="ghost" onClick={() => setEditingStudent(null)} className="flex-1">Cancel</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
