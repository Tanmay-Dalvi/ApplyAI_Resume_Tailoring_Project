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
       return new Response(JSON.stringify({ error: 'Missing resumeText or jobDescription' }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         status: 200
       })
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')
    if (!OPENROUTER_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY is missing from Supabase environment variables!" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const systemPrompt = `You are an expert technical recruiter and resume writer.
Your task is to take a candidate's Master Resume text and a specific Job Description, and output a tailored resume.
Align the candidate's skills and experience with the job requirements. Keep it professional and concise.

CRITICAL CONSTRAINTS:
1. PRESERVE ALL ORIGINAL BULLET POINTS: Every single responsibility, achievement, project, and item from the Master Resume must appear in the tailored version.
2. NO DELETIONS: Do not remove any bullet points, experiences, projects, or any other section.
3. NO ADDITIONS: Do not add new experiences or items that are not in the Master Resume.
4. NO FAKE METRICS: Do not invent or add quantifiable metrics not present in the original text.
5. IDENTICAL STRUCTURE: The number of bullet points for each job must remain exactly the same as the original.
6. WORDING OPTIMIZATION ONLY: Rephrase existing wording to better align with keywords from the Job Description.
7. DO NOT HALLUCINATE PAST JOBS: Never add the target Job Title or target Company to work experience.
8. CAPTURE ALL EXTRA SECTIONS: The Master Resume may contain additional sections beyond experience and education, such as Projects, Achievements, Certifications, Languages, Hobbies, Volunteering, etc. You MUST include ALL of them under "extra_sections". Each item can have "heading" (string), "subheading" (string), "bullets" (array of strings), or "plain" (string) fields. If none exist, return an empty array.

Return ONLY a raw JSON object. No markdown, no code blocks, no extra text. Use this exact structure:
{
  "name": "Candidate Name",
  "email": "email@example.com",
  "phone": "Phone Number",
  "summary": "3-4 sentence professional summary targeting the ${jobTitle} role at ${company}.",
  "skills": ["Skill1", "Skill2", "Skill3"],
  "experience": [
    {
      "title": "Past Job Title",
      "company": "Past Company",
      "duration": "Start Date - End Date",
      "description": ["Optimized bullet 1.", "Optimized bullet 2."]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University/College",
      "year": "Graduation Year"
    }
  ],
  "extra_sections": [
    {
      "title": "Projects",
      "items": [
        {
          "heading": "Project Name",
          "subheading": "Tech Stack",
          "bullets": ["Point 1.", "Point 2."]
        }
      ]
    },
    {
      "title": "Achievements",
      "items": [
        { "plain": "Won XYZ award in 2023." }
      ]
    },
    {
      "title": "Languages",
      "items": [
        { "plain": "English - Native" }
      ]
    }
  ]
}`;

    const userPrompt = `
Job Title: ${jobTitle}
Company: ${company}

Job Description:
${jobDescription}

Candidate's Master Resume:
${resumeText}
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "openrouter/auto",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("OpenRouter API Error:", data)
      const apiErrorMsg = data?.error?.message || "Failed to generate content from OpenRouter API";
      return new Response(JSON.stringify({ error: "OpenRouter API failed: " + apiErrorMsg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    let generatedText = data.choices[0].message.content

    // Strip markdown code fences if present
    generatedText = generatedText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    try {
      const parsedResume = JSON.parse(generatedText)
      return new Response(JSON.stringify(parsedResume), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse API output as JSON. Output: " + generatedText.substring(0, 200) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

  } catch (error) {
    console.error("Edge Function Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown internal error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
