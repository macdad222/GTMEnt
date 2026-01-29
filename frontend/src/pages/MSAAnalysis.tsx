import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPinIcon,
  UserGroupIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
  ArrowPathIcon,
  CheckBadgeIcon,
  SparklesIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { useCBConfig } from '../context/CBConfigContext'
import { HelpSection } from '../components/HelpSection'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface SalesAllocation {
  sdr_count: number
  bdr_count: number
  inside_ae_count: number
  inside_am_count: number
  field_ae_count: number
  field_am_count: number
  strategic_ae_count: number
  major_am_count: number
  se_count: number
  partner_mgr_count: number
  sales_mgr_count: number
  total_quota_usd: number
  new_logo_quota_usd: number
  expansion_quota_usd: number
  quota_attainment_pct: number
  total_quota_bearing_headcount: number
  total_headcount: number
}

interface SegmentDistribution {
  segment_tier: string
  total_accounts: number
  hq_accounts: number
  branch_accounts: number
  arr_usd: number
  avg_mrr_usd: number
  whitespace_accounts: number
  expansion_opportunities: number
}

interface MSA {
  code: string
  short_name: string
  name?: string
  region: string
  population_2023: number
  enterprise_establishments: number
  has_fiber: boolean
  has_coax: boolean
  infrastructure_type?: string
  comcast_coverage_pct: number
  fiber_coverage_pct: number
  priority_tier: number
  priority_score: number
  current_arr_usd: number
  tam_usd?: number
  sam_usd?: number
  market_share_pct?: number
  total_quota_bearing_headcount: number
  total_accounts: number
  sales_allocation?: SalesAllocation
  segment_distribution?: SegmentDistribution[]
}

interface MSASummary {
  total_msas: number
  total_population: number
  total_enterprise_establishments: number
  total_quota_bearing_headcount: number
  total_quota_usd: number
  total_current_arr_usd: number
  by_region: Record<string, { count: number; population: number; quota_headcount: number; current_arr_usd: number }>
  by_tier: Record<string, { count: number; quota_headcount: number; current_arr_usd: number }>
  by_infrastructure: { fiber_coax: number; fiber_only: number; coax_only: number }
  avg_coverage_pct: number
  avg_fiber_coverage_pct: number
}

interface SalesConfig {
  segment_tier: string
  primary_motion: string
  secondary_motion: string | null
  allowed_rep_types: string[]
  target_accounts_per_rep: number
  target_arr_per_rep: number
  avg_deal_cycle_days: number
  requires_se: boolean
  requires_field_visit: boolean
}

// LLM-Generated MSA Intel Types
interface ProductOpportunity {
  product_category: string
  tam_usd: number
  sam_usd: number
  current_penetration_pct: number
  growth_rate_cagr: string
  competitive_intensity: string
  key_competitors: string[]
  recommended_focus: string
}

interface SalesResourceRecommendation {
  recommended_sdr_count: number
  recommended_bdr_count: number
  recommended_inside_ae_count: number
  recommended_inside_am_count: number
  recommended_field_ae_count: number
  recommended_field_am_count: number
  recommended_strategic_ae_count: number
  recommended_major_am_count: number
  recommended_se_count: number
  recommended_partner_mgr_count: number
  recommended_sales_mgr_count: number
  recommended_total_quota_usd: number
  recommended_new_logo_quota_usd: number
  recommended_expansion_quota_usd: number
  headcount_rationale: string
  quota_methodology: string
  territory_structure: string
}

interface MSAMarketIntel {
  id: string
  msa_code: string
  msa_name: string
  generated_at: string
  llm_provider: string
  llm_model: string
  executive_summary: string
  market_dynamics: string
  total_enterprise_tam_usd: number
  total_enterprise_sam_usd: number
  tam_methodology: string
  product_opportunities: ProductOpportunity[]
  broadband_opportunity: string
  ethernet_opportunity: string
  fixed_wireless_opportunity: string
  mobile_enterprise_opportunity: string
  sdwan_sase_opportunity: string
  cybersecurity_opportunity: string
  ucaas_ccaas_opportunity: string
  competitive_overview: string
  primary_competitors: string[]
  cb_competitive_position: string
  competitive_strengths: string[]
  competitive_gaps: string[]
  sales_resource_recommendation: SalesResourceRecommendation
  recommended_sales_motion_mix: Record<string, number>
  growth_priorities: Array<{
    priority: string
    rationale: string
    target_segment: string
    estimated_impact_arr: number
    timeline: string
  }>
  quick_wins: string[]
  long_term_plays: string[]
  top_verticals: Array<{
    vertical: string
    establishment_count: number
    spend_potential_usd: number
    key_needs: string[]
    recommended_approach: string
  }>
  sources: string[]
  data_freshness: string
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

function formatNumber(value: number): string {
  return value.toLocaleString()
}

const REGION_COLORS: Record<string, string> = {
  northeast: '#3b82f6',
  midwest: '#10b981',
  south: '#f59e0b',
  west: '#8b5cf6',
}

const TIER_COLORS = ['#0084f4', '#36a5ff', '#ec7612']

const SEGMENT_LABELS: Record<string, string> = {
  tier_e1: 'E1 ($1.5K-$10K)',
  tier_e2: 'E2 ($10K-$25K)',
  tier_e3: 'E3 ($25K-$50K)',
  tier_e4: 'E4 ($50K-$100K)',
  tier_e5: 'E5 ($100K+)',
}

export function MSAAnalysis() {
  // Use CB Config context - auto-refreshes when Admin updates
  const { lastUpdated: cbConfigUpdated } = useCBConfig()
  
  const [summary, setSummary] = useState<MSASummary | null>(null)
  const [msas, setMsas] = useState<MSA[]>([])
  const [salesConfigs, setSalesConfigs] = useState<SalesConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMsa, setExpandedMsa] = useState<string | null>(null)
  const [selectedMsaDetail, setSelectedMsaDetail] = useState<MSA | null>(null)
  
