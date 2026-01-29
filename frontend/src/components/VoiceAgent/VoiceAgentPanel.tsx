import { useRef, useEffect } from 'react';
import { XMarkIcon, TrashIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { AudioVisualizer } from './AudioVisualizer';
import { ConnectionState, VoiceProvider } from '../../lib/voice-agent';
import type { TranscriptEntry } from '../../lib/voice-agent/useVoiceAgent';

const PROVIDER_LABELS: Record<VoiceProvider, string> = {
  gemini: 'Gemini',
  grok: 'Grok',
  openai: 'OpenAI',
};

interface VoiceAgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  connectionState: ConnectionState;
  transcript: TranscriptEntry[];
  currentAudioBuffer: AudioBuffer | null;
  error: string | null;
  activeProvider?: VoiceProvider | null;
  activeModel?: string | null;
  onClearTranscript: () => void;
}

/**
 * Expandable panel showing voice agent status and conversation transcript
 */
export function VoiceAgentPanel({
  isOpen,
  onClose,
  connectionState,
  transcript,
  currentAudioBuffer,
  error,
  activeProvider,
  activeModel,
  onClearTranscript,
}: VoiceAgentPanelProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new transcript entries arrive
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  if (!isOpen) return null;

  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;

  return (
    <div
      className="fixed bottom-24 right-6 w-80 max-h-[60vh] bg-slate-800/95 backdrop-blur-xl border border-slate-600 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-4 duration-300"
      style={{
        boxShadow: isConnected 
          ? '0 0 40px rgba(0, 212, 255, 0.15), 0 20px 40px rgba(0, 0, 0, 0.4)'
          : '0 20px 40px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-600 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected
                ? 'bg-green-400 shadow-lg shadow-green-400/50'
                : isConnecting
                ? 'bg-yellow-400 animate-pulse'
                : error
                ? 'bg-red-400'
                : 'bg-slate-500'
            }`}
          />
          <div>
            <span className="text-sm font-medium text-white">
              {isConnected
                ? 'GTM Advisor Active'
                : isConnecting
                ? 'Connecting...'
                : error
                ? 'Connection Error'
                : 'GTM Voice Advisor'}
            </span>
            {isConnected && activeProvider && (
              <p className="text-xs text-slate-400">
                {PROVIDER_LABELS[activeProvider]} • {activeModel}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {transcript.length > 0 && (
            <button
              onClick={onClearTranscript}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
              title="Clear transcript"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Audio Visualizer */}
      {isConnected && (
        <div className="px-4 py-3 border-b border-slate-700/50 flex justify-center bg-slate-900/30">
          <AudioVisualizer
            audioBuffer={currentAudioBuffer}
            isActive={isConnected}
            width={240}
            height={48}
            barCount={20}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
          <ExclamationCircleIcon className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto max-h-[40vh] p-4 space-y-3">
        {transcript.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">
              {isConnected
                ? 'Listening... Say something!'
                : 'Click the microphone to start'}
            </p>
            {isConnected && (
              <p className="text-slate-600 text-xs mt-2">
                Try: "What's our ARR?" or "Compare enterprise vs mid-market"
              </p>
            )}
          </div>
        ) : (
          transcript.map((entry) => (
            <div
              key={entry.id}
              className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                  entry.speaker === 'user'
                    ? 'bg-cyan-500/20 text-cyan-300 rounded-br-sm'
                    : 'bg-slate-700 text-slate-200 rounded-bl-sm'
                }`}
              >
                {entry.text}
              </div>
            </div>
          ))
        )}
        <div ref={transcriptEndRef} />
      </div>

      {/* Footer hint */}
      {isConnected && (
        <div className="px-4 py-2 border-t border-slate-700/50 bg-slate-900/30">
          <p className="text-[10px] text-slate-500 text-center">
            Press <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-400">V</kbd> to toggle • Speak naturally to interact
          </p>
        </div>
      )}
    </div>
  );
}

