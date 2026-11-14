# AceIt

A responsive interview practice app for AI training, LLM evaluation, and data annotation roles. It stores candidate data in this browser's localStorage and sends AI requests server-side to NVIDIA Build's OpenAI-compatible API.

## Run locally

1. Install Node.js 20 or later.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and set `NVIDIA_API_KEY` to a key created in NVIDIA Build.
4. Run `npm run dev` and open http://localhost:3000.
5. Visit `/api/health` to make a small test call.

The default model is `mistralai/mistral-large-4-1t-a52b`, called through `https://integrate.api.nvidia.com/v1/chat/completions`. NVIDIA Build lists this model with a free prototype endpoint. The fallback model is `openai/gpt-oss-20b`, which also has a free endpoint. Free endpoint availability and limits can change; check the [Mistral Large 4 Build page](https://build.nvidia.com/mistralai/mistral-large-4-1t-a52b) and [NVIDIA API catalog](https://build.nvidia.com/explore) for current status.

## Deploy

On Vercel, add `NVIDIA_API_KEY`, `NVIDIA_PRIMARY_MODEL`, and `NVIDIA_FAST_MODEL` as server-side environment variables. Never prefix the key with `NEXT_PUBLIC_`. Redeploy after changing them. `.env.local` is gitignored.

Create a key in your NVIDIA Build profile/API keys page. Copy the key when it is shown and store it as a Vercel secret. If a key has been pasted into a chat, source file, or public repository, revoke it and create a replacement.

## Features

- Resume text extraction for PDF, DOCX and TXT (5 MB maximum), with editable preview.
- Writing-style calibration from user-provided samples.
- Job description analysis and editable role chips.
- Answer Coach and one-question-at-a-time Mock Interview modes.
- Browser speech recognition, language choices and optional speech playback.
- Standalone Humanizer with rewrite controls, side-by-side view, copy, and a writing-pattern Slop check. It does not use AI-detection services.
- Local history, responsive drawer, theme toggle, and local data deletion.

All AI calls are made server-side through Next.js route handlers. API routes have a basic per-IP in-memory rate limit. Primary model failures retry once, then use the configured fast model. Data is stored only in the browser except for request text sent to NVIDIA for generation or parsing.