  // LLM Intel state
  const [msaIntel, setMsaIntel] = useState<Record<string, MSAMarketIntel | null>>({})
  const [loadingIntel, setLoadingIntel] = useState<Record<string, boolean>>({})
  const [intelError, setIntelError] = useState<string | null>(null)
  
  // Filters
  const [regionFilter, setRegionFilter] = useState<string>('')
  const [tierFilter, setTierFilter] = useState<string>('')
  const [infrastructureFilter, setInfrastructureFilter] = useState<string>('fiber_coax')
  const [sortBy, setSortBy] = useState<string>('priority_score')

  // Re-fetch when CB config is updated in Admin
  useEffect(() => {
    fetchData()
  }, [regionFilter, tierFilter, infrastructureFilter, sortBy, cbConfigUpdated])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Build query params
      const params = new URLSearchParams()
      if (regionFilter) params.append('region', regionFilter)
      if (tierFilter) params.append('tier', tierFilter)
      if (infrastructureFilter === 'fiber_coax') {
        params.append('has_fiber', 'true')
        params.append('has_coax', 'true')
      } else if (infrastructureFilter === 'fiber') {
        params.append('has_fiber', 'true')
      } else if (infrastructureFilter === 'coax') {
        params.append('has_coax', 'true')
      }
      params.append('sort_by', sortBy)

      const [summaryRes, msasRes, configsRes] = await Promise.all([
        fetch('/api/msas/summary'),
        fetch(`/api/msas/?${params.toString()}`),
        fetch('/api/msas/sales-configs'),
      ])

