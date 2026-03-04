export interface JobData {
  title: string;
  company: string;
  description: string;
}

export interface EligibilityScore {
  score: number;
  remark: string;
  missingSkills: string[];
}

export interface ResumeData {
  name: string;
  email: string;
  phone: string;
  summary: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
}

export interface Experience {
  title: string;
  company: string;
  duration: string;
  description: string[];
}

export interface Education {
  degree: string;
  institution: string;
  year: string;
}
