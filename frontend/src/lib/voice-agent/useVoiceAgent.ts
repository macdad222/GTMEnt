import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  VoiceProvider, 
  ConnectionState, 
  VoiceAgentConfig, 
  VoiceAgentCallbacks,
  IVoiceAgent,
  FunctionCall,
} from './base-types';
import { createVoiceAgent, DEFAULT_VOICES } from './providers';
import { voiceAgentTools, executeToolCall, ToolHandlers } from './tools';

/**
 * Transcript entry for conversation history
 */
export interface TranscriptEntry {
  id: string;
  speaker: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

/**
 * Voice agent state and controls
 */
export interface VoiceAgentState {
  connectionState: ConnectionState;
  isConnecting: boolean;
  isConnected: boolean;
  transcript: TranscriptEntry[];
  currentAudioBuffer: AudioBuffer | null;
  error: string | null;
  activeProvider: VoiceProvider | null;
  activeModel: string | null;
}

/**
 * Voice agent actions
 */
export interface VoiceAgentActions {
  connect: (provider?: VoiceProvider) => Promise<void>;
  disconnect: () => Promise<void>;
  toggle: (provider?: VoiceProvider) => Promise<void>;
  clearTranscript: () => void;
}

/**
 * API keys for each provider
 */
export interface ProviderApiKeys {
  gemini?: string;
  grok?: string;
  openai?: string;
}

/**
 * Voice names for each provider
 */
export interface ProviderVoices {
  gemini?: string;
  grok?: string;
  openai?: string;
}

/**
 * Props for the useVoiceAgent hook
 */
export interface UseVoiceAgentProps {
  /**
   * API keys for each provider
   */
  apiKeys: ProviderApiKeys;
  
  /**
   * Voice names for each provider
   */
  voices?: ProviderVoices;
  
  /**
   * Default provider to use (defaults to 'gemini')
   */
  defaultProvider?: VoiceProvider;
  
  /**
   * Tool handlers for data access
   */
  toolHandlers: ToolHandlers;
  
  /**
   * Custom system instruction (optional, uses default if not provided)
   */
  systemInstruction?: string;
}

/**
 * System instruction for the GTM Enterprise Strategy voice assistant
 */
const DEFAULT_SYSTEM_INSTRUCTION = `You are an expert GTM Strategy Advisor for Comcast Business Enterprise.

## Your Role
You are a world-class Go-to-Market strategist with deep expertise in:
- Enterprise B2B sales and growth strategies
- Telecommunications and connectivity markets (broadband, ethernet, SD-WAN, security, UCaaS)
- Competitive analysis and positioning
- Territory and capacity planning
- Product portfolio optimization

## Current Context
- Company: Comcast Business Enterprise Segment
- Current ARR: $4B at 14% growth
- Target: 15% annual growth for 5 years
- Key segments: Enterprise Strategic, Enterprise Core, Mid-Market, SMB+, SMB

## Product Portfolio
- Connectivity: Broadband, Ethernet, Fixed Wireless, Mobile
- Networking: SD-WAN, SASE, Managed Router
- Security: Managed Security, DDoS Protection
- Unified Communications: UCaaS, SIP Trunking
- Cloud: Direct Cloud On-Ramp, Multi-Cloud Networking

## Available Tools
You have access to real-time platform data through these tool categories:
1. **Company Metrics** - ARR, growth rates, bookings targets
2. **Customer Segments** - Segment definitions, analysis, opportunities  
3. **MSA Markets** - Geographic coverage, sales capacity, market sizing
4. **Competitive Intelligence** - Competitor analysis, positioning
5. **Products** - Portfolio, gaps, roadmap recommendations
6. **Market Intel** - TAM/SAM/SOM, industry trends
7. **Strategy** - Strategic recommendations, key insights

## Instructions
- ALWAYS use tools to fetch real data before answering questions
- Provide specific numbers and insights, not generic advice
- When comparing things, use the compare tools
- Proactively suggest related insights and follow-up questions
- Keep responses conversational but substantive (aim for 30-60 seconds spoken)
- If data is missing, acknowledge it and suggest what would help
- Speak naturally with numbers: "four billion dollars" not "$4B"
- Interpret data with context: don't just state facts, explain implications

## Your Personality
You're a trusted strategic advisor - confident, insightful, and proactive. Think of yourself as a senior partner at a top consulting firm who knows this business deeply. Be direct, offer opinions, and highlight opportunities or concerns even if not explicitly asked.`;

/**
 * React hook for managing multi-provider Voice Agent
 */
export function useVoiceAgent({
  apiKeys,
  voices = {},
  defaultProvider = 'gemini',
  toolHandlers,
  systemInstruction,
}: UseVoiceAgentProps): [VoiceAgentState, VoiceAgentActions] {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentAudioBuffer, setCurrentAudioBuffer] = useState<AudioBuffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<VoiceProvider | null>(null);
  const [activeModel, setActiveModel] = useState<string | null>(null);

  const agentRef = useRef<IVoiceAgent | null>(null);
  const toolHandlersRef = useRef<ToolHandlers>(toolHandlers);

