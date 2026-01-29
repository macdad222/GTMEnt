import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  ArrowLeftIcon, 
  ArrowDownTrayIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

const playbookData: Record<string, any> = {
  'pb-001': {
    id: 'pb-001',
    name: 'Enterprise Strategy 2025',
    type: 'enterprise_strategy',
    status: 'approved',
    owner: 'Strategy Team',
    updatedAt: '2025-01-20',
    sections: [
      {
        id: 's1',
        type: 'executive_summary',
        title: 'Executive Summary',
        narrative: 'Comcast Business Enterprise represents $3.0B in ARR across 18,125 accounts. To achieve 15% annual growth, we must focus on: (1) accelerating SD-WAN/SASE attach, (2) reducing churn in mid-market tiers, (3) scaling AI-assisted sales and support.',
        keyPoints: [
          'Target: 15% YoY enterprise growth for 5 years',
          'Primary levers: attach (SD-WAN/SASE), expansion, churn reduction',
          'AI-enabled operating model to scale without linear headcount growth',
        ],
      },
      {
        id: 's2',
        type: 'market_overview',
        title: 'Market Overview & TAM',
        narrative: 'The US enterprise connectivity and security market represents a $63B+ TAM. Key trends include SD-WAN/SASE convergence (18-22% CAGR), managed services growth, and AI-driven operations.',
        keyPoints: [
          'SD-WAN adoption accelerating in mid-market and enterprise',
          'SASE convergence: SD-WAN + cloud security as single service',
          'Enterprises outsourcing network operations',
          'Fiber upgrade cycle in enterprise',
        ],
      },
      {
        id: 's3',
        type: 'segment_analysis',
        title: 'Segment Analysis',
        narrative: 'Enterprise segments by MRR tier show distinct growth and risk profiles.',
        keyPoints: [
          'E1: $1.5k–$10k: 12,500 accounts, $450M ARR',
          'E2: $10k–$50k: 4,200 accounts, $720M ARR',
          'E3: $50k–$250k: 1,100 accounts, $850M ARR',
          'E4: $250k–$1M: 280 accounts, $620M ARR',
          'E5: $1M+: 45 accounts, $360M ARR',
        ],
      },
      {
        id: 's4',
        type: 'growth_model',
        title: 'Growth Model',
        narrative: 'Achieving 15% growth requires a balanced approach: ~40% from new logos, ~40% from expansion/attach, ~20% from churn reduction.',
        keyPoints: [
          'New logo ARR: target high-potential accounts with Connectivity + SD-WAN bundle',
          'Expansion ARR: trigger-based plays for SD-WAN → SASE attach',
          'Churn reduction: proactive intervention for at-risk accounts',
          'Pricing uplift: capture value in renewals',
        ],
      },
      {
        id: 's5',
        type: 'operating_model',
        title: 'AI-Enabled Operating Model',
        narrative: 'The AI-enabled operating model transforms GTM, Delivery, and Support. AI agents assist (not replace) humans across the first 10 growth-acceleration workflows.',
        keyPoints: [
          'GTM: Account planning, proposal generation, quote building with guardrails',
          'Delivery: Order validation, provisioning status, scheduling',
          'Support: Voice triage with transactions, case routing, config changes',
          'Governance: Human accountability, policy guardrails, audit trails',
        ],
      },
      {
        id: 's6',
        type: 'roadmap',
        title: 'Implementation Roadmap',
        narrative: 'Implementation follows a phased approach: Phase 0 (definition), Phase 1 (MVP), Phase 2 (agent scaling), Phase 3 (continuous learning).',
        keyPoints: [
          'Phase 0 (2-4 weeks): Data mapping, KPI definitions, knowledge base curation',
          'Phase 1 (6-10 weeks): Strategy deck generator, segment playbooks, first 10 workflows',
          'Phase 2 (8-12 weeks): Agent scaling, execution integration, cost-to-serve optimization',
          'Phase 3 (ongoing): Experiment framework, playbook versioning, performance tracking',
        ],
      },
      {
        id: 's7',
        type: 'appendix',
        title: 'Appendix: Data & Assumptions',
        narrative: 'This appendix contains data sources, assumptions, and methodology details.',
        keyPoints: [
          'TAM methodology: top-down + bottoms-up validation',
          'Segment splits based on current portfolio analysis',
          'Growth projections assume continued market tailwinds',
        ],
      },
    ],
  },
}

export function PlaybookDetail() {
  const { id } = useParams<{ id: string }>()
  const playbook = id ? playbookData[id] : null

  if (!playbook) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Playbook not found</p>
        <Link to="/playbooks" className="text-brand-400 hover:text-brand-300 mt-4 inline-block">
          ← Back to Playbooks
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
            to="/playbooks"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{playbook.name}</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-emerald-400 bg-emerald-400/10">
                <CheckCircleIcon className="h-3.5 w-3.5" />
                Approved
              </span>
            </div>
            <p className="text-sm text-slate-400">
              {playbook.sections.length} sections • Updated {playbook.updatedAt}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
            Duplicate
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-brand-600/30 hover:bg-brand-500 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export PPTX
          </motion.button>
        </div>
      </div>

      {/* Table of contents */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl card-gradient border border-white/10 p-6"
      >
        <h3 className="text-lg font-semibold text-white">Table of Contents</h3>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {playbook.sections.map((section: any, index: number) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400 text-sm font-medium">
                {index + 1}
              </span>
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                {section.title}
              </span>
            </a>
          ))}
        </div>
      </motion.div>

      {/* Sections */}
      <div className="space-y-6">
        {playbook.sections.map((section: any, index: number) => (
          <motion.div
            key={section.id}
            id={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            className="rounded-xl card-gradient border border-white/10 p-6"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/20 text-accent-400 text-sm font-bold">
                {index + 1}
              </span>
              <h3 className="text-lg font-semibold text-white">{section.title}</h3>
            </div>

            <div className="mt-4 text-slate-300 leading-relaxed">
              {section.narrative}
            </div>

            {section.keyPoints && section.keyPoints.length > 0 && (
              <ul className="mt-4 space-y-2">
                {section.keyPoints.map((point: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-brand-400 mt-0.5">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

