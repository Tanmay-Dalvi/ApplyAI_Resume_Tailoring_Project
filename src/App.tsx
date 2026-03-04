import React, { useState, useEffect } from 'react';
import { Sparkles, Download, Loader2, LogOut, LogIn, UserPlus, X, UploadCloud, CheckCircle2, PieChart, Target } from 'lucide-react';
import { supabase } from './lib/supabase';
import { extractTextFromPDF } from './utils/pdfParser';
import { generateTailoredResume } from './utils/mockAI';
import { generateDocx } from './utils/docxGenerator';
import { JobData, ResumeData, EligibilityScore } from './types';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [masterResume, setMasterResume] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState<string>('');
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCalculatingScore, setIsCalculatingScore] = useState(false);
  const [eligibilityScore, setEligibilityScore] = useState<EligibilityScore | null>(null);
  const [isAuthSubmit, setIsAuthSubmit] = useState(false);
  const [error, setError] = useState<string>('');
  const [infoMessage, setInfoMessage] = useState<string>('');
  const [extractedFileRef, setExtractedFileRef] = useState<File | null>(null);
  const [showUploadUI, setShowUploadUI] = useState(false);

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
      chrome.storage.local.get(['lastScrapedJob'], (result: { [key: string]: unknown }) => {
        if (result.lastScrapedJob) {
          setJobData(result.lastScrapedJob as JobData);
        }
      });

      // Fetch the user's saved resume from cloud
      const fetchResume = async () => {
        const { data, error } = await supabase
          .from('resumes')
          .select('original_text')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (data?.original_text && !error) {
          setResumeText(data.original_text);
          showTemporaryMessage('Loaded your saved resume from the cloud.');
        } else {
          // If no resume is found, force the upload UI to show
          setShowUploadUI(true);
        }
      };
      
      fetchResume();
    }
  }, [session]);

  const showTemporaryMessage = (msg: string) => {
    setInfoMessage(msg);
    setTimeout(() => {
      setInfoMessage('');
    }, 5000);
  };

  const handleClosePopup = () => {
    window.close();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthSubmit(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setIsAuthSubmit(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setResumeText('');
    setMasterResume(null);
    setEligibilityScore(null);
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
      showTemporaryMessage('This resume has already been extracted and saved.');
      return;
    }

    setIsExtracting(true);
    setError('');
    setInfoMessage('');

    try {
      const text = await extractTextFromPDF(masterResume);
      setResumeText(text);

      // Store resume in Supabase as an upsert (update if exists, insert if not)
      const { error: insertError } = await supabase
        .from('resumes')
        .upsert({
          user_id: session.user.id,
          original_text: text,
          created_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (insertError) {
        console.error("Supabase Storage Error:", insertError);
        showTemporaryMessage('Resume extracted, but failed to save backup to cloud.');
      } else {
        setExtractedFileRef(masterResume);
        showTemporaryMessage('Resume extracted and saved to cloud.');
        setShowUploadUI(false); // Hide the upload box once successful
      }
      
      // Reset score on new resume
      setEligibilityScore(null);

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

      chrome.tabs.sendMessage(tab.id, { action: 'scrapeJob' }, (response: { success?: boolean; data?: JobData }) => {
        if (response?.success && response.data) {
          setJobData(response.data);
          setError('');
          setEligibilityScore(null); // Reset score on new job
        } else {
          setError('Could not scrape job data. Make sure you\'re on a LinkedIn job page.');
        }
      });
    } catch (err) {
      setError('Failed to scrape job data');
      console.error(err);
    }
  };

  const handleCalculateScore = async () => {
    if (!resumeText || !jobData) {
      setError('Please ensure you have a resume and a job selected first.');
      return;
    }

    setIsCalculatingScore(true);
    setError('');

    try {
      const { data, error: functionError } = await supabase.functions.invoke('calculate-score', {
        body: {
          resumeText,
          jobDescription: jobData.description,
          jobTitle: jobData.title,
          company: jobData.company
        }
      });

      if (functionError) throw functionError;
      
      setEligibilityScore(data as EligibilityScore);
      showTemporaryMessage('Score calculated successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate eligibility score.';
      setError(`Score error: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsCalculatingScore(false);
    }
  };

  const handleGenerateResume = async () => {
    if (!resumeText) {
      setError('Please extract your Master Resume first.');
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
      showTemporaryMessage('Resume generated and downloaded successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate resume';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const Header = () => (
    <div className="flex justify-between items-start mb-6">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 tracking-tight">
            ApplyAI
          </h1>
        </div>
        <p className="text-xs font-medium text-slate-500 tracking-wide uppercase mt-1">Land Your Dream Role Faster</p>
      </div>
      <button
        onClick={handleClosePopup}
        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors focus:outline-none"
        title="Close Extension"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  if (isAuthLoading) {
    return (
      <div className="w-[420px] h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="w-[420px] min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6 flex flex-col overflow-y-auto">
        <Header />

        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full pb-8">
          <div className="mb-8 text-center mt-8">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Welcome Back</h2>
            <p className="text-sm text-slate-500">Sign in to sync your master resume and start tailoring.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm shadow-sm flex items-center gap-2">
              <span className="block flex-1">{error}</span>
            </div>
          )}

          <form onSubmit={authMode === 'login' ? handleLogin : handleSignup} className="space-y-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={isAuthSubmit}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-2 focus:ring-2 focus:ring-blue-500/50 focus:outline-none disabled:opacity-70"
            >
              {isAuthSubmit ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : authMode === 'login' ? (
                <LogIn className="w-5 h-5" />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors"
            >
              {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[420px] min-h-screen bg-slate-50 p-6 flex flex-col relative overflow-y-auto">
      {/* Decorative background blob */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-blue-500/5 blur-3xl pointer-events-none"></div>

      <Header />
      
      <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm mb-4">
        <p className="text-xs text-slate-500 truncate mr-2 flex-1 font-medium">{session.user.email}</p>
        <button
          onClick={handleLogout}
          className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5 px-2 py-1 hover:bg-red-50 rounded transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>

      {/* Floating Alerts */}
      <div className="space-y-2 mb-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm shadow-sm flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
            <span className="block flex-1 leading-snug">{error}</span>
          </div>
        )}
        {infoMessage && !error && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm shadow-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="block flex-1 leading-snug font-medium">{infoMessage}</span>
          </div>
        )}
      </div>

      <div className="space-y-4 flex-1 pb-4">
        
        {/* Resume Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Master Resume</h3>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5 max-w-[200px] truncate">
                {resumeText ? 'Currently synced to cloud' : 'No resume on file'}
              </p>
            </div>
            {resumeText && !showUploadUI && (
              <button 
                onClick={() => setShowUploadUI(true)}
                className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
              >
                Update Selected
              </button>
            )}
          </div>

          {showUploadUI && (
            <div className="p-4 bg-blue-50/30">
              <div className="relative border-2 border-dashed border-blue-200 rounded-xl p-4 text-center hover:bg-blue-50/50 transition-colors group">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-6 h-6 mx-auto text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-medium text-blue-700 mb-1">
                  {masterResume ? masterResume.name : 'Click to browse PDF'}
                </p>
                <p className="text-[10px] text-slate-500">Max file size 5MB</p>
              </div>

              {masterResume && (
                <button
                  onClick={handleExtractText}
                  disabled={isExtracting}
                  className="w-full mt-3 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-70 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {isExtracting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Upload and Sync'
                  )}
                </button>
              )}
              {resumeText && (
                 <button onClick={() => setShowUploadUI(false)} className="w-full mt-2 text-xs font-medium text-slate-500 hover:text-slate-800">Cancel</button>
              )}
            </div>
          )}
        </div>

        {/* Job Details Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Target Role</h3>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">From currently open LinkedIn tab</p>
            </div>
            <button
              onClick={handleScrapeJob}
              className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Target className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          <div className="p-4">
            {jobData ? (
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                  <span className="text-indigo-600 font-bold text-lg">{jobData.company.charAt(0)}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{jobData.title}</p>
                  <p className="text-xs text-slate-500 truncate">{jobData.company}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-slate-500 font-medium">No job scanned yet.</p>
                <p className="text-xs text-slate-400 mt-1">Open a LinkedIn posting and click Refresh.</p>
              </div>
            )}
          </div>
        </div>

        {/* Eligibility Engine UI */}
        {resumeText && jobData && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-800">Eligibility Engine</h3>
                {!eligibilityScore && (
                  <button
                    onClick={handleCalculateScore}
                    disabled={isCalculatingScore}
                    className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-70"
                  >
                    {isCalculatingScore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PieChart className="w-3.5 h-3.5" />}
                    Calculate Score
                  </button>
                )}
             </div>

             {isCalculatingScore && (
                <div className="p-8 text-center text-slate-500 text-sm flex flex-col items-center">
                   <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                   AI is evaluating your skills...
                </div>
             )}

             {eligibilityScore && (
                <div className="p-4">
                   <div className="flex items-center gap-4 mb-3">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 ${getScoreColor(eligibilityScore.score).replace('text-', 'border-').split(' ')[0]} bg-white shrink-0`}>
                        <span className={`text-xl font-bold ${getScoreColor(eligibilityScore.score).split(' ')[0]}`}>{eligibilityScore.score}</span>
                      </div>
                      <div className="flex-1">
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                          <div 
                            className={`h-full ${getScoreBarColor(eligibilityScore.score)} rounded-full transition-all duration-1000 ease-out`} 
                            style={{ width: `${eligibilityScore.score}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-600 italic leading-snug">"{eligibilityScore.remark}"</p>
                      </div>
                   </div>

                   {eligibilityScore.missingSkills && eligibilityScore.missingSkills.length > 0 && (
                     <div className="mt-4 pt-3 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Key Missing Skills / Keywords</p>
                        <div className="flex flex-wrap gap-1.5">
                          {eligibilityScore.missingSkills.map((skill: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200">
                              {skill}
                            </span>
                          ))}
                        </div>
                     </div>
                   )}
                </div>
             )}
          </div>
        )}

      </div>

      {/* Main Action Area */}
      <div className="mt-auto pt-4 border-t border-slate-200/60 sticky bottom-0 bg-slate-50 z-10 pb-2">
        <button
          onClick={handleGenerateResume}
          disabled={!resumeText || !jobData || isGenerating}
          className="w-full bg-slate-900 text-white py-3.5 px-4 rounded-xl font-bold hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Tailoring your resume...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Generate Tailored Document
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default App;
