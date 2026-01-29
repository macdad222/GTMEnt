/**
 * OpenAI Voice Agent - Implementation for OpenAI's Realtime API
 * 
 * WebSocket endpoint: wss://api.openai.com/v1/realtime
 * Documentation: https://platform.openai.com/docs/guides/realtime
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
import { toOpenAITools } from '../tool-adapter';

const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime';
const DEFAULT_MODEL = 'gpt-4o-realtime-preview';

/**
 * OpenAIVoiceAgent - OpenAI's Realtime API implementation
 */
export class OpenAIVoiceAgent implements IVoiceAgent {
  public readonly provider: VoiceProvider = 'openai';
  
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
  
  private currentModel: string = DEFAULT_MODEL;

  constructor() {}

  public getActiveModel(): string {
    return this.currentModel;
  }

  public async connect(config: VoiceAgentConfig, callbacks: VoiceAgentCallbacks): Promise<void> {
    this.callbacks = callbacks;
    this.currentModel = config.model || DEFAULT_MODEL;

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

    // Create WebSocket connection
    return new Promise((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        reject(new Error('OpenAI connection timeout'));
      }, 10000);

      const url = `${OPENAI_REALTIME_URL}?model=${this.currentModel}`;
      
      // OpenAI uses subprotocols for auth
      this.ws = new WebSocket(url, [
        'realtime',
        `openai-insecure-api-key.${config.apiKey}`,
        'openai-beta.realtime-v1',
      ]);

      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log(`✓ OpenAI Realtime connected (${this.currentModel})`);
        
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
        console.error('OpenAI WebSocket error:', error);
        callbacks.onError(error as ErrorEvent);
        reject(error);
      };

      this.ws.onclose = (event) => {
        console.log('OpenAI WebSocket closed');
        callbacks.onClose(event);
        this.cleanup();
      };
    });
  }

  private sendSessionUpdate(config: VoiceAgentConfig): void {
    if (!this.ws) return;

    // Map voice names - OpenAI uses: alloy, echo, shimmer, ash, ballad, coral, sage, verse
    const voiceMap: Record<string, string> = {
      'Kore': 'shimmer',
      'Puck': 'echo',
      'Charon': 'ash',
      'Fenrir': 'coral',
      'Aoede': 'alloy',
    };

    const sessionConfig: {
      type: string;
      session: {
        modalities: string[];
        instructions: string;
        voice: string;
        input_audio_format: string;
        output_audio_format: string;
        input_audio_transcription: {
          model: string;
        };
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
        modalities: ['text', 'audio'],
        instructions: config.systemInstruction,
        voice: voiceMap[config.voiceName || ''] || config.voiceName || 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
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
      sessionConfig.session.tools = toOpenAITools(config.tools);
      sessionConfig.session.tool_choice = 'auto';
    }

    this.ws.send(JSON.stringify(sessionConfig));
  }

  private async handleMessage(message: { type: string; delta?: string; transcript?: string; name?: string; call_id?: string; arguments?: string; error?: { message?: string } }): Promise<void> {
    switch (message.type) {
      case 'session.created':
      case 'session.updated':
        console.log('OpenAI session configured:', message.type);
        break;

      case 'input_audio_buffer.speech_started':
        // User started speaking - interrupt any playing audio
        this.stopAllAudio();
        break;

      case 'response.audio.delta':
        // Receive audio chunk
        if (message.delta && this.outputAudioContext) {
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
            console.error('Error decoding OpenAI audio:', e);
          }
        }
        break;

      case 'response.audio_transcript.delta':
        // Agent transcript chunk
        if (message.delta) {
          this.currentOutputTranscription += message.delta;
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User transcript completed
        if (message.transcript) {
          this.currentInputTranscription = message.transcript;
        }
        break;

      case 'response.done':
        // Turn complete - send transcriptions
        if (this.callbacks?.onTranscription) {
          this.callbacks.onTranscription(
            this.currentInputTranscription,
            this.currentOutputTranscription
          );
        }
        this.currentInputTranscription = '';
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
            
            console.log('OpenAI tool call:', functionCall);
            const result = await this.callbacks.onToolCall(functionCall);
            
            // Send tool result back
            this.sendToolResult(message.call_id!, result);
          } catch (e) {
            console.error('Error handling OpenAI tool call:', e);
            this.sendToolResult(message.call_id!, { error: String(e) });
          }
        }
        break;

      case 'error':
        console.error('OpenAI error:', message.error);
        this.callbacks?.onError(new Error(message.error?.message || 'Unknown OpenAI error'));
        break;

      default:
        // Log unhandled message types for debugging
        if (message.type && !message.type.startsWith('response.audio')) {
          console.log('OpenAI message:', message.type);
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

