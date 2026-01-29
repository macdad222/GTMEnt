import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChevronRightIcon,
  BuildingOffice2Icon,
  ArrowPathIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LightBulbIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { useSegments as useCBSegments } from '../context/CBConfigContext'
import { HelpSection } from '../components/HelpSection'
import { JobProgressToast } from '../components/JobProgressToast'
import { useJobPolling } from '../hooks/useJobPolling'

interface SegmentConfig {
  tier: string
  label: string
  description: string
  mrr_min: number
  mrr_max: number | null
  accounts: number
  arr: number
  avg_mrr: number
  growth_potential: number
  churn_risk: number
  attach_opportunity: number
  typical_industries: string[]
  key_products: string[]
  sales_motion: string
}

interface SegmentIntel {
  id: string
  segment_tier: string
  generated_at: string
  llm_provider: string
  llm_model: string
  executive_summary: string
  tam_estimate: number
  tam_methodology: string
  sam_estimate: number
  growth_rate_cagr: string
  total_market_customers: number
  total_market_revenue: number
  buyer_personas: {
    title: string
    responsibilities: string
    pain_points: string[]
    decision_criteria: string[]
  }[]
  competitive_landscape: string
  primary_competitors: string[]
  competitive_strengths: string[]
  competitive_weaknesses: string[]
  growth_strategies: {
    name: string
    description: string
    impact: string
    complexity: string
    timeline: string
  }[]
  pricing_insights: string
  typical_deal_size: string
  pricing_trends: string[]
  attach_opportunities: {
    product: string
    penetration_rate: string
    revenue_potential: string
    approach: string
  }[]
  key_takeaways: string[]
  sources: string[]
}

