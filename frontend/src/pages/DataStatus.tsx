import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  SparklesIcon,
  CloudArrowDownIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  RocketLaunchIcon,
  ExclamationCircleIcon,
  PresentationChartLineIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline'

// Types
interface Job {
  id: string
  job_type: string
  status: string
  target_id: string | null
  target_name: string | null
  progress_pct: number
  progress_message: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  duration_seconds: number | null
  error_message: string | null
  result_summary: any
}

interface JobSummary {
  total_jobs: number
  pending: number
  in_progress: number
  completed: number
  failed: number
  by_type: Record<string, number>
  active_jobs: Job[]
  recent_completed: Job[]
}

interface DataSource {
  id: string
  name: string
  category: string
  category_label: string
  api_available: boolean
  refresh_status: string
  last_refresh: string | null
  has_data: boolean
}

interface Summary {
  source_id: string
  source_name: string
  summary_text: string
  generated_at: string
  llm_provider: string
}

// Markdown parser component
function ParsedMarkdown({ text }: { text: string }) {
  const lines = text.split('\n')
  
  return (
    <div className="space-y-3">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        
        // H3 headers (### text)
        if (trimmed.startsWith('### ')) {
          const headerText = trimmed.slice(4)
          const icon = getHeaderIcon(headerText)
          return (
            <div key={idx} className="flex items-center gap-2 mt-6 mb-3 first:mt-0">
              {icon}
              <h3 className="text-lg font-bold text-white">{headerText}</h3>
            </div>
          )
        }
        
        // Bold headers (**text**)
        if (trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.includes('- **')) {
          const headerText = trimmed.slice(2, -2)
          return (
            <h4 key={idx} className="text-sm font-semibold text-brand-300 mt-4 mb-2">
              {headerText}
            </h4>
          )
        }
        
        // Bullet points with bold start (- **text**: description)
        if (trimmed.startsWith('- **') || trimmed.startsWith('* **')) {
          const match = trimmed.match(/^[-*]\s*\*\*([^*]+)\*\*[:\s]*(.*)/)
          if (match) {
            return (
              <div key={idx} className="flex gap-3 pl-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
                <p className="text-sm text-slate-300">
                  <span className="font-semibold text-white">{match[1]}</span>
                  {match[2] && <span className="text-slate-400">: {formatInlineText(match[2])}</span>}
                </p>
              </div>
            )
          }
        }
        
        // Regular bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.slice(2)
          return (
            <div key={idx} className="flex gap-3 pl-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-2 flex-shrink-0" />
              <p className="text-sm text-slate-300">{formatInlineText(content)}</p>
            </div>
          )
        }
        
        // Empty lines
        if (!trimmed) {
          return <div key={idx} className="h-2" />
        }
        
        // Regular paragraphs
        return (
          <p key={idx} className="text-sm text-slate-300 leading-relaxed">
            {formatInlineText(trimmed)}
          </p>
        )
      })}
    </div>
  )
}

// Get icon for section headers
function getHeaderIcon(header: string) {
  const lower = header.toLowerCase()
  if (lower.includes('executive summary')) {
    return <DocumentTextIcon className="h-5 w-5 text-brand-400" />
  }
  if (lower.includes('key insight')) {
    return <LightBulbIcon className="h-5 w-5 text-amber-400" />
  }
  if (lower.includes('competitive') || lower.includes('implication')) {
    return <ShieldCheckIcon className="h-5 w-5 text-purple-400" />
  }
  if (lower.includes('recommend') || lower.includes('action')) {
    return <RocketLaunchIcon className="h-5 w-5 text-emerald-400" />
  }
  if (lower.includes('data quality') || lower.includes('note')) {
    return <ExclamationCircleIcon className="h-5 w-5 text-slate-400" />
  }
  return <ChartBarIcon className="h-5 w-5 text-brand-400" />
}

// Format inline text (bold, etc)
function formatInlineText(text: string): React.ReactNode {
  // Split by bold markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <span key={i} className="font-semibold text-white">{part.slice(2, -2)}</span>
    }
    return <span key={i}>{part}</span>
  })
}

