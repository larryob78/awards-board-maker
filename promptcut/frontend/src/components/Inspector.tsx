import { useAppStore } from '../store/useAppStore';

export default function Inspector() {
  const { selectedMediaId, mediaList } = useAppStore();

  const selectedMedia = mediaList.find((m) => m.id === selectedMediaId);

  return (
    <div className="flex-1 border-b border-border p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold mb-4">Inspector</h3>

      {selectedMedia ? (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Filename</label>
            <p className="text-sm font-medium">{selectedMedia.filename}</p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Type</label>
            <p className="text-sm font-medium capitalize">{selectedMedia.media_type}</p>
          </div>

          {selectedMedia.duration && (
            <div>
              <label className="text-xs text-muted-foreground">Duration</label>
              <p className="text-sm font-medium">{selectedMedia.duration.toFixed(2)}s</p>
            </div>
          )}

          {selectedMedia.width && selectedMedia.height && (
            <div>
              <label className="text-xs text-muted-foreground">Resolution</label>
              <p className="text-sm font-medium">
                {selectedMedia.width} x {selectedMedia.height}
              </p>
            </div>
          )}

          {selectedMedia.fps && (
            <div>
              <label className="text-xs text-muted-foreground">FPS</label>
              <p className="text-sm font-medium">{selectedMedia.fps}</p>
            </div>
          )}

          {selectedMedia.thumbnail_url && (
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Preview</label>
              <img
                src={selectedMedia.thumbnail_url}
                alt="Preview"
                className="w-full rounded"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-sm text-muted-foreground py-8">
          Select a media item to view details
        </div>
      )}
    </div>
  );
}
