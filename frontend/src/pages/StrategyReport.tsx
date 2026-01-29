import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  SparklesIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ChartBarIcon,
  GlobeAltIcon,
  UserGroupIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  RocketLaunchIcon,
  CurrencyDollarIcon,
  ShieldExclamationIcon,
  FlagIcon,
  DocumentTextIcon,
  TrophyIcon,
  BoltIcon,
  ScaleIcon,
  PresentationChartLineIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { HelpSection } from '../components/HelpSection'
import { JobProgressToast } from '../components/JobProgressToast'
import { useJobPolling } from '../hooks/useJobPolling'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { coldarkDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, AreaChart, Area, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Line, Legend,
  ComposedChart,
} from 'recharts'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { useCBConfig } from '../context/CBConfigContext'

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
    lastAutoTable: { finalY: number }
  }
}

// Types
interface KeyInsight {
  title: string
  description: string
  impact: string
  category: string
}

interface StrategicRecommendation {
  priority: number
  title: string
  description: string
  rationale: string
  expected_impact: string
  timeline: string
}

interface ReportSection {
  section_id: string
  section_title: string
  section_subtitle?: string
  narrative: string
  key_points?: string[]
}

interface StrategyReport {
  id: string
  title: string
  subtitle: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  created_at: string
  completed_at?: string
  generation_time_seconds?: number
  executive_summary?: string
  key_insights: KeyInsight[]
  strategic_recommendations: StrategicRecommendation[]
  sections: ReportSection[]
  llm_provider?: string
  llm_model?: string
  error_message?: string
  data_sources_used: string[]
}

// Chart color palette - BCG/Investment Bank style
const COLORS = {
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  accent: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  slate: '#64748B',
  chart: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'],
}

// Section icon mapping
const sectionIcons: Record<string, React.ElementType> = {
  executive_summary: TrophyIcon,
  market_overview: GlobeAltIcon,
  competitive_landscape: ScaleIcon,
  customer_segmentation: UserGroupIcon,
  product_portfolio: BuildingOffice2Icon,
  geographic_analysis: MapPinIcon,
  growth_strategy: RocketLaunchIcon,
  go_to_market: PresentationChartLineIcon,
  financial_projections: CurrencyDollarIcon,
  risk_assessment: ShieldExclamationIcon,
  implementation_roadmap: FlagIcon,
  appendix: DocumentTextIcon,
}

// Custom markdown components
const CustomH1 = ({ children }: { children?: React.ReactNode }) => (
  <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3 border-b-2 border-brand-500/50 pb-3">
    <SparklesIcon className="h-8 w-8 text-brand-400" />
    {children}
  </h1>
)

const CustomH2 = ({ children }: { children?: React.ReactNode }) => (
  <h2 className="text-2xl font-semibold text-white mt-8 mb-4 flex items-center gap-2">
    <BoltIcon className="h-6 w-6 text-amber-400" />
    {children}
  </h2>
)

const CustomH3 = ({ children }: { children?: React.ReactNode }) => (
  <h3 className="text-xl font-semibold text-white mt-6 mb-3 border-l-4 border-brand-500 pl-4">
    {children}
  </h3>
)

const CustomH4 = ({ children }: { children?: React.ReactNode }) => (
  <h4 className="text-lg font-semibold text-slate-200 mt-5 mb-2">{children}</h4>
)

const CustomP = ({ children }: { children?: React.ReactNode }) => (
  <p className="text-slate-300 mb-4 leading-relaxed text-base">{children}</p>
)

const CustomUl = ({ children }: { children?: React.ReactNode }) => (
  <ul className="text-slate-300 mb-4 space-y-2 pl-1">{children}</ul>
)

const CustomOl = ({ children }: { children?: React.ReactNode }) => (
  <ol className="text-slate-300 mb-4 space-y-2 pl-1 list-decimal list-inside">{children}</ol>
)

const CustomLi = ({ children }: { children?: React.ReactNode }) => (
  <li className="flex items-start gap-3 mb-2">
    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-brand-400 mt-2"></span>
    <span className="flex-1">{children}</span>
  </li>
)

const CustomBlockquote = ({ children }: { children?: React.ReactNode }) => (
  <blockquote className="border-l-4 border-amber-500 pl-6 italic text-slate-300 my-6 bg-amber-500/5 py-4 pr-4 rounded-r-lg">
    {children}
  </blockquote>
)

const CustomStrong = ({ children }: { children?: React.ReactNode }) => (
  <strong className="font-bold text-white">{children}</strong>
)

