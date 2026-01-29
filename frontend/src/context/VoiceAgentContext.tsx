import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { VoiceProvider, ProviderApiKeys, ToolHandlers } from '../lib/voice-agent';
import { useCBConfig, useSegments, useProducts, useMSAs } from './CBConfigContext';

interface ProviderVoices {
  [provider: string]: string;
}

/**
 * Normalize tier input to match backend format (tier_e1, tier_e2, etc.)
 * Handles various aliases like "E1", "Enterprise Mid-Market", etc.
 */
function normalizeTierInput(input: string): string {
  const normalized = input.toLowerCase().trim();
  
  const tierMap: Record<string, string> = {
    // E1 - Enterprise Mid-Market
    'e1': 'tier_e1',
    'e-1': 'tier_e1',
    'tier_e1': 'tier_e1',
    'enterprise mid-market': 'tier_e1',
    'enterprise mid market': 'tier_e1',
    'enterprise midmarket': 'tier_e1',
    'mid-market': 'tier_e1',
    'mid market': 'tier_e1',
    'midmarket': 'tier_e1',
    
    // E2 - Enterprise Small
    'e2': 'tier_e2',
    'e-2': 'tier_e2',
    'tier_e2': 'tier_e2',
    'enterprise small': 'tier_e2',
    'small': 'tier_e2',
    
    // E3 - Enterprise Medium
    'e3': 'tier_e3',
    'e-3': 'tier_e3',
    'tier_e3': 'tier_e3',
    'enterprise medium': 'tier_e3',
    'medium': 'tier_e3',
    
    // E4 - Enterprise Large
    'e4': 'tier_e4',
    'e-4': 'tier_e4',
    'tier_e4': 'tier_e4',
    'enterprise large': 'tier_e4',
    'large': 'tier_e4',
    
    // E5 - Enterprise X-Large
    'e5': 'tier_e5',
    'e-5': 'tier_e5',
    'tier_e5': 'tier_e5',
    'enterprise x-large': 'tier_e5',
    'enterprise xlarge': 'tier_e5',
    'x-large': 'tier_e5',
    'xlarge': 'tier_e5',
    'strategic': 'tier_e5',
  };
  
  return tierMap[normalized] || normalized;
}

interface VoiceAgentContextType {
  // API Keys
  apiKeys: ProviderApiKeys;
  voices: ProviderVoices;
  defaultProvider: VoiceProvider;
  isLoading: boolean;
  
  // Tool handlers for data access
  toolHandlers: ToolHandlers;
  
  // Configuration
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  
  // Refresh
  refreshApiKeys: () => Promise<void>;
}

const VoiceAgentContext = createContext<VoiceAgentContextType | null>(null);

interface VoiceAgentProviderProps {
  children: ReactNode;
}

/**
 * Provider for Voice Agent configuration and data access
 */
