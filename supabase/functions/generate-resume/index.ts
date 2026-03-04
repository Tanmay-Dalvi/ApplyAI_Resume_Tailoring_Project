const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { resumeText, jobDescription, jobTitle, company } = await req.json()

    // Required fields check
    if (!resumeText || !jobDescription) {
       return new Response(JSON.stringify({ error: 'Missing resumeText or jobDescription' }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         status: 200 // Return 200 to prevent Supabase frontend SDK from throwing generic error
       })
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      // Return error payload directly
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is missing from Supabase environment variables! Please set it using: npx supabase secrets set GEMINI_API_KEY=your_key" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, 
      })
    }

    const systemPrompt = `You are an expert technical recruiter and resume writer. 
Your task is to take a candidate's Master Resume text and a specific Job Description, and output a tailored resume.
Align the candidate's skills and experience with the job requirements. Keep it professional and concise.

CRITICAL CONSTRAINTS:
1. PRESERVE ALL ORIGINAL BULLET POINTS: Every single responsibility and achievement from the Master Resume must remain in the tailored version.
2. NO DELETIONS: Do not remove any bullet points or experiences.
3. NO ADDITIONS: Do not add any new experiences or responsibilities that are not in the Master Resume.
4. NO FAKE METRICS: Do not invent or add any quantifiable metrics (like percentages or dollar amounts) that are not present in the original text.
5. IDENTICAL STRUCTURE: The number of bullet points for each job must remain exactly the same as the original.
6. WORDING OPTIMIZATION ONLY: You may only rephrase or optimize the existing wording of the bullet points to better align with the keywords and skills requested in the Job Description.

You MUST return the output strictly as a JSON object with this exact structure (do not output markdown blocks or any other text):
{
  "name": "Candidate Name",
  "email": "email@example.com",
  "phone": "Phone Number",
  "summary": "A fully rewritten professional summary targeting the ${jobTitle} role at ${company}, using 3-4 sentences.",
  "skills": ["Skill1", "Skill2", "Skill3"], // Max 15 highly relevant skills from the Master Resume
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Start Date - End Date",
      "description": [
        "Optimized bullet point 1 (maintaining original meaning and intent).",
        "Optimized bullet point 2.",
        "Optimized bullet point 3."
      ]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University/College",
      "year": "Graduation Year"
    }
  ]
}`

    const userPrompt = `
Job Title: ${jobTitle}
Company: ${company}

Job Description:
${jobDescription}

Candidate's Master Resume:
${resumeText}
`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt },
              { text: userPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json" // Force strict JSON output
        }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("Gemini API Error:", data)
      // Return Gemini's error
      const apiErrorMsg = data?.error?.message || "Failed to generate content from Gemini API";
      return new Response(JSON.stringify({ error: "Gemini API failed: " + apiErrorMsg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, 
      })
    }

    let generatedText = data.candidates[0].content.parts[0].text
    
    // Gemini sometimes wraps the JSON in markdown code blocks even with the correct mime type.
    // Strip ```json at the beginning and ``` at the end.
    if (generatedText.startsWith('```json')) {
      generatedText = generatedText.substring(7);
    }
    if (generatedText.startsWith('```')) {
      generatedText = generatedText.substring(3);
    }
    if (generatedText.endsWith('```')) {
      generatedText = generatedText.substring(0, generatedText.length - 3);
    }
    
    generatedText = generatedText.trim();
    
    // Parse the returned JSON text to ensure it's valid
    try {
      const parsedResume = JSON.parse(generatedText)
      return new Response(JSON.stringify(parsedResume), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse Gemini output as JSON. Output was: " + generatedText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, 
      })
    }

  } catch (error: unknown) {
    console.error("Edge Function Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown internal error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Returning 200 instead of 400/500 to bypass generic "Non-2xx" messages by the SDK
    })
  }
})
