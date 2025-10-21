# PromptCut API Documentation

Base URL: `http://localhost:3001/api`

## Authentication

Currently no authentication required for local development.

## Projects

### Create Project
```http
POST /api/projects
Content-Type: application/json

{
  "title": "My Video Project",
  "fps": 30,
  "resolution": "1920x1080"
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "My Video Project",
  "fps": 30,
  "resolution": "1920x1080",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### List Projects
```http
GET /api/projects
```

### Get Project
```http
GET /api/projects/:id
```

### Update Project
```http
PUT /api/projects/:id
Content-Type: application/json

{
  "title": "Updated Title"
}
```

### Delete Project
```http
DELETE /api/projects/:id
```

## Media Upload

### Request Upload URL
```http
POST /api/upload
Content-Type: application/json

{
  "project_id": "uuid",
  "filename": "video.mp4",
  "content_type": "video/mp4"
}
```

**Response:**
```json
{
  "upload_url": "https://minio:9000/...",
  "media_id": "uuid",
  "file_key": "projects/uuid/original/...",
  "job_id": "uuid"
}
```

### Upload File to Presigned URL
```http
PUT {upload_url}
Content-Type: video/mp4
Body: [binary file data]
```

### List Media
```http
GET /api/media?project_id=uuid
```

**Response:**
```json
[
  {
    "id": "uuid",
    "project_id": "uuid",
    "filename": "video.mp4",
    "media_type": "video",
    "duration": 120.5,
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "proxy_url": "https://...",
    "thumbnail_url": "https://...",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### Get Media Details
```http
GET /api/media/:id
```

### Delete Media
```http
DELETE /api/media/:id
```

## AI Editing

### Generate Edit Plan (Async)
```http
POST /api/ai/plan
Content-Type: application/json

{
  "project_id": "uuid",
  "prompt": "Create a 60-second montage with fast cuts"
}
```

**Response:**
```json
{
  "job_id": "uuid",
  "status": "pending",
  "message": "Edit plan generation started"
}
```

### Generate Edit Plan (Sync)
```http
POST /api/ai/plan/sync
Content-Type: application/json

{
  "project_id": "uuid",
  "prompt": "Create a 60-second montage with fast cuts"
}
```

**Response:**
```json
{
  "success": true,
  "plan": {
    "duration": 60,
    "style": "fast-paced",
    "structure": [
      {
        "section": "intro",
        "goal": "hook",
        "duration": 5
      }
    ],
    "actions": [
      {
        "type": "cut",
        "asset": "media_uuid",
        "in": 0,
        "out": 5
      },
      {
        "type": "transition",
        "style": "crossfade",
        "duration": 1
      }
    ]
  }
}
```

## Timeline

### Get Timeline
```http
GET /api/timeline?project_id=uuid
```

**Response:**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "version": 1,
  "state_json": {
    "tracks": [
      {
        "id": "uuid",
        "type": "video",
        "clips": [
          {
            "id": "uuid",
            "media_id": "uuid",
            "start_time": 0,
            "duration": 5,
            "trim_start": 0,
            "trim_end": 5
          }
        ]
      }
    ],
    "duration": 60
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Apply Edit Actions
```http
POST /api/timeline/apply
Content-Type: application/json

{
  "project_id": "uuid",
  "actions": [
    {
      "type": "cut",
      "asset": "media_uuid",
      "in": 0,
      "out": 10
    }
  ],
  "user_prompt": "Add this clip to the timeline"
}
```

**Response:**
```json
{
  "success": true,
  "timeline": { /* timeline object */ }
}
```

## Export

### Start Export
```http
POST /api/export
Content-Type: application/json

{
  "project_id": "uuid",
  "timeline_id": "uuid",
  "format": "mp4",
  "resolution": "1920x1080"
}
```

**Response:**
```json
{
  "export_id": "uuid",
  "job_id": "uuid",
  "status": "pending",
  "message": "Export started"
}
```

### Get Export Status
```http
GET /api/export/:id
```

**Response:**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "filename": "export_123.mp4",
  "format": "mp4",
  "resolution": "1920x1080",
  "status": "completed",
  "download_url": "https://...",
  "file_size": 12345678,
  "job_progress": 100,
  "created_at": "2024-01-01T00:00:00Z",
  "completed_at": "2024-01-01T00:01:00Z"
}
```

### List Exports
```http
GET /api/export?project_id=uuid
```

## Jobs

### Get Job Status
```http
GET /api/jobs/:id
```

**Response:**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "type": "render",
  "status": "processing",
  "progress": 45,
  "created_at": "2024-01-01T00:00:00Z",
  "started_at": "2024-01-01T00:00:01Z"
}
```

### List Jobs
```http
GET /api/jobs?project_id=uuid&type=render&status=completed
```

## WebSocket

Connect to `ws://localhost:3001/ws` for real-time updates.

### Subscribe to Project Updates
```json
{
  "type": "subscribe",
  "project_id": "uuid"
}
```

### Job Updates
Server sends:
```json
{
  "type": "job_update",
  "job_id": "uuid",
  "status": "processing",
  "progress": 50
}
```

## Error Responses

All endpoints return standard error format:

```json
{
  "error": "Error message here"
}
```

Common status codes:
- `400` - Bad Request (missing/invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limits

No rate limits in development mode.

## Complete Example Flow

1. **Create Project**
```bash
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"title": "My Video"}'
```

2. **Request Upload**
```bash
curl -X POST http://localhost:3001/api/upload \
  -H "Content-Type: application/json" \
  -d '{"project_id": "PROJECT_ID", "filename": "video.mp4"}'
```

3. **Upload File**
```bash
curl -X PUT "UPLOAD_URL" \
  --upload-file video.mp4
```

4. **Generate Edit**
```bash
curl -X POST http://localhost:3001/api/ai/plan/sync \
  -H "Content-Type: application/json" \
  -d '{"project_id": "PROJECT_ID", "prompt": "Create a 30s montage"}'
```

5. **Export Video**
```bash
curl -X POST http://localhost:3001/api/export \
  -H "Content-Type: application/json" \
  -d '{"project_id": "PROJECT_ID", "timeline_id": "TIMELINE_ID", "format": "mp4"}'
```

6. **Check Export Status**
```bash
curl http://localhost:3001/api/export/EXPORT_ID
```