      if (summaryRes.ok) {
        setSummary(await summaryRes.json())
      }
      if (msasRes.ok) {
        setMsas(await msasRes.json())
      }
      if (configsRes.ok) {
        setSalesConfigs(await configsRes.json())
      }
    } catch (err) {
      console.error('Failed to fetch MSA data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMsaDetail = async (code: string) => {
    try {
      const res = await fetch(`/api/msas/detail/${code}`)
      if (res.ok) {
        const detail = await res.json()
        setSelectedMsaDetail(detail)
        setExpandedMsa(code)
      }
    } catch (err) {
      console.error('Failed to fetch MSA detail:', err)
    }
  }

  const fetchMsaIntel = async (code: string) => {
    try {
      const res = await fetch(`/api/msas/${code}/intel`)
      if (res.ok) {
        const intel = await res.json()
        setMsaIntel(prev => ({ ...prev, [code]: intel }))
      }
    } catch (err) {
      console.error('Failed to fetch MSA intel:', err)
    }
  }

  const generateMsaIntel = async (code: string, force: boolean = false) => {
    setLoadingIntel(prev => ({ ...prev, [code]: true }))
    setIntelError(null)
    try {
      const res = await fetch(`/api/msas/${code}/intel/generate?force=${force}`, {
        method: 'POST',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Failed to generate intel')
      }
      const intel = await res.json()
      setMsaIntel(prev => ({ ...prev, [code]: intel }))
    } catch (err: any) {
      console.error('Failed to generate MSA intel:', err)
      setIntelError(err.message || 'Failed to generate intel')
    } finally {
      setLoadingIntel(prev => ({ ...prev, [code]: false }))
    }
  }

  const toggleExpand = (code: string) => {
    if (expandedMsa === code) {
      setExpandedMsa(null)
      setSelectedMsaDetail(null)
    } else {
      fetchMsaDetail(code)
      // Also fetch intel if we have it cached
      if (!msaIntel[code]) {
        fetchMsaIntel(code)
      }
    }
  }

  // Prepare chart data
  const regionChartData = summary
    ? Object.entries(summary.by_region).map(([region, data]) => ({
        name: region.charAt(0).toUpperCase() + region.slice(1),
        arr: data.current_arr_usd / 1_000_000,
        headcount: data.quota_headcount,
        fill: REGION_COLORS[region] || '#666',
      }))
    : []

  const tierChartData = summary
    ? Object.entries(summary.by_tier).map(([tier, data], idx) => ({
        name: `Tier ${tier.replace('tier_', '')}`,
        arr: data.current_arr_usd / 1_000_000,
        headcount: data.quota_headcount,
        fill: TIER_COLORS[idx] || '#666',
      }))
    : []

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-8 w-8 text-brand-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MapPinIcon className="h-7 w-7 text-brand-400" />
          MSA Market Analysis
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Geographic market analysis with sales resource planning, headcount allocation, and segment distribution
        </p>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl card-gradient border border-white/10 p-4"
          >
            <p className="text-xs text-slate-400 uppercase tracking-wide">Total MSAs</p>
            <p className="mt-1 text-2xl font-bold text-white">{summary.total_msas}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-xl card-gradient border border-white/10 p-4"
          >
            <p className="text-xs text-slate-400 uppercase tracking-wide">Total ARR</p>
            <p className="mt-1 text-2xl font-bold text-brand-400">{formatCurrency(summary.total_current_arr_usd)}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl card-gradient border border-white/10 p-4"
          >
            <p className="text-xs text-slate-400 uppercase tracking-wide">Quota Headcount</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{formatNumber(summary.total_quota_bearing_headcount)}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl card-gradient border border-white/10 p-4"
          >
            <p className="text-xs text-slate-400 uppercase tracking-wide">Total Quota</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">{formatCurrency(summary.total_quota_usd)}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl card-gradient border border-white/10 p-4"
          >
            <p className="text-xs text-slate-400 uppercase tracking-wide">Fiber+Coax</p>
            <p className="mt-1 text-2xl font-bold text-purple-400">{summary.by_infrastructure.fiber_coax}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-xl card-gradient border border-white/10 p-4"
          >
            <p className="text-xs text-slate-400 uppercase tracking-wide">Avg Coverage</p>
            <p className="mt-1 text-2xl font-bold text-cyan-400">{summary.avg_coverage_pct.toFixed(0)}%</p>
          </motion.div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ARR by Region */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl card-gradient border border-white/10 p-6"
        >
          <h3 className="text-sm font-semibold text-white mb-4">ARR by Region ($M)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={regionChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                labelStyle={{ color: '#f8fafc' }}
              />
              <Bar dataKey="arr" radius={[4, 4, 0, 0]}>
                {regionChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* ARR by Tier */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-xl card-gradient border border-white/10 p-6"
        >
          <h3 className="text-sm font-semibold text-white mb-4">ARR by Priority Tier ($M)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tierChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                labelStyle={{ color: '#f8fafc' }}
              />
              <Bar dataKey="arr" radius={[4, 4, 0, 0]}>
                {tierChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
        <FunnelIcon className="h-5 w-5 text-slate-400" />
        
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Region:</label>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Regions</option>
            <option value="northeast">Northeast</option>
            <option value="midwest">Midwest</option>
            <option value="south">South</option>
            <option value="west">West</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Tier:</label>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Tiers</option>
            <option value="1">Tier 1 (Top 10)</option>
            <option value="2">Tier 2 (11-25)</option>
            <option value="3">Tier 3 (26-50)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Infrastructure:</label>
          <select
            value={infrastructureFilter}
            onChange={(e) => setInfrastructureFilter(e.target.value)}
            className="px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="fiber_coax">Fiber + Coax</option>
            <option value="fiber">Fiber Only</option>
            <option value="coax">Coax Only</option>
            <option value="any">Any</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Sort:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="priority_score">Priority Score</option>
            <option value="arr">Current ARR</option>
            <option value="headcount">Headcount</option>
            <option value="accounts">Accounts</option>
          </select>
        </div>

        <span className="ml-auto text-sm text-slate-400">{msas.length} MSAs</span>
      </div>

      {/* MSA List */}
      <div className="space-y-4">
        {msas.map((msa, index) => {
          const isExpanded = expandedMsa === msa.code
          const detail = isExpanded ? selectedMsaDetail : null

          return (
            <motion.div
              key={msa.code}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.02 }}
              className="rounded-xl card-gradient border border-white/10 overflow-hidden"
            >
              {/* MSA Header */}
              <div
                className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => toggleExpand(msa.code)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${
                          msa.priority_tier === 1
                            ? 'bg-brand-500/20 text-brand-400'
                            : msa.priority_tier === 2
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}
                      >
                        Tier {msa.priority_tier}
                      </span>
                      <span className="text-xs text-slate-500">
                        Score: {msa.priority_score.toFixed(1)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{msa.short_name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-400 capitalize">{msa.region}</span>
                        <span className="flex items-center gap-1 text-xs">
                          {msa.has_fiber && (
                            <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">Fiber</span>
                          )}
                          {msa.has_coax && (
                            <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">Coax</span>
                          )}
                        </span>
                        <span className="text-xs text-slate-500">
                          {msa.comcast_coverage_pct}% coverage
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-brand-400">{formatCurrency(msa.current_arr_usd)}</p>
                      <p className="text-xs text-slate-500">Current ARR</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-emerald-400">{msa.total_quota_bearing_headcount}</p>
                      <p className="text-xs text-slate-500">Quota Reps</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-white">{formatNumber(msa.total_accounts)}</p>
                      <p className="text-xs text-slate-500">Accounts</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUpIcon className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Detail */}
              <AnimatePresence>
                {isExpanded && detail && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 bg-white/[0.02] border-t border-white/10 space-y-6">
                      
                      {/* AI Market Intelligence Section */}
                      <div className="rounded-xl bg-gradient-to-br from-brand-500/10 to-purple-500/10 border border-brand-500/30 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                            <SparklesIcon className="h-5 w-5 text-brand-400" />
                            AI-Powered Market Intelligence
                          </h4>
                          <div className="flex items-center gap-2">
                            {msaIntel[msa.code] && (
                              <span className="text-xs text-slate-400">
                                Generated: {new Date(msaIntel[msa.code]!.generated_at).toLocaleDateString()} by {msaIntel[msa.code]!.llm_provider}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                generateMsaIntel(msa.code, !!msaIntel[msa.code])
                              }}
                              disabled={loadingIntel[msa.code]}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              {loadingIntel[msa.code] ? (
                                <>
                                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                  Generating...
                                </>
                              ) : msaIntel[msa.code] ? (
                                <>
                                  <ArrowPathIcon className="h-4 w-4" />
                                  Refresh Intel
                                </>
                              ) : (
                                <>
                                  <SparklesIcon className="h-4 w-4" />
                                  Generate Intel
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {loadingIntel[msa.code] && !msaIntel[msa.code] && (
                          <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                              <ArrowPathIcon className="h-8 w-8 animate-spin text-brand-400 mx-auto mb-3" />
                              <p className="text-slate-300">Analyzing market opportunity...</p>
                              <p className="text-xs text-slate-500 mt-1">This may take 30-60 seconds</p>
                            </div>
                          </div>
                        )}

                        {intelError && expandedMsa === msa.code && (
                          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {intelError}
                          </div>
                        )}

                        {msaIntel[msa.code] && !loadingIntel[msa.code] && (
                          <div className="space-y-6">
                            {/* Executive Summary */}
                            <div>
                              <h5 className="text-sm font-semibold text-white mb-2">Executive Summary</h5>
                              <p className="text-sm text-slate-300 leading-relaxed">{msaIntel[msa.code]!.executive_summary}</p>
                            </div>

                            {/* TAM/SAM from LLM */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-2xl font-bold text-brand-400">{formatCurrency(msaIntel[msa.code]!.total_enterprise_tam_usd)}</p>
                                <p className="text-xs text-slate-400">Enterprise TAM</p>
                              </div>
                              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-2xl font-bold text-cyan-400">{formatCurrency(msaIntel[msa.code]!.total_enterprise_sam_usd)}</p>
                                <p className="text-xs text-slate-400">Serviceable SAM</p>
                              </div>
                              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(detail.current_arr_usd)}</p>
                                <p className="text-xs text-slate-400">Current ARR</p>
                              </div>
                              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-2xl font-bold text-amber-400">
                                  {msaIntel[msa.code]!.total_enterprise_sam_usd > 0 
                                    ? ((detail.current_arr_usd / msaIntel[msa.code]!.total_enterprise_sam_usd) * 100).toFixed(1) 
                                    : '0'}%
                                </p>
                                <p className="text-xs text-slate-400">SAM Penetration</p>
                              </div>
                            </div>

                            {/* Product Portfolio Opportunities */}
                            {msaIntel[msa.code]!.product_opportunities.length > 0 && (
                              <div>
                                <h5 className="text-sm font-semibold text-white mb-3">Product Portfolio Opportunities</h5>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-white/10">
                                        <th className="text-left py-2 px-3 text-slate-400 font-medium">Product</th>
                                        <th className="text-right py-2 px-3 text-slate-400 font-medium">TAM</th>
                                        <th className="text-right py-2 px-3 text-slate-400 font-medium">SAM</th>
                                        <th className="text-right py-2 px-3 text-slate-400 font-medium">CB Share</th>
                                        <th className="text-center py-2 px-3 text-slate-400 font-medium">CAGR</th>
                                        <th className="text-center py-2 px-3 text-slate-400 font-medium">Competition</th>
                                        <th className="text-center py-2 px-3 text-slate-400 font-medium">Focus</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {msaIntel[msa.code]!.product_opportunities.map((opp) => (
                                        <tr key={opp.product_category} className="border-b border-white/5 hover:bg-white/5">
                                          <td className="py-2 px-3 text-white font-medium">{opp.product_category}</td>
                                          <td className="py-2 px-3 text-right text-slate-300">{formatCurrency(opp.tam_usd)}</td>
                                          <td className="py-2 px-3 text-right text-brand-400">{formatCurrency(opp.sam_usd)}</td>
                                          <td className="py-2 px-3 text-right text-cyan-400">{opp.current_penetration_pct.toFixed(1)}%</td>
                                          <td className="py-2 px-3 text-center text-emerald-400">{opp.growth_rate_cagr}</td>
                                          <td className="py-2 px-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-xs ${
                                              opp.competitive_intensity === 'high' ? 'bg-red-500/20 text-red-400' :
                                              opp.competitive_intensity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                              'bg-emerald-500/20 text-emerald-400'
                                            }`}>
                                              {opp.competitive_intensity}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-xs ${
                                              opp.recommended_focus === 'primary' ? 'bg-brand-500/20 text-brand-400' :
                                              opp.recommended_focus === 'secondary' ? 'bg-purple-500/20 text-purple-400' :
                                              opp.recommended_focus === 'emerging' ? 'bg-cyan-500/20 text-cyan-400' :
                                              'bg-slate-500/20 text-slate-400'
                                            }`}>
                                              {opp.recommended_focus}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Connectivity Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <h6 className="text-sm font-semibold text-purple-400 mb-2">Broadband & Fiber</h6>
                                <p className="text-xs text-slate-300">{msaIntel[msa.code]!.broadband_opportunity}</p>
                              </div>
                              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <h6 className="text-sm font-semibold text-blue-400 mb-2">Ethernet / Dedicated</h6>
                                <p className="text-xs text-slate-300">{msaIntel[msa.code]!.ethernet_opportunity}</p>
                              </div>
                              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <h6 className="text-sm font-semibold text-amber-400 mb-2">Fixed Wireless</h6>
                                <p className="text-xs text-slate-300">{msaIntel[msa.code]!.fixed_wireless_opportunity}</p>
                              </div>
                              <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30">
                                <h6 className="text-sm font-semibold text-emerald-400 mb-2">📱 Mobile Enterprise (Coming 2026)</h6>
                                <p className="text-xs text-slate-300">{msaIntel[msa.code]!.mobile_enterprise_opportunity}</p>
                              </div>
                            </div>

                            {/* Secure Networking & Voice */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <h6 className="text-sm font-semibold text-cyan-400 mb-2">SD-WAN / SASE</h6>
                                <p className="text-xs text-slate-300">{msaIntel[msa.code]!.sdwan_sase_opportunity}</p>
                              </div>
                              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <h6 className="text-sm font-semibold text-red-400 mb-2">Cybersecurity</h6>
                                <p className="text-xs text-slate-300">{msaIntel[msa.code]!.cybersecurity_opportunity}</p>
                              </div>
                              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <h6 className="text-sm font-semibold text-green-400 mb-2">UCaaS / CCaaS</h6>
                                <p className="text-xs text-slate-300">{msaIntel[msa.code]!.ucaas_ccaas_opportunity}</p>
                              </div>
                            </div>

                            {/* AI-Recommended Sales Resources */}
                            <div>
                              <h5 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                <UserGroupIcon className="h-4 w-4 text-brand-400" />
                                AI-Recommended Sales Resources
                              </h5>
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                <div className="p-4 rounded-lg bg-white/5">
                                  <p className="text-xs text-slate-400 uppercase mb-2">Inside Sales</p>
                                  <div className="space-y-1">
                                    <div className="flex justify-between"><span className="text-slate-400 text-xs">SDRs:</span><span className="text-white font-semibold">{msaIntel[msa.code]!.sales_resource_recommendation.recommended_sdr_count}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 text-xs">BDRs:</span><span className="text-white font-semibold">{msaIntel[msa.code]!.sales_resource_recommendation.recommended_bdr_count}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 text-xs">Inside AEs:</span><span className="text-emerald-400 font-semibold">{msaIntel[msa.code]!.sales_resource_recommendation.recommended_inside_ae_count}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 text-xs">Inside AMs:</span><span className="text-emerald-400 font-semibold">{msaIntel[msa.code]!.sales_resource_recommendation.recommended_inside_am_count}</span></div>
                                  </div>
                                </div>
                                <div className="p-4 rounded-lg bg-white/5">
                                  <p className="text-xs text-slate-400 uppercase mb-2">Field Sales</p>
                                  <div className="space-y-1">
                                    <div className="flex justify-between"><span className="text-slate-400 text-xs">Field AEs:</span><span className="text-emerald-400 font-semibold">{msaIntel[msa.code]!.sales_resource_recommendation.recommended_field_ae_count}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 text-xs">Field AMs:</span><span className="text-emerald-400 font-semibold">{msaIntel[msa.code]!.sales_resource_recommendation.recommended_field_am_count}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 text-xs">Strategic AEs:</span><span className="text-purple-400 font-semibold">{msaIntel[msa.code]!.sales_resource_recommendation.recommended_strategic_ae_count}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 text-xs">Major AMs:</span><span className="text-purple-400 font-semibold">{msaIntel[msa.code]!.sales_resource_recommendation.recommended_major_am_count}</span></div>
                                  </div>
                                </div>
                                <div className="p-4 rounded-lg bg-white/5">
                                  <p className="text-xs text-slate-400 uppercase mb-2">Specialists</p>
                                  <div className="space-y-1">
                                    <div className="flex justify-between"><span className="text-slate-400 text-xs">Sales Engineers:</span><span className="text-cyan-400 font-semibold">{msaIntel[msa.code]!.sales_resource_recommendation.recommended_se_count}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 text-xs">Partner Mgrs:</span><span className="text-amber-400 font-semibold">{msaIntel[msa.code]!.sales_resource_recommendation.recommended_partner_mgr_count}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 text-xs">Sales Mgrs:</span><span className="text-white font-semibold">{msaIntel[msa.code]!.sales_resource_recommendation.recommended_sales_mgr_count}</span></div>
                                  </div>
                                </div>
                                <div className="p-4 rounded-lg bg-gradient-to-br from-brand-500/20 to-brand-600/10 border border-brand-500/30">
                                  <p className="text-xs text-slate-400 uppercase mb-2">Quota</p>
                                  <div className="space-y-1">
                                    <div className="flex justify-between"><span className="text-slate-400 text-xs">Total:</span><span className="text-brand-400 font-bold">{formatCurrency(msaIntel[msa.code]!.sales_resource_recommendation.recommended_total_quota_usd)}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 text-xs">New Logo:</span><span className="text-emerald-400 font-semibold">{formatCurrency(msaIntel[msa.code]!.sales_resource_recommendation.recommended_new_logo_quota_usd)}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 text-xs">Expansion:</span><span className="text-amber-400 font-semibold">{formatCurrency(msaIntel[msa.code]!.sales_resource_recommendation.recommended_expansion_quota_usd)}</span></div>
                                  </div>
                                </div>
                              </div>
                              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-xs text-slate-400 uppercase mb-2">Rationale</p>
                                <p className="text-xs text-slate-300">{msaIntel[msa.code]!.sales_resource_recommendation.headcount_rationale}</p>
                              </div>
                            </div>

                            {/* Competitive Position */}
                            <div>
                              <h5 className="text-sm font-semibold text-white mb-3">Competitive Position</h5>
                              <p className="text-sm text-slate-300 mb-3">{msaIntel[msa.code]!.competitive_overview}</p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-3 rounded-lg bg-white/5">
                                  <p className="text-xs text-slate-400 uppercase mb-2">Primary Competitors</p>
                                  <div className="flex flex-wrap gap-1">
                                    {msaIntel[msa.code]!.primary_competitors.map((c) => (
                                      <span key={c} className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">{c}</span>
                                    ))}
                                  </div>
                                </div>
                                <div className="p-3 rounded-lg bg-white/5">
                                  <p className="text-xs text-slate-400 uppercase mb-2">CB Strengths</p>
                                  <ul className="list-disc list-inside text-xs text-emerald-400">
                                    {msaIntel[msa.code]!.competitive_strengths.map((s, i) => <li key={i}>{s}</li>)}
                                  </ul>
                                </div>
                                <div className="p-3 rounded-lg bg-white/5">
                                  <p className="text-xs text-slate-400 uppercase mb-2">Areas to Improve</p>
                                  <ul className="list-disc list-inside text-xs text-amber-400">
                                    {msaIntel[msa.code]!.competitive_gaps.map((g, i) => <li key={i}>{g}</li>)}
                                  </ul>
                                </div>
                              </div>
                            </div>

                            {/* Quick Wins & Long-Term */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                                <h6 className="text-sm font-semibold text-emerald-400 mb-2">🚀 Quick Wins (90 days)</h6>
                                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                                  {msaIntel[msa.code]!.quick_wins.map((w, i) => <li key={i}>{w}</li>)}
                                </ul>
                              </div>
                              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                                <h6 className="text-sm font-semibold text-purple-400 mb-2">📈 Long-Term Plays</h6>
                                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                                  {msaIntel[msa.code]!.long_term_plays.map((p, i) => <li key={i}>{p}</li>)}
                                </ul>
                              </div>
                            </div>

                            {/* Sources */}
                            <div className="pt-4 border-t border-white/10">
                              <p className="text-xs text-slate-500 mb-2">Sources & Methodology</p>
                              <ul className="list-disc list-inside text-xs text-slate-500 space-y-0.5">
                                {msaIntel[msa.code]!.sources.map((s, i) => <li key={i}>{s}</li>)}
                              </ul>
                              <p className="text-xs text-slate-600 mt-2 italic">{msaIntel[msa.code]!.data_freshness}</p>
                            </div>
                          </div>
                        )}

                        {!msaIntel[msa.code] && !loadingIntel[msa.code] && (
                          <div className="text-center py-8">
                            <SparklesIcon className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">Click "Generate Intel" to create AI-powered market analysis</p>
                            <p className="text-xs text-slate-500 mt-1">Includes TAM/SAM, product opportunities, sales resource planning, and growth strategies</p>
                          </div>
                        )}
                      </div>

                      {/* Static Data Section (Current) */}
                      <div className="pt-4">
                        <h4 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
                          <InformationCircleIcon className="h-4 w-4" />
                          Current Configuration (Static Data)
                        </h4>

                        {/* Sales Headcount */}
                        {detail.sales_allocation && (
                          <div className="mb-6">
                            <h5 className="text-xs text-slate-500 uppercase tracking-wide mb-3">Current Sales Allocation</h5>
                            <div className="grid grid-cols-2 gap-6">
                              {/* Inside Sales */}
                              <div className="p-4 rounded-lg bg-white/5">
                                <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Inside Sales</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-lg font-semibold text-white">{detail.sales_allocation.sdr_count}</p>
                                    <p className="text-xs text-slate-500">SDRs</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-semibold text-white">{detail.sales_allocation.bdr_count}</p>
                                    <p className="text-xs text-slate-500">BDRs</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-semibold text-emerald-400">{detail.sales_allocation.inside_ae_count}</p>
                                    <p className="text-xs text-slate-500">Inside AEs</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-semibold text-emerald-400">{detail.sales_allocation.inside_am_count}</p>
                                    <p className="text-xs text-slate-500">Inside AMs</p>
                                  </div>
                                </div>
                              </div>

                              {/* Field Sales */}
                              <div className="p-4 rounded-lg bg-white/5">
                                <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Field Sales</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-lg font-semibold text-emerald-400">{detail.sales_allocation.field_ae_count}</p>
                                    <p className="text-xs text-slate-500">Field AEs</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-semibold text-emerald-400">{detail.sales_allocation.field_am_count}</p>
                                    <p className="text-xs text-slate-500">Field AMs</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-semibold text-purple-400">{detail.sales_allocation.strategic_ae_count}</p>
                                    <p className="text-xs text-slate-500">Strategic AEs</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-semibold text-purple-400">{detail.sales_allocation.major_am_count}</p>
                                    <p className="text-xs text-slate-500">Major AMs</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Quota Summary */}
                            <div className="mt-4 grid grid-cols-3 gap-4">
                              <div className="p-3 rounded-lg bg-white/5">
                                <p className="text-xl font-bold text-slate-400">{formatCurrency(detail.sales_allocation.total_quota_usd)}</p>
                                <p className="text-xs text-slate-500">Current Quota</p>
                              </div>
                              <div className="p-3 rounded-lg bg-white/5">
                                <p className="text-xl font-bold text-slate-400">{formatCurrency(detail.sales_allocation.new_logo_quota_usd)}</p>
                                <p className="text-xs text-slate-500">New Logo</p>
                              </div>
                              <div className="p-3 rounded-lg bg-white/5">
                                <p className="text-xl font-bold text-slate-400">{detail.sales_allocation.quota_attainment_pct}%</p>
                                <p className="text-xs text-slate-500">Attainment</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Segment Distribution */}
                        {detail.segment_distribution && detail.segment_distribution.length > 0 && (
                          <div>
                            <h5 className="text-xs text-slate-500 uppercase tracking-wide mb-3">Customer Segment Distribution</h5>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-white/10">
                                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Segment</th>
                                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Total</th>
                                    <th className="text-right py-2 px-3 text-slate-400 font-medium">HQ</th>
                                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Branch</th>
                                    <th className="text-right py-2 px-3 text-slate-400 font-medium">ARR</th>
                                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Whitespace</th>
                                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Expansion</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detail.segment_distribution.map((seg) => (
                                    <tr key={seg.segment_tier} className="border-b border-white/5 hover:bg-white/5">
                                      <td className="py-2 px-3 text-white font-medium">
                                        {SEGMENT_LABELS[seg.segment_tier] || seg.segment_tier}
                                      </td>
                                      <td className="py-2 px-3 text-right text-white">{formatNumber(seg.total_accounts)}</td>
                                      <td className="py-2 px-3 text-right text-purple-400">{formatNumber(seg.hq_accounts)}</td>
                                      <td className="py-2 px-3 text-right text-slate-400">{formatNumber(seg.branch_accounts)}</td>
                                      <td className="py-2 px-3 text-right text-brand-400">{formatCurrency(seg.arr_usd)}</td>
                                      <td className="py-2 px-3 text-right text-cyan-400">{formatNumber(seg.whitespace_accounts)}</td>
                                      <td className="py-2 px-3 text-right text-emerald-400">{formatNumber(seg.expansion_opportunities)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Sales Configurations */}
      {salesConfigs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl card-gradient border border-white/10 p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-brand-400" />
            Sales Channel Configuration by Segment
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Configurable sales motions and rep types based on customer complexity and deal size
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-slate-400 font-medium">Segment</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium">Primary Motion</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium">Rep Types</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">Accounts/Rep</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">Target ARR/Rep</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">Cycle (days)</th>
                  <th className="text-center py-2 px-3 text-slate-400 font-medium">SE</th>
                  <th className="text-center py-2 px-3 text-slate-400 font-medium">Field Visit</th>
                </tr>
              </thead>
              <tbody>
                {salesConfigs.map((config) => (
                  <tr key={config.segment_tier} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 px-3 text-white font-medium">
                      {SEGMENT_LABELS[config.segment_tier] || config.segment_tier}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 text-xs bg-brand-500/20 text-brand-400 rounded capitalize">
                        {config.primary_motion.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1">
                        {config.allowed_rep_types.slice(0, 3).map((rt) => (
                          <span key={rt} className="px-1.5 py-0.5 text-xs bg-white/10 text-slate-300 rounded uppercase">
                            {rt}
                          </span>
                        ))}
                        {config.allowed_rep_types.length > 3 && (
                          <span className="px-1.5 py-0.5 text-xs bg-white/10 text-slate-400 rounded">
                            +{config.allowed_rep_types.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right text-white">{config.target_accounts_per_rep}</td>
                    <td className="py-2 px-3 text-right text-brand-400">{formatCurrency(config.target_arr_per_rep)}</td>
                    <td className="py-2 px-3 text-right text-slate-300">{config.avg_deal_cycle_days}</td>
                    <td className="py-2 px-3 text-center">
                      {config.requires_se ? (
                        <CheckBadgeIcon className="h-4 w-4 text-emerald-400 mx-auto" />
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {config.requires_field_visit ? (
                        <CheckBadgeIcon className="h-4 w-4 text-emerald-400 mx-auto" />
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Data Source Footnotes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-6"
      >
        <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5" />
          Data Source & Methodology Notes
        </h3>
        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-mono text-xs mt-0.5">¹</span>
            <p>
              <strong className="text-white">MSA Geographic Data:</strong> Top 50 MSAs based on US Census Bureau CBSA definitions (2023).
              Population estimates from American Community Survey 2023.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-mono text-xs mt-0.5">²</span>
            <p>
              <strong className="text-white">Infrastructure Coverage:</strong> Fiber and coax availability percentages are{' '}
              <span className="text-amber-400 font-semibold">placeholder estimates</span> and should be replaced with actual 
              Comcast Business network data from internal systems.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-mono text-xs mt-0.5">³</span>
            <p>
              <strong className="text-white">Sales Headcount & Quotas:</strong> All sales resource allocations (SDR, BDR, AE, AM counts), 
              quota assignments, and attainment figures are{' '}
              <span className="text-amber-400 font-semibold">static placeholder data</span> - NOT generated by LLM. 
              These should be configured via Admin Setup or imported from Dynamics/HRIS systems.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-mono text-xs mt-0.5">⁴</span>
            <p>
              <strong className="text-white">Customer Segment Distribution:</strong> Account counts (Total, HQ, Branch) and ARR by MSA 
              are{' '}<span className="text-amber-400 font-semibold">model estimates</span> based on population/establishment ratios. 
              For accurate data, import from CRM (Dynamics) with location mapping.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-mono text-xs mt-0.5">⁵</span>
            <p>
              <strong className="text-white">TAM/SAM Estimates:</strong> Market sizing based on enterprise establishment counts 
              multiplied by estimated telecom spend. Should be validated against licensed data (Gartner, IDC).
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <InformationCircleIcon className="h-4 w-4" />
            <span>Model Version: 1.0 | Data Loaded: {new Date().toLocaleDateString()}</span>
          </div>
          <div className="text-xs text-slate-500">
            To update with real data, go to <span className="text-brand-400">Admin Setup → CB Data</span>
          </div>
        </div>
      </motion.div>

      <HelpSection
        title="MSA Markets"
        description="Geographic analysis of the top 50 US Metropolitan Statistical Areas. Includes infrastructure coverage (fiber/coax), enterprise establishment counts, sales capacity planning, and AI-generated market intelligence per MSA."
        publicDataSources={[
          { label: 'Census Bureau', description: 'Population and business establishment counts by MSA' },
          { label: 'Bureau of Labor Statistics', description: 'Employment data and economic indicators' },
          { label: 'FCC Broadband Data', description: 'Infrastructure availability and coverage maps' },
          { label: 'Industry Reports', description: 'Enterprise connectivity spending by region' },
        ]}
        cbDataBenefits={[
          'Total ARR scales MSA-level estimates proportionally',
          'Segment distribution reflects your configured tiers',
          'Sales capacity from national config applies to MSA planning',
          'Priority tier scoring considers your strategic markets',
        ]}
        proprietaryDataBenefits={[
          'Actual ARR and accounts per MSA from CRM',
          'Real headcount and quota by territory',
          'Win/loss data by geographic market',
          'Pipeline coverage by MSA',
          'Churn patterns by region',
        ]}
        tips={[
          'Click "Generate Intel" on any MSA to create AI-powered market intelligence',
          'Filter by region or infrastructure type to focus analysis',
          'MSA data footnotes explain estimation methodologies',
          'New York, Philadelphia, and Atlanta are priority Comcast markets',
        ]}
      />
    </div>
  )
}

