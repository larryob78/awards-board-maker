import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { aiApi, timelineApi } from '../api/client';

export default function PromptBar() {
  const { currentProject, promptValue, setPromptValue } = useAppStore();
  const [suggestions] = useState([
    'Make a 60-second film with fast cuts and a warm tone',
    'Create a dramatic intro with slow motion',
    'Add crossfade transitions between all clips',
    'Create an upbeat montage with 2-second clips',
  ]);

  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async (prompt: string) => {
      if (!currentProject) throw new Error('No project selected');

      // Generate edit plan
      const { data } = await aiApi.generatePlanSync({
        project_id: currentProject.id,
        prompt,
      });

      // Apply the plan to timeline
      await timelineApi.applyActions({
        project_id: currentProject.id,
        actions: data.plan.actions,
        user_prompt: prompt,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline', currentProject?.id] });
      setPromptValue('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (promptValue.trim()) {
      generateMutation.mutate(promptValue);
    }
  };

  return (
    <div className="border-b border-border bg-muted/20 p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              placeholder="Describe how you want to edit your video..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              disabled={generateMutation.isPending}
            />
            <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          <button
            type="submit"
            disabled={!promptValue.trim() || generateMutation.isPending}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Edit'
            )}
          </button>
        </div>

        {/* Quick Suggestions */}
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPromptValue(suggestion)}
              className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              disabled={generateMutation.isPending}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </form>

      {generateMutation.isError && (
        <div className="mt-2 text-sm text-red-400">
          Error: {(generateMutation.error as Error).message}
        </div>
      )}
    </div>
  );
}
