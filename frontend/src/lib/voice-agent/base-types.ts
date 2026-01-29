/**
 * Provider-agnostic types for multi-provider voice agent support
 * Supports: Gemini, Grok, OpenAI
 */

/**
 * Supported voice AI providers
 */
export type VoiceProvider = 'gemini' | 'grok' | 'openai';

/**
 * Connection state for the voice agent
 */
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

/**
 * Provider-agnostic tool/function declaration
 * This is the common format used internally - adapters convert to provider-specific formats
 */
export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameterProperty>;
    required: string[];
  };
}

export interface ToolParameterProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
}

/**
 * Provider-agnostic function call from the AI
 */
export interface FunctionCall {
  id?: string;
  name: string;
  args: Record<string, unknown>;
}

/**
 * Configuration for any voice agent provider
 */
export interface VoiceAgentConfig {
  /**
   * The API key for the selected provider
   */
  apiKey: string;

  /**
   * The system instruction / persona for the agent
   */
  systemInstruction: string;

  /**
   * Optional: Provider-specific model override
   */
  model?: string;

  /**
   * Optional: Voice configuration
   */
  voiceName?: string;

  /**
   * Optional: Array of tool declarations the agent can invoke
   */
  tools?: ToolDeclaration[];
}

/**
 * Callbacks for the voice agent lifecycle and events
 */
export interface VoiceAgentCallbacks {
  /**
   * Called when the connection is established
   */
  onOpen: () => void;

  /**
   * Called when the connection is closed
   */
  onClose: (event?: CloseEvent | Event) => void;

  /**
   * Called when an error occurs
   */
  onError: (error: Error | ErrorEvent) => void;

  /**
   * Called when audio data is received from the agent (for visualization)
   */
  onAudioData: (audioBuffer: AudioBuffer) => void;

  /**
   * Optional: Called when a turn completes with transcriptions
   */
  onTranscription?: (userTranscript: string, agentTranscript: string) => void;

  /**
   * Optional: Called when the agent invokes a tool.
   * Return the result object to send back to the agent.
   */
  onToolCall?: (functionCall: FunctionCall) => Promise<Record<string, unknown>> | Record<string, unknown>;
}

/**
 * Base interface that all voice agent providers must implement
 */
export interface IVoiceAgent {
  /**
   * Get the provider name
   */
  readonly provider: VoiceProvider;

  /**
   * Get the currently active model name
   */
  getActiveModel(): string;

  /**
   * Connect to the voice API and start the audio pipeline
   */
  connect(config: VoiceAgentConfig, callbacks: VoiceAgentCallbacks): Promise<void>;

  /**
   * Disconnect from the voice API and clean up resources
   */
  disconnect(): Promise<void>;
}

/**
 * Audio format configuration for different providers
 */
export interface AudioConfig {
  inputSampleRate: number;
  outputSampleRate: number;
  inputChannels: number;
  outputChannels: number;
}

/**
 * Default audio configuration (works for most providers)
 */
export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  inputSampleRate: 16000,
  outputSampleRate: 24000,
  inputChannels: 1,
  outputChannels: 1,
};