interface CBConfiguration {
  segments: SegmentConfig[]
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

function getScoreColor(score: number): string {
  if (score >= 0.7) return 'text-emerald-400'
  if (score >= 0.4) return 'text-amber-400'
  return 'text-red-400'
}

function getScoreBg(score: number): string {
  if (score >= 0.7) return 'bg-emerald-400/20'
  if (score >= 0.4) return 'bg-amber-400/20'
  return 'bg-red-400/20'
}

export function Segments() {
  // Use CB Config context for segment data - auto-refreshes when Admin updates
  const { segments: cbSegments, companyMetrics, lastUpdated } = useCBSegments()
  
  const [segments, setSegments] = useState<SegmentConfig[]>([])
  const [segmentIntel, setSegmentIntel] = useState<{ [tier: string]: SegmentIntel }>({})
  const [loading, setLoading] = useState(true)
  const [expandedIntel, setExpandedIntel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [generatingTier, setGeneratingTier] = useState<string | null>(null)
  
  // Job polling for async segment intel generation
  const {
    isPolling: isGenerating,
    progress,
    progressMessage,
    error: jobError,
    startPolling,
    reset: resetJobPolling,
  } = useJobPolling({
    interval: 2000,
    timeout: 120000, // 2 minutes
    onComplete: async () => {
      // Refresh segment intel after generation completes
      if (generatingTier) {
        const res = await fetch(`/api/cb-config/segments/${generatingTier}/intel`)
        if (res.ok) {
          const data = await res.json()
          if (data.intel) {
            setSegmentIntel(prev => ({ ...prev, [generatingTier]: data.intel }))
            setExpandedIntel(generatingTier)
          }
        }
        setGeneratingTier(null)
      }
    },
    onError: (err) => {
      setError(err || 'Failed to generate intel')
      setGeneratingTier(null)
    }
  })
  
  // Combined generating state for backward compatibility
  const generatingIntel = isGenerating ? generatingTier : null

  // Update local segments when context changes
  useEffect(() => {
    if (cbSegments && cbSegments.length > 0) {
      setSegments(cbSegments as SegmentConfig[])
    }
  }, [cbSegments])

  useEffect(() => {
    fetchData()
  }, [lastUpdated]) // Re-fetch when CB config is updated

  const fetchData = async () => {
    setLoading(true)
    try {
      const [configRes, intelRes] = await Promise.all([
        fetch('/api/cb-config'),
        fetch('/api/cb-config/intel/all'),
      ])

      if (configRes.ok) {
        const config: CBConfiguration = await configRes.json()
        setSegments(config.segments)
      }

      if (intelRes.ok) {
        const intelData = await intelRes.json()
        setSegmentIntel(intelData.intel || {})
      }
    } catch (err) {
      console.error('Failed to fetch segment data:', err)
      setError('Failed to load segment data')
    } finally {
      setLoading(false)
    }
  }

  const generateIntel = async (tier: string) => {
    setGeneratingTier(tier)
    setError(null)
    resetJobPolling()
    
    try {
      const res = await fetch(`/api/cb-config/segments/${tier}/intel/generate?force=true`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        
        // New async API returns job_id
        if (data.job_id) {
          startPolling(data.job_id)
        } else if (data.intel) {
          // Fallback for sync response
          setSegmentIntel(prev => ({
            ...prev,
            [tier]: data.intel,
          }))
          setExpandedIntel(tier)
          setGeneratingTier(null)
        }
      } else {
        const errorData = await res.json()
        setError(errorData.detail || 'Failed to generate intel')
        setGeneratingTier(null)
      }
    } catch (err) {
      console.error('Failed to generate intel:', err)
      setError('Failed to generate intel. Please check LLM configuration.')
      setGeneratingTier(null)
    }
  }

  // Use company_metrics enterprise_arr if available (user-entered value), otherwise sum segments
  const totalArr = companyMetrics?.enterprise_arr || segments.reduce((sum, s) => sum + s.arr, 0)
  const totalAccounts = companyMetrics?.enterprise_accounts || segments.reduce((sum, s) => sum + s.accounts, 0)

  if (loading) {
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
        <h1 className="text-2xl font-bold text-white">Segment Analysis</h1>
        <p className="mt-1 text-sm text-slate-400">
          Enterprise segments by MRR tier with scoring, opportunity sizing, and AI-powered market intelligence
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-red-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl card-gradient border border-white/10 p-6"
        >
          <p className="text-sm text-slate-400">Total Enterprise ARR</p>
          <p className="mt-2 text-3xl font-bold text-white tabular-nums">
            {formatCurrency(totalArr)}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl card-gradient border border-white/10 p-6"
        >
          <p className="text-sm text-slate-400">Total Accounts</p>
          <p className="mt-2 text-3xl font-bold text-white tabular-nums">
            {totalAccounts.toLocaleString()}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl card-gradient border border-white/10 p-6"
        >
          <p className="text-sm text-slate-400">Segments</p>
          <p className="mt-2 text-3xl font-bold text-white tabular-nums">
            {segments.length}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl card-gradient border border-white/10 p-6"
        >
          <p className="text-sm text-slate-400">Intel Generated</p>
          <p className="mt-2 text-3xl font-bold text-brand-400 tabular-nums">
            {Object.keys(segmentIntel).length} / {segments.length}
          </p>
        </motion.div>
      </div>

      {/* Segment cards */}
      <div className="space-y-6">
        {segments.map((segment, index) => {
          const intel = segmentIntel[segment.tier]
          const isExpanded = expandedIntel === segment.tier
          const isGenerating = generatingIntel === segment.tier

          return (
            <motion.div
              key={segment.tier}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="rounded-xl card-gradient border border-white/10 overflow-hidden"
            >
              {/* Segment Header */}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/20">
                      <BuildingOffice2Icon className="h-6 w-6 text-brand-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{segment.label}</h3>
                      <p className="text-sm text-slate-400">{segment.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 text-xs bg-white/10 text-slate-400 rounded capitalize">
                          {segment.sales_motion.replace('-', ' ')}
                        </span>
                        {intel && (
                          <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-brand-500/20 text-brand-400 rounded">
                            <SparklesIcon className="h-3 w-3" />
                            Intel Available
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => generateIntel(segment.tier)}
                      disabled={isGenerating}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isGenerating
                          ? 'bg-brand-500/20 text-brand-400 cursor-wait'
                          : intel
                          ? 'bg-white/10 text-white hover:bg-white/20'
                          : 'bg-brand-600 text-white hover:bg-brand-500'
                      }`}
                    >
                      {isGenerating ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="h-4 w-4" />
                          {intel ? 'Refresh Intel' : 'Generate Intel'}
                        </>
                      )}
                    </button>
                    <Link
                      to={`/segments/${segment.tier}`}
                      className="p-2 text-slate-400 hover:text-brand-400 transition-colors"
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </Link>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-6">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">ARR</p>
                    <p className="mt-1 text-lg font-semibold text-white tabular-nums">
                      {formatCurrency(segment.arr)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Accounts</p>
                    <p className="mt-1 text-lg font-semibold text-white tabular-nums">
                      {segment.accounts.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Avg MRR</p>
                    <p className="mt-1 text-lg font-semibold text-white tabular-nums">
                      {formatCurrency(segment.avg_mrr)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Growth Potential</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`text-lg font-semibold tabular-nums ${getScoreColor(segment.growth_potential)}`}>
                        {(segment.growth_potential * 100).toFixed(0)}%
                      </span>
                      <ArrowTrendingUpIcon className={`h-4 w-4 ${getScoreColor(segment.growth_potential)}`} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Churn Risk</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`text-lg font-semibold tabular-nums ${
                        segment.churn_risk <= 0.1 ? 'text-emerald-400' : 
                        segment.churn_risk <= 0.2 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {(segment.churn_risk * 100).toFixed(0)}%
                      </span>
                      <ArrowTrendingDownIcon className={`h-4 w-4 ${
                        segment.churn_risk <= 0.1 ? 'text-emerald-400' : 
                        segment.churn_risk <= 0.2 ? 'text-amber-400' : 'text-red-400'
                      }`} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Attach Opportunity</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`text-lg font-semibold tabular-nums ${getScoreColor(segment.attach_opportunity)}`}>
                        {(segment.attach_opportunity * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score bars */}
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Growth Potential</span>
                      <span>{(segment.growth_potential * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5">
                      <div 
                        className={`h-full rounded-full ${getScoreBg(segment.growth_potential)}`}
                        style={{ width: `${segment.growth_potential * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Churn Risk</span>
                      <span>{(segment.churn_risk * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5">
                      <div 
                        className="h-full rounded-full bg-red-400/20"
                        style={{ width: `${segment.churn_risk * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Attach Opportunity</span>
                      <span>{(segment.attach_opportunity * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5">
                      <div 
                        className={`h-full rounded-full ${getScoreBg(segment.attach_opportunity)}`}
                        style={{ width: `${segment.attach_opportunity * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Intel Section */}
              {intel && (
                <>
                  <button
                    onClick={() => setExpandedIntel(isExpanded ? null : segment.tier)}
                    className="w-full px-6 py-3 border-t border-white/10 flex items-center justify-between bg-brand-500/5 hover:bg-brand-500/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <SparklesIcon className="h-4 w-4 text-brand-400" />
                      <span className="text-sm font-medium text-white">AI Market Intelligence</span>
                      <span className="text-xs text-slate-500">
                        Generated {new Date(intel.generated_at).toLocaleDateString()}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUpIcon className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-slate-400" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 space-y-6 bg-white/[0.02]">
                          {/* Executive Summary */}
                          <div>
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                              <LightBulbIcon className="h-4 w-4 text-brand-400" />
                              Executive Summary
                            </h4>
                            <p className="text-sm text-slate-300 leading-relaxed">
                              {intel.executive_summary}
                            </p>
                          </div>

                          {/* Total Market Sizing */}
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
                            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30">
                              <p className="text-3xl font-bold text-purple-400">
                                {intel.total_market_customers ? intel.total_market_customers.toLocaleString() : 'N/A'}
                              </p>
                              <p className="text-sm text-slate-300 mt-1">Total Market Customers</p>
                              <p className="text-xs text-slate-500">Businesses in this segment nationally</p>
                            </div>
                            <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30">
                              <p className="text-3xl font-bold text-cyan-400">
                                {intel.total_market_revenue ? formatCurrency(intel.total_market_revenue) : 'N/A'}
                              </p>
                              <p className="text-sm text-slate-300 mt-1">Total Market Revenue</p>
                              <p className="text-xs text-slate-500">Entire market annual spend</p>
                            </div>
                          </div>

                          {/* TAM/SAM */}
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <div className="p-4 rounded-lg bg-white/5">
                              <p className="text-2xl font-bold text-brand-400">{formatCurrency(intel.tam_estimate)}</p>
                              <p className="text-xs text-slate-400">Total Addressable Market</p>
                            </div>
                            <div className="p-4 rounded-lg bg-white/5">
                              <p className="text-2xl font-bold text-accent-400">{formatCurrency(intel.sam_estimate)}</p>
                              <p className="text-xs text-slate-400">Serviceable Available Market</p>
                            </div>
                            <div className="p-4 rounded-lg bg-white/5">
                              <p className="text-2xl font-bold text-emerald-400">{intel.growth_rate_cagr}</p>
                              <p className="text-xs text-slate-400">Growth Rate (CAGR)</p>
                            </div>
                            <div className="p-4 rounded-lg bg-white/5">
                              <p className="text-2xl font-bold text-white">{intel.typical_deal_size}</p>
                              <p className="text-xs text-slate-400">Typical Deal Size</p>
                            </div>
                          </div>

                          {/* Buyer Personas */}
                          {intel.buyer_personas && intel.buyer_personas.length > 0 && (
                            <div>
                              <h4 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                                <UserGroupIcon className="h-4 w-4 text-brand-400" />
                                Key Buyer Personas
                              </h4>
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {intel.buyer_personas.slice(0, 3).map((persona, i) => (
                                  <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/5">
                                    <p className="font-medium text-white">{persona.title}</p>
                                    <p className="text-xs text-slate-400 mt-1">{persona.responsibilities}</p>
                                    <div className="mt-2">
                                      <p className="text-xs text-slate-500 mb-1">Pain Points:</p>
                                      <ul className="text-xs text-slate-400 space-y-0.5">
                                        {persona.pain_points?.slice(0, 2).map((pp, j) => (
                                          <li key={j}>• {pp}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Growth Strategies */}
                          {intel.growth_strategies && intel.growth_strategies.length > 0 && (
                            <div>
                              <h4 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                                <RocketLaunchIcon className="h-4 w-4 text-brand-400" />
                                Growth Strategies
                              </h4>
                              <div className="space-y-2">
                                {intel.growth_strategies.slice(0, 4).map((strategy, i) => (
                                  <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/5">
                                    <div className="flex items-center justify-between">
                                      <p className="font-medium text-white text-sm">{strategy.name}</p>
                                      <div className="flex gap-2">
                                        <span className={`px-2 py-0.5 text-xs rounded ${
                                          strategy.impact === 'high' ? 'bg-emerald-500/20 text-emerald-400' :
                                          strategy.impact === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                          'bg-slate-500/20 text-slate-400'
                                        }`}>
                                          {strategy.impact} impact
                                        </span>
                                        <span className="px-2 py-0.5 text-xs bg-white/10 text-slate-400 rounded">
                                          {strategy.timeline}
                                        </span>
                                      </div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">{strategy.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Competitive Analysis */}
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <h4 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                                <ShieldCheckIcon className="h-4 w-4 text-emerald-400" />
                                Competitive Strengths
                              </h4>
                              <ul className="space-y-1">
                                {intel.competitive_strengths?.slice(0, 4).map((s, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                    <span className="text-emerald-400 mt-0.5">+</span>
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                                <ExclamationTriangleIcon className="h-4 w-4 text-amber-400" />
                                Areas for Improvement
                              </h4>
                              <ul className="space-y-1">
                                {intel.competitive_weaknesses?.slice(0, 4).map((w, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                    <span className="text-amber-400 mt-0.5">–</span>
                                    {w}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Key Takeaways */}
                          {intel.key_takeaways && intel.key_takeaways.length > 0 && (
                            <div className="p-4 rounded-lg bg-brand-500/10 border border-brand-500/30">
                              <h4 className="text-sm font-semibold text-brand-300 mb-2">Key Takeaways</h4>
                              <ul className="grid gap-2 sm:grid-cols-2">
                                {intel.key_takeaways.map((takeaway, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-brand-200/80">
                                    <span className="text-brand-400">→</span>
                                    {takeaway}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Model Info */}
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <SparklesIcon className="h-3 w-3" />
                            <span>Generated by {intel.llm_provider} / {intel.llm_model}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          )
        })}
      </div>

      <HelpSection
        title="Segments"
        description="Enterprise segment analysis for MRR-based tiers (E1-E5). Each segment has unique characteristics, buyer personas, and growth opportunities. Use AI-generated market intelligence to understand TAM/SAM, competitive landscape, and optimal strategies per segment."
        publicDataSources={[
          { label: 'Industry Verticals', description: 'Vertical market sizing and growth from analyst reports' },
          { label: 'Business Demographics', description: 'Company size distribution from Census Business Patterns' },
          { label: 'Technology Adoption', description: 'Enterprise connectivity and cloud adoption trends' },
        ]}
        cbDataBenefits={[
          'Accurate segment ARR and account counts from your configuration',
          'MRR bands aligned to your actual pricing structure',
          'Growth potential and churn risk scores per segment',
          'Key products and sales motion alignment',
        ]}
        proprietaryDataBenefits={[
          'Actual account distribution from Dynamics CRM',
          'True product penetration by segment',
          'Win/loss patterns by segment and competitor',
          'Churn signals from ServiceNow tickets',
          'Expansion pipeline from Orion CPQ',
        ]}
        tips={[
          'Click "Generate Intel" on any segment to create AI-powered market intelligence',
          'Segment data updates automatically when you change CB Config in Admin Setup',
          'E1 (Strategic) accounts typically require field sales and SE support',
        ]}
      />
      
      {/* Job Progress Toast */}
      <JobProgressToast
        isVisible={isGenerating}
        title={`Generating ${generatingTier || 'Segment'} Intel`}
        progress={progress}
        progressMessage={progressMessage}
        status={isGenerating ? 'in_progress' : null}
        error={jobError}
        onDismiss={resetJobPolling}
      />
    </div>
  )
}
