<div align="center">

# 🚀 ApplyAI — AI-Powered Resume Tailor

### _Land your dream role faster. Smarter. Every time._

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![OpenRouter](https://img.shields.io/badge/AI-OpenRouter-FF6B6B)](https://openrouter.ai/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

**ApplyAI** is a Chrome Side Panel Extension that supercharges your job hunt. It scrapes job details straight from LinkedIn, compares them to your master resume, grades your eligibility, and generates a fully tailored resume — all in seconds.

</div>

---

## ✨ Features

| Feature                         | Description                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| 🔐 **User Authentication**      | Secure login/signup via Supabase Auth (email + password)                           |
| ☁️ **Cloud Resume Storage**     | Upload your master resume once, it's saved to the cloud forever                    |
| 🔗 **LinkedIn Job Scraper**     | One-click extraction of job title, company, and full JD from any LinkedIn job page |
| 🤖 **AI Resume Tailoring**      | Powered by OpenRouter AI — generates a fully tailored resume aligned with the JD   |
| 📊 **Eligibility Score Engine** | Get a score out of 100 + missing skills before you even apply                      |
| 📄 **DOCX Download**            | Beautifully formatted Times New Roman Word document, ready to submit               |
| 🧩 **Dynamic Sections**         | Preserves Projects, Achievements, Languages, and all custom resume sections        |
| 📌 **Side Panel UI**            | Persistent side panel — never closes when you click away                           |

---

## 🖼️ How It Works

```
Your Master Resume (PDF)
        │
        ▼
  [Upload Once → Saved to Cloud]
        │
        ▼
  Open LinkedIn Job Page
        │
        ▼
  [Scrape Job Details]  ──────────────────────┐
        │                                      │
        ▼                                      ▼
  [Calculate Eligibility Score]     [Generate Tailored Resume]
  Score / Missing Skills            AI-Optimized DOCX Download
```

---

## 🛠️ Tech Stack

### Frontend (Chrome Extension)

| Technology                    | Purpose                               |
| ----------------------------- | ------------------------------------- |
| **React 18 + TypeScript**     | Extension UI                          |
| **Vite + @crxjs/vite-plugin** | Build toolchain for Chrome extensions |
| **Tailwind CSS**              | Styling                               |
| **lucide-react**              | Icons                                 |
| **pdfjs-dist**                | PDF text extraction                   |
| **docx + file-saver**         | DOCX generation and download          |
| **@supabase/supabase-js**     | Auth + Database client                |

### Backend (Supabase)

| Technology                  | Purpose                                       |
| --------------------------- | --------------------------------------------- |
| **Supabase Auth**           | User registration and login                   |
| **Supabase PostgreSQL**     | Stores user profiles and resumes              |
| **Supabase Edge Functions** | Deno serverless functions for AI calls        |
| **OpenRouter API**          | AI model provider (free tier, no credit card) |
| **Chrome Side Panel API**   | Persistent extension UI                       |

---

## 📦 Project Structure

```
ApplyAI/
├── manifest.json                    # Chrome Extension manifest (v3, sidePanel)
├── src/
│   ├── App.tsx                      # Main Side Panel UI (all screens + logic)
│   ├── background.ts                # Service worker — opens side panel on icon click
│   ├── types/
│   │   └── index.ts                 # TypeScript interfaces (ResumeData, JobData, etc.)
│   ├── lib/
│   │   └── supabase.ts              # Supabase client initialization
│   ├── utils/
│   │   ├── pdfParser.ts             # PDF → text extraction using pdf.js
│   │   ├── mockAI.ts                # Calls Supabase Edge Function for resume generation
│   │   └── docxGenerator.ts        # Structured DOCX builder (Times New Roman, ATS-ready)
│   └── content/
│       └── linkedin-scraper.ts     # Content script — scrapes LinkedIn job pages
├── supabase/
│   └── functions/
│       ├── generate-resume/
│       │   └── index.ts            # Edge Function: OpenRouter AI resume tailoring
│       └── calculate-score/
│           └── index.ts            # Edge Function: Eligibility score calculation
├── vite.config.ts                   # Vite build config
└── .env                             # 🔒 Environment variables (never commit this!)
```

---

## ⚙️ Setup Guide

> **Prerequisites:** Node.js 18+, npm, a Google Chrome browser, and a free [Supabase](https://supabase.com) account.

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/Tanmay-Dalvi/ApplyAI_Resume_Tailoring_Project.git
cd ApplyAI_Resume_Tailoring_Project
npm install
```

---

### Step 2 — Create Your Supabase Project 🗄️

1. Go to [supabase.com](https://supabase.com) and create a **new project**.
2. Wait for it to provision (takes ~1 minute).
3. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon public` key

---

### Step 3 — Set Up the Database 🧱

Go to your Supabase project → **SQL Editor** and run these queries:

**Create the `users` table:**

```sql
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  created_at timestamptz default now(),
  last_login timestamptz default now()
);

-- Auto-insert user on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do update set last_login = now();
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**Create the `resumes` table:**

```sql
create table public.resumes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade unique,
  original_text text not null,
  file_name text,
  updated_at timestamptz default now()
);

-- Row Level Security
alter table public.resumes enable row level security;
create policy "Users can manage their own resumes"
  on public.resumes for all
  using (auth.uid() = user_id);
```

---

### Step 4 — Get Your OpenRouter API Key 🤖

ApplyAI uses [OpenRouter.ai](https://openrouter.ai) for AI calls — it's **completely free**, no credit card required.

1. Go to [openrouter.ai](https://openrouter.ai) and sign in with Google or GitHub
2. Navigate to **Keys** → **Create Key**
3. Copy the key (starts with `sk-or-v1-...`)

---

### Step 5 — Configure Environment Variables 🔑

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> ⚠️ **Never commit your `.env` file to GitHub!** It's already in `.gitignore`.

---

### Step 6 — Configure Supabase CLI & Deploy Edge Functions 🚀

**Install Supabase CLI** (if not already):

```bash
npm install -g supabase
```

**Login to Supabase:**

```bash
npx supabase login
```

**Link your project:**

```bash
npx supabase link --project-ref your-project-ref
```

> Find your project ref in the Supabase URL: `https://supabase.com/dashboard/project/YOUR-REF`

**Set your OpenRouter API Key as a Supabase secret:**

```bash
npx supabase secrets set OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

**Deploy the Edge Functions:**

```bash
npx supabase functions deploy generate-resume --no-verify-jwt
npx supabase functions deploy calculate-score --no-verify-jwt
```

---

### Step 7 — Build the Extension 🔨

```bash
npm run build
```

This creates a `dist/` folder — this is your extension package.

---

### Step 8 — Load the Extension in Chrome 🌐

1. Open Chrome → go to `chrome://extensions/`
2. Toggle **Developer Mode** ON (top-right corner)
3. Click **"Load unpacked"**
4. Select the **`dist`** folder from your project

> 🔄 After every code change, run `npm run build` again, then click the **refresh icon** on the extension card.

---

## 🎯 How to Use ApplyAI

1. **Login / Sign Up** — Create your account on first launch
2. **Upload Master Resume** — Upload your PDF resume once; it's saved to cloud
3. **Navigate to LinkedIn** — Open any LinkedIn job posting
4. **Scrape the Job** — Click "Scrape Current LinkedIn Job" to extract the JD
5. **Check Your Score** — Hit "Calculate Score" to see your eligibility + missing skills
6. **Generate Resume** — Click "Generate Tailored Resume" → instantly downloads your `.docx`

---

## 🧠 AI Capabilities

ApplyAI's AI engine is designed to be **honest and ethical**:

- ✅ **Optimizes wording** of existing bullet points to match JD keywords
- ✅ **Rewrites the professional summary** to target the specific role
- ✅ **Preserves all original bullet points** — no fake metrics, no hallucinated jobs
- ✅ **Captures ALL resume sections** — Projects, Achievements, Languages, Certifications, etc.
- ✅ **Eligibility Score** — Gives you an honest 0–100 score with recruiter-style feedback
- ❌ Never adds experience you don't have
- ❌ Never invents fake companies or job titles

---

## 🔒 Privacy & Security

- Your resume is stored **only in your own Supabase database** under Row Level Security
- Your OpenRouter API key is stored as a **Supabase secret** (server-side only, never exposed)
- No third-party data collection — this is a **self-hosted** project
- Authentication via **Supabase Auth** (industry-standard JWT-based auth)

---

## 🐛 Troubleshooting

| Problem                         | Solution                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------- |
| "OPENROUTER_API_KEY is not set" | Run `npx supabase secrets set OPENROUTER_API_KEY=...` and redeploy functions |
| Extension shows blank screen    | Rebuild (`npm run build`) and reload the extension in `chrome://extensions/` |
| Resume not saving to cloud      | Check Supabase Row Level Security policies are set correctly                 |
| Score/Generate gives error      | Ensure both Edge Functions are deployed; check Supabase Function logs        |
| LinkedIn scraper not working    | Make sure you're on a `linkedin.com/jobs/view/...` page                      |
| Side panel won't open           | Remove and re-add the extension after manifest changes                       |

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">


</div>
