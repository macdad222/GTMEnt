/**
 * Grok Voice Agent - Implementation for xAI's Grok Realtime Voice API
 * 
 * Connects via backend proxy at /api/voice/grok which handles authentication.
 * The proxy forwards to wss://api.x.ai/v1/realtime with proper Authorization header.
 * 
 * Documentation: https://docs.x.ai/docs/guides/voice
 */

import { 
  IVoiceAgent, 
  VoiceAgentConfig, 
  VoiceAgentCallbacks,
  VoiceProvider,
  FunctionCall 
} from '../base-types';
import { 
  createBase64PCM, 
  decodeAudioData, 
  PCM_SAMPLE_RATE, 
  OUTPUT_SAMPLE_RATE, 
  base64ToUint8Array 
} from '../audio-utils';
import { toGrokTools } from '../tool-adapter';

// Connect to local proxy which handles xAI authentication
const getGrokProxyUrl = (): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/api/voice/grok`;
};

// Default voice for Grok - using one of the official voices
const DEFAULT_VOICE = 'Sal';  // Neutral, balanced voice

/**
 * GrokVoiceAgent - xAI's Grok Realtime Voice API implementation
 */
export class GrokVoiceAgent implements IVoiceAgent {
  public readonly provider: VoiceProvider = 'grok';
  
  private ws: WebSocket | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private callbacks: VoiceAgentCallbacks | null = null;
  
  // Transcription state
  private currentInputTranscription = '';
  private currentOutputTranscription = '';
  
  // Response state tracking
  private isResponseInProgress = false;
  
  private currentVoice: string = DEFAULT_VOICE;

  constructor() {}

  public getActiveModel(): string {
    return `Grok Voice Agent (${this.currentVoice})`;
  }

  public async connect(config: VoiceAgentConfig, callbacks: VoiceAgentCallbacks): Promise<void> {
    this.callbacks = callbacks;
    this.currentVoice = config.voiceName || DEFAULT_VOICE;

    // Set up audio contexts
    this.inputAudioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
      sampleRate: PCM_SAMPLE_RATE,
    });
    this.outputAudioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
      sampleRate: OUTPUT_SAMPLE_RATE,
    });
    
    this.outputNode = this.outputAudioContext.createGain();
    this.outputNode.connect(this.outputAudioContext.destination);

    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Create WebSocket connection to local proxy
    // The proxy handles authentication with xAI API
    return new Promise((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        reject(new Error('Grok Voice connection timeout'));
      }, 15000);

      // Connect to local proxy (auth handled server-side)
      const proxyUrl = getGrokProxyUrl();
      console.log(`Connecting to Grok Voice proxy: ${proxyUrl}`);
      
      this.ws = new WebSocket(proxyUrl);

      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log(`✓ Grok Voice Agent connected via proxy`);
        
        // Send session configuration
        this.sendSessionUpdate(config);
        
        // Start audio input
        this.setupAudioInput(stream);
        
        callbacks.onOpen();
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error('Grok WebSocket error:', error);
        callbacks.onError(error as ErrorEvent);
        reject(error);
      };

      this.ws.onclose = (event) => {
        console.log('Grok WebSocket closed');
        callbacks.onClose(event);
        this.cleanup();
      };
    });
  }

  private sendSessionUpdate(config: VoiceAgentConfig): void {
    if (!this.ws) return;

    // Grok Voice Agent supports these voices:
    // - Ara: Female, warm, friendly (default)
    // - Rex: Male, confident, professional
    // - Sal: Neutral, smooth, balanced
    // - Eve: Female, energetic, upbeat
    // - Leo: Male, authoritative, strong
    const validVoices: Record<string, string> = {
      'ara': 'Ara',
      'rex': 'Rex', 
      'sal': 'Sal',
      'eve': 'Eve',
      'leo': 'Leo',
    };
    const requestedVoice = (config.voiceName || '').toLowerCase();
    const grokVoice: string = validVoices[requestedVoice] || this.currentVoice;
    
    // Update current voice to the validated one
    this.currentVoice = grokVoice;
    
    console.log('Grok voice config:', { requested: config.voiceName, validated: grokVoice, sentToAPI: grokVoice.toLowerCase() });

    const sessionConfig: {
      type: string;
      session: {
        model: string;
        modalities: string[];
        instructions: string;
        voice: string;
        input_audio_format: string;
        output_audio_format: string;
        input_audio_transcription: Record<string, never>;
        turn_detection: {
          type: string;
          threshold: number;
          prefix_padding_ms: number;
          silence_duration_ms: number;
        };
        tools?: unknown[];
        tool_choice?: string;
      };
    } = {
      type: 'session.update',
      session: {
        model: 'grok-4-realtime',
        modalities: ['text', 'audio'],
        instructions: config.systemInstruction,
        voice: grokVoice.toLowerCase(),  // xAI expects lowercase voice names
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {},
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      },
    };

    // Add tools if provided
    if (config.tools && config.tools.length > 0) {
      sessionConfig.session.tools = toGrokTools(config.tools);
      sessionConfig.session.tool_choice = 'auto';
    }

    this.ws.send(JSON.stringify(sessionConfig));
  }

  /**
   * Send an initial greeting to make the AI say hello when connected
   */
  private sendGreeting(): void {
    if (!this.ws) return;

    // Create a conversation item with a user message prompting a greeting
    this.ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Say a brief, friendly hello and ask how you can help today. Keep it to one short sentence.',
          },
        ],
      },
    }));

    // Request a response to the greeting
    this.ws.send(JSON.stringify({
      type: 'response.create',
    }));
  }

  private async handleMessage(message: { type: string; delta?: string; transcript?: string; name?: string; call_id?: string; arguments?: string; session?: unknown; error?: { message?: string }; response_id?: string; response?: { id?: string } }): Promise<void> {
    // Log key messages for debugging (reduce noise)
    if (!message.type.includes('delta')) {
      console.log('Grok message:', message.type);
    }
    
    switch (message.type) {
      case 'session.created':
        console.log('Grok session created');
        break;
      
      case 'session.updated':
        console.log('Grok session configured - sending greeting');
        // Send initial greeting after session is fully configured
        this.sendGreeting();
        break;

      case 'input_audio_buffer.speech_started':
        // User started speaking - interrupt any playing audio and cancel response
        console.log('User speaking - interrupting agent');
        this.stopAllAudio();
        this.cancelCurrentResponse();
        break;

      case 'input_audio_buffer.speech_stopped':
        // User stopped speaking - audio will be committed automatically with server_vad
        console.log('User stopped speaking');
        break;

      case 'response.created':
        // New response starting - track it to avoid duplicates
        this.isResponseInProgress = true;
        this.currentOutputTranscription = '';
        break;

      case 'response.output_audio.delta':
        // Receive audio chunk - only process if response is in progress
        if (message.delta && this.outputAudioContext && this.isResponseInProgress) {
          try {
            const bytes = base64ToUint8Array(message.delta);
            const audioBuffer = await decodeAudioData(bytes, this.outputAudioContext, OUTPUT_SAMPLE_RATE);
            
            this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
            
            const source = this.outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputNode!);
            
            source.addEventListener('ended', () => {
              this.activeSources.delete(source);
            });

            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.activeSources.add(source);
            
            this.callbacks?.onAudioData(audioBuffer);
          } catch (e) {
            console.error('Error decoding Grok audio:', e);
          }
        }
        break;

      case 'response.audio_transcript.delta':
      case 'response.output_audio_transcript.delta':
        // Agent transcript chunk - accumulate only if response is in progress
        if (message.delta && this.isResponseInProgress) {
          this.currentOutputTranscription += message.delta;
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User transcript completed
        if (message.transcript) {
          this.currentInputTranscription = message.transcript;
          // Send user transcription immediately
          if (this.callbacks?.onTranscription && this.currentInputTranscription) {
            this.callbacks.onTranscription(this.currentInputTranscription, '');
            this.currentInputTranscription = '';
          }
        }
        break;

      case 'response.done':
        // Turn complete - send agent transcription if we have one
        if (this.isResponseInProgress && this.currentOutputTranscription && this.callbacks?.onTranscription) {
          this.callbacks.onTranscription('', this.currentOutputTranscription);
        }
        this.isResponseInProgress = false;
        this.currentOutputTranscription = '';
        break;

      case 'response.cancelled':
        // Response was cancelled (user interrupted)
        console.log('Response cancelled');
        this.isResponseInProgress = false;
        this.currentOutputTranscription = '';
        break;

      case 'response.function_call_arguments.done':
        // Tool call received
        if (message.name && this.callbacks?.onToolCall) {
          try {
            const functionCall: FunctionCall = {
              id: message.call_id,
              name: message.name,
              args: JSON.parse(message.arguments || '{}'),
            };
            
            console.log('Grok tool call:', functionCall);
            const result = await this.callbacks.onToolCall(functionCall);
            
            // Send tool result back
            this.sendToolResult(message.call_id!, result);
          } catch (e) {
            console.error('Error handling Grok tool call:', e);
            this.sendToolResult(message.call_id!, { error: String(e) });
          }
        }
        break;

      case 'error':
        console.error('Grok error:', message.error);
        this.callbacks?.onError(new Error(message.error?.message || 'Unknown Grok error'));
        break;

      default:
        // Log unhandled message types for debugging
        if (message.type && !message.type.startsWith('response.audio')) {
          console.log('Grok message:', message.type);
        }
    }
  }

  private sendToolResult(callId: string, result: Record<string, unknown>): void {
    if (!this.ws) return;

    // Send conversation item with tool result
    this.ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(result),
      },
    }));

    // Request a response after tool result
    this.ws.send(JSON.stringify({
      type: 'response.create',
    }));
  }

  private setupAudioInput(stream: MediaStream): void {
    if (!this.inputAudioContext) return;
    
    this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      const base64Audio = createBase64PCM(inputData);
      
      this.ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64Audio,
      }));
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private stopAllAudio(): void {
    this.activeSources.forEach(source => {
      try { source.stop(); } catch(e) { /* ignore */ }
    });
    this.activeSources.clear();
    this.nextStartTime = 0;
    if (this.outputAudioContext) {
      this.nextStartTime = this.outputAudioContext.currentTime;
    }
  }

  private cancelCurrentResponse(): void {
    if (!this.ws || !this.isResponseInProgress) return;
    
    // Send response.cancel to tell Grok to stop generating
    this.ws.send(JSON.stringify({
      type: 'response.cancel',
    }));
    
    this.isResponseInProgress = false;
    this.currentOutputTranscription = '';
  }

  public async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.processor?.disconnect();
    this.inputSource?.disconnect();
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    this.stopAllAudio();
    this.callbacks = null;
  }
}

