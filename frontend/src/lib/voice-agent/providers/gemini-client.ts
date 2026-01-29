/**
 * Gemini Voice Agent - Implementation for Google's Gemini Multimodal Live API
 */

import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { 
  IVoiceAgent, 
  VoiceAgentConfig, 
  VoiceAgentCallbacks,
  VoiceProvider,
  FunctionCall 
} from '../base-types';
import { 
  createPcmBlobForGemini, 
  decodeAudioData, 
  PCM_SAMPLE_RATE, 
  OUTPUT_SAMPLE_RATE, 
  base64ToUint8Array 
} from '../audio-utils';
import { toGeminiTools } from '../tool-adapter';

// Model configuration with fallback
const PRIMARY_MODEL = 'gemini-2.5-flash-preview-native-audio-dialog';
const FALLBACK_MODEL = 'gemini-2.0-flash-exp';

// Infer the session type from the connect method
type LiveSession = Awaited<ReturnType<InstanceType<typeof GoogleGenAI>['live']['connect']>>;

/**
 * GeminiVoiceAgent - Google's Gemini Multimodal Live API implementation
 */
export class GeminiVoiceAgent implements IVoiceAgent {
  public readonly provider: VoiceProvider = 'gemini';
  
  private ai: GoogleGenAI | null = null;
  private sessionPromise: Promise<LiveSession> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  
  // Transcription state
  private currentInputTranscription = '';
  private currentOutputTranscription = '';
  
  // Track which model is being used
  private currentModel: string = PRIMARY_MODEL;

  constructor() {}
  
  /**
   * Get the currently active model name
   */
  public getActiveModel(): string {
    return this.currentModel;
  }

  /**
   * Connect to the Gemini Live API and start the audio pipeline
   */
  public async connect(config: VoiceAgentConfig, callbacks: VoiceAgentCallbacks): Promise<void> {
    // Initialize the Gemini client
    this.ai = new GoogleGenAI({ apiKey: config.apiKey });

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

    // Convert tools to Gemini format
    const toolsConfig = config.tools && config.tools.length > 0 
      ? [{ functionDeclarations: toGeminiTools(config.tools) }] 
      : undefined;

    // Determine which model to use
    const modelToUse = config.model || PRIMARY_MODEL;
    
    // Try to connect with primary model, fall back if needed
    try {
      await this.connectToModel(modelToUse, config, callbacks, stream, toolsConfig);
      this.currentModel = modelToUse;
      console.log(`✓ Gemini connected using model: ${this.currentModel}`);
    } catch (primaryError) {
      console.warn(`⚠ Failed to connect with ${modelToUse}, trying fallback model ${FALLBACK_MODEL}...`, primaryError);
      
      if (modelToUse !== FALLBACK_MODEL) {
        try {
          await this.connectToModel(FALLBACK_MODEL, config, callbacks, stream, toolsConfig);
          this.currentModel = FALLBACK_MODEL;
          console.log(`✓ Gemini connected using fallback model: ${this.currentModel}`);
        } catch (fallbackError) {
          console.error('✗ Both primary and fallback models failed:', fallbackError);
          throw new Error(`Failed to connect to Gemini Live API. Primary (${modelToUse}) and fallback (${FALLBACK_MODEL}) models both failed.`);
        }
      } else {
        throw primaryError;
      }
    }
  }

  private connectToModel(
    model: string,
    config: VoiceAgentConfig,
    callbacks: VoiceAgentCallbacks,
    stream: MediaStream,
    toolsConfig: unknown
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let connectionTimeout: ReturnType<typeof setTimeout>;
      let hasResolved = false;
      
      connectionTimeout = setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          reject(new Error(`Connection timeout for model ${model}`));
        }
      }, 10000);
      
      console.log(`Gemini: Attempting to connect to model: ${model}`);
      
      this.sessionPromise = this.ai!.live.connect({
        model,
        callbacks: {
          onopen: () => {
            if (hasResolved) return;
            hasResolved = true;
            clearTimeout(connectionTimeout);
            console.log(`Gemini Live API Connected (${model})`);
            this.setupAudioInput(stream);
            callbacks.onOpen();
            resolve();
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Tool Calls
            if (message.toolCall && message.toolCall.functionCalls && callbacks.onToolCall) {
              console.log('Gemini tool call received:', message.toolCall);
              for (const fc of message.toolCall.functionCalls) {
                try {
                  // Convert to our generic FunctionCall format
                  const genericFc: FunctionCall = {
                    id: fc.id,
                    name: fc.name || '',
                    args: (fc.args || {}) as Record<string, unknown>,
                  };
                  
                  const result = await callbacks.onToolCall(genericFc);
                  
                  this.sessionPromise?.then((session) => {
                    session.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result },
                      },
                    });
                  });
                } catch (error) {
                  console.error(`Error executing tool ${fc.name}:`, error);
                  this.sessionPromise?.then((session) => {
                    session.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { error: String(error) },
                      },
                    });
                  });
                }
              }
            }

            // Handle Audio Output
            const parts = message.serverContent?.modelTurn?.parts;
            const base64Audio = parts?.[0]?.inlineData?.data;
            if (base64Audio && this.outputAudioContext) {
              this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
              
              try {
                const bytes = base64ToUint8Array(base64Audio);
                const audioBuffer = await decodeAudioData(bytes, this.outputAudioContext, OUTPUT_SAMPLE_RATE);
                
                const source = this.outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.outputNode!);
                
                source.addEventListener('ended', () => {
                  this.activeSources.delete(source);
                });

                source.start(this.nextStartTime);
                this.nextStartTime += audioBuffer.duration;
                this.activeSources.add(source);
                
                callbacks.onAudioData(audioBuffer);
              } catch (e) {
                console.error("Error decoding audio", e);
              }
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              this.stopAllAudio();
              this.currentOutputTranscription = '';
            }

            // Handle Transcription
            if (message.serverContent?.outputTranscription?.text) {
              this.currentOutputTranscription += message.serverContent.outputTranscription.text;
            }
            if (message.serverContent?.inputTranscription?.text) {
              this.currentInputTranscription += message.serverContent.inputTranscription.text;
            }
            
            if (message.serverContent?.turnComplete) {
              if (callbacks.onTranscription) {
                callbacks.onTranscription(this.currentInputTranscription, this.currentOutputTranscription);
              }
              this.currentInputTranscription = '';
              this.currentOutputTranscription = '';
            }
          },
          onclose: (e) => {
            console.log('Gemini Session Closed');
            callbacks.onClose(e);
            this.cleanup();
          },
          onerror: (e) => {
            console.error('Gemini Session Error', e);
            if (!hasResolved) {
              hasResolved = true;
              clearTimeout(connectionTimeout);
              reject(e);
            }
            callbacks.onError(e);
            this.cleanup();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          // @ts-expect-error - tools type compatibility with Google SDK
          tools: toolsConfig,
          systemInstruction: config.systemInstruction,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: config.voiceName || 'Kore'
              }
            }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        }
      });
    });
  }

  private setupAudioInput(stream: MediaStream): void {
    if (!this.inputAudioContext) return;
    
    this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = createPcmBlobForGemini(inputData);
      
      this.sessionPromise?.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob as Parameters<typeof session.sendRealtimeInput>[0]['media'] });
      });
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

  /**
   * Disconnect from the Gemini Live API and clean up resources
   */
  public async disconnect(): Promise<void> {
    if (this.sessionPromise) {
      this.sessionPromise = null;
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.processor?.disconnect();
    this.inputSource?.disconnect();
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    this.stopAllAudio();
    this.sessionPromise = null;
  }
}