  // Keep tool handlers up to date
  useEffect(() => {
    toolHandlersRef.current = toolHandlers;
  }, [toolHandlers]);

  /**
   * Add a transcript entry
   */
  const addTranscriptEntry = useCallback((speaker: 'user' | 'agent', text: string) => {
    if (!text.trim()) return;
    
    setTranscript(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        speaker,
        text: text.trim(),
        timestamp: new Date(),
      },
    ]);
  }, []);

  /**
   * Handle tool calls from the agent
   */
  const handleToolCall = useCallback(async (fc: FunctionCall): Promise<Record<string, unknown>> => {
    console.log('Voice agent tool call:', fc.name, fc.args);
    
    if (!fc.name) {
      return { error: 'Tool name not provided' };
    }
    
    try {
      const result = await executeToolCall(
        fc.name,
        fc.args || {},
        toolHandlersRef.current
      );
      console.log('Tool result:', result);
      return result;
    } catch (err) {
      console.error('Tool execution error:', err);
      return { error: String(err) };
    }
  }, []);

  /**
   * Get the API key for a provider
   */
  const getApiKey = useCallback((provider: VoiceProvider): string | undefined => {
    return apiKeys[provider];
  }, [apiKeys]);

  /**
   * Connect to the voice agent with the specified provider
   */
  const connect = useCallback(async (provider: VoiceProvider = defaultProvider) => {
    const apiKey = getApiKey(provider);
    
    if (!apiKey) {
      setError(`No API key configured for ${provider}`);
      setConnectionState(ConnectionState.ERROR);
      return;
    }

    // Disconnect existing agent if any
    if (agentRef.current) {
      await agentRef.current.disconnect();
    }

    setConnectionState(ConnectionState.CONNECTING);
    setError(null);
    setActiveProvider(provider);

    // Create the appropriate agent for this provider
    const agent = createVoiceAgent(provider);
    agentRef.current = agent;

    // Use configured voice or fall back to default
    const voiceName = voices[provider] || DEFAULT_VOICES[provider];
    
    const config: VoiceAgentConfig = {
      apiKey,
      systemInstruction: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
      voiceName,
      tools: voiceAgentTools,
    };

    const callbacks: VoiceAgentCallbacks = {
      onOpen: () => {
        console.log(`Voice agent connected (${provider})`);
        setConnectionState(ConnectionState.CONNECTED);
        setActiveModel(agent.getActiveModel());
        setError(null);
      },
      onClose: () => {
        console.log('Voice agent disconnected');
        setConnectionState(ConnectionState.DISCONNECTED);
        setActiveProvider(null);
        setActiveModel(null);
        agentRef.current = null;
      },
      onError: (e) => {
        console.error('Voice agent error:', e);
        const message = e instanceof Error ? e.message : 'Connection error';
        setError(message);
        setConnectionState(ConnectionState.ERROR);
      },
      onAudioData: (buffer) => {
        setCurrentAudioBuffer(buffer);
      },
      onTranscription: (userText, agentText) => {
        if (userText) addTranscriptEntry('user', userText);
        if (agentText) addTranscriptEntry('agent', agentText);
      },
      onToolCall: handleToolCall,
    };

    try {
      await agent.connect(config, callbacks);
    } catch (err) {
      console.error('Failed to connect:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setConnectionState(ConnectionState.ERROR);
      setActiveProvider(null);
      setActiveModel(null);
      agentRef.current = null;
    }
  }, [defaultProvider, getApiKey, handleToolCall, addTranscriptEntry, systemInstruction, voices]);

  /**
   * Disconnect from the voice agent
   */
  const disconnect = useCallback(async () => {
    if (agentRef.current) {
      await agentRef.current.disconnect();
      agentRef.current = null;
    }
    setConnectionState(ConnectionState.DISCONNECTED);
    setCurrentAudioBuffer(null);
    setActiveProvider(null);
    setActiveModel(null);
  }, []);

  /**
   * Toggle connection state
   */
  const toggle = useCallback(async (provider?: VoiceProvider) => {
    if (connectionState === ConnectionState.CONNECTED) {
      await disconnect();
    } else if (connectionState === ConnectionState.DISCONNECTED || connectionState === ConnectionState.ERROR) {
      await connect(provider || defaultProvider);
    }
  }, [connectionState, connect, disconnect, defaultProvider]);

  /**
   * Clear transcript history
   */
  const clearTranscript = useCallback(() => {
    setTranscript([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (agentRef.current) {
        agentRef.current.disconnect();
      }
    };
  }, []);

  const state: VoiceAgentState = {
    connectionState,
    isConnecting: connectionState === ConnectionState.CONNECTING,
    isConnected: connectionState === ConnectionState.CONNECTED,
    transcript,
    currentAudioBuffer,
    error,
    activeProvider,
    activeModel,
  };

  const actions: VoiceAgentActions = {
    connect,
    disconnect,
    toggle,
    clearTranscript,
  };

  return [state, actions];
}

