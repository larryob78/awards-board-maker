import { useAppStore } from '../store/useAppStore';
import { Film, Music, Type } from 'lucide-react';

export default function Timeline() {
  const { timeline, mediaList, zoom, currentTime } = useAppStore();

  const tracks = timeline?.state_json?.tracks || [];
  const duration = timeline?.state_json?.duration || 60;

  const getTrackIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Film className="w-3 h-3" />;
      case 'audio':
        return <Music className="w-3 h-3" />;
      case 'text':
        return <Type className="w-3 h-3" />;
      default:
        return <Film className="w-3 h-3" />;
    }
  };

  const getMediaName = (mediaId: string) => {
    const media = mediaList.find((m) => m.id === mediaId);
    return media?.filename || 'Unknown';
  };

  const pixelsPerSecond = 10 * zoom;
  const timelineWidth = duration * pixelsPerSecond;

  return (
    <div className="h-full flex flex-col bg-muted/20">
      {/* Timeline Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <h3 className="text-sm font-semibold">Timeline</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Zoom:</span>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={zoom}
            onChange={(e) => useAppStore.getState().setZoom(parseFloat(e.target.value))}
            className="w-20"
          />
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-auto">
        <div className="relative" style={{ width: `${timelineWidth}px`, minWidth: '100%' }}>
          {/* Time Ruler */}
          <div className="h-8 border-b border-border bg-muted/50 flex items-center relative">
            {Array.from({ length: Math.ceil(duration) }).map((_, i) => (
              <div
                key={i}
                className="absolute text-xs text-muted-foreground"
                style={{ left: `${i * pixelsPerSecond}px` }}
              >
                <div className="w-px h-2 bg-muted-foreground mb-1" />
                {i}s
              </div>
            ))}
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
            style={{ left: `${currentTime * pixelsPerSecond}px` }}
          />

          {/* Tracks */}
          <div className="space-y-1 py-2">
            {tracks.map((track, trackIndex) => (
              <div key={track.id} className="flex">
                {/* Track Label */}
                <div className="w-24 flex items-center gap-2 px-2 text-xs font-medium bg-muted/30">
                  {getTrackIcon(track.type)}
                  <span className="capitalize">{track.type}</span>
                </div>

                {/* Track Content */}
                <div className="flex-1 relative h-16 bg-muted/10 border-b border-border">
                  {track.clips.map((clip) => (
                    <div
                      key={clip.id}
                      className="absolute h-14 bg-primary/80 border border-primary rounded px-2 py-1 text-xs text-primary-foreground overflow-hidden cursor-pointer hover:bg-primary"
                      style={{
                        left: `${clip.start_time * pixelsPerSecond}px`,
                        width: `${clip.duration * pixelsPerSecond}px`,
                      }}
                      title={getMediaName(clip.media_id)}
                    >
                      <div className="truncate font-medium">
                        {getMediaName(clip.media_id)}
                      </div>
                      <div className="text-xs opacity-75">
                        {clip.duration.toFixed(1)}s
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {tracks.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                No clips on timeline yet. Use a prompt to generate an edit!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
