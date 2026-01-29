import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  GlobeAltIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentArrowDownIcon,
  LinkIcon,
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { generateMarketIntelPDF } from '../utils/pdfGenerator'
import { HelpSection } from '../components/HelpSection'

interface TAMData {
  market: string;
  tam_usd_billions: number;
  tam_year: number;
  growth_rate_cagr: string;
  forecast_year?: number;
  source: string;
  source_url?: string;
  source_date?: string;
  methodology?: string;
  confidence?: string;
  notes?: string;
}

interface MarketTrend {
  trend: string;
  description: string;
  impact?: string;
  direction?: string;
  growth_rate?: string;
  source?: string;
  source_date?: string;
  implications_for_comcast?: string;
}

interface Footnote {
  id: number;
  citation: string;
  url?: string;
  accessed_date?: string;
}

interface Assumption {
  assumption: string;
  value: string;
  source?: string;
  source_url?: string;
}

interface MarketResearch {
  id: string;
  generated_at: string;
  llm_provider: string;
  llm_model: string;
  research: {
    research_date?: string;
    executive_summary?: string;
    tam_data?: TAMData[];
    market_trends?: MarketTrend[];
    competitive_landscape?: {
      summary?: string;
      key_players?: string[];
      market_concentration?: string;
      source?: string;
    };
    assumptions?: Assumption[];
    footnotes?: Footnote[];
  };
}

// Fallback data when no research is available
const fallbackTamData = [
  { solution: 'Connectivity', tam: 28, color: '#0084f4' },
  { solution: 'Managed Services', tam: 22, color: '#36a5ff' },
  { solution: 'SASE/Security', tam: 8, color: '#ec7612' },
  { solution: 'SD-WAN', tam: 5.5, color: '#f19432' },
]

const marketColors = ['#0084f4', '#36a5ff', '#ec7612', '#f19432', '#10b981', '#8b5cf6']