const CustomEm = ({ children }: { children?: React.ReactNode }) => (
  <em className="italic text-brand-300">{children}</em>
)

const CustomCodeBlock = ({ inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '')
  return !inline && match ? (
    <SyntaxHighlighter
      style={coldarkDark}
      language={match[1]}
      PreTag="div"
      {...props}
      className="rounded-lg !bg-slate-900 p-4 text-sm overflow-x-auto my-4"
    >
      {String(children).replace(/\n$/, '')}
    </SyntaxHighlighter>
  ) : (
    <code className="bg-slate-700 text-brand-300 px-1.5 py-0.5 rounded-md text-sm" {...props}>
      {children}
    </code>
  )
}

const CustomTable = ({ children }: { children?: React.ReactNode }) => (
  <div className="overflow-x-auto my-6">
    <table className="min-w-full divide-y divide-slate-700 rounded-xl overflow-hidden border border-slate-700 shadow-lg">
      {children}
    </table>
  </div>
)

const CustomThead = ({ children }: { children?: React.ReactNode }) => (
  <thead className="bg-gradient-to-r from-slate-800 to-slate-700">{children}</thead>
)

const CustomTbody = ({ children }: { children?: React.ReactNode }) => (
  <tbody className="divide-y divide-slate-800 bg-slate-900/50">{children}</tbody>
)

const CustomTr = ({ children }: { children?: React.ReactNode }) => (
  <tr className="hover:bg-slate-800/70 transition-colors">{children}</tr>
)

const CustomTh = ({ children }: { children?: React.ReactNode }) => (
  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-brand-300 uppercase tracking-wider">
    {children}
  </th>
)

const CustomTd = ({ children }: { children?: React.ReactNode }) => (
  <td className="px-6 py-4 text-sm text-slate-300">{children}</td>
)

// Sample data for charts (will be populated from CB config context)
const marketSizingData = [
  { name: 'TAM', value: 185, label: 'Total Addressable Market', color: COLORS.chart[0] },
  { name: 'SAM', value: 45, label: 'Serviceable Addressable Market', color: COLORS.chart[1] },
  { name: 'SOM', value: 8.5, label: 'Serviceable Obtainable Market', color: COLORS.chart[2] },
  { name: 'Current', value: 3.0, label: 'Current Revenue', color: COLORS.chart[3] },
]

const segmentData = [
  { name: 'E1: $1.5k-$10k', arr: 450, accounts: 8500, growth: 12, color: COLORS.chart[0] },
  { name: 'E2: $10k-$50k', arr: 720, accounts: 4200, growth: 18, color: COLORS.chart[1] },
  { name: 'E3: $50k-$150k', arr: 580, accounts: 950, growth: 22, color: COLORS.chart[2] },
  { name: 'E4: $150k-$500k', arr: 650, accounts: 280, growth: 25, color: COLORS.chart[3] },
  { name: 'E5: $500k+', arr: 600, accounts: 45, growth: 28, color: COLORS.chart[4] },
]

const growthProjectionData = [
  { year: '2024', actual: 2.85, target: 2.85, growth: 14 },
  { year: '2025', actual: 3.0, target: 3.28, growth: 15 },
  { year: '2026', target: 3.77, growth: 15 },
  { year: '2027', target: 4.34, growth: 15 },
  { year: '2028', target: 4.99, growth: 15 },
]

const competitorData = [
  { name: 'Network Coverage', comcast: 85, att: 90, verizon: 88, lumen: 75 },
  { name: 'Product Portfolio', comcast: 78, att: 82, verizon: 85, lumen: 70 },
  { name: 'Price Competitiveness', comcast: 82, att: 75, verizon: 72, lumen: 80 },
  { name: 'Customer Service', comcast: 72, att: 70, verizon: 75, lumen: 68 },
  { name: 'Innovation', comcast: 75, att: 80, verizon: 82, lumen: 65 },
  { name: 'Enterprise Focus', comcast: 70, att: 85, verizon: 88, lumen: 82 },
]

const msaPriorityData = [
  { name: 'New York', score: 95, potential: 450, coverage: 92 },
  { name: 'Los Angeles', score: 88, potential: 380, coverage: 85 },
  { name: 'Chicago', score: 85, potential: 320, coverage: 88 },
  { name: 'Philadelphia', score: 92, potential: 280, coverage: 95 },
  { name: 'Dallas', score: 78, potential: 250, coverage: 72 },
  { name: 'Houston', score: 75, potential: 240, coverage: 68 },
  { name: 'Atlanta', score: 82, potential: 220, coverage: 80 },
  { name: 'Miami', score: 80, potential: 200, coverage: 78 },
]

