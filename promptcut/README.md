# PromptCut - AI-Powered Video Editor

**PromptCut** is a prompt-driven video editing application that lets you upload footage and edit it using natural language commands. It behaves like a professional editor with 20 years' experience, understanding pacing, cuts, transitions, and rhythm.

## Features

- **Prompt-Based Editing**: Type commands like "Make a 60-second film with fast cuts and a warm tone" and get instant edits
- **Automatic Analysis**: Upload any video format and automatically generate thumbnails, transcripts, and scene cuts
- **AI Edit Planning**: Uses Claude or GPT-4 to generate structured edit plans from natural language
- **Real-Time Timeline**: Visual timeline with video/audio tracks, zoom, and manual editing capabilities
- **Export & Render**: Export in multiple formats (MP4, MOV, WebM) and resolutions (1080p, 4K, 9:16)
- **Professional Workflow**: Upload → Prompt → Preview → Fine-tune → Export

## Tech Stack

### Frontend
- **React** with TypeScript
- **TailwindCSS** for styling
- **Vite** for fast builds
- **Zustand** for state management
- **React Query** for data fetching

### Backend
- **Node.js + Express** with TypeScript
- **PostgreSQL** for data storage
- **Redis + BullMQ** for job queue
- **ffmpeg** for video processing
- **OpenAI/Anthropic** for AI edit planning
- **MinIO (S3)** for media storage

### Python Worker
- **FastAPI** for heavy video rendering
- **ffmpeg-python** for video processing
- **boto3** for S3 operations

## Architecture

```
┌─────────────┐
│   Frontend  │ (React + Vite)
│   :5173     │
└──────┬──────┘
       │
┌──────▼──────┐      ┌──────────────┐
│   Backend   │◄────►│  PostgreSQL  │
│   :3001     │      │  :5432       │
└──────┬──────┘      └──────────────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       │              │              │              │
┌──────▼──────┐ ┌────▼─────┐  ┌─────▼──────┐ ┌────▼─────┐
│    Redis    │ │  MinIO   │  │  Python    │ │ AI APIs  │
│    :6379    │ │  :9000   │  │  Worker    │ │ Claude/  │
│  (Queue)    │ │  (S3)    │  │  :8000     │ │ OpenAI   │
└─────────────┘ └──────────┘  └────────────┘ └──────────┘
```

## Prerequisites

- **Docker** and **Docker Compose**
- **Node.js** 20+ (for local development)
- **Python** 3.11+ (for local development)
- **OpenAI API Key** or **Anthropic API Key**

## Quick Start

### 1. Clone and Setup

```bash
cd promptcut
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` and add your AI API keys:

```bash
# Required: Add at least one AI API key
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Start with Docker Compose

```bash
docker-compose up -d
```

This will start all services:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)

### 4. Initialize MinIO Bucket

Access MinIO console at http://localhost:9001 and create a bucket named `promptcut-media`, or use the AWS CLI:

```bash
# Install AWS CLI if needed
pip install awscli

# Configure
aws configure set aws_access_key_id minioadmin
aws configure set aws_secret_access_key minioadmin

# Create bucket
aws --endpoint-url http://localhost:9000 s3 mb s3://promptcut-media
```

### 5. Access the App

Open http://localhost:5173 in your browser.

## Usage

### 1. Upload Media

- Click "Upload Media" in the left sidebar
- Select video, audio, or image files
- Wait for processing (proxy generation, thumbnails)

### 2. Generate an Edit with AI

Type a prompt in the prompt bar, for example:
- "Make a 60-second film with fast cuts and a warm tone"
- "Create a dramatic intro with slow motion"
- "Add crossfade transitions between all clips"
- "Create an upbeat montage with 2-second clips"

Click "Generate Edit" and watch the AI create your timeline!

### 3. Fine-Tune (Manual Editing)

- View clips on the timeline
- Adjust zoom level
- Drag clips (coming soon)
- Trim and adjust speeds (coming soon)

### 4. Export

- Select format (MP4, MOV, WebM)
- Choose resolution (1080p, 720p, 4K, 9:16)
- Click "Export Video"
- Download when complete

## Development

### Backend Development

```bash
cd backend
npm install
npm run dev
```

Environment variables in `.env`:
```
DATABASE_URL=postgresql://promptcut:promptcut_dev_password@localhost:5432/promptcut
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
OPENAI_API_KEY=sk-...
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Python Worker Development

