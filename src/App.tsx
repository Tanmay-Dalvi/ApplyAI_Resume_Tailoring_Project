import React, { useState, useEffect } from 'react';
import { FileText, Sparkles, Download, Loader2, LogOut, LogIn, UserPlus } from 'lucide-react';
import { supabase } from './lib/supabase';
import { extractTextFromPDF } from './utils/pdfParser';
import { generateTailoredResume } from './utils/mockAI';
import { generateDocx } from './utils/docxGenerator';
import { JobData, ResumeData } from './types';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [masterResume, setMasterResume] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState<string>('');
  const [showResumeText, setShowResumeText] = useState(false);
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAuthSubmit, setIsAuthSubmit] = useState(false);
  const [error, setError] = useState<string>('');
  const [infoMessage, setInfoMessage] = useState<string>('');
  const [extractedFileRef, setExtractedFileRef] = useState<File | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setSession(session);
      setIsAuthLoading(false);
      chrome.storage.local.set({ userLoggedIn: !!session });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setSession(session);
      chrome.storage.local.set({ userLoggedIn: !!session });
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      chrome.storage.local.get(['lastScrapedJob'], (result: { [key: string]: any }) => {
        if (result.lastScrapedJob) {
          setJobData(result.lastScrapedJob as JobData);
        }
      });
    }
  }, [session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthSubmit(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setIsAuthSubmit(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthSubmit(true);
    setError('');
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setError('Check your email for confirmation!');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setIsAuthSubmit(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setMasterResume(file);
      setExtractedFileRef(null);
      setError('');
      setInfoMessage('');
    } else {
      setError('Please upload a PDF file');
    }
  };

  const handleExtractText = async () => {
    if (!masterResume) {
      setError('Please upload a resume first');
      return;
    }

    if (!session?.user) {
      setError('You must be logged in to upload resumes');
      return;
    }

    if (masterResume === extractedFileRef) {
      setInfoMessage('This resume has already been extracted and saved.');
      return;
    }

    setIsExtracting(true);
    setError('');
    setInfoMessage('');

    try {
      const text = await extractTextFromPDF(masterResume);
      setResumeText(text);
      setShowResumeText(false); // Default to hidden

      // Store resume in Supabase
      const { error: insertError } = await supabase
        .from('resumes')
        .insert({
          user_id: session.user.id,
          original_text: text
        });

      if (insertError) {
        console.error("Supabase Storage Error:", insertError);
        setInfoMessage('Resume extracted, but failed to save backup to cloud.');
      } else {
        setExtractedFileRef(masterResume);
        setInfoMessage('Resume extracted and saved to cloud.');
      }

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

      chrome.tabs.sendMessage(tab.id, { action: 'scrapeJob' }, (response: any) => {
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

  if (isAuthLoading) {
    return (
      <div className="w-[400px] h-[500px] flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="w-[400px] min-h-[500px] bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Sparkles className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">AI Resume Tailor</h1>
          <p className="text-sm text-slate-600">Sign in to start tailoring your resume</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={authMode === 'login' ? handleLogin : handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={isAuthSubmit}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            {isAuthSubmit ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : authMode === 'login' ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {authMode === 'login' ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[400px] min-h-[500px] bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-800">AI Resume Tailor</h1>
          </div>
          <p className="text-xs text-slate-600">{session.user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {infoMessage && !error && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          {infoMessage}
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
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-medium text-slate-700">Extracted Resume Text:</p>
              <button 
                onClick={() => setShowResumeText(!showResumeText)}
                className="text-[10px] text-blue-600 hover:text-blue-700 font-medium underline"
              >
                {showResumeText ? 'Hide' : 'View Original Resume Text'}
              </button>
            </div>
            {showResumeText && (
              <div className="text-xs text-slate-600 max-h-32 overflow-y-auto bg-slate-50 p-2 rounded">
                {resumeText}
              </div>
            )}
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
