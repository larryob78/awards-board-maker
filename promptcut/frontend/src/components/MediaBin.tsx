import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Film, Music, Image as ImageIcon } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { uploadApi } from '../api/client';

export default function MediaBin() {
  const { currentProject, mediaList, setSelectedMediaId, selectedMediaId } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!currentProject) throw new Error('No project selected');

      // Request upload URL
      const { data } = await uploadApi.requestUpload({
        project_id: currentProject.id,
        filename: file.name,
        content_type: file.type,
      });

      // Upload file
      await uploadApi.uploadFile(data.upload_url, file);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', currentProject?.id] });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        uploadMutation.mutate(file);
      });
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Film className="w-4 h-4" />;
      case 'audio':
        return <Music className="w-4 h-4" />;
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      default:
        return <Film className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-semibold mb-2">Media Bin</h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-3 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2"
          disabled={uploadMutation.isPending}
        >
          <Upload className="w-4 h-4" />
          {uploadMutation.isPending ? 'Uploading...' : 'Upload Media'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="video/*,audio/*,image/*"
          multiple
          onChange={handleFileSelect}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {mediaList.map((media) => (
          <div
            key={media.id}
            onClick={() => setSelectedMediaId(media.id)}
            className={`p-2 rounded cursor-pointer transition-colors ${
              selectedMediaId === media.id
                ? 'bg-primary/20 border border-primary'
                : 'bg-muted/50 hover:bg-muted border border-transparent'
            }`}
          >
            {media.thumbnail_url && (
              <img
                src={media.thumbnail_url}
                alt={media.filename}
                className="w-full h-24 object-cover rounded mb-2"
              />
            )}
            <div className="flex items-start gap-2">
              {getMediaIcon(media.media_type)}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{media.filename}</p>
                {media.duration && (
                  <p className="text-xs text-muted-foreground">
                    {media.duration.toFixed(1)}s
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        {mediaList.length === 0 && !uploadMutation.isPending && (
          <div className="text-center text-sm text-muted-foreground py-8">
            No media uploaded yet
          </div>
        )}
      </div>
    </div>
  );
}
