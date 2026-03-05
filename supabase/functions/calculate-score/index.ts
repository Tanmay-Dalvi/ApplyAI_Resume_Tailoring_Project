// @ts-nocheck
// Supabase Edge Function — runs in the Deno runtime.
// This file is excluded from ESLint and TypeScript project config.

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

    const API_KEY = Deno.env.get('OPENROUTER_API_KEY')
    if (!API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not set')
    }

    const systemPrompt = `You are an expert technical recruiter and resume evaluator. 
Your task is to take a candidate's Master Resume text and a specific Job Description, and evaluate how well the candidate fits the role.

CRITICAL CONSTRAINTS:
1. Provide an honest, professional assessment. If they lack key skills, lower the score.
2. The score must be out of 100.
3. Provide a brief 1-2 sentence remark explaining the score.
4. List up to 5 critical skills or requirements they are missing.

Return ONLY a raw JSON object. No markdown, no code blocks. Use this exact structure:
{
  "score": 85,
  "remark": "Strong fit for the Python backend requirements, but lacks the requested AWS cloud experience.",
  "missingSkills": ["AWS deployment", "Docker"]
}`;

    const userPrompt = `
JOB TITLE: ${jobTitle}
COMPANY: ${company}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S MASTER RESUME:
${resumeText}
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openrouter/auto",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json()
    const rawText = data.choices[0].message.content

    if (!rawText) {
      throw new Error('No content returned from AI')
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText.replace(/```json\n?|\n?```/g, '').trim());
    } catch {
      console.error("Failed to parse AI response as JSON:", rawText);
      throw new Error("AI returned invalid JSON format.");
    }

    return new Response(
      JSON.stringify(parsedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Internal Error";
    console.error("Calculate Score Error:", errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
