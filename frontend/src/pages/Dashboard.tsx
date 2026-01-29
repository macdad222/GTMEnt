import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BuildingOffice2Icon,
  CurrencyDollarIcon,
  ChartBarIcon,
  RocketLaunchIcon,
  ArrowPathIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { useDashboardData } from '../context/CBConfigContext'
import { HelpSection } from '../components/HelpSection'

const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
  CurrencyDollarIcon,
  BuildingOffice2Icon,
  RocketLaunchIcon,
  ChartBarIcon,
}

export function Dashboard() {
  const navigate = useNavigate()
  // Use centralized CB config context - automatically refreshes when data changes
  const { dashboardData, loading, refreshDashboard, lastUpdated } = useDashboardData()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-8 w-8 text-brand-400 animate-spin" />
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="rounded-xl card-gradient border border-white/10 p-8 text-center">
        <p className="text-red-400">No data available</p>
        <button
          onClick={refreshDashboard}
          className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-500"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Enterprise Growth Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Tracking progress toward {dashboardData.stats[2]?.value || '15%'} annual growth | FY2025
            {lastUpdated && (
              <span className="ml-2 text-slate-500">
                · Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refreshDashboard}
            className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 transition-colors"
            title="Refresh data"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/strategy-report')}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-brand-600/30 hover:from-brand-500 hover:to-purple-500 transition-all"
          >
            <TrophyIcon className="h-4 w-4" />
            Generate Strategy Report
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardData.stats.map((stat, index) => {
          const Icon = iconMap[stat.icon] || ChartBarIcon
          return (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="rounded-xl card-gradient border border-white/10 p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/20">
                  <Icon className="h-5 w-5 text-brand-400" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-emerald-400' : 
                  stat.changeType === 'negative' ? 'text-red-400' : 'text-slate-400'
                }`}>
                  {stat.changeType === 'positive' && <ArrowTrendingUpIcon className="h-4 w-4" />}
                  {stat.changeType === 'negative' && <ArrowTrendingDownIcon className="h-4 w-4" />}
                  {stat.change}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-white tabular-nums">{stat.value}</p>
                <p className="text-sm text-slate-400">{stat.name}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Growth trajectory */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl card-gradient border border-white/10 p-6"
        >
          <h3 className="text-lg font-semibold text-white">Growth Trajectory</h3>
          <p className="text-sm text-slate-400">Quarterly ARR ($B) vs Target</p>
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardData.growth_data.map((d: { period: string; actual: number; target: number }) => ({
                ...d,
                actual: d.actual > 0 ? d.actual : null  // Don't plot 0 values for actual
              }))}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0084f4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0084f4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="period" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis 
                  domain={['auto', 'auto']}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(value) => `$${value}B`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [`$${value}B`, '']}
                />
                <Area 
                  type="monotone" 
                  dataKey="target" 
                  stroke="#475569" 
                  strokeDasharray="4 4"
                  fill="none"
                  strokeWidth={2}
                  name="Target"
                />
                <Area 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#0084f4" 
                  fillOpacity={1}
                  fill="url(#colorActual)"
                  strokeWidth={2}
                  name="Actual"
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Segment distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl card-gradient border border-white/10 p-6"
        >
          <h3 className="text-lg font-semibold text-white">ARR by Segment</h3>
          <p className="text-sm text-slate-400">Enterprise MRR Tiers ($M)</p>
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.segment_data} layout="vertical">
                <XAxis 
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(value) => `$${value}M`}
                />
                <YAxis 
                  type="category"
                  dataKey="tier"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  width={30}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number, _: any, entry: any) => [
                    `$${value}M ARR | ${entry.payload.accounts.toLocaleString()} accounts`,
                    entry.payload.label
                  ]}
                />
                <Bar dataKey="arr" radius={[0, 4, 4, 0]}>
                  {dashboardData.segment_data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Market trends */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="rounded-xl card-gradient border border-white/10 p-6"
      >
        <h3 className="text-lg font-semibold text-white">Market Trends</h3>
        <p className="text-sm text-slate-400">Key drivers from market intelligence</p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dashboardData.trends.map((trend, index) => (
            <motion.div
              key={trend.title}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="rounded-lg bg-white/5 border border-white/5 p-4"
            >
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <ArrowTrendingUpIcon className="h-4 w-4" />
                {trend.magnitude}
              </div>
              <p className="mt-2 text-sm text-slate-300">{trend.title}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <QuickAction
          title="Generate Enterprise Strategy"
          description="BCG-style deck with TAM, trends, and growth model"
          action="Generate"
          delay={0.8}
        />
        <QuickAction
          title="Generate Segment Playbook"
          description="ICP, plays, and KPIs for a specific tier"
          action="Select Tier"
          delay={0.9}
        />
        <QuickAction
          title="Export to PowerPoint"
          description="Download consulting-grade slide deck"
          action="Export"
          delay={1.0}
        />
      </div>

      <HelpSection
        title="Dashboard"
        description="Executive overview of Comcast Business Enterprise performance. Displays real-time KPIs including ARR, account counts, growth rates, and segment health indicators. Use this as your daily command center for enterprise segment health."
        publicDataSources={[
          { label: 'Industry Benchmarks', description: 'Market growth rates and industry averages from analyst reports' },
          { label: 'Economic Indicators', description: 'Business formation and economic health data from BLS/Census' },
        ]}
        cbDataBenefits={[
          'Accurate current ARR and account counts from your configuration',
          'Growth targets (15%) aligned to your strategic plan',
          'Segment distribution reflecting your actual customer base',
          'Bookings targets for 2026-2028 for forecast tracking',
        ]}
        proprietaryDataBenefits={[
          'Real-time ARR sync from Dynamics CRM',
          'Live pipeline data from Orion CPQ',
          'Customer health scores from ServiceNow',
          'Churn alerts and expansion signals',
          'Actual vs. forecast variance tracking',
        ]}
        tips={[
          'Click "Generate Strategy Report" to create a comprehensive BCG-quality analysis',
          'Refresh data after updating CB configuration in Admin Setup',
        ]}
      />
    </div>
  )
}

function QuickAction({ title, description, action, delay }: { 
  title: string
  description: string
  action: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="group rounded-xl card-gradient border border-white/10 p-6 hover:border-brand-500/50 transition-colors cursor-pointer"
    >
      <h4 className="text-white font-medium">{title}</h4>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
      <div className="mt-4">
        <span className="text-sm font-medium text-brand-400 group-hover:text-brand-300 transition-colors">
          {action} →
        </span>
      </div>
    </motion.div>
  )
}
