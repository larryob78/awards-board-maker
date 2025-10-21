"""
PromptCut Python Worker - Video Rendering Service
Handles heavy ffmpeg operations for video rendering
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import logging
from .render import VideoRenderer
from .db import get_timeline, get_media_for_timeline

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PromptCut Python Worker", version="1.0.0")

# Initialize renderer
renderer = VideoRenderer(
    s3_endpoint=os.getenv('S3_ENDPOINT', 'http://minio:9000'),
    s3_access_key=os.getenv('S3_ACCESS_KEY', 'minioadmin'),
    s3_secret_key=os.getenv('S3_SECRET_KEY', 'minioadmin'),
    s3_bucket=os.getenv('S3_BUCKET', 'promptcut-media'),
)


class RenderRequest(BaseModel):
    timeline_id: str
    export_id: str
    format: str = 'mp4'
    resolution: str = '1920x1080'


class ProxyRequest(BaseModel):
    media_id: str
    source_key: str
    output_resolution: str = '1280x720'


@app.get("/")
async def root():
    return {
        "service": "PromptCut Python Worker",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "ffmpeg": renderer.check_ffmpeg(),
    }


@app.post("/render")
async def render_video(request: RenderRequest):
    """
    Render a timeline to video file
    """
    try:
        logger.info(f"Starting render for timeline {request.timeline_id}")

        # Get timeline data from database
        timeline = get_timeline(request.timeline_id)
        if not timeline:
            raise HTTPException(status_code=404, detail="Timeline not found")

        # Get all media referenced in timeline
        media_list = get_media_for_timeline(timeline)

        # Perform rendering
        output_uri = await renderer.render_timeline(
            timeline=timeline,
            media_list=media_list,
            export_id=request.export_id,
            output_format=request.format,
            resolution=request.resolution,
        )

        # Get file size
        file_size = renderer.get_file_size(output_uri)

        logger.info(f"Render completed: {output_uri}")

        return {
            "success": True,
            "output_uri": output_uri,
            "file_size": file_size,
            "export_id": request.export_id,
        }

    except Exception as e:
        logger.error(f"Render failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/proxy")
async def generate_proxy(request: ProxyRequest):
    """
    Generate a proxy (lower resolution) version of a video
    """
    try:
        logger.info(f"Generating proxy for media {request.media_id}")

        output_uri = await renderer.generate_proxy(
            source_key=request.source_key,
            media_id=request.media_id,
            resolution=request.output_resolution,
        )

        file_size = renderer.get_file_size(output_uri)

        logger.info(f"Proxy generated: {output_uri}")

        return {
            "success": True,
            "output_uri": output_uri,
            "file_size": file_size,
        }

    except Exception as e:
        logger.error(f"Proxy generation failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/thumbnail")
async def generate_thumbnail(media_id: str, source_key: str, time_seconds: float = 1.0):
    """
    Generate a thumbnail from a video
    """
    try:
        logger.info(f"Generating thumbnail for media {media_id}")

        output_uri = await renderer.generate_thumbnail(
            source_key=source_key,
            media_id=media_id,
            time_seconds=time_seconds,
        )

        return {
            "success": True,
            "output_uri": output_uri,
        }

    except Exception as e:
        logger.error(f"Thumbnail generation failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
