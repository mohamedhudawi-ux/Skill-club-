import React, { useState } from "react";
import { Resume, Experience, Education, SkillCategory, Project, Language, cn } from "../lib/utils";
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  Star, 
  Layers, 
  Award, 
  Languages, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  Save
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ResumeEditorProps {
  resume: Resume;
  onChange: (resume: Resume) => void;
}

export const ResumeEditor: React.FC<ResumeEditorProps> = ({ resume, onChange }) => {
  const [activeTab, setActiveTab] = useState<string>("personal");

  const updatePersonalInfo = (field: keyof Resume["personalInfo"], value: string) => {
    onChange({
      ...resume,
      personalInfo: {
        ...resume.personalInfo,
        [field]: value,
      },
    });
  };

  const addExperience = () => {
    const newExp: Experience = {
      id: Math.random().toString(36).substr(2, 9),
      company: "",
      position: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      description: [""],
    };
    onChange({ ...resume, experience: [newExp, ...resume.experience] });
  };

  const updateExperience = (id: string, field: keyof Experience, value: any) => {
    onChange({
      ...resume,
      experience: resume.experience.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    });
  };

  const deleteExperience = (id: string) => {
    onChange({
      ...resume,
      experience: resume.experience.filter((exp) => exp.id !== id),
    });
  };

  const addEducation = () => {
    const newEdu: Education = {
      id: Math.random().toString(36).substr(2, 9),
      school: "",
      degree: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
    };
    onChange({ ...resume, education: [newEdu, ...resume.education] });
  };

  const updateEducation = (id: string, field: keyof Education, value: any) => {
    onChange({
      ...resume,
      education: resume.education.map((edu) =>
        edu.id === id ? { ...edu, [field]: value } : edu
      ),
    });
  };

  const deleteEducation = (id: string) => {
    onChange({
      ...resume,
      education: resume.education.filter((edu) => edu.id !== id),
    });
  };

  const addSkillCategory = () => {
    const newCat: SkillCategory = {
      id: Math.random().toString(36).substr(2, 9),
      name: "",
      skills: [""],
    };
    onChange({ ...resume, skills: [...resume.skills, newCat] });
  };

  const updateSkillCategory = (id: string, field: keyof SkillCategory, value: any) => {
    onChange({
      ...resume,
      skills: resume.skills.map((cat) =>
        cat.id === id ? { ...cat, [field]: value } : cat
      ),
    });
  };

  const deleteSkillCategory = (id: string) => {
    onChange({
      ...resume,
      skills: resume.skills.filter((cat) => cat.id !== id),
    });
  };

  const addProject = () => {
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name: "",
      description: "",
      technologies: [""],
    };
    onChange({ ...resume, projects: [...resume.projects, newProject] });
  };

  const updateProject = (id: string, field: keyof Project, value: any) => {
    onChange({
      ...resume,
      projects: resume.projects.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    });
  };

  const deleteProject = (id: string) => {
    onChange({
      ...resume,
      projects: resume.projects.filter((p) => p.id !== id),
    });
  };

  const tabs = [
    { id: "personal", label: "Personal", icon: User },
    { id: "experience", label: "Experience", icon: Briefcase },
    { id: "education", label: "Education", icon: GraduationCap },
    { id: "skills", label: "Skills", icon: Star },
    { id: "projects", label: "Projects", icon: Layers },
    { id: "others", label: "Others", icon: Award },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Tab Navigation */}
      <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50/50 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2",
              activeTab === tab.id
                ? "border-blue-500 text-blue-600 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === "personal" && (
            <motion.div
              key="personal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <InputGroup
                  label="Full Name"
                  value={resume.personalInfo.fullName}
                  onChange={(v) => updatePersonalInfo("fullName", v)}
                  placeholder="e.g. John Doe"
                />
                <InputGroup
                  label="Job Title"
                  value={resume.personalInfo.jobTitle}
                  onChange={(v) => updatePersonalInfo("jobTitle", v)}
                  placeholder="e.g. Software Engineer"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputGroup
                    label="Email"
                    value={resume.personalInfo.email}
                    onChange={(v) => updatePersonalInfo("email", v)}
                    placeholder="john@example.com"
                  />
                  <InputGroup
                    label="Phone"
                    value={resume.personalInfo.phone}
                    onChange={(v) => updatePersonalInfo("phone", v)}
                    placeholder="+1 234 567 890"
                  />
                </div>
                <InputGroup
                  label="Address"
                  value={resume.personalInfo.address}
                  onChange={(v) => updatePersonalInfo("address", v)}
                  placeholder="City, State"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputGroup
                    label="Website"
                    value={resume.personalInfo.website}
                    onChange={(v) => updatePersonalInfo("website", v)}
                    placeholder="portfolio.dev"
                  />
                  <InputGroup
                    label="GitHub"
                    value={resume.personalInfo.github}
                    onChange={(v) => updatePersonalInfo("github", v)}
                    placeholder="github.com/username"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Professional Summary</label>
                  <textarea
                    value={resume.personalInfo.summary}
                    onChange={(e) => updatePersonalInfo("summary", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[120px]"
                    placeholder="Write a brief summary of your professional background..."
                  />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "experience" && (
            <motion.div
              key="experience"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Work Experience</h3>
                <button
                  onClick={addExperience}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus size={14} />
                  Add New
                </button>
              </div>
              <div className="space-y-6">
                {resume.experience.map((exp, idx) => (
                  <CollapsibleSection
                    key={exp.id}
                    title={exp.position || `Experience ${idx + 1}`}
                    subtitle={exp.company}
                    onDelete={() => deleteExperience(exp.id)}
                  >
                    <div className="grid grid-cols-1 gap-4">
                      <InputGroup
                        label="Company"
                        value={exp.company}
                        onChange={(v) => updateExperience(exp.id, "company", v)}
                      />
                      <InputGroup
                        label="Position"
                        value={exp.position}
                        onChange={(v) => updateExperience(exp.id, "position", v)}
                      />
                      <InputGroup
                        label="Location"
                        value={exp.location}
                        onChange={(v) => updateExperience(exp.id, "location", v)}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <InputGroup
                          label="Start Date"
                          value={exp.startDate}
                          onChange={(v) => updateExperience(exp.id, "startDate", v)}
                          type="month"
                        />
                        <InputGroup
                          label="End Date"
                          value={exp.endDate}
                          onChange={(v) => updateExperience(exp.id, "endDate", v)}
                          type="month"
                          disabled={exp.current}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`current-${exp.id}`}
                          checked={exp.current}
                          onChange={(e) => updateExperience(exp.id, "current", e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor={`current-${exp.id}`} className="text-sm text-gray-700">
                          I currently work here
                        </label>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                        {exp.description.map((desc, dIdx) => (
                          <div key={dIdx} className="flex gap-2">
                            <input
                              value={desc}
                              onChange={(e) => {
                                const newDesc = [...exp.description];
                                newDesc[dIdx] = e.target.value;
                                updateExperience(exp.id, "description", newDesc);
                              }}
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="Key responsibility or achievement..."
                            />
                            <button
                              onClick={() => {
                                const newDesc = exp.description.filter((_, i) => i !== dIdx);
                                updateExperience(exp.id, "description", newDesc);
                              }}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            updateExperience(exp.id, "description", [...exp.description, ""]);
                          }}
                          className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <Plus size={12} />
                          Add Bullet Point
                        </button>
                      </div>
                    </div>
                  </CollapsibleSection>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "education" && (
            <motion.div
              key="education"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Education</h3>
                <button
                  onClick={addEducation}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus size={14} />
                  Add New
                </button>
              </div>
              <div className="space-y-6">
                {resume.education.map((edu, idx) => (
                  <CollapsibleSection
                    key={edu.id}
                    title={edu.degree || `Education ${idx + 1}`}
                    subtitle={edu.school}
                    onDelete={() => deleteEducation(edu.id)}
                  >
                    <div className="grid grid-cols-1 gap-4">
                      <InputGroup
                        label="School"
                        value={edu.school}
                        onChange={(v) => updateEducation(edu.id, "school", v)}
                      />
                      <InputGroup
                        label="Degree"
                        value={edu.degree}
                        onChange={(v) => updateEducation(edu.id, "degree", v)}
                      />
                      <InputGroup
                        label="Location"
                        value={edu.location}
                        onChange={(v) => updateEducation(edu.id, "location", v)}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <InputGroup
                          label="Start Date"
                          value={edu.startDate}
                          onChange={(v) => updateEducation(edu.id, "startDate", v)}
                          type="month"
                        />
                        <InputGroup
                          label="End Date"
                          value={edu.endDate}
                          onChange={(v) => updateEducation(edu.id, "endDate", v)}
                          type="month"
                          disabled={edu.current}
                        />
                      </div>
                      <InputGroup
                        label="Description (Optional)"
                        value={edu.description}
                        onChange={(v) => updateEducation(edu.id, "description", v)}
                        placeholder="e.g. GPA 3.8, Major in Data Science..."
                      />
                    </div>
                  </CollapsibleSection>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "skills" && (
            <motion.div
              key="skills"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Skills</h3>
                <button
                  onClick={addSkillCategory}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus size={14} />
                  Add Category
                </button>
              </div>
              <div className="space-y-6">
                {resume.skills.map((cat, idx) => (
                  <CollapsibleSection
                    key={cat.id}
                    title={cat.name || `Category ${idx + 1}`}
                    onDelete={() => deleteSkillCategory(cat.id)}
                  >
                    <div className="space-y-4">
                      <InputGroup
                        label="Category Name"
                        value={cat.name}
                        onChange={(v) => updateSkillCategory(cat.id, "name", v)}
                        placeholder="e.g. Programming Languages"
                      />
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Skills</label>
                        <div className="flex flex-wrap gap-2">
                          {cat.skills.map((skill, sIdx) => (
                            <div key={sIdx} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                              <input
                                value={skill}
                                onChange={(e) => {
                                  const newSkills = [...cat.skills];
                                  newSkills[sIdx] = e.target.value;
                                  updateSkillCategory(cat.id, "skills", newSkills);
                                }}
                                className="bg-transparent text-xs border-none focus:ring-0 w-20 outline-none"
                              />
                              <button
                                onClick={() => {
                                  const newSkills = cat.skills.filter((_, i) => i !== sIdx);
                                  updateSkillCategory(cat.id, "skills", newSkills);
                                }}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              updateSkillCategory(cat.id, "skills", [...cat.skills, ""]);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-md"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </CollapsibleSection>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "projects" && (
            <motion.div
              key="projects"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Projects</h3>
                <button
                  onClick={addProject}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus size={14} />
                  Add New
                </button>
              </div>
              <div className="space-y-6">
                {resume.projects.map((project, idx) => (
                  <CollapsibleSection
                    key={project.id}
                    title={project.name || `Project ${idx + 1}`}
                    onDelete={() => deleteProject(project.id)}
                  >
                    <div className="grid grid-cols-1 gap-4">
                      <InputGroup
                        label="Project Name"
                        value={project.name}
                        onChange={(v) => updateProject(project.id, "name", v)}
                      />
                      <InputGroup
                        label="Description"
                        value={project.description}
                        onChange={(v) => updateProject(project.id, "description", v)}
                        type="textarea"
                      />
                      <InputGroup
                        label="Link (Optional)"
                        value={project.link || ""}
                        onChange={(v) => updateProject(project.id, "link", v)}
                      />
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Technologies</label>
                        <div className="flex flex-wrap gap-2">
                          {project.technologies.map((tech, tIdx) => (
                            <div key={tIdx} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                              <input
                                value={tech}
                                onChange={(e) => {
                                  const newTech = [...project.technologies];
                                  newTech[tIdx] = e.target.value;
                                  updateProject(project.id, "technologies", newTech);
                                }}
                                className="bg-transparent text-xs border-none focus:ring-0 w-20 outline-none"
                              />
                              <button
                                onClick={() => {
                                  const newTech = project.technologies.filter((_, i) => i !== tIdx);
                                  updateProject(project.id, "technologies", newTech);
                                }}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              updateProject(project.id, "technologies", [...project.technologies, ""]);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-md"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </CollapsibleSection>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "others" && (
            <motion.div
              key="others"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Languages */}
              <section className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-900">Languages</h3>
                  <button
                    onClick={() => {
                      const newLang: Language = { id: Math.random().toString(36).substr(2, 9), name: "", level: "" };
                      onChange({ ...resume, languages: [...resume.languages, newLang] });
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={14} />
                    Add New
                  </button>
                </div>
                <div className="space-y-3">
                  {resume.languages.map((lang) => (
                    <div key={lang.id} className="flex gap-4 items-end">
                      <div className="flex-1">
                        <InputGroup
                          label="Language"
                          value={lang.name}
                          onChange={(v) => {
                            onChange({
                              ...resume,
                              languages: resume.languages.map(l => l.id === lang.id ? { ...l, name: v } : l)
                            });
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <InputGroup
                          label="Level"
                          value={lang.level}
                          onChange={(v) => {
                            onChange({
                              ...resume,
                              languages: resume.languages.map(l => l.id === lang.id ? { ...l, level: v } : l)
                            });
                          }}
                          placeholder="e.g. Native, Fluent..."
                        />
                      </div>
                      <button
                        onClick={() => {
                          onChange({
                            ...resume,
                            languages: resume.languages.filter(l => l.id !== lang.id)
                          });
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 mb-0.5"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Certifications */}
              <section className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-900">Certifications</h3>
                  <button
                    onClick={() => {
                      onChange({ ...resume, certifications: [...resume.certifications, ""] });
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={14} />
                    Add New
                  </button>
                </div>
                <div className="space-y-3">
                  {resume.certifications.map((cert, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        value={cert}
                        onChange={(e) => {
                          const newCerts = [...resume.certifications];
                          newCerts[idx] = e.target.value;
                          onChange({ ...resume, certifications: newCerts });
                        }}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Certification name..."
                      />
                      <button
                        onClick={() => {
                          const newCerts = resume.certifications.filter((_, i) => i !== idx);
                          onChange({ ...resume, certifications: newCerts });
                        }}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Helper Components
interface InputGroupProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, value, onChange, placeholder, type = "text", disabled }) => (
  <div className="space-y-1">
    <label className="text-xs font-bold text-gray-500 uppercase">{label}</label>
    {type === "textarea" ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[80px]"
        placeholder={placeholder}
        disabled={disabled}
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-50 disabled:text-gray-400"
        placeholder={placeholder}
        disabled={disabled}
      />
    )}
  </div>
);

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onDelete: () => void;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, subtitle, children, onDelete }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-gray-900 truncate">{title}</h4>
          {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 border-t border-gray-100">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
