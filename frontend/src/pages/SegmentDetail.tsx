import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeftIcon, DocumentTextIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

const segmentData: Record<string, any> = {
  tier_e1: {
    label: 'E1: $1.5k–$10k',
    description: 'Entry enterprise: small multi-site or single large site',
    accounts: 12500,
    arr: 450_000_000,
    avgMrr: 3000,
    icp: [
      '10-50 locations',
      '100-500 employees',
      'Industries: retail, healthcare, hospitality',
      'Current: legacy copper/T1, basic broadband',
      'Need: reliability, security, cost efficiency',
    ],
    primaryBundle: 'Dedicated Internet + Basic SD-WAN',
    attachPath: 'DIA → SD-WAN → SASE Lite',
    acquisitionPlays: [
      { name: 'Legacy Displacement', description: 'Target accounts on T1/DS3 for fiber upgrade' },
      { name: 'Competitive Win-Back', description: 'Re-engage churned accounts with new bundle' },
      { name: 'Partner Referral', description: 'IT reseller and MSP referral program' },
    ],
    expansionPlays: [
      { name: 'Bandwidth Upgrade', description: 'Trigger when utilization >70%' },
      { name: 'SD-WAN Attach', description: 'Bundle at renewal or new site' },
      { name: 'Multi-Site Rollout', description: 'Land and expand to additional locations' },
    ],
    kpis: [
      { name: 'Win Rate', target: '28%', current: '25%' },
      { name: 'Sales Cycle', target: '45 days', current: '52 days' },
      { name: 'SD-WAN Attach', target: '35%', current: '28%' },
      { name: 'Churn Rate', target: '15%', current: '18%' },
    ],
  },
  tier_e2: {
    label: 'E2: $10k–$50k',
    description: 'Mid-market enterprise: regional multi-site',
    accounts: 4200,
    arr: 720_000_000,
    avgMrr: 14286,
    icp: [
      '20-100 locations',
      '500-2000 employees',
      'Industries: retail chains, healthcare networks, hospitality groups',
      'Current: MPLS, basic SD-WAN',
      'Need: hybrid cloud connectivity, security convergence',
    ],
    primaryBundle: 'Ethernet + SD-WAN + Managed Security',
    attachPath: 'Ethernet → SD-WAN → SASE',
    acquisitionPlays: [
      { name: 'MPLS Migration', description: 'Cost reduction via SD-WAN replacement' },
      { name: 'Multi-Cloud Connect', description: 'Direct2Cloud for AWS/Azure workloads' },
      { name: 'Competitive Displacement', description: 'Beat incumbent on TCO + capability' },
    ],
    expansionPlays: [
      { name: 'SASE Bundle', description: 'Add security to existing SD-WAN' },
      { name: 'Managed Services', description: 'Take over network operations' },
      { name: 'New Region Expansion', description: 'Follow customer geographic growth' },
    ],
    kpis: [
      { name: 'Win Rate', target: '32%', current: '29%' },
      { name: 'Sales Cycle', target: '60 days', current: '68 days' },
      { name: 'SASE Attach', target: '40%', current: '32%' },
      { name: 'NRR', target: '108%', current: '105%' },
    ],
  },
}

export function SegmentDetail() {
  const { tier } = useParams<{ tier: string }>()
  const segment = tier ? segmentData[tier] : null

  if (!segment) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Segment not found</p>
        <Link to="/segments" className="text-brand-400 hover:text-brand-300 mt-4 inline-block">
          ← Back to Segments
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/segments"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{segment.label}</h1>
            <p className="text-sm text-slate-400">{segment.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            <DocumentTextIcon className="h-4 w-4" />
            Generate Playbook
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-brand-600/30 hover:bg-brand-500 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export Deck
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl card-gradient border border-white/10 p-6"
        >
          <p className="text-sm text-slate-400">Segment ARR</p>
          <p className="mt-2 text-3xl font-bold text-white tabular-nums">
            ${(segment.arr / 1_000_000).toFixed(0)}M
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl card-gradient border border-white/10 p-6"
        >
          <p className="text-sm text-slate-400">Accounts</p>
          <p className="mt-2 text-3xl font-bold text-white tabular-nums">
            {segment.accounts.toLocaleString()}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl card-gradient border border-white/10 p-6"
        >
          <p className="text-sm text-slate-400">Avg MRR</p>
          <p className="mt-2 text-3xl font-bold text-white tabular-nums">
            ${segment.avgMrr.toLocaleString()}
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ICP */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl card-gradient border border-white/10 p-6"
        >
          <h3 className="text-lg font-semibold text-white">Ideal Customer Profile</h3>
          <ul className="mt-4 space-y-2">
            {segment.icp.map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-brand-400 mt-1">•</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Primary Bundle</p>
            <p className="mt-1 text-sm font-medium text-white">{segment.primaryBundle}</p>
            <p className="mt-3 text-xs text-slate-500 uppercase tracking-wide">Attach Path</p>
            <p className="mt-1 text-sm font-medium text-accent-400">{segment.attachPath}</p>
          </div>
        </motion.div>

        {/* KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl card-gradient border border-white/10 p-6"
        >
          <h3 className="text-lg font-semibold text-white">Segment KPIs</h3>
          <div className="mt-4 space-y-4">
            {segment.kpis.map((kpi: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{kpi.name}</span>
                  <span className="text-slate-300">
                    <span className="text-white font-medium">{kpi.current}</span>
                    <span className="text-slate-500"> / {kpi.target}</span>
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/5">
                  <div 
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: '75%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Plays */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl card-gradient border border-white/10 p-6"
        >
          <h3 className="text-lg font-semibold text-white">Acquisition Plays</h3>
          <div className="mt-4 space-y-4">
            {segment.acquisitionPlays.map((play: any, i: number) => (
              <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/5">
                <p className="font-medium text-white">{play.name}</p>
                <p className="mt-1 text-sm text-slate-400">{play.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-xl card-gradient border border-white/10 p-6"
        >
          <h3 className="text-lg font-semibold text-white">Expansion Plays</h3>
          <div className="mt-4 space-y-4">
            {segment.expansionPlays.map((play: any, i: number) => (
              <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/5">
                <p className="font-medium text-white">{play.name}</p>
                <p className="mt-1 text-sm text-slate-400">{play.description}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

