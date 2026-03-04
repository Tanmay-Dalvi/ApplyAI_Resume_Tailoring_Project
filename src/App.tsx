import { useState, useEffect } from 'react';
import { FileText, Sparkles, Download, Loader2 } from 'lucide-react';
import { extractTextFromPDF } from './utils/pdfParser';
import { generateTailoredResume } from './utils/mockAI';
import { generateDocx } from './utils/docxGenerator';
import { JobData, ResumeData } from './types';

function App() {
  const [masterResume, setMasterResume] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState<string>('');
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    chrome.storage.local.get(['lastScrapedJob'], (result) => {
      if (result.lastScrapedJob) {
        setJobData(result.lastScrapedJob as JobData);
      }
    });
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setMasterResume(file);
      setError('');
    } else {
      setError('Please upload a PDF file');
    }
  };

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
      console.error(err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleScrapeJob = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id || !tab.url?.includes('linkedin.com/jobs')) {
        setError('Please navigate to a LinkedIn job posting');
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: 'scrapeJob' }, (response) => {
        if (response?.success && response.data) {
          setJobData(response.data);
          setError('');
        } else {
          setError('Could not scrape job data. Make sure you\'re on a LinkedIn job page.');
        }
      });
    } catch (err) {
      setError('Failed to scrape job data');
      console.error(err);
    }
  };

  const handleGenerateResume = async () => {
    if (!resumeText) {
      setError('Please extract resume text first');
      return;
    }

    if (!jobData) {
      setError('Please scrape job data first');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const tailoredResume: ResumeData = await generateTailoredResume(
        resumeText,
        jobData.description,
        jobData.title,
        jobData.company
      );

      await generateDocx(tailoredResume, jobData.title);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate resume';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-[400px] min-h-[500px] bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800">AI Resume Tailor</h1>
        </div>
        <p className="text-sm text-slate-600">Tailor your resume to any job posting</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
          <label className="block mb-2 text-sm font-medium text-slate-700">
            Upload Master Resume (PDF)
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer cursor-pointer"
          />
          {masterResume && (
            <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {masterResume.name}
            </p>
          )}
        </div>

        <button
          onClick={handleExtractText}
          disabled={!masterResume || isExtracting}
          className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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

        {resumeText && (
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <p className="text-xs font-medium text-slate-700 mb-2">Resume Preview:</p>
            <div className="text-xs text-slate-600 max-h-32 overflow-y-auto bg-slate-50 p-2 rounded">
              {resumeText.substring(0, 300)}...
            </div>
          </div>
        )}

        <div className="border-t border-slate-300 my-4"></div>

        {jobData && (
          <div className="bg-white rounded-lg p-4 shadow-sm border border-green-200">
            <p className="text-xs font-medium text-slate-700 mb-2">Job Details:</p>
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-slate-800">{jobData.title}</p>
              <p className="text-slate-600">{jobData.company}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleScrapeJob}
          className="w-full bg-slate-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Scrape Current LinkedIn Job
        </button>

        <button
          onClick={handleGenerateResume}
          disabled={!resumeText || !jobData || isGenerating}
          className="w-full bg-green-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Generate Tailored Resume
            </>
          )}
        </button>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-300">
        <p className="text-xs text-slate-500 text-center">
          Navigate to a LinkedIn job posting and click "Scrape" to begin
        </p>
      </div>
    </div>
  );
}

export default App;
