import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Resume {
  personalInfo: {
    fullName: string;
    jobTitle: string;
    email: string;
    phone: string;
    address: string;
    website: string;
    github: string;
    summary: string;
    avatar?: string;
  };
  experience: Experience[];
  education: Education[];
  skills: SkillCategory[];
  projects: Project[];
  languages: Language[];
  certifications: string[];
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string[];
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface SkillCategory {
  id: string;
  name: string;
  skills: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  link?: string;
}

export interface Language {
  id: string;
  name: string;
  level: string;
}

export const INITIAL_RESUME: Resume = {
  personalInfo: {
    fullName: "Alex Rivera",
    jobTitle: "Senior Full Stack Developer",
    email: "alex.rivera@example.com",
    phone: "+1 (555) 123-4567",
    address: "San Francisco, CA",
    website: "alexrivera.dev",
    github: "github.com/arivera",
    summary: "Passionate Full Stack Developer with 8+ years of experience building scalable web applications. Expert in React, Node.js, and cloud architecture. Proven track record of leading teams and delivering high-impact products.",
  },
  experience: [
    {
      id: "1",
      company: "TechFlow Solutions",
      position: "Senior Software Engineer",
      location: "San Francisco, CA",
      startDate: "2020-01",
      endDate: "",
      current: true,
      description: [
        "Led the migration of a legacy monolith to a microservices architecture using Node.js and Docker.",
        "Architected and implemented a real-time analytics dashboard using React and WebSockets.",
        "Mentored a team of 5 junior developers and improved code quality through rigorous peer reviews.",
      ],
    },
    {
      id: "2",
      company: "Innovate Digital",
      position: "Full Stack Developer",
      location: "Austin, TX",
      startDate: "2017-06",
      endDate: "2019-12",
      current: false,
      description: [
        "Developed and maintained multiple client-facing web applications using Vue.js and Express.",
        "Optimized database queries in PostgreSQL, reducing average response time by 40%.",
        "Implemented automated CI/CD pipelines using GitHub Actions.",
      ],
    },
  ],
  education: [
    {
      id: "1",
      school: "University of California, Berkeley",
      degree: "B.S. in Computer Science",
      location: "Berkeley, CA",
      startDate: "2013-09",
      endDate: "2017-05",
      current: false,
      description: "Focus on Distributed Systems and Artificial Intelligence.",
    },
  ],
  skills: [
    {
      id: "1",
      name: "Frontend",
      skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Framer Motion"],
    },
    {
      id: "2",
      name: "Backend",
      skills: ["Node.js", "Express", "PostgreSQL", "Redis", "GraphQL"],
    },
    {
      id: "3",
      name: "Tools & DevOps",
      skills: ["Docker", "AWS", "Git", "CI/CD", "Jest"],
    },
  ],
  projects: [
    {
      id: "1",
      name: "CloudScale Analytics",
      description: "A real-time monitoring tool for cloud infrastructure with automated alerting.",
      technologies: ["React", "Go", "InfluxDB", "Grafana"],
      link: "https://cloudscale.demo",
    },
    {
      id: "2",
      name: "EcoTrack Mobile",
      description: "Mobile application for tracking personal carbon footprint and suggesting sustainable alternatives.",
      technologies: ["React Native", "Firebase", "Node.js"],
    },
  ],
  languages: [
    { id: "1", name: "English", level: "Native" },
    { id: "2", name: "Spanish", level: "Professional Working" },
  ],
  certifications: [
    "AWS Certified Solutions Architect",
    "Google Cloud Professional Developer",
  ],
};
