# PromptCut - Quick Start Guide

Get started with PromptCut in 5 minutes!

## Prerequisites

- Docker and Docker Compose installed
- OpenAI or Anthropic API key

## Step 1: Setup (2 minutes)

```bash
# Navigate to project
cd promptcut

# Copy environment file
cp .env.example .env

# Edit .env and add your API key
# OPENAI_API_KEY=sk-... OR ANTHROPIC_API_KEY=sk-ant-...
nano .env
```

## Step 2: Start Services (1 minute)

```bash
# Start all services with Docker Compose
docker-compose up -d

# Check status
docker-compose ps
```

You should see:
- ✅ promptcut-frontend
- ✅ promptcut-backend
- ✅ promptcut-python-worker
- ✅ promptcut-postgres
- ✅ promptcut-redis
- ✅ promptcut-minio

## Step 3: Initialize Storage (1 minute)

```bash
# Install AWS CLI if needed
pip install awscli

# Create MinIO bucket
aws configure set aws_access_key_id minioadmin
aws configure set aws_secret_access_key minioadmin
aws --endpoint-url http://localhost:9000 s3 mb s3://promptcut-media

# Or use MinIO web console at http://localhost:9001
# Login: minioadmin / minioadmin
```

## Step 4: Use the App (1 minute)

1. **Open** http://localhost:5173

2. **Upload a video**: Click "Upload Media" and select a video file

3. **Wait** for processing (thumbnail generation)

4. **Type a prompt**:
   ```
   Create a 30-second highlight reel with fast cuts
   ```

5. **Click** "Generate Edit"

6. **Watch** the AI create your timeline!

7. **Export**: Choose format and resolution, click "Export Video"

## Sample Video

Don't have a video? Download a free sample:

```bash
# Download a sample video (requires youtube-dl or yt-dlp)
yt-dlp "https://www.youtube.com/watch?v=dQw4w9WgXcQ" -f "best[height<=720]" -o sample.mp4
```

Or use any `.mp4`, `.mov`, or `.mkv` file from your computer.

## Troubleshooting

### Services won't start
```bash
docker-compose down
docker-compose up -d --build
```

### Can't upload files
- Check MinIO is running: http://localhost:9001
- Verify bucket exists: `promptcut-media`

### AI not working
- Check API key is set in `.env`
- Restart backend: `docker-compose restart backend`

### Export fails
- Check Python worker logs: `docker-compose logs python-worker`
- Ensure ffmpeg is working: `docker-compose exec python-worker ffmpeg -version`

## Next Steps

- Read the full [README.md](README.md)
- Try [sample prompts](docs/PROMPTS.md)
- Explore the [API](docs/API.md)

## Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (deletes data)
docker-compose down -v
```

---

🎬 Happy editing with PromptCut!
