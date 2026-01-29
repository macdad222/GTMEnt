/**
 * Provider-agnostic audio utilities for voice agents
 */

export const PCM_SAMPLE_RATE = 16000;
export const OUTPUT_SAMPLE_RATE = 24000;

/**
 * Generic audio blob type (provider-agnostic)
 */
export interface AudioBlob {
  data: string; // Base64 encoded audio
  mimeType: string;
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Float32Array audio samples to Int16Array
 */
export function floatTo16BitPCM(float32Array: Float32Array): Int16Array {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16;
}

/**
 * Decode PCM Int16 audio data to AudioBuffer
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = OUTPUT_SAMPLE_RATE,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 to Float32 [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Create a PCM audio blob for Gemini (uses their Blob format)
 */
export function createPcmBlobForGemini(data: Float32Array): AudioBlob {
  const int16 = floatTo16BitPCM(data);
  return {
    data: arrayBufferToBase64(int16.buffer as ArrayBuffer),
    mimeType: `audio/pcm;rate=${PCM_SAMPLE_RATE}`,
  };
}

/**
 * Create base64 encoded PCM audio for Grok/OpenAI
 */
export function createBase64PCM(data: Float32Array): string {
  const int16 = floatTo16BitPCM(data);
  return arrayBufferToBase64(int16.buffer as ArrayBuffer);
}

/**
 * Resample audio data to a different sample rate
 * Uses linear interpolation for simplicity
 */
export function resampleAudio(
  inputData: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return inputData;
  }

  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.floor(inputData.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1);
    const fraction = srcIndex - srcIndexFloor;
    
    output[i] = inputData[srcIndexFloor] * (1 - fraction) + inputData[srcIndexCeil] * fraction;
  }

  return output;
}