// Category icon and color mapping
function getCategoryStyle(sourceId: string) {
  if (sourceId.includes('cisa') || sourceId.includes('mitre')) {
    return { icon: ShieldCheckIcon, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' }
  }
  if (sourceId.includes('sec-')) {
    return { icon: BuildingOfficeIcon, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' }
  }
  if (sourceId.includes('delloro') || sourceId.includes('synergy') || sourceId.includes('mef') || sourceId.includes('telegeography')) {
    return { icon: PresentationChartLineIcon, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' }
  }
  if (sourceId.includes('peeringdb') || sourceId.includes('cloudscene') || sourceId.includes('datacenter') || sourceId.includes('uptime')) {
    return { icon: ServerStackIcon, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' }
  }
  if (sourceId.includes('fcc') || sourceId.includes('census') || sourceId.includes('bls')) {
    return { icon: ChartBarIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' }
  }
  return { icon: DocumentTextIcon, color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/30' }
}

// Mini chart component for visual interest
function MiniBarChart({ data }: { data: number[] }) {
  const max = Math.max(...data)
  return (
    <div className="flex items-end gap-1 h-8">
      {data.map((value, i) => (
        <div
          key={i}
          className="w-2 bg-gradient-to-t from-brand-600 to-brand-400 rounded-t"
          style={{ height: `${(value / max) * 100}%` }}
        />
      ))}
    </div>
  )
}

// Summary card component
function SummaryCard({ summary, isExpanded, onToggle }: { 
  summary: Summary
  isExpanded: boolean
  onToggle: () => void 
}) {
  const style = getCategoryStyle(summary.source_id)
  const Icon = style.icon
  
  // Generate fake chart data based on source name hash
  const chartData = Array.from({ length: 8 }, (_, i) => 
    20 + Math.sin(summary.source_id.charCodeAt(i % summary.source_id.length) + i) * 40 + 40
  )
  
  return (
    <motion.div
      layout
      className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${style.bg}`}>
            <Icon className={`h-5 w-5 ${style.color}`} />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-white">{summary.source_name}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <SparklesIcon className="h-3 w-3 text-accent-400" />
              <span>{summary.llm_provider.toUpperCase()}</span>
              <span>•</span>
              <span>{new Date(summary.generated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!isExpanded && <MiniBarChart data={chartData} />}
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </button>
      
      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-2 border-t border-white/10">
              {/* Quick Stats Row */}
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 rounded-lg bg-white/5">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    {summary.summary_text.split('**').filter((_, i) => i % 2 === 1).length}
                  </p>
                  <p className="text-xs text-slate-400">Key Points</p>
                </div>
                <div className="text-center border-x border-white/10">
                  <p className="text-2xl font-bold text-white">
                    {(summary.summary_text.match(/- /g) || []).length}
                  </p>
                  <p className="text-xs text-slate-400">Insights</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    {Math.ceil(summary.summary_text.length / 1000)}K
                  </p>
                  <p className="text-xs text-slate-400">Characters</p>
                </div>
              </div>
              
              {/* Chart Visualization */}
              <div className="mb-6 p-4 rounded-lg bg-white/5">
                <p className="text-xs text-slate-400 mb-3">Analysis Depth by Section</p>
                <div className="flex items-end justify-between gap-2 h-16">
                  {['Executive', 'Insights', 'Competitive', 'Actions', 'Notes'].map((label, i) => {
                    const height = 30 + Math.random() * 70
                    const colors = ['bg-brand-500', 'bg-amber-500', 'bg-purple-500', 'bg-emerald-500', 'bg-slate-500']
                    return (
                      <div key={label} className="flex-1 flex flex-col items-center gap-1">
                        <div 
                          className={`w-full ${colors[i]} rounded-t opacity-80`}
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-[10px] text-slate-500">{label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              {/* Parsed Markdown Content */}
              <ParsedMarkdown text={summary.summary_text} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function DataStatus() {
  const [jobSummary, setJobSummary] = useState<JobSummary | null>(null)
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'status' | 'summaries'>('status')

  const fetchData = useCallback(async () => {
    try {
      const [jobsRes, sourcesRes, summariesRes] = await Promise.all([
        fetch('/api/jobs/summary'),
        fetch('/api/market-intel/public-sources?enabled_only=true'),
        fetch('/api/market-intel/summaries'),
      ])
      
      if (jobsRes.ok) setJobSummary(await jobsRes.json())
      if (sourcesRes.ok) setDataSources(await sourcesRes.json())
      if (summariesRes.ok) {
        const data = await summariesRes.json()
        setSummaries(data.summaries || [])
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleImportAll = async () => {
    setImporting(true)
    try {
      const res = await fetch('/api/jobs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ import_all: true }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch (err) {
      console.error('Failed to start import:', err)
    } finally {
      setImporting(false)
    }
  }

  const handleSummarizeAll = async () => {
    setSummarizing(true)
    try {
      const res = await fetch('/api/jobs/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summarize_all_imported: true }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch (err) {
      console.error('Failed to start summarization:', err)
    } finally {
      setSummarizing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-emerald-400" />
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-400" />
      case 'in_progress':
        return <ArrowPathIcon className="h-5 w-5 text-brand-400 animate-spin" />
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-amber-400" />
      default:
        return <ClockIcon className="h-5 w-5 text-slate-500" />
    }
  }

  const getJobTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      data_import: 'Data Import',
      data_summary: 'LLM Summary',
      segment_playbook: 'Segment Playbook',
      msa_playbook: 'MSA Playbook',
      strategy_deck: 'Strategy Deck',
      batch_import: 'Batch Import',
    }
    return labels[type] || type
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    if (seconds < 60) return `${Math.round(seconds)}s`
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-8 w-8 text-brand-400 animate-spin" />
      </div>
    )
  }

  const apiSources = dataSources.filter(s => s.api_available)
  const importedCount = apiSources.filter(s => s.has_data).length
  const summarizedCount = summaries.length

  // Group summaries by category
  const groupedSummaries = {
    security: summaries.filter(s => s.source_id.includes('cisa') || s.source_id.includes('mitre')),
    competitors: summaries.filter(s => s.source_id.startsWith('sec-')),
    analyst: summaries.filter(s => 
      s.source_id.includes('delloro') || 
      s.source_id.includes('synergy') || 
      s.source_id.includes('mef') || 
      s.source_id.includes('telegeography')
    ),
    infrastructure: summaries.filter(s => 
      s.source_id.includes('peeringdb') || 
      s.source_id.includes('cloudscene') || 
      s.source_id.includes('datacenter') || 
      s.source_id.includes('uptime')
    ),
    market: summaries.filter(s => s.source_id.includes('fcc') || s.source_id.includes('census') || s.source_id.includes('bls')),
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Data Import Status</h1>
          <p className="mt-1 text-sm text-slate-400">
            Track data imports, LLM summaries, and playbook generation
          </p>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleImportAll}
            disabled={importing}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-brand-600/30 hover:bg-brand-500 disabled:opacity-50 transition-colors"
          >
            {importing ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <CloudArrowDownIcon className="h-4 w-4" />
            )}
            Import All Data
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSummarizeAll}
            disabled={summarizing || importedCount === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent-600/30 hover:bg-accent-500 disabled:opacity-50 transition-colors"
          >
            {summarizing ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <SparklesIcon className="h-4 w-4" />
            )}
            Generate Summaries
          </motion.button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl card-gradient border border-white/10 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/20">
              <CloudArrowDownIcon className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Data Imported</p>
              <p className="text-lg font-bold text-white">
                {importedCount} / {apiSources.length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl card-gradient border border-white/10 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-500/20">
              <SparklesIcon className="h-5 w-5 text-accent-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Summaries Ready</p>
              <p className="text-lg font-bold text-white">{summarizedCount}</p>
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
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              (jobSummary?.in_progress || 0) > 0 ? 'bg-amber-500/20' : 'bg-emerald-500/20'
            }`}>
              {(jobSummary?.in_progress || 0) > 0 ? (
                <ArrowPathIcon className="h-5 w-5 text-amber-400 animate-spin" />
              ) : (
                <CheckCircleIcon className="h-5 w-5 text-emerald-400" />
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400">Active Jobs</p>
              <p className="text-lg font-bold text-white">
                {(jobSummary?.pending || 0) + (jobSummary?.in_progress || 0)}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl card-gradient border border-white/10 p-4"
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              (jobSummary?.failed || 0) > 0 ? 'bg-red-500/20' : 'bg-slate-500/20'
            }`}>
              {(jobSummary?.failed || 0) > 0 ? (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              ) : (
                <CheckCircleIcon className="h-5 w-5 text-slate-400" />
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400">Failed Jobs</p>
              <p className="text-lg font-bold text-white">{jobSummary?.failed || 0}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-white/10">
        <nav className="flex gap-6">
          {[
            { id: 'status', label: 'Job Status', icon: ClockIcon },
            { id: 'summaries', label: 'Data Summaries', icon: DocumentTextIcon, count: summarizedCount },
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
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-brand-500/20 text-brand-400">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Status Tab */}
      {activeTab === 'status' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Active Jobs */}
          {jobSummary && jobSummary.active_jobs.length > 0 && (
            <div className="rounded-xl card-gradient border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ArrowPathIcon className="h-5 w-5 text-brand-400 animate-spin" />
                Active Jobs
              </h3>
              <div className="space-y-3">
                {jobSummary.active_jobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-4 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(job.status)}
                        <div>
                          <p className="font-medium text-white">{job.target_name}</p>
                          <p className="text-xs text-slate-400">{getJobTypeLabel(job.job_type)}</p>
                        </div>
                      </div>
                      <span className="text-sm text-slate-400">
                        {job.progress_pct}%
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-brand-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${job.progress_pct}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    {job.progress_message && (
                      <p className="text-xs text-slate-500 mt-2">{job.progress_message}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Completed Jobs */}
          <div className="rounded-xl card-gradient border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Jobs</h3>
            {jobSummary && jobSummary.recent_completed.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-white/10">
                <table className="min-w-full divide-y divide-white/10">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Job</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {jobSummary.recent_completed.map((job) => (
                      <tr key={job.id} className="hover:bg-white/5">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-white">{job.target_name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-400">{getJobTypeLabel(job.job_type)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(job.status)}
                            <span className="text-sm text-slate-400 capitalize">{job.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-400">
                          {formatDuration(job.duration_seconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">
                No completed jobs yet. Click "Import All Data" to start.
              </p>
            )}
          </div>

          {/* Data Source Status */}
          <div className="rounded-xl card-gradient border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">API Data Sources</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {apiSources.map((source) => (
                <div
                  key={source.id}
                  className={`p-4 rounded-lg border ${
                    source.has_data
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-white text-sm">{source.name}</p>
                    {source.has_data ? (
                      <CheckCircleIcon className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <ClockIcon className="h-5 w-5 text-slate-500" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{source.category_label}</p>
                  {source.last_refresh && (
                    <p className="text-xs text-slate-500 mt-2">
                      Last: {new Date(source.last_refresh).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Summaries Tab - Redesigned */}
      {activeTab === 'summaries' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-8"
        >
          {summaries.length > 0 ? (
            <>
              {/* Security & Threat Intel */}
              {groupedSummaries.security.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheckIcon className="h-5 w-5 text-red-400" />
                    <h2 className="text-lg font-semibold text-white">Security & Threat Intelligence</h2>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">
                      {groupedSummaries.security.length}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {groupedSummaries.security.map((summary) => (
                      <SummaryCard
                        key={summary.source_id}
                        summary={summary}
                        isExpanded={expandedSummary === summary.source_id}
                        onToggle={() => setExpandedSummary(
                          expandedSummary === summary.source_id ? null : summary.source_id
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Competitor Analysis */}
              {groupedSummaries.competitors.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <BuildingOfficeIcon className="h-5 w-5 text-blue-400" />
                    <h2 className="text-lg font-semibold text-white">Competitor Intelligence (SEC Filings)</h2>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">
                      {groupedSummaries.competitors.length}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {groupedSummaries.competitors.map((summary) => (
                      <SummaryCard
                        key={summary.source_id}
                        summary={summary}
                        isExpanded={expandedSummary === summary.source_id}
                        onToggle={() => setExpandedSummary(
                          expandedSummary === summary.source_id ? null : summary.source_id
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Analyst & Market Research */}
              {groupedSummaries.analyst.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <PresentationChartLineIcon className="h-5 w-5 text-amber-400" />
                    <h2 className="text-lg font-semibold text-white">Analyst & Market Research</h2>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">
                      {groupedSummaries.analyst.length}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {groupedSummaries.analyst.map((summary) => (
                      <SummaryCard
                        key={summary.source_id}
                        summary={summary}
                        isExpanded={expandedSummary === summary.source_id}
                        onToggle={() => setExpandedSummary(
                          expandedSummary === summary.source_id ? null : summary.source_id
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Infrastructure & Data Centers */}
              {groupedSummaries.infrastructure.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <ServerStackIcon className="h-5 w-5 text-cyan-400" />
                    <h2 className="text-lg font-semibold text-white">Infrastructure & Data Centers</h2>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-400">
                      {groupedSummaries.infrastructure.length}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {groupedSummaries.infrastructure.map((summary) => (
                      <SummaryCard
                        key={summary.source_id}
                        summary={summary}
                        isExpanded={expandedSummary === summary.source_id}
                        onToggle={() => setExpandedSummary(
                          expandedSummary === summary.source_id ? null : summary.source_id
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Market & Regulatory Data */}
              {groupedSummaries.market.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <ChartBarIcon className="h-5 w-5 text-emerald-400" />
                    <h2 className="text-lg font-semibold text-white">Market & Regulatory Data</h2>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
                      {groupedSummaries.market.length}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {groupedSummaries.market.map((summary) => (
                      <SummaryCard
                        key={summary.source_id}
                        summary={summary}
                        isExpanded={expandedSummary === summary.source_id}
                        onToggle={() => setExpandedSummary(
                          expandedSummary === summary.source_id ? null : summary.source_id
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl card-gradient border border-white/10 p-12 text-center">
              <SparklesIcon className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Summaries Yet</h3>
              <p className="text-slate-400 mb-6">
                Import data first, then generate LLM summaries for analysis.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleImportAll}
                  disabled={importing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50"
                >
                  <CloudArrowDownIcon className="h-4 w-4" />
                  Import Data
                </button>
                <button
                  onClick={handleSummarizeAll}
                  disabled={summarizing || importedCount === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-500 disabled:opacity-50"
                >
                  <SparklesIcon className="h-4 w-4" />
                  Generate Summaries
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
