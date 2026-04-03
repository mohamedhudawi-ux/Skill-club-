import React, { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { ResumeEditor } from "../components/ResumeEditor";
import { ResumeTemplate } from "../components/ResumeTemplate";
import { INITIAL_RESUME, Resume } from "../lib/utils";
import { 
  Printer, 
  Download, 
  Settings as SettingsIcon, 
  Palette, 
  Type, 
  Layout as LayoutIcon,
  Eye,
  Edit3,
  Share2,
  Save,
  History,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  orderBy
} from "firebase/firestore";

const ResumeBuilder: React.FC = () => {
  const { user } = useAuth();
  const [resume, setResume] = useState<Resume>(INITIAL_RESUME);
  const [themeColor, setThemeColor] = useState("#3b82f6");
  const [fontFamily, setFontFamily] = useState("font-sans");
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [savedResumes, setSavedResumes] = useState<any[]>([]);
  const [currentResumeId, setCurrentResumeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [showHistory, setShowHistory] = useState(false);
  
  const resumeRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: resumeRef,
    documentTitle: `${resume.personalInfo.fullName.replace(/\s+/g, "_")}_Resume`,
  });

  // Load saved resumes
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "resumes"), 
      where("uid", "==", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const resumes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSavedResumes(resumes);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSave = async () => {
    if (!user) {
      alert("Please log in to save your resume.");
      return;
    }

    setIsSaving(true);
    setSaveStatus("idle");

    try {
      const resumeData = {
        resume,
        themeColor,
        fontFamily,
        uid: user.uid,
        updatedAt: serverTimestamp(),
        title: resume.personalInfo.fullName || "Untitled Resume"
      };

      if (currentResumeId) {
        await updateDoc(doc(db, "resumes", currentResumeId), resumeData);
      } else {
        const docRef = await addDoc(collection(db, "resumes"), {
          ...resumeData,
          createdAt: serverTimestamp()
        });
        setCurrentResumeId(docRef.id);
      }
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error) {
      console.error("Error saving resume:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const loadResume = (savedResume: any) => {
    setResume(savedResume.resume);
    setThemeColor(savedResume.themeColor || "#3b82f6");
    setFontFamily(savedResume.fontFamily || "font-sans");
    setCurrentResumeId(savedResume.id);
    setShowHistory(false);
  };

  const deleteResume = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this resume?")) return;
    
    try {
      await deleteDoc(doc(db, "resumes", id));
      if (currentResumeId === id) {
        setResume(INITIAL_RESUME);
        setCurrentResumeId(null);
      }
    } catch (error) {
      console.error("Error deleting resume:", error);
    }
  };

  const createNew = () => {
    if (currentResumeId && !confirm("Create new resume? Unsaved changes to current resume might be lost.")) return;
    setResume(INITIAL_RESUME);
    setCurrentResumeId(null);
    setShowHistory(false);
  };

  const colors = [
    { name: "Blue", value: "#3b82f6" },
    { name: "Indigo", value: "#6366f1" },
    { name: "Emerald", value: "#10b981" },
    { name: "Rose", value: "#f43f5e" },
    { name: "Amber", value: "#f59e0b" },
    { name: "Slate", value: "#475569" },
    { name: "Violet", value: "#8b5cf6" },
    { name: "Teal", value: "#14b8a6" },
  ];

  const fonts = [
    { name: "Sans Serif", value: "font-sans" },
    { name: "Serif", value: "font-serif" },
    { name: "Mono", value: "font-mono" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Edit3 size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">ResumePro</h1>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Builder</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center bg-gray-100 p-1 rounded-lg mr-4">
            <button
              onClick={() => setViewMode("edit")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                viewMode === "edit" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <Edit3 size={14} />
                Editor
              </div>
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                viewMode === "preview" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <Eye size={14} />
                Preview
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all relative"
              title="My Resumes"
            >
              <History size={20} />
              {savedResumes.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full border border-white" />
              )}
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all active:scale-95 ${
                saveStatus === "success" 
                  ? "bg-green-100 text-green-700" 
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm"
              }`}
            >
              {isSaving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : saveStatus === "success" ? (
                <CheckCircle2 size={18} />
              ) : saveStatus === "error" ? (
                <AlertCircle size={18} className="text-red-500" />
              ) : (
                <Save size={18} />
              )}
              {saveStatus === "success" ? "Saved!" : "Save"}
            </button>

            <button
              onClick={() => handlePrint()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
            >
              <Printer size={18} />
              Download PDF
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* History Sidebar Overlay */}
        <AnimatePresence>
          {showHistory && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowHistory(false)}
                className="absolute inset-0 bg-black/20 z-40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                className="absolute inset-y-0 left-0 w-80 bg-white shadow-2xl z-50 border-r border-gray-200 flex flex-col"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900">My Resumes</h2>
                  <button 
                    onClick={createNew}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Create New"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {savedResumes.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <History size={24} />
                      </div>
                      <p className="text-sm text-gray-500">No saved resumes yet.</p>
                    </div>
                  ) : (
                    savedResumes.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => loadResume(r)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer group hover:shadow-md ${
                          currentResumeId === r.id 
                            ? "border-blue-600 bg-blue-50" 
                            : "border-gray-100 hover:border-blue-200"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-gray-900 text-sm truncate max-w-[180px]">
                              {r.title}
                            </h3>
                            <p className="text-[10px] text-gray-500 mt-1">
                              Last updated: {r.updatedAt?.toDate().toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={(e) => deleteResume(r.id, e)}
                            className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Left Sidebar - Editor */}
        <div className={`w-full md:w-[450px] lg:w-[500px] flex-shrink-0 ${viewMode === "preview" ? "hidden md:flex" : "flex"}`}>
          <ResumeEditor resume={resume} onChange={setResume} />
        </div>

        {/* Main Content - Preview & Customization */}
        <div className={`flex-1 bg-gray-100 overflow-y-auto p-4 md:p-8 custom-scrollbar ${viewMode === "edit" ? "hidden md:block" : "block"}`}>
          {/* Customization Bar */}
          <div className="max-w-[210mm] mx-auto mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Palette size={12} />
                  Theme Color
                </label>
                <div className="flex gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setThemeColor(c.value)}
                      className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                        themeColor === c.value ? "border-gray-900 scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="h-10 w-px bg-gray-200" />

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Type size={12} />
                  Typography
                </label>
                <div className="flex gap-2">
                  {fonts.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFontFamily(f.value)}
                      className={`px-3 py-1 text-xs font-medium rounded-md border transition-all ${
                        fontFamily === f.value 
                          ? "bg-gray-900 text-white border-gray-900" 
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
               <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                 <Share2 size={20} />
               </button>
               <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                 <SettingsIcon size={20} />
               </button>
            </div>
          </div>

          {/* Resume Preview */}
          <div className="flex justify-center pb-12">
            <ResumeTemplate 
              ref={resumeRef} 
              resume={resume} 
              themeColor={themeColor} 
              fontFamily={fontFamily} 
            />
          </div>
        </div>
      </main>

      {/* Mobile View Toggle */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-white shadow-2xl border border-gray-200 rounded-full p-1 flex z-50">
        <button
          onClick={() => setViewMode("edit")}
          className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
            viewMode === "edit" ? "bg-blue-600 text-white" : "text-gray-500"
          }`}
        >
          Edit
        </button>
        <button
          onClick={() => setViewMode("preview")}
          className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
            viewMode === "preview" ? "bg-blue-600 text-white" : "text-gray-500"
          }`}
        >
          Preview
        </button>
      </div>
    </div>
  );
};

export default ResumeBuilder;
