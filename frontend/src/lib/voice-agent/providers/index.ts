/**
 * Voice Agent Provider exports
 */

export { GeminiVoiceAgent } from './gemini-client';
export { GrokVoiceAgent } from './grok-client';
export { OpenAIVoiceAgent } from './openai-client';

import { IVoiceAgent, VoiceProvider } from '../base-types';
import { GeminiVoiceAgent } from './gemini-client';
import { GrokVoiceAgent } from './grok-client';
import { OpenAIVoiceAgent } from './openai-client';

/**
 * Factory function to create a voice agent for the specified provider
 */
export function createVoiceAgent(provider: VoiceProvider): IVoiceAgent {
  switch (provider) {
    case 'gemini':
      return new GeminiVoiceAgent();
    case 'grok':
      return new GrokVoiceAgent();
    case 'openai':
      return new OpenAIVoiceAgent();
    default:
      throw new Error(`Unknown voice provider: ${provider}`);
  }
}

/**
 * Get display info for a provider
 */
export function getProviderInfo(provider: VoiceProvider): { name: string; description: string } {
  switch (provider) {
    case 'gemini':
      return {
        name: 'Google Gemini',
        description: 'Gemini Multimodal Live API',
      };
    case 'grok':
      return {
        name: 'xAI Grok',
        description: 'Grok Realtime Voice API',
      };
    case 'openai':
      return {
        name: 'OpenAI',
        description: 'OpenAI Realtime API',
      };
    default:
      return {
        name: 'Unknown',
        description: 'Unknown provider',
      };
  }
}

/**
 * Available voices for each provider
 */
export const PROVIDER_VOICES: Record<VoiceProvider, string[]> = {
  gemini: ['Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede'],
  grok: ['Ara', 'Rex', 'Sal', 'Eve', 'Leo'],  // Grok's native voices
  openai: ['alloy', 'echo', 'shimmer', 'ash', 'ballad', 'coral', 'sage', 'verse'],
};

/**
 * Default voice for each provider
 */
export const DEFAULT_VOICES: Record<VoiceProvider, string> = {
  gemini: 'Kore',
  grok: 'Sal',    // Neutral, balanced voice
  openai: 'alloy',
};

