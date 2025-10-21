import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { exportApi } from '../api/client';

export default function ExportPanel() {
  const { currentProject, timeline } = useAppStore();
  const [format, setFormat] = useState<'mp4' | 'mov' | 'webm'>('mp4');
  const [resolution, setResolution] = useState('1920x1080');
  const [activeExportId, setActiveExportId] = useState<string | null>(null);

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!currentProject || !timeline) throw new Error('No project or timeline');

      const { data } = await exportApi.start({
        project_id: currentProject.id,
        timeline_id: timeline.id,
        format,
        resolution,
      });

      setActiveExportId(data.export_id);
      return data;
    },
  });

  // Poll export status
  const { data: exportStatus } = useQuery({
    queryKey: ['export', activeExportId],
    queryFn: async () => {
      if (!activeExportId) return null;
      const { data } = await exportApi.get(activeExportId);
      return data;
    },
    enabled: !!activeExportId,
    refetchInterval: (data) => {
      if (!data) return false;
      return data.status === 'pending' || data.status === 'processing' ? 2000 : false;
    },
  });

  const handleExport = () => {
    exportMutation.mutate();
  };

  const getStatusIcon = () => {
    if (!exportStatus) return null;

    switch (exportStatus.status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      default:
        return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold">Export</h3>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as any)}
            className="w-full px-3 py-2 bg-background border border-border rounded text-sm"
          >
            <option value="mp4">MP4</option>
            <option value="mov">MOV</option>
            <option value="webm">WebM</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Resolution</label>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded text-sm"
          >
            <option value="1920x1080">1080p (1920x1080)</option>
            <option value="1280x720">720p (1280x720)</option>
            <option value="3840x2160">4K (3840x2160)</option>
            <option value="1080x1920">9:16 (1080x1920)</option>
          </select>
        </div>

        <button
          onClick={handleExport}
          disabled={!timeline || exportMutation.isPending}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {exportMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Starting Export...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export Video
            </>
          )}
        </button>
      </div>

      {/* Export Status */}
      {exportStatus && (
        <div className="border border-border rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Export Status</span>
            {getStatusIcon()}
          </div>

          <div className="text-xs text-muted-foreground capitalize">
            {exportStatus.status}
          </div>

          {exportStatus.job_progress !== undefined && (
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${exportStatus.job_progress}%` }}
              />
            </div>
          )}

          {exportStatus.status === 'completed' && exportStatus.download_url && (
            <a
              href={exportStatus.download_url}
              download
              className="block w-full px-3 py-2 bg-green-600 text-white rounded text-sm text-center hover:bg-green-700"
            >
              Download Video
            </a>
          )}
        </div>
      )}
    </div>
  );
}
