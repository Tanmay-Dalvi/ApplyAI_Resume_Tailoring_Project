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
  // Dynamic extra sections — projects, achievements, languages, etc.
  extra_sections?: ExtraSection[];
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

// A flexible section that can hold any extra content
export interface ExtraSection {
  title: string;                 // e.g. "Projects", "Achievements", "Languages"
  items: ExtraSectionItem[];
}

export interface ExtraSectionItem {
  heading?: string;              // Optional item heading (e.g. project name)
  subheading?: string;           // Optional sub-info (e.g. tech stack, role)
  bullets?: string[];            // Bullet points for the item
  plain?: string;                // Or just a plain text line (for languages, etc.)
}
