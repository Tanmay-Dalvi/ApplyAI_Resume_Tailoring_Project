# Setup Guide - AI Resume Tailor Chrome Extension

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Extension
```bash
npm run build
```

### 3. Load in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `dist` folder from this project
5. Extension is now installed!

## Usage Flow

### Step 1: Upload Resume
1. Click the extension icon in Chrome toolbar
2. Click "Upload Master Resume (PDF)"
3. Select your PDF resume file
4. Click "Extract Text" button
5. Wait for text extraction (preview will show)

### Step 2: Scrape LinkedIn Job
1. Navigate to any LinkedIn job posting
   - Example: `https://www.linkedin.com/jobs/view/123456789`
2. Open the extension popup
3. Click "Scrape Current LinkedIn Job"
4. Job details will appear in the popup

### Step 3: Generate Tailored Resume
1. Click "Generate Tailored Resume" button
2. A DOCX file will automatically download
3. File name: `Tailored_Resume_<JobTitle>.docx`

## Development Mode

For live development:

```bash
npm run dev
```

Then load the `dist` folder in Chrome as described above. Changes will rebuild automatically.

## Project Structure

```
ai-resume-tailor/
├── manifest.json              # Chrome extension configuration
├── vite.config.ts            # Vite + CRX plugin setup
├── public/
│   ├── icon-16.png           # Extension icons
│   ├── icon-48.png
│   └── icon-128.png
├── src/
│   ├── App.tsx               # Main popup UI component
│   ├── main.tsx              # React entry point
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   ├── utils/
│   │   ├── pdfParser.ts      # PDF.js text extraction
│   │   ├── mockAI.ts         # Mock AI resume tailoring
│   │   └── docxGenerator.ts  # DOCX file generation
│   └── content/
│       └── linkedin-scraper.ts  # LinkedIn page scraper
└── dist/                     # Build output (load this in Chrome)
```

## How It Works

### PDF Parsing
- Uses `pdf.js` library
- Extracts text from all pages
- Stores text in component state

### LinkedIn Scraping
- Content script runs on `linkedin.com/jobs/*`
- Detects job title, company, and description
- Uses Chrome messaging to send data to popup
- Auto-saves last scraped job in local storage

### Mock AI Logic
- Combines resume text + job description
- Extracts skills, experience, education
- Matches keywords from job posting
- Generates tailored summary
- Returns structured JSON

### DOCX Generation
- Uses `docx` library
- Creates professional resume layout
- Sections: Summary, Skills, Experience, Education
- Auto-downloads with job-specific filename

## Troubleshooting

### Extension won't load
- Make sure you selected the `dist` folder, not the project root
- Check Chrome console for errors
- Try rebuilding: `npm run build`

### PDF extraction fails
- Ensure file is a valid PDF
- Check browser console for errors
- Try a different PDF

### LinkedIn scraping doesn't work
- Must be on a LinkedIn job posting page
- URL should match: `linkedin.com/jobs/view/*`
- LinkedIn may have changed their HTML structure

### DOCX won't download
- Check browser download permissions
- Ensure file-saver is installed: `npm install file-saver`

## Technologies Used

| Technology | Purpose |
|-----------|---------|
| React | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| @crxjs/vite-plugin | Chrome extension bundling |
| Tailwind CSS | Styling |
| pdf.js | PDF parsing |
| docx | DOCX generation |
| file-saver | File downloads |
| Lucide React | Icons |

## Future Enhancements

- Replace mock AI with real AI API (OpenAI, Anthropic, etc.)
- Support DOCX resume uploads
- Add resume templates
- Support multiple job postings
- Add resume comparison feature
- Export to PDF format
- Indeed/Glassdoor support

## License

MIT
