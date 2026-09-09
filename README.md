# AI Engineering From Scratch — Learning App

A local, private study app built around the *AI Engineering From Scratch* course (the 6
reference-manual PDFs). It's a monorepo: a NestJS API that serves the course content and
talks to OpenAI, and a React + Vite frontend for reading chapters and chatting with an
AI tutor that explains everything at a plain, 9th-grade reading level.

Everything runs on your machine only. Nothing is deployed or sent anywhere except your
own OpenAI account when you use the tutor or quiz features.

## What's inside

```
content/            509 chapters extracted from the 6 course PDFs, as markdown + JSON manifests
  course-manifest.json
  vol1-foundations/
    manifest.json
    01-about-this-volume.md
    ...
  vol2-deep-learning/
  vol3-language/
  vol4-llms/
  vol5-agents/
  vol6-production/
apps/
  api/               NestJS backend
    src/courses/     serves the manifest + chapter markdown
    src/tutor/        the AI tutor — streaming chat + quiz generation via OpenAI
    src/progress/     tracks per-chapter status (not-started / in-progress / mastered) in data/progress.json
  web/               React + Vite frontend — sidebar course tree, lesson viewer, tutor chat, quizzes
data/
  progress.json      created automatically the first time you mark a chapter
```

Each chapter file has frontmatter (title, volume, part, chapter number, source PDF pages)
followed by the extracted chapter text — this is the ground truth the AI tutor reads from,
so its explanations stay grounded in the actual course rather than making things up.

## One-time setup

You need Node.js 18+ and an OpenAI API key.

1. Install dependencies (installs both the api and web workspaces):

   ```
   npm install
   ```

2. Add your API key:

   ```
   cp .env.example apps/api/.env
   ```

   Edit `apps/api/.env` and set `OPENAI_API_KEY=sk-...`. `OPENAI_MODEL` defaults to
   `gpt-4o-mini` — change it if you want a stronger (and pricier) model.

## Running it

From the repo root:

```
npm run dev
```

This starts the API on **http://localhost:4000** and the web app on
**http://localhost:5173**. Open the web app in your browser — the frontend proxies
`/api/*` requests to the backend automatically.

To run them separately: `npm run dev:api` and `npm run dev:web`.

## How to use it

- The sidebar lists all 6 volumes; click one to expand its chapters. A dot next to each
  chapter shows progress: gray = not started, yellow = in progress, green = mastered.
- Open a chapter to read the extracted lesson text (the **Lesson** tab).
- Switch to **Ask the tutor** to chat about the chapter — it only knows what's in that
  chapter plus general knowledge, and always explains things simply, defining new terms
  before it uses them again.
- Switch to **Quiz** to generate a short multiple-choice quiz from the chapter. Score 80%+
  and the chapter is automatically marked mastered.
- You can also mark a chapter "In progress" or "✓ Mastered" manually with the buttons at
  the top of the chapter page.

## Regenerating the content

If the upstream course PDFs change, re-run the extraction script (it re-reads the 6 PDFs
and rewrites everything under `content/`):

```
python3 scripts/extract.py
```

It expects the 6 volume PDFs at the paths hardcoded near the top of `scripts/extract.py`
— update those paths if you move the source PDFs.

## Notes

- All progress and chat history stay on your machine — progress lives in
  `data/progress.json`; chat is not persisted between sessions.
- The tutor calls OpenAI directly from the NestJS server, so your API key never touches
  the browser.
