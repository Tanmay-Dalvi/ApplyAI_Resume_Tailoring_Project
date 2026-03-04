# AI Resume Tailor - Chrome Extension

A Chrome extension that helps you tailor your resume to any LinkedIn job posting.

## Features

- Upload and parse PDF resumes
- Automatically scrape LinkedIn job postings
- Generate tailored resumes as DOCX files
- 100% client-side processing (no backend required)
- Mock AI logic for resume tailoring

## Tech Stack

- React + TypeScript
- Vite
- @crxjs/vite-plugin
- Tailwind CSS
- pdf.js (PDF parsing)
- docx (Document generation)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Extension

```bash
npm run build
```

### 3. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `dist` folder from this project

### 4. Usage

1. Navigate to a LinkedIn job posting (e.g., https://www.linkedin.com/jobs/...)
2. Click the extension icon in Chrome toolbar
3. Upload your master resume (PDF format)
4. Click "Extract Text" to parse the PDF
5. Click "Scrape Current LinkedIn Job" to extract job details
6. Click "Generate Tailored Resume" to create a customized DOCX file

The extension will automatically download a file named `Tailored_Resume_<JobTitle>.docx`

## Development

```bash
npm run dev
```

Then follow step 3 above, but select the `dist` folder after the dev build completes.

## Project Structure

```
├── manifest.json              # Chrome extension manifest
├── src/
│   ├── App.tsx               # Main popup UI
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   ├── utils/
│   │   ├── pdfParser.ts      # PDF text extraction
│   │   ├── mockAI.ts         # Mock AI logic
│   │   └── docxGenerator.ts  # DOCX creation
│   └── content/
│       └── linkedin-scraper.ts  # LinkedIn scraping
├── vite.config.ts            # Vite + CRX plugin config
└── tailwind.config.js        # Tailwind CSS config
```

## How It Works

1. **PDF Parsing**: Uses pdf.js to extract text from uploaded resume
2. **LinkedIn Scraping**: Content script monitors LinkedIn job pages and extracts job details
3. **Mock AI**: Combines resume text + job description to generate structured resume data
4. **DOCX Generation**: Creates a professionally formatted Word document using the docx library

## Notes

- This is a frontend-only implementation
- No external APIs or backend services required
- The "AI" logic is a mock implementation that extracts and reorganizes resume data
- For production use, you would replace the mock AI with actual AI API calls

## License

MIT
