import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { VoiceAgent } from './VoiceAgent';
import { useVoiceAgentContext } from '../context/VoiceAgentContext';
import { useAuth } from '../context/AuthContext';
import { useCBConfig, useSegments, useProducts, useMSAs } from '../context/CBConfigContext';

/**
 * Global Voice Agent component that renders on all protected pages
 * Preloads platform data into the voice agent's context for better responses
 */
export function GlobalVoiceAgent() {
  const location = useLocation();
  const { user } = useAuth();
  const { apiKeys, voices, defaultProvider, isLoading, toolHandlers, voiceEnabled } = useVoiceAgentContext();
  
  // Get all platform data for preloading into context
  const { dashboardData } = useCBConfig();
  const { segments, companyMetrics } = useSegments();
  const { products } = useProducts();
  const { msaList: msas } = useMSAs();

  // Build the system instruction with preloaded data
  const systemInstruction = useMemo(() => {
    return buildSystemInstruction(location.pathname, {
      companyMetrics,
      segments,
      products,
      msas,
      growthData: dashboardData?.growth_data,
    });
  }, [location.pathname, companyMetrics, segments, products, msas, dashboardData]);

  // Don't render on login page or if not authenticated
  if (location.pathname === '/login' || !user) {
    return null;
  }

  // Don't render while loading or if voice is disabled
  if (isLoading || !voiceEnabled) {
    return null;
  }

  // Don't render if no API keys are configured
  const hasAnyKey = apiKeys.gemini || apiKeys.grok || apiKeys.openai;
  if (!hasAnyKey) {
    return null;
  }

  return (
    <VoiceAgent
      apiKeys={apiKeys}
      voices={voices}
      defaultProvider={defaultProvider}
      toolHandlers={toolHandlers}
      systemInstruction={systemInstruction}
    />
  );
}

/**
 * Format currency for voice (spoken format)
 */
function formatCurrencyForVoice(value: number | undefined): string {
  if (!value) return 'not available';
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} billion dollars`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(0)} million dollars`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)} thousand dollars`;
  }
  return `${value} dollars`;
}

/**
 * Format percentage for voice
 */
function formatPercentForVoice(value: number | undefined): string {
  if (value === undefined || value === null) return 'not available';
  return `${value.toFixed(1)} percent`;
}

interface PlatformData {
  companyMetrics?: {
    enterprise_arr?: number;
    growth_target_pct?: number;
    growth_rate_actual?: number;
    total_accounts?: number;
    bookings_target_2026_mrr?: number;
    bookings_target_2027_mrr?: number;
    bookings_target_2028_mrr?: number;
  } | null;
  segments?: Array<{
    tier?: string;
    label?: string;
    name?: string;
    account_count?: number;
    arr_contribution_pct?: number;
    mrr_range_low?: number;
    mrr_range_high?: number;
    market_intel?: {
      summary?: string;
      key_insights?: string[];
      growth_opportunities?: string[];
      recommended_actions?: string[];
    };
  }> | null;
  products?: Array<{
    name?: string;
    category?: string;
    market_position?: string;
    competitive_rating?: number;
  }> | null;
  msas?: Array<{
    name?: string;
    short_name?: string;
    tam_billions?: number;
    sam_billions?: number;
    comcast_fiber_available?: boolean;
  }> | null;
  growthData?: Array<{
    period?: string;
    target?: number;
    actual?: number;
  }> | null;
}

/**
 * Build streamlined system instruction with minimal preloaded data for faster connection
 * Detailed data is fetched on-demand via tools
 */
function buildSystemInstruction(pathname: string, data: PlatformData): string {
  const { companyMetrics, segments, msas } = data;

  // Build compact company metrics section
  let companySection = '';
  if (companyMetrics) {
    companySection = `
## COMPANY SNAPSHOT
- ARR: ${formatCurrencyForVoice(companyMetrics.enterprise_arr)} at ${formatPercentForVoice(companyMetrics.growth_rate_actual)} growth
- Target: ${formatPercentForVoice(companyMetrics.growth_target_pct)} growth
- Accounts: ${companyMetrics.total_accounts?.toLocaleString() || 'N/A'}`;
  }

  // Build compact segments section (names only, no AI analysis)
  let segmentsSection = '';
  if (segments && segments.length > 0) {
    segmentsSection = `
## SEGMENTS (use get_segment_details tool for full analysis)
${segments.map((s, i) => {
  const tierLabel = s.tier || s.label || `Tier ${i + 1}`;
  const tierAlias = getTierAlias(tierLabel);
  return `- ${tierAlias || tierLabel}: ${s.account_count?.toLocaleString() || 'N/A'} accounts, ${formatPercentForVoice(s.arr_contribution_pct)} of ARR`;
}).join('\n')}`;
  }

  // Build compact MSAs section (top 5 only)
  let msasSection = '';
  if (msas && msas.length > 0) {
    const topMSAs = msas.slice(0, 5);
    msasSection = `