export function MarketIntel() {
  const [research, setResearch] = useState<MarketResearch | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    tam: true,
    trends: true,
    sources: false,
    assumptions: false,
  })

  useEffect(() => {
    fetchResearch()
  }, [])

  const fetchResearch = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/market-intel/research')
      const data = await response.json()
      
      if (data.status === 'not_generated') {
        setResearch(null)
      } else {
        setResearch(data)
      }
    } catch (err) {
      setError('Failed to load market research')
    } finally {
      setLoading(false)
    }
  }

  const generateResearch = async () => {
    try {
      setGenerating(true)
      setError(null)
      
      // Use synchronous endpoint for immediate results
      const response = await fetch('/api/market-intel/research/generate-sync?force_refresh=true', {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate research')
      }
      
      const data = await response.json()
      setResearch(data)
    } catch (err) {
      setError('Failed to generate market research. Please check your LLM configuration.')
    } finally {
      setGenerating(false)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const downloadPDF = () => {
    if (research) {
      generateMarketIntelPDF(research)
    }
  }

  // Transform research data for charts
  const tamChartData = research?.research?.tam_data?.map((t, i) => ({
    solution: t.market.replace(/\s*\([^)]*\)/g, '').substring(0, 20),
    tam: t.tam_usd_billions,
    color: marketColors[i % marketColors.length],
  })) || fallbackTamData

  const totalTam = tamChartData.reduce((sum, d) => sum + d.tam, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-brand-400" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Market Intelligence</h1>
          <p className="mt-1 text-sm text-slate-400">
            TAM/SAM/SOM analysis and market trends with citations
          </p>
        </div>
        <div className="flex items-center gap-3">
          {research && (
            <button
              onClick={downloadPDF}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-600 text-white hover:bg-accent-500 transition-colors"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              Download PDF
            </button>
          )}
          <button
            onClick={generateResearch}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-500 transition-colors disabled:opacity-50"
          >
            {generating ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <SparklesIcon className="h-5 w-5" />
                {research ? 'Refresh Data' : 'Generate Research'}
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {/* Research Metadata */}
      {research && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
        >
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-emerald-400" />
            <span className="text-sm text-emerald-400">Research Generated</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <ClockIcon className="h-4 w-4" />
            <span className="text-sm">
              {new Date(research.generated_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </span>
          </div>
          <div className="text-sm text-slate-400">
            Model: <span className="text-slate-300">{research.llm_model}</span>
          </div>
        </motion.div>
      )}

      {/* Executive Summary */}
      {research?.research?.executive_summary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl card-gradient border border-white/10 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('summary')}
            className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/20">
                <DocumentChartBarIcon className="h-5 w-5 text-brand-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Executive Summary</h3>
            </div>
            {expandedSections.summary ? (
              <ChevronUpIcon className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-slate-400" />
            )}
          </button>
          <AnimatePresence>
            {expandedSections.summary && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-6 pb-6"
              >
                <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                  {research.research.executive_summary}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* TAM Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl card-gradient border border-white/10 overflow-hidden"
      >
        <button
          onClick={() => toggleSection('tam')}
          className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-500/20">
              <GlobeAltIcon className="h-5 w-5 text-accent-400" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-white">Enterprise Market TAM by Solution</h3>
              <p className="text-sm text-slate-400">US Enterprise Market (Billions USD)</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!research && (
              <div className="flex items-center gap-2 text-sm text-amber-400">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span>Placeholder data - Generate research for cited figures</span>
              </div>
            )}
            {expandedSections.tam ? (
              <ChevronUpIcon className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-slate-400" />
            )}
          </div>
        </button>
        
        <AnimatePresence>
          {expandedSections.tam && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-6 pb-6"
            >
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tamChartData} layout="vertical">
                      <XAxis 
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        tickFormatter={(value) => `$${value}B`}
                      />
                      <YAxis 
                        type="category"
                        dataKey="solution"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        width={100}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                        formatter={(value: number) => [`$${value}B TAM`, '']}
                      />
                      <Bar dataKey="tam" radius={[0, 4, 4, 0]}>
                        {tamChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-3xl font-bold text-white">${totalTam.toFixed(1)}B</p>
                    <p className="text-sm text-slate-400">Total Enterprise TAM</p>
                  </div>
                  
                  {/* Individual market boxes */}
                  <div className="grid grid-cols-2 gap-3">
                    {tamChartData.slice(0, 4).map((market, i) => (
                      <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/5">
                        <p className="text-lg font-bold" style={{ color: market.color }}>
                          ${market.tam}B
                        </p>
                        <p className="text-xs text-slate-400 truncate">{market.solution}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* TAM Details with Sources */}
              {research?.research?.tam_data && (
                <div className="mt-8 space-y-4">
                  <h4 className="text-md font-semibold text-white">Market Breakdown with Sources</h4>
                  <div className="grid gap-4">
                    {research.research.tam_data.map((tam, i) => (
                      <div 
                        key={i} 
                        className="p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-brand-400">
                                ${tam.tam_usd_billions}B
                              </span>
                              <span className="font-medium text-white">{tam.market}</span>
                              {tam.confidence && (
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  tam.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-400' :
                                  tam.confidence === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-slate-500/20 text-slate-400'
                                }`}>
                                  {tam.confidence} confidence
                                </span>
                              )}
                            </div>
                            
                            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                              {tam.growth_rate_cagr && (
                                <span className="flex items-center gap-1">
                                  <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-400" />
                                  {tam.growth_rate_cagr} CAGR
                                </span>
                              )}
                              <span>Year: {tam.tam_year}</span>
                            </div>

                            {tam.methodology && (
                              <p className="mt-2 text-sm text-slate-500">{tam.methodology}</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Source citation */}
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <div className="flex items-start gap-2">
                            <LinkIcon className="h-4 w-4 text-slate-500 mt-0.5" />
                            <div className="text-sm">
                              <span className="text-slate-400">{tam.source}</span>
                              {tam.source_date && (
                                <span className="text-slate-500"> ({tam.source_date})</span>
                              )}
                              {tam.source_url && (
                                <a 
                                  href={tam.source_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="ml-2 text-brand-400 hover:text-brand-300"
                                >
                                  View source →
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Market Trends */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl card-gradient border border-white/10 overflow-hidden"
      >
        <button
          onClick={() => toggleSection('trends')}
          className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
              <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-white">Market Trends</h3>
              <p className="text-sm text-slate-400">Key drivers and implications</p>
            </div>
          </div>
          {expandedSections.trends ? (
            <ChevronUpIcon className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-slate-400" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.trends && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-6 pb-6"
            >
              <div className="space-y-4">
                {(research?.research?.market_trends || []).map((trend, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    className="p-4 rounded-lg bg-white/5 border border-white/5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                            trend.direction === 'declining' ? 'text-red-400' :
                            trend.direction === 'stable' ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {trend.direction === 'declining' ? (
                              <ArrowTrendingDownIcon className="h-4 w-4" />
                            ) : (
                              <ArrowTrendingUpIcon className="h-4 w-4" />
                            )}
                            {trend.growth_rate || trend.direction}
                          </span>
                          {trend.impact && (
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              trend.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                              trend.impact === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              {trend.impact} impact
                            </span>
                          )}
                        </div>
                        <h4 className="mt-2 font-medium text-white">{trend.trend}</h4>
                        <p className="mt-1 text-sm text-slate-400">{trend.description}</p>
                        
                        {trend.implications_for_comcast && (
                          <div className="mt-3 pt-3 border-t border-white/5">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Implications for Comcast Business</p>
                            <p className="mt-1 text-sm text-brand-300">{trend.implications_for_comcast}</p>
                          </div>
                        )}

                        {trend.source && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <LinkIcon className="h-3 w-3" />
                            {trend.source}
                            {trend.source_date && ` (${trend.source_date})`}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {(!research?.research?.market_trends || research.research.market_trends.length === 0) && (
                  <div className="text-center py-8 text-slate-400">
                    <p>No market trends available.</p>
                    <p className="text-sm mt-1">Click "Generate Research" to fetch the latest market insights.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Sources & Footnotes */}
      {research?.research?.footnotes && research.research.footnotes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl card-gradient border border-white/10 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('sources')}
            className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20">
                <LinkIcon className="h-5 w-5 text-violet-400" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-white">Sources & Citations</h3>
                <p className="text-sm text-slate-400">{research.research.footnotes.length} sources cited</p>
              </div>
            </div>
            {expandedSections.sources ? (
              <ChevronUpIcon className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-slate-400" />
            )}
          </button>

          <AnimatePresence>
            {expandedSections.sources && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-6 pb-6"
              >
                <div className="space-y-3">
                  {research.research.footnotes.map((footnote) => (
                    <div 
                      key={footnote.id}
                      className="p-3 rounded-lg bg-white/5 border border-white/5"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold">
                          {footnote.id}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-slate-300">{footnote.citation}</p>
                          {footnote.url && (
                            <a 
                              href={footnote.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 text-xs text-brand-400 hover:text-brand-300 break-all"
                            >
                              {footnote.url}
                            </a>
                          )}
                          {footnote.accessed_date && (
                            <p className="mt-1 text-xs text-slate-500">
                              Accessed: {footnote.accessed_date}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Assumptions */}
      {research?.research?.assumptions && research.research.assumptions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl card-gradient border border-white/10 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('assumptions')}
            className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-500/20">
                <DocumentChartBarIcon className="h-5 w-5 text-slate-400" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-white">Methodology & Assumptions</h3>
                <p className="text-sm text-slate-400">Transparent inputs for TAM calculations</p>
              </div>
            </div>
            {expandedSections.assumptions ? (
              <ChevronUpIcon className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-slate-400" />
            )}
          </button>

          <AnimatePresence>
            {expandedSections.assumptions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-6 pb-6"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Assumption</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Value</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {research.research.assumptions.map((assumption, i) => (
                        <tr key={i} className="border-b border-white/5">
                          <td className="py-3 px-4 text-slate-300">{assumption.assumption}</td>
                          <td className="py-3 px-4 text-white font-medium">{assumption.value}</td>
                          <td className="py-3 px-4">
                            <span className="text-slate-400">{assumption.source || 'Internal estimate'}</span>
                            {assumption.source_url && (
                              <a 
                                href={assumption.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-brand-400 hover:text-brand-300"
                              >
                                →
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* No Research CTA */}
      {!research && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <SparklesIcon className="h-12 w-12 mx-auto text-brand-400 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Generate AI-Powered Market Research
          </h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Click the button above to use AI to research and compile market data 
            from public sources with proper citations.
          </p>
          <button
            onClick={generateResearch}
            disabled={generating}
            className="px-6 py-3 rounded-lg bg-brand-600 text-white hover:bg-brand-500 transition-colors disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Research Now'}
          </button>
        </motion.div>
      )}

      <HelpSection
        title="Market Intel"
        description="Market sizing and trends for enterprise connectivity, SD-WAN, SASE, cybersecurity, and cloud connectivity markets. AI-generated research compiled from public sources with proper footnotes and citations."
        publicDataSources={[
          { label: 'Analyst Reports', description: 'Gartner, IDC, Frost & Sullivan market sizing' },
          { label: 'Industry Publications', description: 'Light Reading, SDxCentral, Fierce Telecom' },
          { label: 'Government Data', description: 'FCC, NTIA, Census Bureau economic reports' },
          { label: 'Academic Research', description: 'Telecommunications economics studies' },
        ]}
        cbDataBenefits={[
          'Market share calculations using your actual ARR',
          'Growth comparisons relative to your trajectory',
          'TAM/SAM contextualized to your addressable market',
          'Trend analysis relevant to your product portfolio',
        ]}
        proprietaryDataBenefits={[
          'True market share from internal analytics',
          'Win rates by market segment',
          'Average deal size trends',
          'Customer acquisition patterns',
          'Product attach rates by market',
        ]}
        tips={[
          'Click "Generate Research" to refresh market data with latest sources',
          'All sources are footnoted with links and dates',
          'Download as PDF for executive presentations',
          'Research focuses on 2024-2025 data when available',
        ]}
      />
    </div>
  )
}
