"""
Database utilities for Python worker
"""

import psycopg2
import psycopg2.extras
import os
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://promptcut:promptcut_dev_password@postgres:5432/promptcut')


def get_connection():
    """Get database connection"""
    return psycopg2.connect(DATABASE_URL)


def get_timeline(timeline_id: str) -> Optional[Dict[str, Any]]:
    """Get timeline by ID"""
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cursor.execute(
            "SELECT * FROM timeline WHERE id = %s",
            (timeline_id,)
        )

        result = cursor.fetchone()
        cursor.close()
        conn.close()

        if result:
            return dict(result)
        return None

    except Exception as e:
        logger.error(f"Failed to get timeline: {e}")
        return None


def get_media_for_timeline(timeline: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Get all media referenced in a timeline"""
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Extract media IDs from timeline state
        state = timeline.get('state_json', {})
        media_ids = set()

        for track in state.get('tracks', []):
            for clip in track.get('clips', []):
                media_id = clip.get('media_id')
                if media_id and not media_id.startswith('text_'):
                    media_ids.add(media_id)

        if not media_ids:
            return []

        # Query media
        placeholders = ','.join(['%s'] * len(media_ids))
        cursor.execute(
            f"SELECT * FROM media WHERE id IN ({placeholders})",
            tuple(media_ids)
        )

        results = cursor.fetchall()
        cursor.close()
        conn.close()

        return [dict(row) for row in results]

    except Exception as e:
        logger.error(f"Failed to get media for timeline: {e}")
        return []


def update_export_status(export_id: str, status: str, **kwargs):
    """Update export status"""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        updates = [f"status = %s"]
        values = [status]

        if 'uri' in kwargs:
            updates.append("uri = %s")
            values.append(kwargs['uri'])

        if 'file_size' in kwargs:
            updates.append("file_size = %s")
            values.append(kwargs['file_size'])

        if status == 'completed':
            updates.append("completed_at = NOW()")

        values.append(export_id)

        query = f"UPDATE exports SET {', '.join(updates)} WHERE id = %s"
        cursor.execute(query, values)

        conn.commit()
        cursor.close()
        conn.close()

        logger.info(f"Updated export {export_id} status to {status}")

    except Exception as e:
        logger.error(f"Failed to update export status: {e}")