## TOP MARKETS (use get_msa_details tool for specifics)
${topMSAs.map(m => `- ${m.short_name || m.name}`).join(', ')}`;
  }

  // Get section-specific context
  const sectionContext = getSectionSpecificContext(pathname);

  return `You are a GTM Strategy Advisor for Comcast Business Enterprise.

## CRITICAL: DATA SOURCE RULES
**ONLY use data from the platform tools. NEVER use outside knowledge or make up numbers.**
1. For market data/TAM/SAM: Call get_market_data tool FIRST
2. For market trends: Call get_market_trends tool FIRST  
3. For competitor info: Call get_competitor_analysis tool FIRST
4. For segment intel: Call get_segment_details tool FIRST
5. For MSA/city data: Call get_msa_details tool FIRST
6. For product info/roadmap: Call get_product_analysis or get_products tool FIRST
7. For strategy/recommendations: Call get_strategy_summary, get_key_insights, or get_recommendations tool FIRST
8. If a tool returns "not available" or error, say "I don't have that data yet - please run the LLM analysis for that section."
9. NEVER cite external sources like Gartner, IDC, etc. unless they appear in tool results
10. ALL numbers and insights MUST come from tool results - not your training data

## RESPONSE RULES
1. MAX 2-3 sentences per response
2. Lead with ONE key number or insight FROM THE TOOL RESULT
3. End with "Want details?" or "Should I elaborate?"
4. NEVER give long explanations unless explicitly asked
5. When using tools, summarize the result in ONE sentence

## TOOLS - ALWAYS CALL THESE FOR DATA
- get_market_data: REQUIRED for market size, TAM, SAM, industry stats
- get_market_trends: REQUIRED for trends, growth rates, market dynamics
- get_competitor_analysis: REQUIRED for competitor questions (AT&T, Verizon, etc.)
- get_segment_details: For segment AI analysis (E1-E5)
- get_msa_details: For city/MSA market data and sales capacity
- get_product_analysis: For product portfolio and competitive positioning
- get_strategy_summary: For executive strategy summary from Strategy Report
- get_key_insights: For strategic insights from Strategy Report
- get_recommendations: For strategic recommendations from Strategy Report
${companySection}
${segmentsSection}
${msasSection}

## SEGMENTS
E1=Mid-Market, E2=Small, E3=Medium, E4=Large, E5=X-Large

${sectionContext}

## STYLE
Be direct like a busy executive. No fluff. Data-driven answers only.`;
}

/**
 * Get tier alias for display
 */
function getTierAlias(tier: string): string | null {
  const normalized = tier.toLowerCase();
  if (normalized === 'tier_e1' || normalized.includes('e1')) return 'E1 - Enterprise Mid-Market';
  if (normalized === 'tier_e2' || normalized.includes('e2')) return 'E2 - Enterprise Small';
  if (normalized === 'tier_e3' || normalized.includes('e3')) return 'E3 - Enterprise Medium';
  if (normalized === 'tier_e4' || normalized.includes('e4')) return 'E4 - Enterprise Large';
  if (normalized === 'tier_e5' || normalized.includes('e5')) return 'E5 - Enterprise X-Large';
  return null;
}

/**
 * Get section-specific context additions
 */
function getSectionSpecificContext(pathname: string): string {
  if (pathname.startsWith('/dashboard')) {
    return `## PAGE: Dashboard - Focus on KPIs and growth. Use get_growth_trajectory for trends.`;
  }

  if (pathname.startsWith('/segments')) {
    return `## PAGE: Segments - Use get_segment_details for full AI analysis of any segment.`;
  }

  if (pathname.startsWith('/msa')) {
    return `## PAGE: MSA Markets - Use get_msa_details for specific city data.`;
  }

  if (pathname.startsWith('/competitive')) {
    return `## PAGE: Competitive - Use get_competitor_analysis for AI analysis of any competitor.`;
  }

  if (pathname.startsWith('/product-roadmap')) {
    return `## PAGE: Products - Use get_product_analysis or get_roadmap_recommendations for details.`;
  }

  if (pathname.startsWith('/strategy-report')) {
    return `## PAGE: Strategy - Use get_strategy_summary or get_key_insights for analysis.`;
  }

  if (pathname.startsWith('/market-intel')) {
    return `## PAGE: Market Intelligence - ALWAYS use get_market_data and get_market_trends for any market questions. This contains the LLM-generated market research. Do NOT use general knowledge.`;
  }

  return `## PAGE: General - For ANY market data questions, ALWAYS call get_market_data first.`;
}
