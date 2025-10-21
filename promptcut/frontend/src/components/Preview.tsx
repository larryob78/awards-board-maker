import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function Preview() {
  const { isPlaying, setIsPlaying, currentTime, setCurrentTime, timeline } = useAppStore();

  const duration = timeline?.state_json?.duration || 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-black/50">
      {/* Video Preview Area */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="text-6xl mb-4">▶</div>
          <p className="text-sm">Video preview</p>
          <p className="text-xs mt-1">Preview will appear here</p>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="border-t border-border bg-muted/30 p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentTime(0)}
            className="p-2 hover:bg-muted rounded"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setCurrentTime(duration)}
            className="p-2 hover:bg-muted rounded"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <div className="flex-1">
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <span className="text-sm text-muted-foreground font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
