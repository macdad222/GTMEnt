import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid';
import { ConnectionState } from '../../lib/voice-agent';

interface VoiceAgentButtonProps {
  connectionState: ConnectionState;
  onClick: () => void;
  onPanelToggle: () => void;
  isPanelOpen: boolean;
}

/**
 * Floating circular button to activate/deactivate the voice agent
 */
export function VoiceAgentButton({
  connectionState,
  onClick,
  onPanelToggle,
  isPanelOpen,
}: VoiceAgentButtonProps) {
  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;
  const hasError = connectionState === ConnectionState.ERROR;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2">
      {/* Main button */}
      <button
        onClick={onClick}
        disabled={isConnecting}
        className={`
          relative w-14 h-14 rounded-full flex items-center justify-center
          transition-all duration-300 ease-out
          ${isConnected
            ? 'bg-cyan-400 text-slate-900 shadow-lg shadow-cyan-400/40'
            : hasError
            ? 'bg-red-500/20 text-red-400 border-2 border-red-500/50'
            : 'bg-slate-700 text-white border border-slate-600 hover:border-cyan-400/50 hover:bg-slate-600'
          }
          ${isConnecting ? 'cursor-wait' : 'cursor-pointer'}
          disabled:opacity-70
        `}
        style={{
          boxShadow: isConnected
            ? '0 0 30px rgba(0, 212, 255, 0.5), 0 0 60px rgba(0, 212, 255, 0.2)'
            : undefined,
        }}
        title={
          isConnected
            ? 'Click to disconnect'
            : isConnecting
            ? 'Connecting...'
            : 'Click to start voice assistant'
        }
      >
        {/* Pulsing ring when connected */}
        {isConnected && (
          <>
            <span className="absolute inset-0 rounded-full bg-cyan-400/30 animate-ping" />
            <span className="absolute inset-[-4px] rounded-full border-2 border-cyan-400/50 animate-pulse" />
          </>
        )}

        {/* Icon */}
        {isConnecting ? (
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : isConnected ? (
          <StopIcon className="w-6 h-6 relative z-10" />
        ) : (
          <MicrophoneIcon className="w-6 h-6" />
        )}
      </button>

      {/* Connecting indicator */}
      {isConnecting && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs font-medium text-amber-300">Connecting...</span>
        </div>
      )}

      {/* Panel toggle indicator (only when connected) */}
      {(isConnected || isPanelOpen) && (
        <button
          onClick={onPanelToggle}
          className={`
            text-[10px] px-2 py-1 rounded-full transition-all
            ${isPanelOpen
              ? 'bg-cyan-400/20 text-cyan-400'
              : 'bg-slate-700/80 text-slate-400 hover:text-white'
            }
          `}
        >
          {isPanelOpen ? 'Hide' : 'Show'} transcript
        </button>
      )}
    </div>
  );
}

