# shorts-demand-proof

Deployable Next.js (App Router) API for uploading short clips, transcribing, and generating demand proof outputs.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` with:
   ```bash
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_key
   ```
3. Run locally:
   ```bash
   npm run dev
   ```

## Supabase SQL (add report fields)

```sql
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS transcript_full text,
ADD COLUMN IF NOT EXISTS scenes jsonb,
ADD COLUMN IF NOT EXISTS report_md text,
ADD COLUMN IF NOT EXISTS report_json jsonb,
ADD COLUMN IF NOT EXISTS conti_json jsonb,
ADD COLUMN IF NOT EXISTS error text;
```

## API

### POST /api/upload
- Multipart form data with `file` and optional `source_url`.
- Enforces 25MB max file size.

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@./sample.mp4" \
  -F "source_url=https://example.com/source"
```

### POST /api/process/{job_id}
- Runs transcription and report generation.

```bash
curl -X POST http://localhost:3000/api/process/YOUR_JOB_ID
```

### GET /api/result/{job_id}
- Returns the full job row.

```bash
curl http://localhost:3000/api/result/YOUR_JOB_ID
```