```bash
cd python
pip install -r requirements.txt
uvicorn workers.main:app --reload --host 0.0.0.0 --port 8000
```

### Database Migrations

The database schema is automatically created on first run. To manually run migrations:

```bash
docker-compose exec postgres psql -U promptcut -d promptcut -f /docker-entrypoint-initdb.d/01-schema.sql
```

## API Documentation

### Projects

- `POST /api/projects` - Create a new project
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details

### Upload & Media

- `POST /api/upload` - Request upload URL
- `GET /api/media?project_id=xxx` - List project media
- `DELETE /api/media/:id` - Delete media

### AI Editing

- `POST /api/ai/plan` - Generate edit plan (async)
- `POST /api/ai/plan/sync` - Generate edit plan (sync)

### Timeline

- `GET /api/timeline?project_id=xxx` - Get timeline
- `POST /api/timeline/apply` - Apply edit actions

### Export

- `POST /api/export` - Start export
- `GET /api/export/:id` - Get export status
- `GET /api/export?project_id=xxx` - List exports

### Jobs

- `GET /api/jobs/:id` - Get job status
- `GET /api/jobs?project_id=xxx` - List jobs

## Sample Prompts

Here are some example prompts to try:

**Basic Edits:**
- "Cut all clips to 5 seconds each"
- "Create a 30-second montage"
- "Reverse the order of all clips"

**Styling:**
- "Make it cinematic with slow crossfades"
- "Fast-paced with quick cuts every 2 seconds"
- "Add a warm, golden color grade"

**Complex:**
- "Create a 90-second story: 10s intro, 70s development, 10s conclusion with fade to black"
- "Make an energetic sports highlight reel with speed ramps"
- "Documentary style with talking heads and b-roll cutaways"

## Project Structure

```
promptcut/
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── api/          # API client
│   │   ├── store/        # State management
│   │   └── types/        # TypeScript types
│   └── package.json
│
├── backend/              # Node.js backend
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── workers/      # Queue workers
│   │   ├── models/       # Database models
│   │   └── utils/        # Utilities
│   └── package.json
│
├── python/               # Python worker
│   ├── workers/
│   │   ├── main.py      # FastAPI app
│   │   ├── render.py    # Video rendering
│   │   └── db.py        # Database utils
│   └── requirements.txt
│
└── docker-compose.yml    # Docker orchestration
```

## Troubleshooting

### "No AI API keys configured"

Add either `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to your `.env` file.

### Upload fails

1. Check MinIO is running: http://localhost:9001
2. Verify bucket `promptcut-media` exists
3. Check backend logs: `docker-compose logs backend`

### Render fails

1. Check Python worker logs: `docker-compose logs python-worker`
2. Verify ffmpeg is installed in the container
3. Check available disk space in `/tmp`

### Database connection errors

```bash
# Restart PostgreSQL
docker-compose restart postgres

# Check if database exists
docker-compose exec postgres psql -U promptcut -c "\l"
```

## Performance Tips

1. **Upload smaller files** for testing (< 100MB)
2. **Use proxy files** - they're automatically generated
3. **Limit timeline duration** to < 5 minutes for faster exports
4. **Scale workers** by adjusting Docker Compose replicas

## Roadmap

- [ ] Timeline drag-and-drop editing
- [ ] Audio waveform visualization
- [ ] Real-time video preview
- [ ] Speech-to-text for auto-captions
- [ ] Template library
- [ ] Collaborative editing
- [ ] Plugin system
- [ ] Mobile app

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Credits

Built with:
- [React](https://react.dev/)
- [Express](https://expressjs.com/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [FFmpeg](https://ffmpeg.org/)
- [Claude](https://www.anthropic.com/) / [OpenAI](https://openai.com/)
- [TailwindCSS](https://tailwindcss.com/)

---

**PromptCut** - Professional video editing, powered by AI 🎬✨