export function VoiceAgentProvider({ children }: VoiceAgentProviderProps) {
  const [apiKeys, setApiKeys] = useState<ProviderApiKeys>({});
  const [voices, setVoices] = useState<ProviderVoices>({});
  const [defaultProvider, setDefaultProvider] = useState<VoiceProvider>('gemini');
  const [isLoading, setIsLoading] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Get data from CB Config context
  const { config: cbConfig, dashboardData } = useCBConfig();
  const { segments, companyMetrics } = useSegments();
  const { products } = useProducts();
  const { msaList: msas } = useMSAs();

  /**
   * Fetch API keys and voice settings from the backend
   */
  const refreshApiKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch voice-specific API keys from the dedicated endpoint
      const response = await fetch('/api/admin/voice-api-keys');
      if (!response.ok) throw new Error('Failed to fetch voice API keys');
      
      const data = await response.json();
      const keys: ProviderApiKeys = {};
      const providerVoices: ProviderVoices = {};
      
      // Extract API keys from voice providers
      if (data.api_keys) {
        if (data.api_keys.gemini) keys.gemini = data.api_keys.gemini;
        if (data.api_keys.grok) keys.grok = data.api_keys.grok;
        if (data.api_keys.openai) keys.openai = data.api_keys.openai;
      }
      
      // Extract voice settings
      if (data.voices) {
        if (data.voices.gemini) providerVoices.gemini = data.voices.gemini;
        if (data.voices.grok) providerVoices.grok = data.voices.grok;
        if (data.voices.openai) providerVoices.openai = data.voices.openai;
      }
      
      setApiKeys(keys);
      setVoices(providerVoices);
      
      // Set default provider from backend or based on what's available
      if (data.default_provider) {
        setDefaultProvider(data.default_provider as VoiceProvider);
      } else if (keys.gemini) {
        setDefaultProvider('gemini');
      } else if (keys.grok) {
        setDefaultProvider('grok');
      } else if (keys.openai) {
        setDefaultProvider('openai');
      }
    } catch (error) {
      console.error('Failed to fetch voice API keys:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch API keys on mount
  useEffect(() => {
    refreshApiKeys();
  }, [refreshApiKeys]);

  /**
   * Tool handlers for voice agent data access
   */
  const toolHandlers: ToolHandlers = useMemo(() => ({
    getCompanyMetrics: () => {
      return companyMetrics || null;
    },
    
    getGrowthTrajectory: () => {
      return dashboardData?.growth_data || null;
    },
    
    getSegments: () => {
      return segments;
    },
    
    getSegmentDetails: async (tier: string) => {
      // Normalize tier input to match backend format (tier_e1, tier_e2, etc.)
      const normalizedTier = normalizeTierInput(tier);
      
      // Find segment in local data using normalized tier
      const segment = segments?.find(s => 
        s.tier?.toLowerCase() === normalizedTier.toLowerCase() ||
        s.tier?.toLowerCase() === tier.toLowerCase() ||
        s.label?.toLowerCase().includes(tier.toLowerCase())
      );
      
      // Fetch the AI-generated intel for this segment
      try {
        const segmentTier = segment?.tier || normalizedTier;
        const intelResponse = await fetch(`/api/cb-config/segments/${segmentTier}/intel`);
        if (intelResponse.ok) {
          const intelData = await intelResponse.json();
          
          // If intel exists, return it with segment data
          if (intelData.status === 'generated' && intelData.intel) {
            return {
              ...(segment || { tier: segmentTier }),
              ai_analysis: intelData.intel,
            };
          }
        }
      } catch (error) {
        console.error('Error fetching segment intel:', error);
      }
      
      // Return segment without intel, or null if no segment found
      return segment || null;
    },
    
    getMSAs: () => {
      return msas;
    },
    
    getMSADetails: async (name: string) => {
      try {
        // Fetch detailed MSA data by name
        const response = await fetch(`/api/msas/by-name/${encodeURIComponent(name)}`);
        if (!response.ok) {
          // Fallback to local data
          const msa = msas?.find(m => 
            m.name?.toLowerCase().includes(name.toLowerCase()) ||
            m.short_name?.toLowerCase().includes(name.toLowerCase())
          );
          return msa || null;
        }
        const msaData = await response.json();
        
        // Also try to fetch intel for this MSA
        try {
          const intelResponse = await fetch(`/api/msas/${msaData.code}/intel`);
          if (intelResponse.ok) {
            const intel = await intelResponse.json();
            return { ...msaData, ai_analysis: intel };
          }
        } catch {
          // Continue without intel
        }
        
        return msaData;
      } catch {
        // Fallback to local data
        const msa = msas?.find(m => 
          m.name?.toLowerCase().includes(name.toLowerCase()) ||
          m.short_name?.toLowerCase().includes(name.toLowerCase())
        );
        return msa || null;
      }
    },
    
    getCompetitors: async (category?: string) => {
      try {
        const url = category 
          ? `/api/competitive/competitors?category=${encodeURIComponent(category)}`
          : '/api/competitive/competitors';
        const response = await fetch(url);
        if (!response.ok) return null;
        return await response.json();
      } catch {
        return null;
      }
    },
    
    getCompetitorAnalysis: async (name: string) => {
      try {
        // First get all analyses
        const response = await fetch('/api/competitive/analyses');
        if (!response.ok) return null;
        const analyses = await response.json();
        
        // Find analysis for this competitor
        const analysis = analyses.find((a: { competitors_analyzed?: string[] }) => 
          a.competitors_analyzed?.some((c: string) => 
            c.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(c.toLowerCase())
          )
        );
        
        if (!analysis) {
          return { error: `No analysis found for ${name}. Try running a competitive analysis first.` };
        }
        
        // Fetch full analysis details
        const detailsResponse = await fetch(`/api/competitive/analyses/${analysis.id}`);
        if (!detailsResponse.ok) return analysis; // Return summary if details fail
        return await detailsResponse.json();
      } catch {
        return null;
      }
    },
    
    getProducts: (category?: string) => {
      if (!products) return null;
      if (category) {
        return products.filter(p => 
          p.category?.toLowerCase().includes(category.toLowerCase())
        );
      }
      return products;
    },
    
    getProductAnalysis: async (name: string) => {
      try {
        // Get the full product intel (includes competitive analysis and recommendations)
        const intelResponse = await fetch('/api/product-roadmap/intel');
        if (!intelResponse.ok) return null;
        const intel = await intelResponse.json();
        
        // If a specific product name is requested, try to find it in the portfolio
        if (name) {
          const portfolioResponse = await fetch('/api/product-roadmap/portfolio');
          if (portfolioResponse.ok) {
            const portfolio = await portfolioResponse.json();
            const product = portfolio.products?.find((p: { name?: string; id?: string }) => 
              p.name?.toLowerCase().includes(name.toLowerCase()) ||
              p.id?.toLowerCase().includes(name.toLowerCase())
            );
            if (product) {
              return { product, intel_summary: intel?.executive_summary, recommendations: intel?.recommendations };
            }
          }
        }
        
        return intel;
      } catch {
        return null;
      }
    },
    
    getMarketData: async () => {
      try {
        // Get the LLM-generated market research
        const response = await fetch('/api/market-intel/research');
        if (!response.ok) return null;
        return await response.json();
      } catch {
        return null;
      }
    },
    
    getMarketTrends: async (category?: string) => {
      try {
        // Get summaries for market trends
        const summariesResponse = await fetch('/api/market-intel/summaries');
        if (!summariesResponse.ok) return null;
        const summaries = await summariesResponse.json();
        
        // If category specified, filter by category
        if (category && Array.isArray(summaries)) {
          return summaries.filter((s: { category?: string }) => 
            s.category?.toLowerCase().includes(category.toLowerCase())
          );
        }
        return summaries;
      } catch {
        return null;
      }
    },
    
    getStrategySummary: async () => {
      try {
        const response = await fetch('/api/strategy-report/latest');
        if (!response.ok) return null;
        const data = await response.json();
        return data.executive_summary || null;
      } catch {
        return null;
      }
    },
    
    getKeyInsights: async (count?: number) => {
      try {
        const response = await fetch('/api/strategy-report/latest');
        if (!response.ok) return null;
        const data = await response.json();
        const insights = data.key_insights || [];
        return count ? insights.slice(0, count) : insights;
      } catch {
        return null;
      }
    },
    
    getRecommendations: async () => {
      try {
        const response = await fetch('/api/strategy-report/latest');
        if (!response.ok) return null;
        const data = await response.json();
        return data.strategic_recommendations || null;
      } catch {
        return null;
      }
    },
    
    searchInsights: async (query: string) => {
      try {
        const response = await fetch(`/api/insights?search=${encodeURIComponent(query)}`);
        if (!response.ok) return null;
        return await response.json();
      } catch {
        return null;
      }
    },
    
    getStarredInsights: async () => {
      try {
        const response = await fetch('/api/insights?starred=true');
        if (!response.ok) return null;
        return await response.json();
      } catch {
        return null;
      }
    },
    
    getSalesCapacity: async (msaName?: string) => {
      try {
        const url = msaName 
          ? `/api/cb-config/sales-capacity?msa=${encodeURIComponent(msaName)}`
          : '/api/cb-config/sales-capacity';
        const response = await fetch(url);
        if (!response.ok) return null;
        return await response.json();
      } catch {
        return null;
      }
    },
  }), [cbConfig, companyMetrics, dashboardData, segments, products, msas]);

  const value: VoiceAgentContextType = {
    apiKeys,
    voices,
    defaultProvider,
    isLoading,
    toolHandlers,
    voiceEnabled,
    setVoiceEnabled,
    refreshApiKeys,
  };

  return (
    <VoiceAgentContext.Provider value={value}>
      {children}
    </VoiceAgentContext.Provider>
  );
}

/**
 * Hook to access voice agent context
 */
export function useVoiceAgentContext() {
  const context = useContext(VoiceAgentContext);
  if (!context) {
    throw new Error('useVoiceAgentContext must be used within a VoiceAgentProvider');
  }
  return context;
}

