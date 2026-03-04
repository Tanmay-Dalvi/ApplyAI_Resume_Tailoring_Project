import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { resumeText, jobDescription, jobTitle, company } = await req.json()

    if (!resumeText || !jobDescription) {
      throw new Error('Resume text and job description are required')
    }

    const API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!API_KEY) {
      throw new Error('GEMINI_API_KEY is not set')
    }

    const systemPrompt = `You are an expert technical recruiter and resume evaluator. 
Your task is to take a candidate's Master Resume text and a specific Job Description, and evaluate how well the candidate fits the role.

CRITICAL CONSTRAINTS:
1. Provide an honest, professional assessment. If they lack key skills, lower the score.
2. The score must be out of 100.
3. Provide a brief 1-2 sentence remark explaining the score.
4. List up to 5 critical skills or requirements they are missing.

You MUST return the output strictly as a JSON object with this exact structure (do not output markdown blocks or any other text):
{
  "score": 85,
  "remark": "Strong fit for the Python backend requirements, but lacks the requested AWS cloud experience.",
  "missingSkills": ["AWS deployment", "Docker"]
}`

    const userPrompt = `
JOB TITLE: ${jobTitle}
COMPANY: ${company}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S MASTER RESUME:
${resumeText}
`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
            temperature: 0.2,
            response_mime_type: "application/json",
        }
      })
    })

    if (!response.ok) {
         const errorText = await response.text();
         throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json()
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawText) {
      throw new Error('No content returned from Gemini')
    }

    let parsedResult;
    try {
        parsedResult = JSON.parse(rawText.replace(/```json\n?|\n?```/g, '').trim());
    } catch (e) {
        console.error("Failed to parse AI response as JSON:", rawText);
        throw new Error("AI returned invalid JSON format.");
    }

    return new Response(
      JSON.stringify(parsedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Calculate Score Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
