/**
 * Voice Agent - Multi-provider voice AI support for GTM Enterprise
 * 
 * Supports: Gemini, Grok, OpenAI
 */

// Base types and interfaces
export { ConnectionState, DEFAULT_AUDIO_CONFIG } from './base-types';
export type {
  VoiceProvider,
  ToolDeclaration,
  ToolParameterProperty,
  FunctionCall,
  VoiceAgentConfig,
  VoiceAgentCallbacks,
  IVoiceAgent,
  AudioConfig,
} from './base-types';

// Provider implementations and factory
export {
  GeminiVoiceAgent,
  GrokVoiceAgent,
  OpenAIVoiceAgent,
  createVoiceAgent,
  getProviderInfo,
  PROVIDER_VOICES,
  DEFAULT_VOICES,
} from './providers';

// Tool adapter
export {
  toGeminiTools,
  toGrokTools,
  toOpenAITools,
  convertToolsForProvider,
  fromGeminiTools,
} from './tool-adapter';

// Audio utilities
export { 
  PCM_SAMPLE_RATE, 
  OUTPUT_SAMPLE_RATE,
  base64ToUint8Array,
  arrayBufferToBase64,
  floatTo16BitPCM,
  decodeAudioData,
  createPcmBlobForGemini,
  createBase64PCM,
  resampleAudio,
} from './audio-utils';
export type { AudioBlob } from './audio-utils';

// Tools
export { voiceAgentTools, executeToolCall } from './tools';
export type { ToolHandlers } from './tools';

// React hook
export { useVoiceAgent } from './useVoiceAgent';
export type { TranscriptEntry, VoiceAgentState, VoiceAgentActions, UseVoiceAgentProps, ProviderApiKeys, ProviderVoices } from './useVoiceAgent';