const riskMatrix = [
  { risk: 'Competitive Fiber Overbuild', likelihood: 4, impact: 5, category: 'Market' },
  { risk: 'Economic Downturn', likelihood: 3, impact: 4, category: 'External' },
  { risk: 'Technology Disruption', likelihood: 3, impact: 4, category: 'Technology' },
  { risk: 'Talent Acquisition', likelihood: 4, impact: 3, category: 'Operational' },
  { risk: 'Regulatory Changes', likelihood: 2, impact: 4, category: 'Regulatory' },
]

// Chart Components
const MarketSizingChart = () => (
  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
      <ChartBarIcon className="h-5 w-5 text-brand-400" />
      Market Sizing ($B)
    </h3>
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={marketSizingData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis type="number" stroke="#94a3b8" fontSize={12} />
        <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={80} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
          labelStyle={{ color: '#f1f5f9' }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {marketSizingData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
)

const SegmentDistributionChart = () => (
  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
      <UserGroupIcon className="h-5 w-5 text-purple-400" />
      Segment ARR Distribution ($M)
    </h3>
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={segmentData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-15} textAnchor="end" height={60} />
        <YAxis stroke="#94a3b8" fontSize={12} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
          labelStyle={{ color: '#f1f5f9' }}
        />
        <Bar dataKey="arr" radius={[4, 4, 0, 0]}>
          {segmentData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
)

const GrowthProjectionChart = () => (
  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
      <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-400" />
      Revenue Growth Trajectory ($B)
    </h3>
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={growthProjectionData}>
        <defs>
          <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.accent} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
        <YAxis stroke="#94a3b8" fontSize={12} domain={[2.5, 5.5]} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
          labelStyle={{ color: '#f1f5f9' }}
        />
        <Legend />
        <Area type="monotone" dataKey="target" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorTarget)" name="Target ARR" />
        <Area type="monotone" dataKey="actual" stroke={COLORS.accent} fillOpacity={1} fill="url(#colorActual)" name="Actual ARR" />
      </AreaChart>
    </ResponsiveContainer>
  </div>
)

const CompetitorRadarChart = () => (
  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
      <ScaleIcon className="h-5 w-5 text-amber-400" />
      Competitive Positioning
    </h3>
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={competitorData}>
        <PolarGrid stroke="#334155" />
        <PolarAngleAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
        <PolarRadiusAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
        <Radar name="Comcast Business" dataKey="comcast" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} />
        <Radar name="AT&T" dataKey="att" stroke={COLORS.warning} fill={COLORS.warning} fillOpacity={0.1} />
        <Radar name="Verizon" dataKey="verizon" stroke={COLORS.danger} fill={COLORS.danger} fillOpacity={0.1} />
        <Legend />
        <Tooltip
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  </div>
)

const MSAPriorityChart = () => (
  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
      <MapPinIcon className="h-5 w-5 text-cyan-400" />
      MSA Priority Score & Market Potential
    </h3>
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={msaPriorityData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-20} textAnchor="end" height={50} />
        <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} />
        <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
          labelStyle={{ color: '#f1f5f9' }}
        />
        <Legend />
        <Bar yAxisId="left" dataKey="potential" fill={COLORS.chart[1]} name="Market Potential ($M)" radius={[4, 4, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="score" stroke={COLORS.accent} strokeWidth={2} name="Priority Score" dot={{ fill: COLORS.accent }} />
      </ComposedChart>
    </ResponsiveContainer>
  </div>
)

const RiskMatrixChart = () => {
  const riskColors: Record<string, string> = {
    'Market': COLORS.chart[0],
    'External': COLORS.chart[1],
    'Technology': COLORS.chart[2],
    'Operational': COLORS.chart[3],
    'Regulatory': COLORS.chart[4],
  }
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <ShieldExclamationIcon className="h-5 w-5 text-red-400" />
        Risk Assessment Matrix
      </h3>
      <div className="grid grid-cols-5 gap-2 mb-4">
        {[5, 4, 3, 2, 1].map(impact => (
          <React.Fragment key={impact}>
            {[1, 2, 3, 4, 5].map(likelihood => {
              const risk = riskMatrix.find(r => r.likelihood === likelihood && r.impact === impact)
              const severity = likelihood * impact
              const bgColor = severity >= 15 ? 'bg-red-500/40' : severity >= 8 ? 'bg-amber-500/30' : 'bg-emerald-500/20'
              
              return (
                <div
                  key={`${likelihood}-${impact}`}
                  className={`h-12 rounded ${bgColor} flex items-center justify-center text-xs relative group`}
                >
                  {risk && (
                    <>
                      <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: riskColors[risk.category] }} />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {risk.risk}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Likelihood →</span>
        <div className="flex gap-4">
          {Object.entries(riskColors).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span>{cat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Helper function to format currency
function formatCurrencyCompact(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

// Key Metrics Cards - uses real CB Config data
interface KeyMetricsProps {
  enterpriseArr: number
  growthTarget: number
  enterpriseAccounts: number
  avgMrr: number
  growthActual: number
}

const KeyMetricsCards = ({ enterpriseArr, growthTarget, enterpriseAccounts, avgMrr, growthActual }: KeyMetricsProps) => {
  const metrics = [
    { 
      label: 'Current ARR', 
      value: formatCurrencyCompact(enterpriseArr), 
      change: `+${growthActual}%`, 
      icon: CurrencyDollarIcon, 
      color: 'from-blue-500 to-blue-600' 
    },
    { 
      label: 'Target Growth', 
      value: `${growthTarget}%`, 
      change: growthTarget > growthActual ? `+${growthTarget - growthActual}pp` : '—', 
      icon: ArrowTrendingUpIcon, 
      color: 'from-emerald-500 to-emerald-600' 
    },
    { 
      label: 'Enterprise Accounts', 
      value: enterpriseAccounts.toLocaleString(), 
      change: '+8%', 
      icon: BuildingOffice2Icon, 
      color: 'from-purple-500 to-purple-600' 
    },
    { 
      label: 'Avg MRR', 
      value: formatCurrencyCompact(avgMrr), 
      change: '+12%', 
      icon: ChartBarIcon, 
      color: 'from-amber-500 to-amber-600' 
    },
  ]
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {metrics.map((metric, i) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`p-4 rounded-xl bg-gradient-to-br ${metric.color} shadow-lg`}
        >
          <div className="flex items-center justify-between">
            <metric.icon className="h-8 w-8 text-white/80" />
            <span className="text-xs font-medium text-white/80 bg-white/20 px-2 py-0.5 rounded-full">
              {metric.change}
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">{metric.value}</p>
          <p className="text-sm text-white/80">{metric.label}</p>
        </motion.div>
      ))}
    </div>
  )
}

export function StrategyReport() {
  // Get CB Config data from context
  const { config } = useCBConfig()
  
  const [report, setReport] = useState<StrategyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['executive_summary']))
  const [error, setError] = useState<string | null>(null)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)
  
  // Job polling for async report generation
  const {
    isPolling: generating,
    progress,
    progressMessage,
    error: jobError,
    startPolling,
    reset: resetJobPolling,
  } = useJobPolling({
    interval: 2000,
    timeout: 300000, // 5 minutes
    onComplete: async () => {
      // Fetch the completed report
      await fetchLatestReport()
    },
    onError: (err) => {
      setError(err)
    }
  })

  useEffect(() => {
    fetchLatestReport()
  }, [])

  const fetchLatestReport = async () => {
    try {
      const res = await fetch('/api/strategy-report/latest')
      if (res.ok) {
        const data = await res.json()
        setReport(data)
        if (data && data.sections) {
          // Auto-expand executive summary
          setExpandedSections(new Set(['executive_summary']))
        }
      }
    } catch (e) {
      console.error('Error fetching report:', e)
    } finally {
      setLoading(false)
    }
  }

  const generateNewReport = async () => {
    setError(null)
    resetJobPolling()
    
    try {
      const res = await fetch('/api/strategy-report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (res.ok) {
        const data = await res.json()
        // New async API returns job_id
        if (data.job_id) {
          startPolling(data.job_id)
        } else if (data.id) {
          // Fallback for sync response
          setReport(data)
        }
      } else {
        const errData = await res.json()
        setError(errData.detail || 'Failed to generate report')
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to generate report'
      setError(errorMessage)
    }
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const expandAllSections = () => {
    if (report?.sections) {
      setExpandedSections(new Set(report.sections.map(s => s.section_id)))
    }
  }

  const collapseAllSections = () => {
    setExpandedSections(new Set())
  }

  // BCG/Investment Bank Quality PDF Generation
  const generatePremiumPDF = async () => {
    if (!report) return
    setPdfGenerating(true)

    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15
      const contentWidth = pageWidth - 2 * margin
      let pageNum = 0

      // Helper functions
      const addPage = () => {
        if (pageNum > 0) pdf.addPage()
        pageNum++
        // Add page background
        pdf.setFillColor(15, 23, 42) // slate-900
        pdf.rect(0, 0, pageWidth, pageHeight, 'F')
        // Add footer
        pdf.setFontSize(8)
        pdf.setTextColor(100, 116, 139)
        pdf.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
        pdf.text('CONFIDENTIAL', margin, pageHeight - 8)
        pdf.text(new Date().toLocaleDateString(), pageWidth - margin, pageHeight - 8, { align: 'right' })
      }

      const addSectionHeader = (title: string, y: number): number => {
        // Gradient bar
        pdf.setFillColor(59, 130, 246) // blue-500
        pdf.rect(margin, y, contentWidth, 8, 'F')
        pdf.setFontSize(14)
        pdf.setTextColor(255, 255, 255)
        pdf.setFont('helvetica', 'bold')
        pdf.text(title.toUpperCase(), margin + 4, y + 5.5)
        return y + 12
      }

      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number, color: number[]): number => {
        pdf.setFontSize(fontSize)
        pdf.setTextColor(color[0], color[1], color[2])
        pdf.setFont('helvetica', 'normal')
        const lines = pdf.splitTextToSize(text, maxWidth)
        const lineHeight = fontSize * 0.5
        
        for (const line of lines) {
          if (y + lineHeight > pageHeight - 20) {
            addPage()
            y = 25
          }
          pdf.text(line, x, y)
          y += lineHeight
        }
        return y + 2
      }

      // ===== COVER PAGE =====
      addPage()
      
      // Cover gradient header
      pdf.setFillColor(30, 41, 59) // slate-800
      pdf.rect(0, 0, pageWidth, 100, 'F')
      
      // Blue accent bar
      pdf.setFillColor(59, 130, 246)
      pdf.rect(0, 95, pageWidth, 5, 'F')
      
      // Title
      pdf.setFontSize(32)
      pdf.setTextColor(255, 255, 255)
      pdf.setFont('helvetica', 'bold')
      pdf.text('ENTERPRISE', margin, 45)
      pdf.text('GROWTH STRATEGY', margin, 60)
      
      // Subtitle
      pdf.setFontSize(14)
      pdf.setTextColor(148, 163, 184)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Accelerating from 14% to 15% Annual Growth', margin, 80)
      
      // Main title section
      pdf.setFontSize(24)
      pdf.setTextColor(59, 130, 246)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Comcast Business', margin, 130)
      pdf.text('Enterprise Segment', margin, 145)
      
      pdf.setFontSize(12)
      pdf.setTextColor(148, 163, 184)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Strategic Analysis & Roadmap', margin, 160)
      pdf.text('FY2026 - FY2028', margin, 170)
      
      // Metrics boxes
      const boxY = 200
      const boxWidth = (contentWidth - 15) / 4
      const metrics = [
        { label: 'Current ARR', value: '$3.0B' },
        { label: 'Target Growth', value: '15%' },
        { label: 'Accounts', value: '18,125' },
        { label: 'Avg MRR', value: '$13.8K' },
      ]
      
      metrics.forEach((m, i) => {
        const x = margin + i * (boxWidth + 5)
        pdf.setFillColor(30, 41, 59)
        pdf.roundedRect(x, boxY, boxWidth, 30, 3, 3, 'F')
        pdf.setFontSize(16)
        pdf.setTextColor(255, 255, 255)
        pdf.setFont('helvetica', 'bold')
        pdf.text(m.value, x + boxWidth/2, boxY + 12, { align: 'center' })
        pdf.setFontSize(8)
        pdf.setTextColor(148, 163, 184)
        pdf.setFont('helvetica', 'normal')
        pdf.text(m.label, x + boxWidth/2, boxY + 22, { align: 'center' })
      })
      
      // Date and branding
      pdf.setFontSize(10)
      pdf.setTextColor(100, 116, 139)
      pdf.text(`Generated: ${new Date(report.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, pageHeight - 25)
      pdf.setTextColor(59, 130, 246)
      pdf.setFont('helvetica', 'bold')
      pdf.text('COMCAST BUSINESS', pageWidth - margin, pageHeight - 25, { align: 'right' })

      // ===== EXECUTIVE SUMMARY =====
      addPage()
      let y = 25
      y = addSectionHeader('Executive Summary', y)
      y += 5
      
      if (report.executive_summary) {
        const cleanSummary = report.executive_summary
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/#{1,6}\s/g, '')
          .replace(/`/g, '')
        y = addWrappedText(cleanSummary, margin, y, contentWidth, 11, [203, 213, 225])
      }

      // ===== KEY INSIGHTS =====
      if (report.key_insights.length > 0) {
        addPage()
        y = 25
        y = addSectionHeader('Key Insights', y)
        y += 5
        
        report.key_insights.forEach((insight, i) => {
          if (y > pageHeight - 50) {
            addPage()
            y = 25
          }
          
          // Insight number badge
          pdf.setFillColor(59, 130, 246)
          pdf.circle(margin + 5, y + 2, 5, 'F')
          pdf.setFontSize(10)
          pdf.setTextColor(255, 255, 255)
          pdf.setFont('helvetica', 'bold')
          pdf.text(String(i + 1), margin + 5, y + 4, { align: 'center' })
          
          // Insight title
          pdf.setFontSize(12)
          pdf.setTextColor(255, 255, 255)
          pdf.text(insight.title, margin + 15, y + 4)
          y += 10
          
          // Insight description
          y = addWrappedText(insight.description, margin + 15, y, contentWidth - 15, 10, [148, 163, 184])
          y += 5
        })
      }

      // ===== STRATEGIC RECOMMENDATIONS =====
      if (report.strategic_recommendations.length > 0) {
        addPage()
        y = 25
        y = addSectionHeader('Strategic Recommendations', y)
        y += 5
        
        report.strategic_recommendations.forEach((rec) => {
          if (y > pageHeight - 60) {
            addPage()
            y = 25
          }
          
          // Priority badge
          const priorityColor = rec.priority === 1 ? [239, 68, 68] : rec.priority === 2 ? [245, 158, 11] : [16, 185, 129]
          pdf.setFillColor(priorityColor[0], priorityColor[1], priorityColor[2])
          pdf.roundedRect(margin, y, 25, 8, 2, 2, 'F')
          pdf.setFontSize(8)
          pdf.setTextColor(255, 255, 255)
          pdf.setFont('helvetica', 'bold')
          pdf.text(`P${rec.priority}`, margin + 12.5, y + 5.5, { align: 'center' })
          
          // Title
          pdf.setFontSize(11)
          pdf.setTextColor(255, 255, 255)
          pdf.text(rec.title, margin + 30, y + 5.5)
          y += 12
          
          // Description
          y = addWrappedText(rec.description, margin, y, contentWidth, 10, [148, 163, 184])
          
          // Timeline and Impact
          pdf.setFontSize(9)
          pdf.setTextColor(100, 116, 139)
          pdf.text(`Timeline: ${rec.timeline} | Impact: ${rec.expected_impact}`, margin, y)
          y += 10
        })
      }

      // ===== REPORT SECTIONS =====
      for (const section of report.sections) {
        addPage()
        y = 25
        y = addSectionHeader(section.section_title, y)
        y += 5
        
        const cleanNarrative = section.narrative
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/#{1,6}\s/g, '\n')
          .replace(/`/g, '')
          .replace(/\|/g, ' ')
        
        y = addWrappedText(cleanNarrative, margin, y, contentWidth, 10, [203, 213, 225])
      }

      // Save PDF
      pdf.save(`Comcast_Business_Strategy_Report_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (e) {
      console.error('Error generating PDF:', e)
    } finally {
      setPdfGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-brand-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading strategy report...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8" ref={reportRef}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-white flex items-center gap-3"
          >
            <div className="p-2 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 shadow-lg shadow-brand-500/30">
              <TrophyIcon className="h-8 w-8 text-white" />
            </div>
            Enterprise Strategy Report
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-2 text-slate-400 max-w-2xl"
          >
            BCG/Bain-quality comprehensive analysis powered by AI. Generate strategic insights, competitive positioning, and growth roadmap.
          </motion.p>
        </div>

        <div className="flex items-center gap-3">
          {report?.status === 'completed' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={generatePremiumPDF}
              disabled={pdfGenerating}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-600/30 hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-50"
            >
              {pdfGenerating ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  Download Premium PDF
                </>
              )}
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={generateNewReport}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-600/30 hover:from-brand-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <SparklesIcon className="h-5 w-5" />
                Generate New Report
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-red-500/10 border border-red-500/30"
        >
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
            <div>
              <p className="font-medium text-red-300">Generation Failed</p>
              <p className="text-sm text-red-400/80">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Generating State */}
      {generating && report?.status === 'generating' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-2xl bg-gradient-to-br from-brand-900/50 to-purple-900/30 border border-brand-500/30 text-center"
        >
          <div className="relative inline-block">
            <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping"></div>
            <SparklesIcon className="h-16 w-16 text-brand-400 mx-auto relative" />
          </div>
          <h3 className="mt-6 text-xl font-semibold text-white">Generating Your Strategy Report</h3>
          <p className="mt-2 text-slate-400 max-w-md mx-auto">
            Our AI is analyzing all your data across segments, markets, competitors, and products to create a world-class strategic analysis...
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
            <ClockIcon className="h-4 w-4" />
            This may take 2-5 minutes
          </div>
        </motion.div>
      )}

      {/* No Report State */}
      {!report && !generating && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-12 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-center"
        >
          <TrophyIcon className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white">No Strategy Report Yet</h3>
          <p className="mt-2 text-slate-400 max-w-md mx-auto">
            Generate your first comprehensive strategy report using AI analysis of all your business data.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={generateNewReport}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 px-6 py-3 text-sm font-medium text-white shadow-lg"
          >
            <SparklesIcon className="h-5 w-5" />
            Generate Strategy Report
          </motion.button>
        </motion.div>
      )}

      {/* Report Content */}
      {report && report.status === 'completed' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Key Metrics - using real CB Config data */}
          <KeyMetricsCards 
            enterpriseArr={config?.company_metrics?.enterprise_arr || 3000000000}
            growthTarget={config?.company_metrics?.growth_target_pct || 15}
            enterpriseAccounts={config?.company_metrics?.enterprise_accounts || 18125}
            avgMrr={config?.company_metrics?.avg_mrr || 13800}
            growthActual={config?.company_metrics?.growth_rate_actual || 14}
          />

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MarketSizingChart />
            <SegmentDistributionChart />
            <GrowthProjectionChart />
            <CompetitorRadarChart />
            <MSAPriorityChart />
            <RiskMatrixChart />
          </div>

          {/* Report Header Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">{report.title}</h2>
                <p className="mt-1 text-slate-400">{report.subtitle}</p>
                <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <ClockIcon className="h-4 w-4" />
                    Generated {new Date(report.created_at).toLocaleString()}
                  </span>
                  {report.generation_time_seconds && (
                    <span>• {Math.round(report.generation_time_seconds)}s generation time</span>
                  )}
                  {report.llm_model && (
                    <span>• {report.llm_model}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-sm">
                  <CheckCircleIcon className="h-4 w-4" />
                  Complete
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-700/50">
              <button
                onClick={expandAllSections}
                className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={collapseAllSections}
                className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Executive Summary */}
          {report.executive_summary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-8 rounded-2xl bg-gradient-to-br from-brand-900/30 to-purple-900/20 border border-brand-500/30 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-brand-500/20">
                  <TrophyIcon className="h-6 w-6 text-brand-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Executive Summary</h2>
              </div>
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: CustomH1, h2: CustomH2, h3: CustomH3, h4: CustomH4,
                    p: CustomP, ul: CustomUl, ol: CustomOl, li: CustomLi,
                    blockquote: CustomBlockquote, strong: CustomStrong, em: CustomEm,
                    code: CustomCodeBlock, table: CustomTable, thead: CustomThead,
                    tbody: CustomTbody, tr: CustomTr, th: CustomTh, td: CustomTd,
                  }}
                >
                  {report.executive_summary}
                </ReactMarkdown>
              </div>
            </motion.div>
          )}

          {/* Key Insights */}
          {report.key_insights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <LightBulbIcon className="h-6 w-6 text-amber-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Key Insights</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {report.key_insights.map((insight, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="p-5 rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-600/50 hover:border-amber-500/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-amber-500 text-white font-bold text-sm">
                        {index + 1}
                      </span>
                      <div>
                        <h4 className="font-semibold text-white">{insight.title}</h4>
                        <p className="mt-2 text-sm text-slate-400">{insight.description}</p>
                        <span className={`mt-3 inline-block px-2 py-0.5 rounded-full text-xs ${
                          insight.impact === 'high' 
                            ? 'bg-red-500/20 text-red-300' 
                            : insight.impact === 'medium'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-green-500/20 text-green-300'
                        }`}>
                          {insight.impact} impact
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Strategic Recommendations */}
          {report.strategic_recommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <RocketLaunchIcon className="h-6 w-6 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Strategic Recommendations</h2>
              </div>
              <div className="space-y-4">
                {report.strategic_recommendations.map((rec, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="p-5 rounded-xl bg-gradient-to-r from-slate-700/30 to-transparent border-l-4 border-emerald-500 hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <span className={`flex items-center justify-center h-10 w-10 rounded-xl text-white font-bold ${
                          rec.priority === 1 ? 'bg-red-500' : rec.priority === 2 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}>
                          P{rec.priority}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-lg">{rec.title}</h4>
                        <p className="mt-2 text-slate-400">{rec.description}</p>
                        <div className="mt-3 flex items-center gap-4 text-sm">
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <ClockIcon className="h-4 w-4" />
                            {rec.timeline}
                          </span>
                          <span className={`inline-flex items-center gap-1 ${
                            rec.expected_impact.toLowerCase().includes('high')
                              ? 'text-emerald-400'
                              : 'text-slate-400'
                          }`}>
                            <ChartBarIcon className="h-4 w-4" />
                            {rec.expected_impact} Impact
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Report Sections */}
          <div className="space-y-4">
            {report.sections.map((section, index) => {
              const SectionIcon = sectionIcons[section.section_id] || DocumentTextIcon
              const isExpanded = expandedSections.has(section.section_id)

              return (
                <motion.div
                  key={section.section_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  className="rounded-2xl bg-slate-800/50 border border-slate-700/50 overflow-hidden"
                >
                  <button
                    onClick={() => toggleSection(section.section_id)}
                    className="w-full p-5 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-slate-700/50">
                        <SectionIcon className="h-5 w-5 text-brand-400" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-white">{section.section_title}</h3>
                        {section.section_subtitle && (
                          <p className="text-sm text-slate-400">{section.section_subtitle}</p>
                        )}
                      </div>
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
                        className="border-t border-slate-700/50"
                      >
                        <div className="p-6">
                          <div className="prose prose-invert max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1: CustomH1, h2: CustomH2, h3: CustomH3, h4: CustomH4,
                                p: CustomP, ul: CustomUl, ol: CustomOl, li: CustomLi,
                                blockquote: CustomBlockquote, strong: CustomStrong, em: CustomEm,
                                code: CustomCodeBlock, table: CustomTable, thead: CustomThead,
                                tbody: CustomTbody, tr: CustomTr, th: CustomTh, td: CustomTd,
                              }}
                            >
                              {section.narrative}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>

          {/* Data Sources Footer */}
          {report.data_sources_used.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50"
            >
              <p className="text-xs text-slate-500 mb-2">Data Sources Used:</p>
              <div className="flex flex-wrap gap-2">
                {report.data_sources_used.map((source, i) => (
                  <span key={i} className="px-2 py-1 rounded-lg bg-slate-800/50 text-xs text-slate-400 border border-slate-700/50">
                    {source}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Failed Report */}
      {report && report.status === 'failed' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-2xl bg-red-500/10 border border-red-500/30 text-center"
        >
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white">Report Generation Failed</h3>
          <p className="mt-2 text-slate-400 max-w-md mx-auto">
            {report.error_message || 'An unexpected error occurred while generating the report.'}
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={generateNewReport}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-medium text-white"
          >
            <ArrowPathIcon className="h-5 w-5" />
            Try Again
          </motion.button>
        </motion.div>
      )}

      <HelpSection
        title="Strategy Report"
        description="Comprehensive BCG/Bain-quality strategy document. The AI synthesizes all platform data to create an executive-ready report covering market analysis, competitive positioning, segment strategies, geographic priorities, financial projections, and implementation roadmap."
        publicDataSources={[
          { label: 'All Market Intel', description: 'TAM/SAM sizing, trends, and growth forecasts' },
          { label: 'All Competitive Intel', description: 'Competitor analyses and strategic recommendations' },
          { label: 'All MSA Data', description: 'Geographic market intelligence and priorities' },
          { label: 'Industry Frameworks', description: 'Best practices from top consulting methodologies' },
        ]}
        cbDataBenefits={[
          'Report baseline uses your actual ARR, growth, and segments',
          'Financial projections aligned to your 2026-2028 targets',
          'Product portfolio and sales capacity considered',
          'Recommendations tailored to your specific situation',
        ]}
        proprietaryDataBenefits={[
          'True performance data from internal systems',
          'Actual win/loss patterns for competitive strategy',
          'Real pipeline for growth projections',
          'Customer health for retention strategies',
          '10x more actionable and accurate recommendations',
        ]}
        tips={[
          'Click "Generate Report" to create a new strategic analysis',
          'Generation takes 1-3 minutes depending on data complexity',
          'Download as PDF for board presentations',
          'Report includes executive summary, 5 key insights, and 5 recommendations',
        ]}
      />
      
      {/* Job Progress Toast */}
      <JobProgressToast
        isVisible={generating}
        title="Generating Strategy Report"
        progress={progress}
        progressMessage={progressMessage}
        status={generating ? 'in_progress' : null}
        error={jobError}
        onDismiss={resetJobPolling}
      />
    </div>
  )
}
