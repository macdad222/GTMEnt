import { useState, useEffect, useCallback, useMemo } from 'react';
import { VoiceAgentButton } from './VoiceAgentButton';
import { VoiceAgentPanel } from './VoiceAgentPanel';
import { useVoiceAgent, type ProviderApiKeys, type ProviderVoices } from '../../lib/voice-agent/useVoiceAgent';
import { VoiceProvider, ToolHandlers } from '../../lib/voice-agent';

interface VoiceAgentProps {
  apiKeys: ProviderApiKeys;
  voices?: ProviderVoices;
  defaultProvider?: VoiceProvider;
  toolHandlers: ToolHandlers;
  systemInstruction?: string;
}

/**
 * Main Voice Agent component with floating button and expandable panel
 * Supports multiple AI providers: Gemini, Grok, OpenAI
 */
export function VoiceAgent({
  apiKeys,
  voices = {},
  defaultProvider = 'gemini',
  toolHandlers,
  systemInstruction,
}: VoiceAgentProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Memoize tool handlers to prevent unnecessary re-renders
  const memoizedToolHandlers = useMemo(() => toolHandlers, [toolHandlers]);

  const [state, actions] = useVoiceAgent({
    apiKeys,
    voices,
    defaultProvider,
    toolHandlers: memoizedToolHandlers,
    systemInstruction,
  });

  // Auto-open panel when connected
  useEffect(() => {
    if (state.isConnected && !isPanelOpen) {
      setIsPanelOpen(true);
    }
  }, [state.isConnected, isPanelOpen]);

  // Keyboard shortcut: V to toggle voice agent
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key.toLowerCase() === 'v' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        actions.toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);

  const handleButtonClick = useCallback(() => {
    actions.toggle();
  }, [actions]);

  const handlePanelToggle = useCallback(() => {
    setIsPanelOpen((prev) => !prev);
  }, []);

  const handlePanelClose = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  // Check if we have at least one API key configured
  const hasAnyApiKey = apiKeys.gemini || apiKeys.grok || apiKeys.openai;
  
  // Don't render if no API keys are configured
  if (!hasAnyApiKey) {
    return null;
  }

  return (
    <>
      <VoiceAgentButton
        connectionState={state.connectionState}
        onClick={handleButtonClick}
        onPanelToggle={handlePanelToggle}
        isPanelOpen={isPanelOpen}
      />
      <VoiceAgentPanel
        isOpen={isPanelOpen}
        onClose={handlePanelClose}
        connectionState={state.connectionState}
        transcript={state.transcript}
        currentAudioBuffer={state.currentAudioBuffer}
        error={state.error}
        activeProvider={state.activeProvider}
        activeModel={state.activeModel}
        onClearTranscript={actions.clearTranscript}
      />
    </>
  );
}

