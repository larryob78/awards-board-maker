import { useAppStore } from '../store/useAppStore';

export default function Header() {
  const { currentProject } = useAppStore();

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-muted/30">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
          PromptCut
        </h1>
        <div className="h-4 w-px bg-border" />
        <span className="text-sm text-muted-foreground">
          {currentProject?.title || 'No Project'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {currentProject?.resolution} @ {currentProject?.fps}fps
        </span>
      </div>
    </header>
  );
}
