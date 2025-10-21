import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from './store/useAppStore';
import { projectsApi, mediaApi, timelineApi } from './api/client';
import Header from './components/Header';
import MediaBin from './components/MediaBin';
import Timeline from './components/Timeline';
import Preview from './components/Preview';
import Inspector from './components/Inspector';
import PromptBar from './components/PromptBar';
import ExportPanel from './components/ExportPanel';

function App() {
  const { currentProject, setCurrentProject, setMediaList, setTimeline } = useAppStore();

  // Load projects on mount
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await projectsApi.list();
      return res.data;
    },
  });

  // Set first project as current if none selected
  useEffect(() => {
    if (projects && projects.length > 0 && !currentProject) {
      setCurrentProject(projects[0]);
    }
  }, [projects, currentProject, setCurrentProject]);

  // Load media for current project
  const { data: media } = useQuery({
    queryKey: ['media', currentProject?.id],
    queryFn: async () => {
      if (!currentProject) return [];
      const res = await mediaApi.list(currentProject.id);
      return res.data;
    },
    enabled: !!currentProject,
  });

  // Load timeline for current project
  const { data: timeline } = useQuery({
    queryKey: ['timeline', currentProject?.id],
    queryFn: async () => {
      if (!currentProject) return null;
      const res = await timelineApi.get(currentProject.id);
      return res.data;
    },
    enabled: !!currentProject,
  });

  // Update store when data changes
  useEffect(() => {
    if (media) setMediaList(media);
  }, [media, setMediaList]);

  useEffect(() => {
    if (timeline) setTimeline(timeline);
  }, [timeline, setTimeline]);

  if (!currentProject) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">PromptCut</h1>
          <p className="text-muted-foreground mb-4">AI-Powered Video Editing</p>
          {!projects || projects.length === 0 ? (
            <p className="text-sm">No projects found. Creating demo project...</p>
          ) : (
            <p className="text-sm">Loading project...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Media Bin */}
        <div className="w-64 border-r border-border flex flex-col">
          <MediaBin />
        </div>

        {/* Center - Timeline and Preview */}
        <div className="flex-1 flex flex-col">
          {/* Preview */}
          <div className="h-1/2 border-b border-border">
            <Preview />
          </div>

          {/* Timeline */}
          <div className="flex-1 flex flex-col">
            <PromptBar />
            <div className="flex-1 overflow-hidden">
              <Timeline />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Inspector & Export */}
        <div className="w-80 border-l border-border flex flex-col">
          <Inspector />
          <ExportPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
