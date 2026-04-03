import React from "react";
import { Resume, cn } from "../lib/utils";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Github, 
  Briefcase, 
  GraduationCap, 
  Star, 
  Layers, 
  Award, 
  Languages 
} from "lucide-react";

interface ResumeTemplateProps {
  resume: Resume;
  themeColor?: string;
  fontFamily?: string;
}

export const ResumeTemplate = React.forwardRef<HTMLDivElement, ResumeTemplateProps>(
  ({ resume, themeColor = "#3b82f6", fontFamily = "font-sans" }, ref) => {
    const { personalInfo, experience, education, skills, projects, languages, certifications } = resume;

    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-[210mm] min-h-[297mm] bg-white shadow-2xl mx-auto p-8 md:p-12 text-gray-800 print:shadow-none print:p-0",
          fontFamily
        )}
        style={{ "--theme-color": themeColor } as React.CSSProperties}
      >
        {/* Header */}
        <header className="border-b-4 pb-6 mb-8" style={{ borderColor: themeColor }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-1 uppercase">
                {personalInfo.fullName}
              </h1>
              <p className="text-xl font-medium" style={{ color: themeColor }}>
                {personalInfo.jobTitle}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Mail size={14} style={{ color: themeColor }} />
                <span>{personalInfo.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} style={{ color: themeColor }} />
                <span>{personalInfo.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} style={{ color: themeColor }} />
                <span>{personalInfo.address}</span>
              </div>
              {personalInfo.website && (
                <div className="flex items-center gap-2">
                  <Globe size={14} style={{ color: themeColor }} />
                  <span>{personalInfo.website}</span>
                </div>
              )}
              {personalInfo.github && (
                <div className="flex items-center gap-2">
                  <Github size={14} style={{ color: themeColor }} />
                  <span>{personalInfo.github}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Summary */}
        {personalInfo.summary && (
          <section className="mb-8">
            <h2 className="text-lg font-bold uppercase tracking-wider mb-3 flex items-center gap-2 border-b pb-1">
              <Star size={18} style={{ color: themeColor }} />
              Professional Summary
            </h2>
            <p className="text-gray-700 leading-relaxed text-sm">
              {personalInfo.summary}
            </p>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column (Main Content) */}
          <div className="md:col-span-2 space-y-8">
            {/* Experience */}
            <section>
              <h2 className="text-lg font-bold uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-1">
                <Briefcase size={18} style={{ color: themeColor }} />
                Work Experience
              </h2>
              <div className="space-y-6">
                {experience.map((exp) => (
                  <div key={exp.id} className="relative pl-4 border-l-2 border-gray-100">
                    <div 
                      className="absolute w-3 h-3 rounded-full -left-[7.5px] top-1.5 border-2 bg-white"
                      style={{ borderColor: themeColor }}
                    />
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-gray-900">{exp.position}</h3>
                      <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                        {exp.startDate} — {exp.current ? "Present" : exp.endDate}
                      </span>
                    </div>
                    <div className="text-sm font-medium mb-2" style={{ color: themeColor }}>
                      {exp.company} | {exp.location}
                    </div>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {exp.description.map((item, idx) => (
                        <li key={idx} className="leading-relaxed">{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* Projects */}
            {projects.length > 0 && (
              <section>
                <h2 className="text-lg font-bold uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-1">
                  <Layers size={18} style={{ color: themeColor }} />
                  Key Projects
                </h2>
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div key={project.id}>
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-bold text-gray-900">{project.name}</h3>
                        {project.link && (
                          <span className="text-xs text-blue-500 underline">{project.link}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{project.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {project.technologies.map((tech, idx) => (
                          <span 
                            key={idx} 
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column (Sidebar) */}
          <div className="space-y-8">
            {/* Skills */}
            <section>
              <h2 className="text-lg font-bold uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-1">
                <Star size={18} style={{ color: themeColor }} />
                Skills
              </h2>
              <div className="space-y-4">
                {skills.map((category) => (
                  <div key={category.id}>
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">
                      {category.name}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {category.skills.map((skill, idx) => (
                        <span 
                          key={idx} 
                          className="px-2 py-1 bg-gray-50 text-gray-700 text-xs border border-gray-200 rounded-md"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Education */}
            <section>
              <h2 className="text-lg font-bold uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-1">
                <GraduationCap size={18} style={{ color: themeColor }} />
                Education
              </h2>
              <div className="space-y-4">
                {education.map((edu) => (
                  <div key={edu.id}>
                    <h3 className="font-bold text-gray-900 text-sm">{edu.degree}</h3>
                    <p className="text-xs font-medium" style={{ color: themeColor }}>{edu.school}</p>
                    <p className="text-[10px] text-gray-500">{edu.startDate} — {edu.current ? "Present" : edu.endDate}</p>
                    {edu.description && (
                      <p className="text-xs text-gray-600 mt-1 italic">{edu.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Languages */}
            {languages.length > 0 && (
              <section>
                <h2 className="text-lg font-bold uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-1">
                  <Languages size={18} style={{ color: themeColor }} />
                  Languages
                </h2>
                <div className="space-y-2">
                  {languages.map((lang) => (
                    <div key={lang.id} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-800">{lang.name}</span>
                      <span className="text-xs text-gray-500">{lang.level}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Certifications */}
            {certifications.length > 0 && (
              <section>
                <h2 className="text-lg font-bold uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-1">
                  <Award size={18} style={{ color: themeColor }} />
                  Certifications
                </h2>
                <ul className="space-y-2">
                  {certifications.map((cert, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: themeColor }} />
                      {cert}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ResumeTemplate.displayName = "ResumeTemplate";
