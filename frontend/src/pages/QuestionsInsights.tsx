import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  SparklesIcon,
  PaperAirplaneIcon,
  TrashIcon,
  StarIcon,
  CheckBadgeIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LightBulbIcon,
  DocumentTextIcon,
  XMarkIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  TagIcon,
  BookmarkIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid, CheckBadgeIcon as CheckBadgeSolid } from '@heroicons/react/24/solid'
import ReactMarkdown, { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { HelpSection } from '../components/HelpSection'
import { JobProgressToast } from '../components/JobProgressToast'
import { useJobPolling } from '../hooks/useJobPolling'

interface DataSourceUsed {
  source_type: string
  source_name: string
  data_timestamp: string | null
}

interface Insight {
  id: string
  question: string
  category: string
  response: string | null
  executive_summary: string | null
  key_recommendations: string[]
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'incorporated'
  created_at: string
  completed_at: string | null
  processing_time_seconds: number | null
  data_sources_used: DataSourceUsed[]
  is_incorporated: boolean
  incorporation_note: string | null
  is_starred: boolean
  llm_provider: string | null
  llm_model: string | null
  error_message: string | null
}

interface InsightStats {
  total: number
  completed: number
  incorporated: number
  starred: number
  by_category: Record<string, number>
  avg_processing_time_seconds: number
}

const categories = [
  { value: 'general', label: 'General Strategy' },
  { value: 'market_strategy', label: 'Market Strategy' },
  { value: 'competitive', label: 'Competitive Intelligence' },
  { value: 'product', label: 'Product Strategy' },
  { value: 'sales', label: 'Sales & GTM' },
  { value: 'customer_segment', label: 'Customer Segments' },
  { value: 'msa_geography', label: 'MSA / Geography' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'growth', label: 'Growth' },
  { value: 'operations', label: 'Operations' },
]

const categoryColors: Record<string, string> = {
  general: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  market_strategy: 'bg-brand-500/20 text-brand-300 border-brand-500/30',
  competitive: 'bg-red-500/20 text-red-300 border-red-500/30',
  product: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  sales: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  customer_segment: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  msa_geography: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  pricing: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  growth: 'bg-lime-500/20 text-lime-300 border-lime-500/30',
  operations: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
}

// Custom markdown components for beautiful rendering
const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-white mt-8 mb-4 pb-3 border-b border-slate-700/50 flex items-center gap-3">
      <div className="w-1 h-8 bg-gradient-to-b from-brand-400 to-purple-500 rounded-full" />
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold text-white mt-6 mb-3 flex items-center gap-2">
      <ChartBarIcon className="h-5 w-5 text-brand-400" />
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold text-slate-200 mt-5 mb-2 flex items-center gap-2">
      <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-400" />
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-semibold text-slate-300 mt-4 mb-2">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="text-slate-300 leading-relaxed mb-4">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="space-y-2 mb-4 ml-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="space-y-2 mb-4 ml-1 list-decimal list-inside">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-slate-300 flex items-start gap-2">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
      <span className="flex-1">{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-brand-300">{children}</em>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-brand-500 pl-4 py-2 my-4 bg-brand-500/10 rounded-r-lg">
      <div className="text-slate-300 italic">{children}</div>
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isInline = !className
    if (isInline) {
      return (
        <code className="px-1.5 py-0.5 rounded bg-slate-800 text-brand-300 text-sm font-mono">
          {children}
        </code>
      )
    }
    return (
      <code className="block p-4 rounded-lg bg-slate-900 border border-slate-700/50 text-slate-300 text-sm font-mono overflow-x-auto my-4">
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="rounded-xl bg-slate-900 border border-slate-700/50 overflow-hidden my-4">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-6 rounded-xl border border-slate-700/50">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-800/80 border-b border-slate-700/50">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-slate-700/50">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-slate-800/30 transition-colors">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 text-left font-semibold text-slate-200">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-slate-300">{children}</td>
  ),
  hr: () => (
    <hr className="my-6 border-slate-700/50" />
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
}

export function QuestionsInsights() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [stats, setStats] = useState<InsightStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('general')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'incorporated' | 'starred'>('all')
  const [incorporateModal, setIncorporateModal] = useState<{id: string, note: string} | null>(null)
  const [pendingInsightId, setPendingInsightId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Job polling for async Q&A generation
  const {
    isPolling: submitting,
    progress,
    progressMessage,
    error: jobError,
    startPolling,
    reset: resetJobPolling,
  } = useJobPolling({
    interval: 2000,
    timeout: 120000, // 2 minutes for Q&A
    onComplete: async () => {
      // Refresh insights to get the completed one
      await fetchInsights()
      if (pendingInsightId) {
        setExpandedId(pendingInsightId)
        setPendingInsightId(null)
      }
    },
    onError: (err) => {
      console.error('Insight generation failed:', err)
    }
  })

  const fetchInsights = async () => {
    try {
      const params = new URLSearchParams()
      if (filter === 'incorporated') params.append('incorporated_only', 'true')
      if (filter === 'starred') params.append('starred_only', 'true')
      
      const [insightsRes, statsRes] = await Promise.all([
        fetch(`/api/insights?${params}`),
        fetch('/api/insights/stats/summary'),
      ])
      
      if (insightsRes.ok) {
        const data = await insightsRes.json()
        setInsights(data)
      }
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching insights:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [filter])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [question])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || submitting) return

    resetJobPolling()
    
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          category: selectedCategory,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        
        // New async API returns job_id
        if (data.job_id) {
          setPendingInsightId(data.insight_id)
          startPolling(data.job_id)
          setQuestion('')
          
          // Refresh insights immediately to show the processing one
          await fetchInsights()
        } else {
          // Fallback for sync response
          setInsights(prev => [data, ...prev])
          setQuestion('')
          setExpandedId(data.id)
        }
        
        // Refresh stats
        const statsRes = await fetch('/api/insights/stats/summary')
        if (statsRes.ok) setStats(await statsRes.json())
      }
    } catch (error) {
      console.error('Error submitting question:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this insight?')) return

    try {
      const res = await fetch(`/api/insights/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setInsights(prev => prev.filter(i => i.id !== id))
        if (expandedId === id) setExpandedId(null)
        
        // Refresh stats
        const statsRes = await fetch('/api/insights/stats/summary')
        if (statsRes.ok) setStats(await statsRes.json())
      }
    } catch (error) {
      console.error('Error deleting insight:', error)
    }
  }

  const handleStar = async (id: string, currentlyStarred: boolean) => {
    try {
      const endpoint = currentlyStarred ? 'unstar' : 'star'
      const res = await fetch(`/api/insights/${id}/${endpoint}`, { method: 'POST' })
      if (res.ok) {
        const updated = await res.json()
        setInsights(prev => prev.map(i => i.id === id ? updated : i))
      }
    } catch (error) {
      console.error('Error starring insight:', error)
    }
  }

  const handleIncorporate = async (id: string, note: string) => {
    try {
      const res = await fetch(`/api/insights/${id}/incorporate?note=${encodeURIComponent(note)}`, { method: 'POST' })
      if (res.ok) {
        const updated = await res.json()
        setInsights(prev => prev.map(i => i.id === id ? updated : i))
        setIncorporateModal(null)
        
        // Refresh stats
        const statsRes = await fetch('/api/insights/stats/summary')
        if (statsRes.ok) setStats(await statsRes.json())
      }
    } catch (error) {
      console.error('Error incorporating insight:', error)
    }
  }

  const handleUnincorporate = async (id: string) => {
    try {
      const res = await fetch(`/api/insights/${id}/unincorporate`, { method: 'POST' })
      if (res.ok) {
        const updated = await res.json()
        setInsights(prev => prev.map(i => i.id === id ? updated : i))
        
        // Refresh stats
        const statsRes = await fetch('/api/insights/stats/summary')
        if (statsRes.ok) setStats(await statsRes.json())
      }
    } catch (error) {
      console.error('Error unincorporating insight:', error)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-400'
      case 'incorporated': return 'text-brand-400'
      case 'processing': return 'text-amber-400'
      case 'failed': return 'text-red-400'
      default: return 'text-slate-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/30">
              <LightBulbIcon className="h-6 w-6 text-brand-400" />
            </div>
            Questions & Insights
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Ask strategic questions and get AI-powered insights using all platform data
          </p>
        </div>
        
        {stats && (
          <div className="flex gap-3">
            <div className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <p className="text-lg font-bold text-white">{stats.total}</p>
              <p className="text-xs text-slate-400">Total</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-brand-500/10 border border-brand-500/30">
              <p className="text-lg font-bold text-brand-400">{stats.incorporated}</p>
              <p className="text-xs text-slate-400">Incorporated</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-lg font-bold text-amber-400">{stats.starred}</p>
              <p className="text-xs text-slate-400">Starred</p>
            </div>
          </div>
        )}
      </div>

      {/* Question Input Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 shadow-xl"
      >
        <div className="flex items-center gap-2 mb-4">
          <SparklesIcon className="h-5 w-5 text-brand-400" />
          <h2 className="text-lg font-semibold text-white">Ask Your Strategic Advisor</h2>
        </div>
        
        <p className="text-sm text-slate-400 mb-4">
          Your AI advisor combines expertise in Go-to-Market strategy, product management, and management consulting.
          It has access to all Comcast Business data, competitive intelligence, market research, and previously validated insights.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a detailed strategic question... e.g., 'What is the optimal sales coverage model for E2 segment accounts in the Philadelphia MSA, considering our current competitive position against Verizon and the growth potential of SD-WAN services?'"
              className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-900/80 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 resize-none min-h-[100px]"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={!question.trim() || submitting}
              className="absolute bottom-3 right-3 p-2 rounded-lg bg-brand-500 text-white hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (
                <PaperAirplaneIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <TagIcon className="h-4 w-4 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-600/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            
            {submitting && (
              <div className="flex items-center gap-2 text-sm text-amber-400">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Analyzing with AI advisor... This may take 30-60 seconds.
              </div>
            )}
          </div>
        </form>
      </motion.div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">Filter:</span>
        {(['all', 'incorporated', 'starred'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
            }`}
          >
            {f === 'all' ? 'All Insights' : f === 'incorporated' ? 'Incorporated' : 'Starred'}
          </button>
        ))}
        
        <button
          onClick={fetchInsights}
          className="ml-auto px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Insights List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="h-8 w-8 text-brand-400 animate-spin" />
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-12">
          <LightBulbIcon className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No insights yet. Ask your first strategic question above!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {insights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-2xl border overflow-hidden ${
                  insight.is_incorporated
                    ? 'bg-gradient-to-br from-brand-900/30 to-slate-900/80 border-brand-500/30'
                    : 'bg-slate-800/50 border-slate-700/50'
                }`}
              >
                {/* Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-slate-700/20 transition-colors"
                  onClick={() => setExpandedId(expandedId === insight.id ? null : insight.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${categoryColors[insight.category] || categoryColors.general}`}>
                          {categories.find(c => c.value === insight.category)?.label || insight.category}
                        </span>
                        {insight.is_incorporated && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center gap-1">
                            <CheckBadgeSolid className="h-3 w-3" />
                            Incorporated
                          </span>
                        )}
                        {insight.is_starred && (
                          <StarIconSolid className="h-4 w-4 text-amber-400" />
                        )}
                      </div>
                      
                      <p className="font-medium text-white line-clamp-2">{insight.question}</p>
                      
                      {insight.executive_summary && (
                        <p className="mt-2 text-sm text-slate-400 line-clamp-2">{insight.executive_summary}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs ${getStatusColor(insight.status)}`}>
                        {insight.status === 'processing' && (
                          <span className="flex items-center gap-1">
                            <ArrowPathIcon className="h-3 w-3 animate-spin" />
                            Processing...
                          </span>
                        )}
                        {insight.status === 'completed' && 'Completed'}
                        {insight.status === 'incorporated' && 'Incorporated'}
                        {insight.status === 'failed' && 'Failed'}
                      </span>
                      
                      {expandedId === insight.id ? (
                        <ChevronUpIcon className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="h-3 w-3" />
                      {formatDate(insight.created_at)}
                    </span>
                    {insight.processing_time_seconds && (
                      <span>Took {insight.processing_time_seconds.toFixed(1)}s</span>
                    )}
                    {insight.llm_model && (
                      <span className="text-slate-600">{insight.llm_model}</span>
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {expandedId === insight.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-700/50"
                    >
                      <div className="p-6">
                        {insight.status === 'failed' ? (
                          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                            <div className="flex items-center gap-2 text-red-400 mb-2">
                              <ExclamationTriangleIcon className="h-5 w-5" />
                              <span className="font-medium">Analysis Failed</span>
                            </div>
                            <p className="text-sm text-red-300">{insight.error_message || 'Unknown error occurred'}</p>
                          </div>
                        ) : insight.status === 'processing' ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                              <ArrowPathIcon className="h-8 w-8 text-brand-400 animate-spin mx-auto mb-3" />
                              <p className="text-slate-400">Generating comprehensive analysis...</p>
                              <p className="text-xs text-slate-500 mt-1">This may take up to 60 seconds</p>
                            </div>
                          </div>
                        ) : insight.response ? (
                          <div className="space-y-6">
                            {/* Executive Summary Banner */}
                            {insight.executive_summary && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-5 rounded-xl bg-gradient-to-br from-brand-500/20 via-purple-500/10 to-slate-900/50 border border-brand-500/30"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="p-2 rounded-lg bg-brand-500/20 flex-shrink-0">
                                    <SparklesIcon className="h-5 w-5 text-brand-400" />
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-brand-300 mb-2">Executive Summary</h3>
                                    <p className="text-slate-300 leading-relaxed">{insight.executive_summary}</p>
                                  </div>
                                </div>
                              </motion.div>
                            )}

                            {/* Key Recommendations */}
                            {insight.key_recommendations.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/15 to-slate-900/50 border border-emerald-500/30"
                              >
                                <h3 className="font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                                  <ShieldCheckIcon className="h-5 w-5" />
                                  Key Recommendations
                                </h3>
                                <div className="grid gap-3">
                                  {insight.key_recommendations.map((rec, i) => (
                                    <motion.div
                                      key={i}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: 0.1 + i * 0.05 }}
                                      className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/30"
                                    >
                                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold flex-shrink-0">
                                        {i + 1}
                                      </span>
                                      <span className="text-slate-300 leading-relaxed">{rec}</span>
                                    </motion.div>
                                  ))}
                                </div>
                              </motion.div>
                            )}

                            {/* Full Response - Beautiful Markdown */}
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              className="p-6 rounded-xl bg-slate-900/50 border border-slate-700/50"
                            >
                              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700/50">
                                <BoltIcon className="h-5 w-5 text-amber-400" />
                                <h3 className="font-semibold text-white">Detailed Analysis</h3>
                              </div>
                              <div className="max-w-none">
                                <ReactMarkdown 
                                  remarkPlugins={[remarkGfm]}
                                  components={markdownComponents}
                                >
                                  {insight.response}
                                </ReactMarkdown>
                              </div>
                            </motion.div>

                            {/* Data Sources Used */}
                            {insight.data_sources_used.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="p-4 rounded-xl bg-slate-900/30 border border-slate-700/30"
                              >
                                <h3 className="font-medium text-slate-400 mb-3 flex items-center gap-2 text-sm">
                                  <DocumentTextIcon className="h-4 w-4" />
                                  Data Sources Referenced
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                  {insight.data_sources_used.map((source, i) => (
                                    <span key={i} className="px-3 py-1.5 rounded-lg bg-slate-800/80 text-xs text-slate-300 border border-slate-700/50 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                                      {source.source_name}
                                    </span>
                                  ))}
                                </div>
                              </motion.div>
                            )}

                            {/* Incorporation Note */}
                            {insight.is_incorporated && insight.incorporation_note && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35 }}
                                className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/30"
                              >
                                <h3 className="font-medium text-brand-300 mb-2 flex items-center gap-2">
                                  <BookmarkIcon className="h-4 w-4" />
                                  Incorporation Note
                                </h3>
                                <p className="text-sm text-slate-300">{insight.incorporation_note}</p>
                              </motion.div>
                            )}
                          </div>
                        ) : null}

                        {/* Actions */}
                        {insight.status === 'completed' && (
                          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700/50">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStar(insight.id, insight.is_starred)
                                }}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                  insight.is_starred
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
                                }`}
                              >
                                {insight.is_starred ? (
                                  <StarIconSolid className="h-4 w-4" />
                                ) : (
                                  <StarIcon className="h-4 w-4" />
                                )}
                                {insight.is_starred ? 'Starred' : 'Star'}
                              </button>
                              
                              {insight.is_incorporated ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleUnincorporate(insight.id)
                                  }}
                                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center gap-2"
                                >
                                  <CheckBadgeSolid className="h-4 w-4" />
                                  Incorporated
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setIncorporateModal({ id: insight.id, note: '' })
                                  }}
                                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white transition-colors flex items-center gap-2"
                                >
                                  <CheckBadgeIcon className="h-4 w-4" />
                                  Incorporate
                                </button>
                              )}
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(insight.id)
                              }}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors flex items-center gap-2"
                            >
                              <TrashIcon className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Incorporate Modal */}
      <AnimatePresence>
        {incorporateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setIncorporateModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-800 rounded-2xl border border-slate-700 p-6 max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <CheckBadgeIcon className="h-5 w-5 text-brand-400" />
                  Incorporate Insight
                </h3>
                <button
                  onClick={() => setIncorporateModal(null)}
                  className="p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              
              <p className="text-sm text-slate-400 mb-4">
                Incorporated insights will be used by the AI advisor in future analyses, 
                capacity planning, market analysis, and strategy recommendations.
              </p>
              
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Note (optional)
              </label>
              <textarea
                value={incorporateModal.note}
                onChange={(e) => setIncorporateModal({ ...incorporateModal, note: e.target.value })}
                placeholder="Add context for how this insight should be used..."
                className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
                rows={3}
              />
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIncorporateModal(null)}
                  className="px-4 py-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleIncorporate(incorporateModal.id, incorporateModal.note)}
                  className="px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-400 transition-colors flex items-center gap-2"
                >
                  <CheckBadgeIcon className="h-4 w-4" />
                  Incorporate Insight
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <HelpSection
        title="Q&A Insights"
        description="Ask strategic questions and get AI-powered answers using all available platform data. The LLM acts as a senior Go-to-Market strategist with deep expertise in enterprise B2B, telecommunications, and consulting methodologies."
        publicDataSources={[
          { label: 'Market Intelligence', description: 'TAM/SAM sizing, growth rates, industry trends' },
          { label: 'Competitive Intelligence', description: 'Scraped competitor data and analysis' },
          { label: 'Economic Data', description: 'Business formation, employment trends' },
        ]}
        cbDataBenefits={[
          'Questions answered in context of your actual ARR and segments',
          'Product portfolio considered in recommendations',
          'Sales capacity factored into GTM advice',
          'MSA priorities inform geographic strategies',
        ]}
        proprietaryDataBenefits={[
          'Account-specific recommendations from CRM data',
          'Pipeline analysis from Orion CPQ',
          'Customer health signals from ServiceNow',
          'Trend analysis across historical data',
          'Personalized insights based on your actual performance',
        ]}
        tips={[
          'Star insights to save them for later reference',
          'Use "Incorporate" to add insights to other analyses',
          'Try questions like "What are the top 3 growth opportunities?"',
          'Ask about specific competitors, segments, or MSAs for focused answers',
        ]}
      />
      
      {/* Job Progress Toast */}
      <JobProgressToast
        isVisible={submitting}
        title="Generating Insight"
        progress={progress}
        progressMessage={progressMessage}
        status={submitting ? 'in_progress' : null}
        error={jobError}
        onDismiss={resetJobPolling}
      />
    </div>
  )
}

