import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RocketLaunchIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  PhoneIcon,
  ServerIcon,
  DevicePhoneMobileIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'
import { HelpSection } from '../components/HelpSection'
import { JobProgressToast } from '../components/JobProgressToast'
import { useJobPolling } from '../hooks/useJobPolling'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// Types
interface ProductPortfolio {
  id: string
  name: string
  category: string
  description: string
  current_penetration_pct: number
  yoy_growth_pct: number
  market_position: string
  market_rank: number
  key_competitors: string[]
  competitive_strengths: string[]
  competitive_gaps: string[]
  is_launched: boolean
  launch_date: string | null
  maturity: string
}

interface CompetitiveAnalysis {
  category: string
  category_label: string
  cb_products: string[]
  overall_position: string
  market_share_pct: number | null
  tam_billions: number
  cagr_pct: number
  market_leaders: string[]
  feature_gaps: string[]
  coverage_gaps: string[]
  pricing_position: string
  strategic_fit: string
  growth_opportunity: string
  risk_factors: string[]
}

interface RoadmapRecommendation {
  id: string
  title: string
  description: string
  category: string
  recommendation_type: string
  priority: string
  revenue_impact_millions: number
  margin_impact_pct: number
  time_to_value_months: number
  estimated_investment_millions: number
  requires_partnership: boolean
  partner_candidates: string[]
  phase: string
  dependencies: string[]
  rationale: string
  success_metrics: string[]
}

interface ProductRoadmapIntel {
  id: string
  generated_at: string
  llm_provider: string
  llm_model: string
  executive_summary: string
  portfolio_health_score: number
  portfolio_strengths: string[]
  portfolio_weaknesses: string[]
  product_assessments: ProductPortfolio[]
  competitive_analysis: CompetitiveAnalysis[]
  roadmap_recommendations: RoadmapRecommendation[]
  total_recommended_investment_millions: number
  expected_revenue_impact_millions: number
  expected_roi_pct: number
  strategic_themes: string[]
  market_trends: string[]
  key_risks: string[]
  mitigation_strategies: string[]
  sources: string[]
  methodology_notes: string
}

