# AI Resume Tailor - Complete Folder Structure

```
ai-resume-tailor/
│
├── manifest.json                    # Chrome Extension Manifest v3
│   ├── permissions: ["activeTab", "storage"]
│   ├── action: popup configuration
│   └── content_scripts: LinkedIn scraper
│
├── vite.config.ts                   # Vite + @crxjs/vite-plugin config
├── tailwind.config.js               # Tailwind CSS configuration
├── tsconfig.json                    # TypeScript configuration
├── package.json                     # Dependencies & scripts
│
├── public/                          # Static assets
│   ├── icon-16.png                 # 16x16 extension icon
│   ├── icon-48.png                 # 48x48 extension icon
│   ├── icon-128.png                # 128x128 extension icon
│   └── icon.svg                    # SVG icon source
│
├── src/
│   ├── main.tsx                    # React entry point
│   ├── App.tsx                     # Main popup UI component
│   ├── index.css                   # Tailwind directives
│   │
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces
│   │       ├── JobData
│   │       ├── ResumeData
│   │       ├── Experience
│   │       └── Education
│   │
│   ├── utils/
│   │   ├── pdfParser.ts            # PDF text extraction (pdf.js)
│   │   ├── mockAI.ts               # Mock AI tailoring logic
│   │   └── docxGenerator.ts        # DOCX file generation (docx)
│   │
│   └── content/
│       └── linkedin-scraper.ts     # LinkedIn job scraper
│
├── dist/                            # Build output (load in Chrome)
│   ├── manifest.json               # Generated manifest
│   ├── index.html                  # Popup HTML
│   ├── icon-*.png                  # Icons
│   ├── assets/
│   │   ├── popup-*.js              # Bundled popup code
│   │   ├── popup-*.css             # Bundled styles
│   │   └── linkedin-scraper-*.js   # Content script
│   └── .vite/
│       └── manifest.json           # Vite manifest
│
├── README.md                        # Project overview
├── SETUP.md                         # Detailed setup guide
└── FOLDER_STRUCTURE.md             # This file
```

## File Descriptions

### Root Configuration Files

**manifest.json**
- Chrome Extension Manifest v3
- Defines permissions, popup, content scripts
- Specifies icon paths

**vite.config.ts**
- Configures Vite bundler
- Integrates @crxjs/vite-plugin for Chrome extension support
- Sets up build options

**tailwind.config.js**
- Tailwind CSS configuration
- Defines content paths for purging

**package.json**
- Dependencies: React, TypeScript, pdf.js, docx, etc.
- Scripts: dev, build, lint

### Source Files

**src/main.tsx**
- React application entry point
- Mounts App component to DOM

**src/App.tsx**
- Main popup interface (400x500px)
- State management for resume, job data, loading states
- Handlers for file upload, text extraction, scraping, generation
- Clean Tailwind UI with error handling

**src/types/index.ts**
```typescript
interface JobData {
  title: string;
  company: string;
  description: string;
}

interface ResumeData {
  name: string;
  email: string;
  phone: string;
  summary: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
}
```

**src/utils/pdfParser.ts**
- Uses pdf.js library
- `extractTextFromPDF(file: File): Promise<string>`
- Iterates through all pages
- Concatenates text content

**src/utils/mockAI.ts**
- `generateTailoredResume()`: Main function
- Extracts keywords from job description
- Parses resume text for skills, experience, education
- Combines and tailors data
- Returns structured ResumeData object

**src/utils/docxGenerator.ts**
- Uses docx library
- `generateDocx(resume: ResumeData, jobTitle: string): Promise<void>`
- Creates professional resume layout
- Uses file-saver to trigger download
- Filename: `Tailored_Resume_<JobTitle>.docx`

**src/content/linkedin-scraper.ts**
- Runs on `linkedin.com/jobs/*` pages
- Scrapes job title, company, description
- Listens for messages from popup
- Auto-saves to chrome.storage.local
- Uses MutationObserver to detect page changes

### Build Output (dist/)

After running `npm run build`, the dist/ folder contains:
- Bundled and minified JavaScript
- Processed CSS
- Copied static assets
- Generated manifest.json
- Ready to load in Chrome

## Chrome Extension Architecture

```
┌─────────────────┐
│  Popup (App.tsx)│
│  - Upload PDF   │
│  - Extract Text │
│  - Generate     │
└────────┬────────┘
         │
         ├──────────────┐
         │              │
         ▼              ▼
┌────────────────┐  ┌──────────────────┐
│ Content Script │  │ Chrome Storage   │
│ (LinkedIn)     │  │ - Job Data       │
│ - Scrape       │  │ - Resume Text    │
│ - Send Message │  │                  │
└────────────────┘  └──────────────────┘
         │
         ▼
┌────────────────┐
│ Utils          │
│ - PDF Parser   │
│ - Mock AI      │
│ - DOCX Gen     │
└────────────────┘
```

## Data Flow

1. **Upload Resume** → PDF File → pdfParser.ts → Text String → State
2. **Scrape LinkedIn** → Content Script → Chrome Message → Job Data → State
3. **Generate Resume** → mockAI.ts → ResumeData → docxGenerator.ts → Download

## Key Dependencies

```json
{
  "@crxjs/vite-plugin": "Chrome extension bundling",
  "pdfjs-dist": "PDF text extraction",
  "docx": "DOCX file generation",
  "file-saver": "Browser file downloads",
  "react": "UI framework",
  "typescript": "Type safety",
  "tailwindcss": "Styling",
  "lucide-react": "Icons"
}
```
