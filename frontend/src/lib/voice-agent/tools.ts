/**
 * GTM Enterprise Platform - Voice Agent Tools
 * 
 * Provider-agnostic tool declarations for the voice agent to query platform data
 */

import { ToolDeclaration } from './base-types';

/**
 * Tool declarations for GTM Enterprise voice agent
 */
export const voiceAgentTools: ToolDeclaration[] = [
  // Dashboard Tools
  {
    name: 'get_company_metrics',
    description: 'Get the current company metrics including ARR, growth rate, targets, and bookings. Use this when the user asks about company performance, revenue, or overall business metrics.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_growth_trajectory',
    description: 'Get the quarterly growth trajectory data showing actual vs target performance. Use this when the user asks about growth trends, quarterly performance, or projections.',
    parameters: {
      type: 'object',
      properties: {
        quarters: {
          type: 'number',
          description: 'Optional: Number of quarters to return (default: all available)',
        },
      },
      required: [],
    },
  },
  
  // Segment Tools
  {
    name: 'get_segments',
    description: 'Get all customer segments with their definitions, account counts, and ARR contribution. Use this when the user asks about customer segments, segment breakdown, or segment performance.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_segment_details',
    description: 'Get detailed information about a specific customer segment including AI-generated market intelligence, TAM/SAM data, competitive landscape, and growth strategies. Use this when the user asks about E1, E2, E3, E4, E5, mid-market, or any specific segment.',
    parameters: {
      type: 'object',
      properties: {
        tier: {
          type: 'string',
          description: 'The segment tier: E1 (Mid-Market $1.5k-$10k MRR), E2 (Small $10k-$50k), E3 (Medium $50k-$250k), E4 (Large $250k-$1M), E5 (X-Large $1M+). Can also use tier_e1, tier_e2, etc.',
          enum: ['E1', 'E2', 'E3', 'E4', 'E5', 'tier_e1', 'tier_e2', 'tier_e3', 'tier_e4', 'tier_e5', 'mid-market', 'enterprise small', 'enterprise medium', 'enterprise large', 'enterprise x-large'],
        },
      },
      required: ['tier'],
    },
  },
  {
    name: 'compare_segments',
    description: 'Compare two customer segments side by side. Use this when the user wants to understand differences between segments like E1 vs E3.',
    parameters: {
      type: 'object',
      properties: {
        tier1: {
          type: 'string',
          description: 'First segment tier (E1, E2, E3, E4, or E5)',
        },
        tier2: {
          type: 'string',
          description: 'Second segment tier (E1, E2, E3, E4, or E5)',
        },
      },
      required: ['tier1', 'tier2'],
    },
  },
  
  // MSA Market Tools
  {
    name: 'get_msa_list',
    description: 'Get list of all MSAs (Metropolitan Statistical Areas) with their market data. Use this when the user asks about geographic markets or MSA coverage.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_msa_details',
    description: 'Get detailed information about a specific MSA including market size, coverage, and sales capacity. Use this when the user asks about a specific city or metro area.',
    parameters: {
      type: 'object',
      properties: {
        msa_name: {
          type: 'string',
          description: 'The name of the MSA (e.g., "New York", "Philadelphia", "Atlanta")',
        },
      },
      required: ['msa_name'],
    },
  },
  {
    name: 'get_sales_capacity',
    description: 'Get sales capacity information including rep counts, quotas, and coverage by MSA. Use this when the user asks about sales team capacity or rep coverage.',
    parameters: {
      type: 'object',
      properties: {
        msa_name: {
          type: 'string',
          description: 'Optional: Filter by specific MSA name',
        },
      },
      required: [],
    },
  },
  {
    name: 'compare_msas',
    description: 'Compare two MSAs side by side on key metrics. Use this when the user wants to understand differences between markets.',
    parameters: {
      type: 'object',
      properties: {
        msa1: {
          type: 'string',
          description: 'First MSA to compare',
        },
        msa2: {
          type: 'string',
          description: 'Second MSA to compare',
        },
      },
      required: ['msa1', 'msa2'],
    },
  },
  
  // Competitive Intelligence Tools
  {
    name: 'get_competitors',
    description: 'Get list of all competitors with their categories and analysis status. Use this when the user asks about competitors or competitive landscape.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional: Filter by category (e.g., "telecommunications", "cloud_connectivity", "sdwan_sase")',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_competitor_analysis',
    description: 'Get the AI-generated competitive analysis for a specific competitor. Use this when the user asks about a specific competitor.',
    parameters: {
      type: 'object',
      properties: {
        competitor: {
          type: 'string',
          description: 'The name of the competitor (e.g., "AT&T", "Verizon", "Lumen")',
        },
      },
      required: ['competitor'],
    },
  },
  {
    name: 'get_competitive_summary',
    description: 'Get an overall summary of competitive positioning across all competitors. Use this when the user asks for a high-level competitive overview.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  
  // Product Tools
  {
    name: 'get_products',
    description: 'Get the product portfolio with categories and competitive positioning. Use this when the user asks about products, solutions, or portfolio.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional: Filter by product category (e.g., "Broadband", "Ethernet", "SD-WAN", "UCaaS")',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_product_analysis',
    description: 'Get the AI-generated analysis for a specific product including competitive position and recommendations. Use this when the user asks about a specific product.',
    parameters: {
      type: 'object',
      properties: {
        product: {
          type: 'string',
          description: 'The name of the product to analyze',
        },
      },
      required: ['product'],
    },
  },
  {
    name: 'get_product_gaps',
    description: 'Get identified gaps in the product portfolio compared to competitors. Use this when the user asks about product weaknesses or gaps.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_roadmap_recommendations',
    description: 'Get strategic product roadmap recommendations. Use this when the user asks about product strategy or future direction.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  
  // Market Intelligence Tools
  {
    name: 'get_market_data',
    description: 'Get market intelligence data including TAM, SAM, SOM by segment. Use this when the user asks about market size or market opportunity.',
    parameters: {
      type: 'object',
      properties: {
        segment: {
          type: 'string',
          description: 'Optional: Filter by customer segment',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_market_trends',
    description: 'Get industry trends and market dynamics. Use this when the user asks about market trends or industry outlook.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional: Filter by category (e.g., "connectivity", "security", "cloud")',
        },
      },
      required: [],
    },
  },
  
  // Strategy Tools
  {
    name: 'get_strategy_summary',
    description: 'Get the executive summary from the strategy report. Use this when the user asks for a high-level strategic overview.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_key_insights',
    description: 'Get the top strategic insights from analysis. Use this when the user asks about key findings or important insights.',
    parameters: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Optional: Number of insights to return (default: 5)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_recommendations',
    description: 'Get strategic recommendations. Use this when the user asks for recommendations or what actions to take.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  
  // Q&A / Insights Tools
  {
    name: 'search_insights',
    description: 'Search through previously saved Q&A insights. Use this when the user asks about past questions or wants to find saved insights.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to find relevant insights',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_starred_insights',
    description: 'Get insights that have been starred/bookmarked. Use this when the user asks about saved or important insights.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

/**
 * Data handlers for tool execution
 * All handlers should return data or null, and may be async
 */
export interface ToolHandlers {
  // Synchronous data fetchers (from React context)
  getCompanyMetrics: () => unknown | null;
  getGrowthTrajectory: () => unknown | null;
  getSegments: () => unknown | null;
  getSegmentDetails: (tier: string) => Promise<unknown | null> | unknown | null;
  getMSAs: () => unknown | null;
  getMSADetails: (name: string) => Promise<unknown | null> | unknown | null;
  getProducts: (category?: string) => unknown | null;
  
  // Async data fetchers (from API calls)
  getCompetitors: (category?: string) => Promise<unknown | null> | unknown | null;
  getCompetitorAnalysis: (name: string) => Promise<unknown | null> | unknown | null;
  getProductAnalysis: (name: string) => Promise<unknown | null> | unknown | null;
  getMarketData: (segment?: string) => Promise<unknown | null> | unknown | null;
  getMarketTrends: (category?: string) => Promise<unknown | null> | unknown | null;
  getStrategySummary: () => Promise<unknown | null> | unknown | null;
  getKeyInsights: (count?: number) => Promise<unknown | null> | unknown | null;
  getRecommendations: () => Promise<unknown | null> | unknown | null;
  searchInsights: (query: string) => Promise<unknown | null> | unknown | null;
  getStarredInsights: () => Promise<unknown | null> | unknown | null;
  getSalesCapacity: (msaName?: string) => Promise<unknown | null> | unknown | null;
}

/**
 * Format currency values
 */
function formatCurrency(value: number, billions = false): string {
  if (billions) {
    return `$${(value).toFixed(2)}B`;
  }
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

/**
 * Format percentage values
 */
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Normalize segment tier input to match backend tier IDs
 * E1-E5 maps to tier_e1 through tier_e5
 * E1=Mid-Market (smallest), E5=X-Large (largest)
 */
function normalizeSegmentTier(input: string): string {
  const normalized = input.toLowerCase().trim();
  
  // Map to backend tier IDs (tier_e1, tier_e2, etc.)
  const tierMap: Record<string, string> = {
    // E1 - Enterprise Mid-Market ($1.5k–$10k MRR)
    'e1': 'tier_e1',
    'e-1': 'tier_e1',
    'tier_e1': 'tier_e1',
    'enterprise mid-market': 'tier_e1',
    'enterprise mid market': 'tier_e1',
    'enterprise midmarket': 'tier_e1',
    'mid-market': 'tier_e1',
    'mid market': 'tier_e1',
    'midmarket': 'tier_e1',
    
    // E2 - Enterprise Small ($10k–$50k MRR)
    'e2': 'tier_e2',
    'e-2': 'tier_e2',
    'tier_e2': 'tier_e2',
    'enterprise small': 'tier_e2',
    'small': 'tier_e2',
    
    // E3 - Enterprise Medium ($50k–$250k MRR)
    'e3': 'tier_e3',
    'e-3': 'tier_e3',
    'tier_e3': 'tier_e3',
    'enterprise medium': 'tier_e3',
    'medium': 'tier_e3',
    
    // E4 - Enterprise Large ($250k–$1M MRR)
    'e4': 'tier_e4',
    'e-4': 'tier_e4',
    'tier_e4': 'tier_e4',
    'enterprise large': 'tier_e4',
    'large': 'tier_e4',
    
    // E5 - Enterprise X-Large ($1M+ MRR)
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

/**
 * Execute a tool call with the given handlers
 * Returns a Promise to properly handle async handlers
 */
export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  handlers: ToolHandlers
): Promise<Record<string, unknown>> {
  switch (toolName) {
    case 'get_company_metrics': {
      const data = handlers.getCompanyMetrics() as {
        enterprise_arr?: number;
        growth_target_pct?: number;
        growth_rate_actual?: number;
        bookings_target_2026_mrr?: number;
        bookings_target_2027_mrr?: number;
        bookings_target_2028_mrr?: number;
      } | null;
      if (!data) {
        return { error: 'Company metrics not available' };
      }
      return {
        arr: formatCurrency(data.enterprise_arr || 0, true),
        targetGrowth: formatPercent(data.growth_target_pct || 0),
        actualGrowth: formatPercent(data.growth_rate_actual || 0),
        bookingsTarget2026: formatCurrency((data.bookings_target_2026_mrr || 0) * 12),
        bookingsTarget2027: formatCurrency((data.bookings_target_2027_mrr || 0) * 12),
        bookingsTarget2028: formatCurrency((data.bookings_target_2028_mrr || 0) * 12),
        summary: `Current ARR is ${formatCurrency(data.enterprise_arr || 0, true)} with ${formatPercent(data.growth_rate_actual || 0)} actual growth against a ${formatPercent(data.growth_target_pct || 0)} target.`,
      };
    }

    case 'get_growth_trajectory': {
      const data = handlers.getGrowthTrajectory() as Array<{
        period?: string;
        target?: number;
        actual?: number;
      }> | null;
      if (!data || data.length === 0) {
        return { error: 'Growth trajectory data not available' };
      }
      const quarters = (args.quarters as number) || data.length;
      const trajectory = data.slice(-quarters);
      const latest = trajectory[trajectory.length - 1];
      return {
        quarters: trajectory.map(q => ({
          period: q.period,
          target: formatCurrency(q.target || 0, true),
          actual: q.actual ? formatCurrency(q.actual, true) : 'N/A',
        })),
        summary: `Latest quarter (${latest?.period}): Target ${formatCurrency(latest?.target || 0, true)}, Actual ${latest?.actual ? formatCurrency(latest.actual, true) : 'not yet recorded'}.`,
      };
    }

    case 'get_segments': {
      const data = handlers.getSegments() as Array<{
        tier?: string;
        name?: string;
        account_count?: number;
        arr_contribution_pct?: number;
      }> | null;
      if (!data || data.length === 0) {
        return { error: 'Segment data not available' };
      }
      return {
        segments: data.map(s => ({
          tier: s.tier,
          name: s.name,
          accounts: s.account_count,
          arrContribution: formatPercent(s.arr_contribution_pct || 0),
        })),
        summary: `${data.length} customer segments defined. Enterprise segments contribute the majority of ARR.`,
      };
    }

    case 'get_segment_details': {
      const tierInput = args.tier as string;
      if (!tierInput) {
        return { error: 'Segment tier is required' };
      }
      const tier = normalizeSegmentTier(tierInput);
      const data = await handlers.getSegmentDetails(tier);
      if (!data) {
        return { error: `Segment ${tierInput} (normalized: ${tier}) not found. Valid tiers: tier_e1 (E1), tier_e2 (E2), tier_e3 (E3), tier_e4 (E4), tier_e5 (E5)` };
      }
      return {
        segment: data,
        summary: `Retrieved details for ${tier} segment including AI analysis.`,
      };
    }

    case 'compare_segments': {
      const tier1Input = args.tier1 as string;
      const tier2Input = args.tier2 as string;
      if (!tier1Input || !tier2Input) {
        return { error: 'Both tier1 and tier2 are required' };
      }
      const tier1 = normalizeSegmentTier(tier1Input);
      const tier2 = normalizeSegmentTier(tier2Input);
      const segment1 = handlers.getSegmentDetails(tier1);
      const segment2 = handlers.getSegmentDetails(tier2);
      if (!segment1 || !segment2) {
        return { error: 'One or both segments not found' };
      }
      return {
        segment1,
        segment2,
        summary: `Comparison between ${tier1} and ${tier2} segments.`,
      };
    }

    case 'get_msa_list': {
      const data = handlers.getMSAs();
      if (!data) {
        return { error: 'MSA data not available' };
      }
      return {
        msas: data,
        summary: 'Retrieved list of MSAs with market data.',
      };
    }

    case 'get_msa_details': {
      const msaName = args.msa_name as string;
      if (!msaName) {
        return { error: 'MSA name is required' };
      }
      const data = await handlers.getMSADetails(msaName);
      if (!data) {
        return { error: `MSA ${msaName} not found` };
      }
      return {
        msa: data,
        summary: `Retrieved details for ${msaName} MSA including AI analysis if available.`,
      };
    }

    case 'get_sales_capacity': {
      const msaName = args.msa_name as string | undefined;
      const data = await handlers.getSalesCapacity(msaName);
      if (!data) {
        return { error: 'Sales capacity data not available' };
      }
      return {
        capacity: data,
        summary: msaName ? `Sales capacity for ${msaName}.` : 'National sales capacity overview.',
      };
    }

    case 'compare_msas': {
      const msa1 = args.msa1 as string;
      const msa2 = args.msa2 as string;
      if (!msa1 || !msa2) {
        return { error: 'Both msa1 and msa2 are required' };
      }
      const data1 = handlers.getMSADetails(msa1);
      const data2 = handlers.getMSADetails(msa2);
      if (!data1 || !data2) {
        return { error: 'One or both MSAs not found' };
      }
      return {
        msa1: data1,
        msa2: data2,
        summary: `Comparison between ${msa1} and ${msa2} markets.`,
      };
    }

    case 'get_competitors': {
      const category = args.category as string | undefined;
      const data = await handlers.getCompetitors(category);
      if (!data) {
        return { error: 'Competitor data not available' };
      }
      return {
        competitors: data,
        summary: category ? `Competitors in ${category} category.` : 'All competitors across categories.',
      };
    }

    case 'get_competitor_analysis': {
      const competitor = args.competitor as string;
      if (!competitor) {
        return { error: 'Competitor name is required' };
      }
      const data = await handlers.getCompetitorAnalysis(competitor);
      if (!data) {
        return { error: `Analysis for ${competitor} not found` };
      }
      return {
        analysis: data,
        summary: `Competitive analysis for ${competitor}.`,
      };
    }

    case 'get_competitive_summary': {
      const competitors = await handlers.getCompetitors() as Array<{ name?: string; category?: string }> | null;
      if (!competitors) {
        return { error: 'Competitive data not available' };
      }
      return {
        totalCompetitors: Array.isArray(competitors) ? competitors.length : 0,
        categories: Array.isArray(competitors) 
          ? [...new Set(competitors.map((c) => c.category))]
          : [],
        summary: 'Competitive landscape overview across all categories.',
      };
    }

    case 'get_products': {
      const category = args.category as string | undefined;
      const data = handlers.getProducts(category);
      if (!data) {
        return { error: 'Product data not available' };
      }
      return {
        products: data,
        summary: category ? `Products in ${category} category.` : 'Full product portfolio.',
      };
    }

    case 'get_product_analysis': {
      const product = args.product as string;
      if (!product) {
        return { error: 'Product name is required' };
      }
      const data = await handlers.getProductAnalysis(product);
      if (!data) {
        return { error: `Analysis for ${product} not found` };
      }
      return {
        analysis: data,
        summary: `Product analysis for ${product}.`,
      };
    }

    case 'get_product_gaps': {
      const products = handlers.getProducts() as Array<{ name?: string; competitive_position?: string }> | null;
      if (!products) {
        return { error: 'Product data not available' };
      }
      // Find products with gaps (weak competitive position)
      const gaps = Array.isArray(products) 
        ? products.filter((p) => p.competitive_position === 'weak' || p.competitive_position === 'gap')
        : [];
      return {
        gaps,
        summary: `${gaps.length} product gaps or weaknesses identified.`,
      };
    }

    case 'get_roadmap_recommendations': {
      const data = await handlers.getRecommendations();
      if (!data) {
        return { error: 'Recommendations not available' };
      }
      return {
        recommendations: data,
        summary: 'Strategic product roadmap recommendations.',
      };
    }

    case 'get_market_data': {
      const segment = args.segment as string | undefined;
      const data = await handlers.getMarketData(segment);
      if (!data) {
        return { error: 'Market data not available' };
      }
      return {
        market: data,
        summary: segment ? `Market data for ${segment} segment.` : 'Overall market sizing data.',
      };
    }

    case 'get_market_trends': {
      const category = args.category as string | undefined;
      const data = await handlers.getMarketTrends(category);
      if (!data) {
        return { error: 'Market trends not available' };
      }
      return {
        trends: data,
        summary: category ? `Market trends in ${category}.` : 'Industry-wide market trends.',
      };
    }

    case 'get_strategy_summary': {
      const data = await handlers.getStrategySummary();
      if (!data) {
        return { error: 'Strategy summary not available' };
      }
      return {
        summary: data,
      };
    }

    case 'get_key_insights': {
      const count = (args.count as number) || 5;
      const data = await handlers.getKeyInsights(count);
      if (!data) {
        return { error: 'Key insights not available' };
      }
      return {
        insights: data,
        summary: `Top ${count} strategic insights.`,
      };
    }

    case 'get_recommendations': {
      const data = await handlers.getRecommendations();
      if (!data) {
        return { error: 'Recommendations not available' };
      }
      return {
        recommendations: data,
        summary: 'Strategic recommendations for growth.',
      };
    }

    case 'search_insights': {
      const query = args.query as string;
      if (!query) {
        return { error: 'Search query is required' };
      }
      const data = await handlers.searchInsights(query);
      if (!data) {
        return { results: [], summary: 'No matching insights found.' };
      }
      return {
        results: data,
        summary: `Found insights matching "${query}".`,
      };
    }

    case 'get_starred_insights': {
      const data = await handlers.getStarredInsights();
      if (!data) {
        return { insights: [], summary: 'No starred insights.' };
      }
      return {
        insights: data,
        summary: 'Starred/bookmarked insights.',
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

