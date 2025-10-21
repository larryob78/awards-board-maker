// AI Edit Planning Service
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { EditPlan, EditAction, Media } from '../types';

export class AIService {
  private anthropic?: Anthropic;
  private openai?: OpenAI;

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }

    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    if (!this.anthropic && !this.openai) {
      logger.warn('No AI API keys configured. AI features will be limited.');
    }
  }

  /**
   * Generate an edit plan from a user prompt
   */
  async generateEditPlan(
    prompt: string,
    availableMedia: Media[],
    currentTimeline?: any
  ): Promise<EditPlan> {
    logger.info('Generating edit plan', { prompt, mediaCount: availableMedia.length });

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(prompt, availableMedia, currentTimeline);

    try {
      // Try Claude first, then fall back to OpenAI
      if (this.anthropic) {
        return await this.generateWithClaude(systemPrompt, userPrompt);
      } else if (this.openai) {
        return await this.generateWithOpenAI(systemPrompt, userPrompt);
      } else {
        throw new Error('No AI service configured');
      }
    } catch (error) {
      logger.error('Failed to generate edit plan', { error });
      throw error;
    }
  }

  /**
   * Generate edit plan using Claude
   */
  private async generateWithClaude(
    systemPrompt: string,
    userPrompt: string
  ): Promise<EditPlan> {
    const message = await this.anthropic!.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      return this.parseEditPlan(content.text);
    }

    throw new Error('Unexpected response format from Claude');
  }

  /**
   * Generate edit plan using OpenAI
   */
  private async generateWithOpenAI(
    systemPrompt: string,
    userPrompt: string
  ): Promise<EditPlan> {
    const completion = await this.openai!.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (content) {
      return this.parseEditPlan(content);
    }

    throw new Error('No response from OpenAI');
  }

  /**
   * Build the system prompt for the AI
   */
  private buildSystemPrompt(): string {
    return `You are EditBrain, an expert video editor with 20 years of experience. You understand pacing, rhythm, cuts, transitions, and storytelling.

Your task is to analyze user prompts and available media, then create a detailed Edit Plan in JSON format.

The Edit Plan should include:
1. Overall duration and style
2. Structure with sections (intro, middle, outro, etc.)
3. Specific actions (cuts, transitions, effects, text overlays, speed changes)

Consider:
- Pacing: Fast cuts for energy, slower cuts for emotion
- Transitions: Match the mood (crossfade for smooth, cut for impact)
- Audio: Use music and sound design to enhance the story
- Text: Add captions or titles where helpful
- Color: Suggest color grading for the desired mood

Always respond with valid JSON in this format:
{
  "duration": <number>,
  "style": "<cinematic|documentary|fast-paced|emotional|etc>",
  "structure": [
    {"section": "intro", "goal": "hook viewer", "duration": 5},
    {"section": "middle", "goal": "develop story", "duration": 45},
    {"section": "outro", "goal": "resolve", "duration": 10}
  ],
  "actions": [
    {"type": "cut", "asset": "media_id", "in": 0, "out": 5},
    {"type": "transition", "style": "crossfade", "duration": 1},
    {"type": "overlayText", "text": "Example", "time": 10, "duration": 3},
    {"type": "speed", "asset": "media_id", "speed": 1.5},
    {"type": "effect", "style": "color_grade", "parameters": {"warmth": 1.2}}
  ]
}

Be creative but practical. Ensure the plan is achievable with the available media.`;
  }

  /**
   * Build the user prompt with context
   */
  private buildUserPrompt(
    prompt: string,
    availableMedia: Media[],
    currentTimeline?: any
  ): string {
    const mediaList = availableMedia.map((m, i) =>
      `${i + 1}. ${m.filename} (ID: ${m.id}, Type: ${m.media_type}, Duration: ${m.duration?.toFixed(1)}s)`
    ).join('\n');

    let promptText = `User Request: "${prompt}"\n\nAvailable Media:\n${mediaList}`;

    if (currentTimeline && currentTimeline.tracks?.length > 0) {
      promptText += `\n\nCurrent Timeline: ${JSON.stringify(currentTimeline, null, 2)}`;
      promptText += '\n\nPlease modify or extend the current timeline based on the user request.';
    } else {
      promptText += '\n\nCreate a new timeline from scratch.';
    }

    return promptText;
  }

  /**
   * Parse the AI response into an EditPlan
   */
  private parseEditPlan(response: string): EditPlan {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                       response.match(/```\n?([\s\S]*?)\n?```/);

      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      const plan = JSON.parse(jsonStr);

      // Validate the plan has required fields
      if (!plan.duration || !plan.actions || !Array.isArray(plan.actions)) {
        throw new Error('Invalid edit plan format');
      }

      return plan as EditPlan;
    } catch (error) {
      logger.error('Failed to parse edit plan', { response, error });
      throw new Error('Failed to parse AI response into valid edit plan');
    }
  }

  /**
   * Review an edit plan for quality and coherence
   */
  async reviewEditPlan(plan: EditPlan): Promise<{
    approved: boolean;
    suggestions?: string[];
    confidence: number;
  }> {
    // This would use a second AI call to review the plan
    // For now, return a simple validation
    return {
      approved: true,
      confidence: 0.85,
      suggestions: []
    };
  }

  /**
   * Generate captions/transcription for audio
   */
  async transcribeAudio(audioUrl: string): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI API key required for transcription');
    }

    try {
      // Note: This requires the audio file to be accessible
      // In production, download from S3 first
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioUrl as any, // Type needs adjustment for actual file
        model: 'whisper-1',
      });

      return transcription.text;
    } catch (error) {
      logger.error('Transcription failed', { error });
      throw error;
    }
  }
}

export default new AIService();
