# AceIt

A responsive interview practice app for AI training, LLM evaluation, and data annotation roles. It runs locally with a Mistral API key and stores candidate data in this browser's localStorage.

## Run locally

1. Install Node.js 20 or later.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and add your Mistral API key.
4. Run `npm run dev` and open http://localhost:3000.
5. Visit `/api/health` to make a small test call.

Get a key from [Mistral AI Studio](https://console.mistral.ai/). Find current model IDs in the [official models overview](https://docs.mistral.ai/models) and [model lifecycle docs](https://docs.mistral.ai/inference/model-lifecycle). This project defaults to `mistral-large-4-0` (Mistral Large 4) and `mistral-small-2603` (fast model). Confirm availability and pricing for your account before deployment. Free-tier quotas and rate limits vary by account and can change; check the [official rate limits page](https://docs.mistral.ai/deployment/laplateforme/rate-limits) and billing page for current limits.

## Deploy

On Vercel or another host, add `MISTRAL_API_KEY`, `MISTRAL_PRIMARY_MODEL`, and `MISTRAL_FAST_MODEL` as server-side environment variables. Never prefix the key with `NEXT_PUBLIC_`. Redeploy after changing them. `.env.local` is gitignored.

## Features

- Resume text extraction for PDF, DOCX and TXT (5 MB maximum), with editable preview.
- Writing-style calibration from user-provided samples.
- Job description analysis and editable role chips.
- Answer Coach and one-question-at-a-time Mock Interview modes.
- Browser speech recognition, language choices and optional speech playback.
- Standalone Humanizer with rewrite controls, side-by-side view, copy, and a writing-pattern Slop check. It does not use AI-detection services.
- Local history, responsive drawer, theme toggle, and local data deletion.

All AI calls are made server-side through Next.js route handlers. API routes have a basic per-IP in-memory rate limit. Mistral primary model failures retry once, then use the configured fast model. Data is stored only in the browser except for request text sent to Mistral for generation or parsing.