// Category icons and colors
const categoryConfig: Record<string, { icon: typeof RocketLaunchIcon; color: string; bgColor: string }> = {
  connectivity: { icon: GlobeAltIcon, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  secure_networking: { icon: ShieldCheckIcon, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  cybersecurity: { icon: ShieldCheckIcon, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  voice_collab: { icon: PhoneIcon, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  data_center: { icon: ServerIcon, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  mobile: { icon: DevicePhoneMobileIcon, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
}

const priorityColors: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  maintain: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

const positionColors: Record<string, string> = {
  leader: 'text-emerald-400',
  strong: 'text-blue-400',
  growing: 'text-cyan-400',
  challenger: 'text-amber-400',
  emerging: 'text-purple-400',
  not_yet: 'text-slate-400',
}

export function ProductRoadmap() {
  const [loading, setLoading] = useState(true)
  const [portfolio, setPortfolio] = useState<ProductPortfolio[]>([])
  const [intel, setIntel] = useState<ProductRoadmapIntel | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'competitive' | 'roadmap' | 'investment'>('overview')
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)
  const [expandedRec, setExpandedRec] = useState<string | null>(null)
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null)
  
  // Job polling for async product roadmap analysis
  const {
    isPolling: generating,
    progress,
    progressMessage,
    error: jobError,
    startPolling,
    reset: resetJobPolling,
  } = useJobPolling({
    interval: 2000,
    timeout: 180000, // 3 minutes
    onComplete: async () => {
      // Refresh intel after generation completes
      const intelRes = await fetch('/api/product-roadmap/intel')
      if (intelRes.ok) {
        const data = await intelRes.json()
        if (data.intel) setIntel(data.intel)
      }
    },
    onError: (err) => {
      console.error('Product roadmap analysis failed:', err)
    }
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [portfolioRes, intelRes] = await Promise.all([
        fetch('/api/product-roadmap/portfolio'),
        fetch('/api/product-roadmap/intel'),
      ])

      if (portfolioRes.ok) {
        const data = await portfolioRes.json()
        setPortfolio(data.products)
      }

      if (intelRes.ok) {
        const data = await intelRes.json()
        if (data.status === 'generated' && data.intel) {
          setIntel(data.intel)
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateIntel = async () => {
    resetJobPolling()
    
    try {
      const res = await fetch('/api/product-roadmap/intel/generate?force=true', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        
        // New async API returns job_id
        if (data.job_id) {
          startPolling(data.job_id)
        } else if (data.intel) {
          // Fallback for sync response
          setIntel(data.intel)
        }
      }
    } catch (err) {
      console.error('Failed to generate intel:', err)
    }
  }

  const formatCurrency = (value: number): string => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`
    return `$${value.toFixed(0)}M`
  }

  // Prepare chart data
  const portfolioByCategory = portfolio.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {} as Record<string, ProductPortfolio[]>)

  const categoryChartData = Object.entries(portfolioByCategory).map(([cat, products]) => ({
    category: cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    products: products.length,
    avgPenetration: products.reduce((s, p) => s + p.current_penetration_pct, 0) / products.length,
    avgGrowth: products.reduce((s, p) => s + p.yoy_growth_pct, 0) / products.length,
  }))

  const investmentByPhase = intel?.roadmap_recommendations.reduce((acc, rec) => {
    if (!acc[rec.phase]) acc[rec.phase] = { investment: 0, revenue: 0, count: 0 }
    acc[rec.phase].investment += rec.estimated_investment_millions
    acc[rec.phase].revenue += rec.revenue_impact_millions
    acc[rec.phase].count += 1
    return acc
  }, {} as Record<string, { investment: number; revenue: number; count: number }>) || {}

  const phaseChartData = Object.entries(investmentByPhase).map(([phase, data]) => ({
    phase,
    investment: data.investment,
    revenue: data.revenue,
    count: data.count,
  })).sort((a, b) => a.phase.localeCompare(b.phase))

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Product Competitiveness & Roadmap</h1>
          <p className="mt-1 text-sm text-slate-400">
            Strategic analysis of CB's enterprise product portfolio with AI-powered recommendations
          </p>
        </div>
        <div className="flex items-center gap-3">
          {intel && (
            <div className="text-right text-xs text-slate-500">
              <p>Generated: {new Date(intel.generated_at).toLocaleString()}</p>
              <p>{intel.llm_provider} / {intel.llm_model}</p>
            </div>
          )}
          <button
            onClick={generateIntel}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-accent-600 text-white rounded-lg hover:from-brand-500 hover:to-accent-500 disabled:opacity-50 transition-all"
          >
            {generating ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Generating Analysis...
              </>
            ) : (
              <>
                <SparklesIcon className="h-5 w-5" />
                {intel ? 'Regenerate Analysis' : 'Generate Analysis'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl card-gradient border border-white/10 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/20">
              <RocketLaunchIcon className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{portfolio.length}</p>
              <p className="text-xs text-slate-400">Products</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl card-gradient border border-white/10 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
              <CheckCircleIcon className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">
                {portfolio.filter(p => p.is_launched).length}
              </p>
              <p className="text-xs text-slate-400">Launched</p>
            </div>
          </div>
        </motion.div>

        {intel && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl card-gradient border border-white/10 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                  <ChartBarIcon className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">{intel.portfolio_health_score}</p>
                  <p className="text-xs text-slate-400">Health Score</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-xl card-gradient border border-white/10 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
                  <LightBulbIcon className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400">{intel.roadmap_recommendations.length}</p>
                  <p className="text-xs text-slate-400">Recommendations</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl card-gradient border border-white/10 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20">
                  <BanknotesIcon className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-cyan-400">
                    {formatCurrency(intel.total_recommended_investment_millions)}
                  </p>
                  <p className="text-xs text-slate-400">Investment</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-xl card-gradient border border-white/10 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
                  <ArrowTrendingUpIcon className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{intel.expected_roi_pct.toFixed(0)}%</p>
                  <p className="text-xs text-slate-400">Expected ROI</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-white/10">
        <nav className="flex gap-6">
          {[
            { id: 'overview', label: 'Portfolio Overview', icon: RocketLaunchIcon },
            { id: 'competitive', label: 'Competitive Analysis', icon: ChartBarIcon },
            { id: 'roadmap', label: 'Roadmap Recommendations', icon: LightBulbIcon },
            { id: 'investment', label: 'Investment Summary', icon: CurrencyDollarIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Executive Summary (if intel exists) */}
      {intel && activeTab === 'overview' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl bg-gradient-to-br from-brand-600/20 to-accent-600/20 border border-brand-500/30 p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-brand-400" />
            Executive Summary
          </h3>
          <div className="prose prose-invert prose-sm max-w-none">
            <p className="text-slate-300 whitespace-pre-line">{intel.executive_summary}</p>
          </div>
          
          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 gap-6 mt-6 sm:grid-cols-2">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <h4 className="font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5" />
                Portfolio Strengths
              </h4>
              <ul className="space-y-2">
                {intel.portfolio_strengths.map((strength, i) => (
                  <li key={i} className="text-sm text-emerald-200 flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <h4 className="font-semibold text-amber-400 mb-3 flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5" />
                Areas for Investment
              </h4>
              <ul className="space-y-2">
                {intel.portfolio_weaknesses.map((weakness, i) => (
                  <li key={i} className="text-sm text-amber-200 flex items-start gap-2">
                    <span className="text-amber-400 mt-1">•</span>
                    {weakness}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Portfolio Overview Tab */}
      {activeTab === 'overview' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Category Chart */}
          <div className="rounded-xl card-gradient border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Portfolio by Category</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="avgPenetration" name="Avg Penetration %" fill="#0084f4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgGrowth" name="Avg YoY Growth %" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portfolio.map((product) => {
              const config = categoryConfig[product.category] || categoryConfig.connectivity
              const Icon = config.icon
              const isExpanded = expandedProduct === product.id

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl card-gradient border transition-all ${
                    product.is_launched ? 'border-white/10' : 'border-dashed border-amber-500/30'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.bgColor}`}>
                          <Icon className={`h-5 w-5 ${config.color}`} />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{product.name}</h4>
                          <p className="text-xs text-slate-400 capitalize">{product.category.replace('_', ' ')}</p>
                        </div>
                      </div>
                      {!product.is_launched && (
                        <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded border border-amber-500/30">
                          {product.launch_date}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">{product.description}</p>

                    {product.is_launched && (
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="p-2 rounded bg-white/5 text-center">
                          <p className="text-lg font-semibold text-white">{product.current_penetration_pct}%</p>
                          <p className="text-xs text-slate-500">Penetration</p>
                        </div>
                        <div className="p-2 rounded bg-white/5 text-center">
                          <p className={`text-lg font-semibold ${product.yoy_growth_pct > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {product.yoy_growth_pct > 0 ? '+' : ''}{product.yoy_growth_pct}%
                          </p>
                          <p className="text-xs text-slate-500">YoY Growth</p>
                        </div>
                        <div className="p-2 rounded bg-white/5 text-center">
                          <p className={`text-lg font-semibold ${positionColors[product.market_position]}`}>
                            #{product.market_rank}
                          </p>
                          <p className="text-xs text-slate-500">Market Rank</p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                      className="w-full flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      {isExpanded ? (
                        <>Less <ChevronUpIcon className="h-4 w-4" /></>
                      ) : (
                        <>More Details <ChevronDownIcon className="h-4 w-4" /></>
                      )}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 mt-4 border-t border-white/10 space-y-3">
                            <div>
                              <p className="text-xs font-medium text-slate-400 mb-1">Key Competitors</p>
                              <div className="flex flex-wrap gap-1">
                                {product.key_competitors.slice(0, 4).map((comp, i) => (
                                  <span key={i} className="px-2 py-0.5 text-xs bg-slate-700/50 text-slate-300 rounded">
                                    {comp}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-emerald-400 mb-1">Strengths</p>
                              <ul className="space-y-1">
                                {product.competitive_strengths.map((s, i) => (
                                  <li key={i} className="text-xs text-slate-300">• {s}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-amber-400 mb-1">Gaps to Close</p>
                              <ul className="space-y-1">
                                {product.competitive_gaps.map((g, i) => (
                                  <li key={i} className="text-xs text-slate-300">• {g}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Competitive Analysis Tab */}
      {activeTab === 'competitive' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {!intel ? (
            <div className="rounded-xl card-gradient border border-white/10 p-12 text-center">
              <SparklesIcon className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Generate Analysis First</h3>
              <p className="text-sm text-slate-400 mb-6">
                Click "Generate Analysis" to get AI-powered competitive intelligence for each product category.
              </p>
              <button
                onClick={generateIntel}
                disabled={generating}
                className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50"
              >
                Generate Analysis
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {intel.competitive_analysis.map((analysis, index) => {
                const config = categoryConfig[analysis.category] || categoryConfig.connectivity
                const Icon = config.icon

                return (
                  <motion.div
                    key={analysis.category}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="rounded-xl card-gradient border border-white/10 overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${config.bgColor}`}>
                            <Icon className={`h-6 w-6 ${config.color}`} />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">{analysis.category_label}</h3>
                            <p className="text-sm text-slate-400">
                              CB Products: {analysis.cb_products.join(', ')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-semibold capitalize ${positionColors[analysis.overall_position]}`}>
                            {analysis.overall_position}
                          </p>
                          {analysis.market_share_pct && (
                            <p className="text-sm text-slate-400">{analysis.market_share_pct}% market share</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
                        <div className="p-3 rounded-lg bg-white/5">
                          <p className="text-xl font-bold text-white">${analysis.tam_billions}B</p>
                          <p className="text-xs text-slate-400">TAM</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5">
                          <p className="text-xl font-bold text-emerald-400">{analysis.cagr_pct}%</p>
                          <p className="text-xs text-slate-400">CAGR</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5">
                          <p className="text-xl font-bold text-white">{analysis.market_leaders.length}</p>
                          <p className="text-xs text-slate-400">Major Players</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5">
                          <p className="text-lg font-semibold text-white capitalize">{analysis.pricing_position}</p>
                          <p className="text-xs text-slate-400">Pricing Position</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium text-slate-400 mb-2">Market Leaders</p>
                          <div className="flex flex-wrap gap-2">
                            {analysis.market_leaders.map((leader, i) => (
                              <span key={i} className="px-2 py-1 text-xs bg-slate-700/50 text-slate-300 rounded">
                                {leader}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-400 mb-2">Strategic Fit</p>
                          <p className="text-sm text-slate-300">{analysis.strategic_fit}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 mt-4 sm:grid-cols-2">
                        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <p className="text-xs font-medium text-amber-400 mb-2">Feature Gaps</p>
                          <ul className="space-y-1">
                            {analysis.feature_gaps.map((gap, i) => (
                              <li key={i} className="text-sm text-amber-200">• {gap}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-xs font-medium text-emerald-400 mb-2">Growth Opportunity</p>
                          <p className="text-sm text-emerald-200">{analysis.growth_opportunity}</p>
                        </div>
                      </div>

                      {analysis.risk_factors.length > 0 && (
                        <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                          <p className="text-xs font-medium text-red-400 mb-2">Risk Factors</p>
                          <div className="flex flex-wrap gap-2">
                            {analysis.risk_factors.map((risk, i) => (
                              <span key={i} className="px-2 py-1 text-xs bg-red-500/20 text-red-300 rounded">
                                {risk}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Roadmap Recommendations Tab */}
      {activeTab === 'roadmap' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {!intel ? (
            <div className="rounded-xl card-gradient border border-white/10 p-12 text-center">
              <LightBulbIcon className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Generate Analysis First</h3>
              <p className="text-sm text-slate-400 mb-6">
                Click "Generate Analysis" to get AI-powered roadmap recommendations.
              </p>
              <button
                onClick={generateIntel}
                disabled={generating}
                className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50"
              >
                Generate Analysis
              </button>
            </div>
          ) : (
            <>
              {/* Phase Filter */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-400">Filter by Phase:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPhase(null)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      !selectedPhase ? 'bg-brand-600 text-white' : 'bg-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  {['2026', '2027', '2028', '2028+'].map(phase => (
                    <button
                      key={phase}
                      onClick={() => setSelectedPhase(phase)}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        selectedPhase === phase ? 'bg-brand-600 text-white' : 'bg-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {phase}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-4">
                {intel.roadmap_recommendations
                  .filter(rec => !selectedPhase || rec.phase === selectedPhase)
                  .map((rec, index) => {
                    const config = categoryConfig[rec.category] || categoryConfig.connectivity
                    const Icon = config.icon
                    const isExpanded = expandedRec === rec.id

                    return (
                      <motion.div
                        key={rec.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="rounded-xl card-gradient border border-white/10 overflow-hidden"
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-4">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${config.bgColor} flex-shrink-0`}>
                              <Icon className={`h-6 w-6 ${config.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 text-xs rounded border ${priorityColors[rec.priority]}`}>
                                      {rec.priority.toUpperCase()}
                                    </span>
                                    <span className="px-2 py-0.5 text-xs bg-slate-700/50 text-slate-300 rounded">
                                      {rec.phase}
                                    </span>
                                    <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded capitalize">
                                      {rec.recommendation_type}
                                    </span>
                                  </div>
                                  <h4 className="font-semibold text-white">{rec.title}</h4>
                                  <p className="text-sm text-slate-400 mt-1">{rec.description}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-lg font-bold text-emerald-400">
                                    +${rec.revenue_impact_millions}M
                                  </p>
                                  <p className="text-xs text-slate-400">Revenue Impact</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 mt-4 sm:grid-cols-4">
                                <div className="p-2 rounded bg-white/5">
                                  <p className="text-sm font-semibold text-white">
                                    ${rec.estimated_investment_millions}M
                                  </p>
                                  <p className="text-xs text-slate-500">Investment</p>
                                </div>
                                <div className="p-2 rounded bg-white/5">
                                  <p className="text-sm font-semibold text-white">
                                    {rec.time_to_value_months} mo
                                  </p>
                                  <p className="text-xs text-slate-500">Time to Value</p>
                                </div>
                                <div className="p-2 rounded bg-white/5">
                                  <p className="text-sm font-semibold text-white">
                                    {rec.margin_impact_pct}%
                                  </p>
                                  <p className="text-xs text-slate-500">Margin Impact</p>
                                </div>
                                <div className="p-2 rounded bg-white/5">
                                  <p className="text-sm font-semibold text-white">
                                    {rec.requires_partnership ? 'Yes' : 'No'}
                                  </p>
                                  <p className="text-xs text-slate-500">Partnership</p>
                                </div>
                              </div>

                              <button
                                onClick={() => setExpandedRec(isExpanded ? null : rec.id)}
                                className="mt-4 flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                              >
                                {isExpanded ? (
                                  <>Less Details <ChevronUpIcon className="h-4 w-4" /></>
                                ) : (
                                  <>More Details <ChevronDownIcon className="h-4 w-4" /></>
                                )}
                              </button>

                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="pt-4 mt-4 border-t border-white/10 space-y-4">
                                      <div>
                                        <p className="text-xs font-medium text-slate-400 mb-2">Strategic Rationale</p>
                                        <p className="text-sm text-slate-300">{rec.rationale}</p>
                                      </div>

                                      {rec.partner_candidates.length > 0 && (
                                        <div>
                                          <p className="text-xs font-medium text-slate-400 mb-2">Potential Partners</p>
                                          <div className="flex flex-wrap gap-2">
                                            {rec.partner_candidates.map((partner, i) => (
                                              <span key={i} className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded">
                                                {partner}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {rec.dependencies.length > 0 && (
                                        <div>
                                          <p className="text-xs font-medium text-slate-400 mb-2">Dependencies</p>
                                          <div className="flex flex-wrap gap-2">
                                            {rec.dependencies.map((dep, i) => (
                                              <span key={i} className="px-2 py-1 text-xs bg-slate-700/50 text-slate-300 rounded">
                                                {dep}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      <div>
                                        <p className="text-xs font-medium text-slate-400 mb-2">Success Metrics</p>
                                        <ul className="space-y-1">
                                          {rec.success_metrics.map((metric, i) => (
                                            <li key={i} className="text-sm text-slate-300 flex items-center gap-2">
                                              <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
                                              {metric}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Investment Summary Tab */}
      {activeTab === 'investment' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {!intel ? (
            <div className="rounded-xl card-gradient border border-white/10 p-12 text-center">
              <CurrencyDollarIcon className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Generate Analysis First</h3>
              <p className="text-sm text-slate-400 mb-6">
                Click "Generate Analysis" to see investment summary and ROI projections.
              </p>
              <button
                onClick={generateIntel}
                disabled={generating}
                className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50"
              >
                Generate Analysis
              </button>
            </div>
          ) : (
            <>
              {/* Investment Overview */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-xl bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/20">
                      <BanknotesIcon className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-cyan-400">
                        {formatCurrency(intel.total_recommended_investment_millions)}
                      </p>
                      <p className="text-sm text-cyan-200">Total Investment (2026-2028)</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-gradient-to-br from-emerald-600/20 to-green-600/20 border border-emerald-500/30 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
                      <ArrowTrendingUpIcon className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-emerald-400">
                        {formatCurrency(intel.expected_revenue_impact_millions)}
                      </p>
                      <p className="text-sm text-emerald-200">Expected Revenue Impact</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20">
                      <ChartBarIcon className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-purple-400">
                        {intel.expected_roi_pct.toFixed(0)}%
                      </p>
                      <p className="text-sm text-purple-200">Expected ROI</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Investment by Phase Chart */}
              <div className="rounded-xl card-gradient border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Investment & Revenue by Phase</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={phaseChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="phase" tick={{ fill: '#94a3b8' }} />
                      <YAxis tick={{ fill: '#94a3b8' }} tickFormatter={(v) => `$${v}M`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        formatter={(value: number) => [`$${value}M`, '']}
                      />
                      <Legend />
                      <Bar dataKey="investment" name="Investment" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="revenue" name="Revenue Impact" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Strategic Themes & Market Trends */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl card-gradient border border-white/10 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <LightBulbIcon className="h-5 w-5 text-amber-400" />
                    Strategic Themes
                  </h3>
                  <ul className="space-y-3">
                    {intel.strategic_themes.map((theme, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm text-slate-300">{theme}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl card-gradient border border-white/10 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-400" />
                    Market Trends
                  </h3>
                  <ul className="space-y-3">
                    {intel.market_trends.map((trend, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm text-slate-300">{trend}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Risks & Mitigations */}
              <div className="rounded-xl card-gradient border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  Key Risks & Mitigations
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm font-medium text-red-400 mb-3">Key Risks</p>
                    <ul className="space-y-2">
                      {intel.key_risks.map((risk, i) => (
                        <li key={i} className="text-sm text-red-200 flex items-start gap-2">
                          <span className="text-red-400 mt-1">•</span>
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm font-medium text-blue-400 mb-3">Mitigation Strategies</p>
                    <ul className="space-y-2">
                      {intel.mitigation_strategies.map((strategy, i) => (
                        <li key={i} className="text-sm text-blue-200 flex items-start gap-2">
                          <span className="text-blue-400 mt-1">•</span>
                          {strategy}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Sources */}
              <div className="rounded-xl bg-slate-800/50 border border-white/10 p-6">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Data Sources & Methodology</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {intel.sources.map((source, i) => (
                    <span key={i} className="px-2 py-1 text-xs bg-slate-700/50 text-slate-400 rounded">
                      {source}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-500">{intel.methodology_notes}</p>
              </div>
            </>
          )}
        </motion.div>
      )}

      <HelpSection
        title="Product Roadmap"
        description="Product competitiveness analysis across all portfolio categories (Broadband, Ethernet, SD-WAN, SASE, UCaaS, Cloud Connectivity). AI-generated recommendations for product priorities, roadmap investments, and competitive differentiation."
        publicDataSources={[
          { label: 'Market Analyst Reports', description: 'Gartner Magic Quadrant, Forrester Wave positioning' },
          { label: 'Competitor Products', description: 'Feature comparisons from scraped websites' },
          { label: 'Technology Trends', description: 'Emerging technologies and customer demand signals' },
          { label: 'Industry Standards', description: 'MEF, IETF, and other standards bodies' },
        ]}
        cbDataBenefits={[
          'Product portfolio defined with your actual offerings',
          'Performance metrics (ARR, penetration, growth) per product',
          'Competitive positioning relative to your market rank',
          'Gap analysis based on your product roadmap',
        ]}
        proprietaryDataBenefits={[
          'Actual product attach rates from CRM',
          'Revenue and margin by product',
          'Customer feedback from ServiceNow',
          'Win/loss by product vs. competitor',
          'Pipeline by product category',
        ]}
        tips={[
          'Configure products in Admin Setup → Product Portfolio',
          'Click "Generate Analysis" to create AI-powered recommendations',
          'Analysis considers both competitive positioning and growth opportunity',
          'Use insights to inform product investment decisions',
        ]}
      />
      
      {/* Job Progress Toast */}
      <JobProgressToast
        isVisible={generating}
        title="Generating Product Analysis"
        progress={progress}
        progressMessage={progressMessage}
        status={generating ? 'in_progress' : null}
        error={jobError}
        onDismiss={resetJobPolling}
      />
    </div>
  )
}

