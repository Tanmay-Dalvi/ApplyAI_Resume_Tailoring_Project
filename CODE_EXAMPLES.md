# Code Examples - AI Resume Tailor

## 1. PDF Text Extraction

```typescript
// src/utils/pdfParser.ts
import * as pdfjsLib from 'pdfjs-dist';

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}
```

**Usage:**
```typescript
const text = await extractTextFromPDF(resumeFile);
setResumeText(text);
```

---

## 2. LinkedIn Job Scraping

```typescript
// src/content/linkedin-scraper.ts
function scrapeLinkedInJob(): ScrapedJobData | null {
  const titleElement = document.querySelector('.job-details-jobs-unified-top-card__job-title');
  const companyElement = document.querySelector('.job-details-jobs-unified-top-card__company-name');
  const descriptionElement = document.querySelector('.jobs-description__content');

  if (!titleElement || !companyElement || !descriptionElement) {
    return null;
  }

  return {
    title: titleElement.textContent?.trim() || '',
    company: companyElement.textContent?.trim() || '',
    description: descriptionElement.textContent?.trim() || '',
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeJob') {
    const jobData = scrapeLinkedInJob();
    sendResponse({ success: true, data: jobData });
  }
  return true;
});
```

**From Popup:**
```typescript
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

chrome.tabs.sendMessage(tab.id, { action: 'scrapeJob' }, (response) => {
  if (response?.success && response.data) {
    setJobData(response.data);
  }
});
```

---

## 3. Mock AI Resume Tailoring

```typescript
// src/utils/mockAI.ts
export function generateTailoredResume(
  resumeText: string,
  jobDescription: string,
  jobTitle: string,
  company: string
): ResumeData {
  // Extract contact info
  const emailMatch = resumeText.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = resumeText.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

  // Extract keywords from job description
  const jobKeywords = extractKeywords(jobDescription);
  const resumeSkills = extractSkills(resumeText);
  const tailoredSkills = [...new Set([...jobKeywords, ...resumeSkills])].slice(0, 12);

  // Generate tailored summary
  const summary = `Results-driven professional seeking ${jobTitle} position at ${company}.
    Proven expertise in ${tailoredSkills.slice(0, 5).join(', ')}.`;

  return {
    name: extractName(resumeText),
    email: emailMatch?.[0] || 'email@example.com',
    phone: phoneMatch?.[0] || '(555) 123-4567',
    summary,
    skills: tailoredSkills,
    experience: extractExperiences(resumeText),
    education: extractEducation(resumeText),
  };
}
```

**Keyword Extraction:**
```typescript
function extractKeywords(text: string): string[] {
  const commonKeywords = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python',
    'AWS', 'Docker', 'Kubernetes', 'SQL', 'MongoDB', 'Git'
  ];

  return commonKeywords.filter(keyword =>
    text.toLowerCase().includes(keyword.toLowerCase())
  );
}
```

---

## 4. DOCX Generation

```typescript
// src/utils/docxGenerator.ts
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

export async function generateDocx(resume: ResumeData, jobTitle: string): Promise<void> {
  const doc = new Document({
    sections: [{
      children: [
        // Header
        new Paragraph({
          text: resume.name,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        }),

        // Contact
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun(`${resume.email} | ${resume.phone}`),
          ],
        }),

        // Summary
        new Paragraph({
          text: 'PROFESSIONAL SUMMARY',
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({ text: resume.summary }),

        // Skills
        new Paragraph({
          text: 'SKILLS',
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: resume.skills.join(' • '),
        }),

        // Experience
        new Paragraph({
          text: 'EXPERIENCE',
          heading: HeadingLevel.HEADING_1,
        }),
        ...resume.experience.flatMap(exp => [
          new Paragraph({
            children: [
              new TextRun({ text: exp.title, bold: true }),
              new TextRun(` | ${exp.company}`),
            ],
          }),
          new Paragraph({
            text: exp.duration,
            italics: true,
          }),
          ...exp.description.map(desc =>
            new Paragraph({ text: `• ${desc}` })
          ),
        ]),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `Tailored_Resume_${jobTitle.replace(/\s+/g, '_')}.docx`;
  saveAs(blob, fileName);
}
```

---

## 5. Chrome Storage Integration

```typescript
// Save job data
chrome.storage.local.set({ lastScrapedJob: jobData });

// Retrieve job data
chrome.storage.local.get(['lastScrapedJob'], (result) => {
  if (result.lastScrapedJob) {
    setJobData(result.lastScrapedJob);
  }
});
```

---

## 6. React State Management

```typescript
// src/App.tsx
function App() {
  const [masterResume, setMasterResume] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState<string>('');
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>('');

  // Load saved job data on mount
  useEffect(() => {
    chrome.storage.local.get(['lastScrapedJob'], (result) => {
      if (result.lastScrapedJob) {
        setJobData(result.lastScrapedJob);
      }
    });
  }, []);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setMasterResume(file);
      setError('');
    } else {
      setError('Please upload a PDF file');
    }
  };

  // Extract text from PDF
  const handleExtractText = async () => {
    if (!masterResume) {
      setError('Please upload a resume first');
      return;
    }

    setIsExtracting(true);
    setError('');

    try {
      const text = await extractTextFromPDF(masterResume);
      setResumeText(text);
    } catch (err) {
      setError('Failed to extract text from PDF');
    } finally {
      setIsExtracting(false);
    }
  };

  // Generate tailored resume
  const handleGenerateResume = async () => {
    if (!resumeText || !jobData) {
      setError('Missing resume text or job data');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const tailoredResume = generateTailoredResume(
        resumeText,
        jobDescription: jobData.description,
        jobTitle: jobData.title,
        company: jobData.company
      );

      await generateDocx(tailoredResume, jobData.title);
    } catch (err) {
      setError('Failed to generate resume');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-[400px] min-h-[500px] p-6">
      {/* UI components */}
    </div>
  );
}
```

---

## 7. TypeScript Interfaces

```typescript
// src/types/index.ts
export interface JobData {
  title: string;
  company: string;
  description: string;
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
```

---

## 8. Error Handling

```typescript
// Graceful error handling with user feedback
const handleExtractText = async () => {
  setIsExtracting(true);
  setError('');

  try {
    const text = await extractTextFromPDF(masterResume);
    setResumeText(text);
  } catch (err) {
    setError('Failed to extract text from PDF');
    console.error(err);
  } finally {
    setIsExtracting(false);
  }
};

// Display errors in UI
{error && (
  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
    {error}
  </div>
)}
```

---

## 9. Loading States

```typescript
// Button with loading indicator
<button
  onClick={handleExtractText}
  disabled={!masterResume || isExtracting}
  className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg"
>
  {isExtracting ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin" />
      Extracting...
    </>
  ) : (
    <>
      <FileText className="w-4 h-4" />
      Extract Text
    </>
  )}
</button>
```

---

## 10. Vite + CRX Plugin Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      input: {
        popup: 'index.html',
      },
    },
  },
});
```

---

## Testing the Extension

```typescript
// 1. Test PDF extraction
const testPDF = new File([pdfBlob], 'resume.pdf', { type: 'application/pdf' });
const text = await extractTextFromPDF(testPDF);
console.log('Extracted text:', text);

// 2. Test mock AI
const resume = generateTailoredResume(
  'John Doe\njohn@email.com\nSoftware Engineer with React experience',
  'Looking for React developer with TypeScript skills',
  'React Developer',
  'Tech Corp'
);
console.log('Generated resume:', resume);

// 3. Test DOCX generation
await generateDocx(resume, 'React_Developer');
// Should download: Tailored_Resume_React_Developer.docx
```
