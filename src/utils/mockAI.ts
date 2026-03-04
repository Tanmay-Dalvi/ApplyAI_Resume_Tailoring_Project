import { supabase } from '../lib/supabase';
import { ResumeData } from '../types';

export async function generateTailoredResume(
  resumeText: string,
  jobDescription: string,
  jobTitle: string,
  company: string
): Promise<ResumeData> {
  const { data, error } = await supabase.functions.invoke('generate-resume', {
    body: {
      resumeText,
      jobDescription,
      jobTitle,
      company
    }
  });

  if (error) {
    console.error("Supabase Edge Function Error:", error);
    throw new Error(error.message || "Failed to generate resume through AI");
  }

  // Manually check for errors inside the 200 OK payload
  if (data && data.error) {
    console.error("AI Generation Error from backend:", data.error);
    throw new Error(data.error);
  }

  // data will already be a parsed JSON object since Supabase automatically parses JSON responses
  return data as ResumeData;
}
