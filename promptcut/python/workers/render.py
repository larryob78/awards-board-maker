"""
Video rendering engine using ffmpeg
"""

import ffmpeg
import os
import boto3
import logging
from typing import List, Dict, Any
from pathlib import Path
import tempfile
import shutil

logger = logging.getLogger(__name__)


class VideoRenderer:
    def __init__(self, s3_endpoint: str, s3_access_key: str, s3_secret_key: str, s3_bucket: str):
        self.s3_endpoint = s3_endpoint
        self.s3_bucket = s3_bucket

        # Initialize S3 client
        self.s3_client = boto3.client(
            's3',
            endpoint_url=s3_endpoint,
            aws_access_key_id=s3_access_key,
            aws_secret_access_key=s3_secret_key,
        )

        # Temporary working directory
        self.temp_dir = Path("/tmp/promptcut")
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def check_ffmpeg(self) -> bool:
        """Check if ffmpeg is available"""
        try:
            ffmpeg.probe('/dev/null')
            return True
        except:
            return False

    async def render_timeline(
        self,
        timeline: Dict[str, Any],
        media_list: List[Dict[str, Any]],
        export_id: str,
        output_format: str = 'mp4',
        resolution: str = '1920x1080',
    ) -> str:
        """
        Render a complete timeline to video
        This is a simplified implementation - production would be much more complex
        """

        logger.info(f"Rendering timeline {timeline['id']} to {resolution} {output_format}")

        # Create working directory
        work_dir = self.temp_dir / export_id
        work_dir.mkdir(exist_ok=True)

        try:
            # Download media files from S3
            media_files = await self._download_media(media_list, work_dir)

            # Parse timeline state
            state = timeline.get('state_json', {})
            tracks = state.get('tracks', [])

            # For simplicity, concatenate video clips in order
            video_track = next((t for t in tracks if t['type'] == 'video'), None)

            if not video_track or not video_track.get('clips'):
                raise ValueError("No video clips in timeline")

            # Build ffmpeg filter complex
            inputs = []
            filters = []

            for i, clip in enumerate(video_track['clips']):
                media_id = clip['media_id']
                media_file = media_files.get(media_id)

                if not media_file:
                    logger.warning(f"Media {media_id} not found, skipping")
                    continue

                # Input file
                input_stream = ffmpeg.input(
                    media_file,
                    ss=clip['trim_start'],
                    t=clip['duration']
                )

                # Apply speed if specified
                speed = clip.get('speed', 1.0)
                if speed != 1.0:
                    input_stream = input_stream.filter('setpts', f'{1.0/speed}*PTS')

                inputs.append(input_stream)

            # Concatenate all clips
            if len(inputs) > 1:
                joined = ffmpeg.concat(*inputs, v=1, a=1)
            elif len(inputs) == 1:
                joined = inputs[0]
            else:
                raise ValueError("No valid clips to render")

            # Parse resolution
            width, height = map(int, resolution.split('x'))

            # Scale to target resolution
            video = joined.video.filter('scale', width, height)
            audio = joined.audio

            # Output file
            output_path = work_dir / f"output.{output_format}"

            # Render
            output = ffmpeg.output(
                video,
                audio,
                str(output_path),
                vcodec='libx264',
                acodec='aac',
                preset='medium',
                crf=23,
                **{'b:a': '192k'}
            )

            ffmpeg.run(output, overwrite_output=True, capture_stdout=True, capture_stderr=True)

            # Upload result to S3
            output_key = f"exports/{export_id}/output.{output_format}"
            self.s3_client.upload_file(
                str(output_path),
                self.s3_bucket,
                output_key
            )

            logger.info(f"Render complete, uploaded to {output_key}")

            return output_key

        finally:
            # Cleanup
            if work_dir.exists():
                shutil.rmtree(work_dir)

    async def generate_proxy(
        self,
        source_key: str,
        media_id: str,
        resolution: str = '1280x720',
    ) -> str:
        """Generate a proxy (lower resolution) version of a video"""

        work_dir = self.temp_dir / f"proxy_{media_id}"
        work_dir.mkdir(exist_ok=True)

        try:
            # Download source
            source_path = work_dir / "source"
            self.s3_client.download_file(self.s3_bucket, source_key, str(source_path))

            # Output path
            output_path = work_dir / "proxy.mp4"

            # Parse resolution
            width, height = map(int, resolution.split('x'))

            # Generate proxy
            stream = ffmpeg.input(str(source_path))
            stream = ffmpeg.output(
                stream,
                str(output_path),
                vf=f'scale={width}:{height}',
                vcodec='libx264',
                preset='fast',
                crf=28,
                acodec='aac',
                **{'b:a': '128k'}
            )

            ffmpeg.run(stream, overwrite_output=True, capture_stdout=True, capture_stderr=True)

            # Upload
            output_key = f"proxies/{media_id}/proxy.mp4"
            self.s3_client.upload_file(str(output_path), self.s3_bucket, output_key)

            return output_key

        finally:
            if work_dir.exists():
                shutil.rmtree(work_dir)

    async def generate_thumbnail(
        self,
        source_key: str,
        media_id: str,
        time_seconds: float = 1.0,
    ) -> str:
        """Generate a thumbnail from a video"""

        work_dir = self.temp_dir / f"thumb_{media_id}"
        work_dir.mkdir(exist_ok=True)

        try:
            # Download source
            source_path = work_dir / "source"
            self.s3_client.download_file(self.s3_bucket, source_key, str(source_path))

            # Output path
            output_path = work_dir / "thumbnail.jpg"

            # Generate thumbnail
            stream = ffmpeg.input(str(source_path), ss=time_seconds)
            stream = ffmpeg.output(
                stream,
                str(output_path),
                vframes=1,
                vf='scale=640:360'
            )

            ffmpeg.run(stream, overwrite_output=True, capture_stdout=True, capture_stderr=True)

            # Upload
            output_key = f"thumbnails/{media_id}/thumbnail.jpg"
            self.s3_client.upload_file(str(output_path), self.s3_bucket, output_key)

            return output_key

        finally:
            if work_dir.exists():
                shutil.rmtree(work_dir)

    async def _download_media(
        self,
        media_list: List[Dict[str, Any]],
        work_dir: Path
    ) -> Dict[str, str]:
        """Download media files from S3"""

        media_files = {}

        for media in media_list:
            media_id = media['id']

            # Use proxy if available, otherwise original
            source_key = media.get('uri_proxy') or media.get('uri_original')

            if not source_key:
                logger.warning(f"No URI for media {media_id}")
                continue

            # Download to local file
            local_path = work_dir / f"{media_id}.mp4"

            try:
                self.s3_client.download_file(self.s3_bucket, source_key, str(local_path))
                media_files[media_id] = str(local_path)
                logger.info(f"Downloaded {media_id} from {source_key}")
            except Exception as e:
                logger.error(f"Failed to download {media_id}: {e}")

        return media_files

    def get_file_size(self, s3_key: str) -> int:
        """Get file size from S3"""
        try:
            response = self.s3_client.head_object(Bucket=self.s3_bucket, Key=s3_key)
            return response['ContentLength']
        except:
            return 0
