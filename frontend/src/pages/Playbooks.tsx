import { useState, useEffect, Fragment } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Dialog, Transition, RadioGroup } from '@headlessui/react'
import {
  DocumentTextIcon,
  PlusIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  GlobeAltIcon,
  ServerStackIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

interface PlaybookListItem {
  id: string
  name: string
  playbook_type: string
  segment: string | null
  status: string
  updated_at: string
  owner_name: string | null
}

interface GenerateResult {
  playbook_id: string
  name: string
  data_level: string
  data_sources_used: string[]
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: 'Draft', color: 'text-slate-400 bg-slate-400/10', icon: DocumentTextIcon },
  pending_review: { label: 'Pending Review', color: 'text-amber-400 bg-amber-400/10', icon: ClockIcon },
  approved: { label: 'Approved', color: 'text-emerald-400 bg-emerald-400/10', icon: CheckCircleIcon },
  rejected: { label: 'Rejected', color: 'text-red-400 bg-red-400/10', icon: ExclamationCircleIcon },
}

const typeLabels: Record<string, string> = {
  enterprise_strategy: 'Enterprise Strategy',
  segment_playbook: 'Segment Playbook',
  gtm_motion: 'GTM Motion',
}

const dataLevelOptions = [
  {
    value: 'public_only',
    label: 'Public Only',
    description: 'Market trends, TAM analysis, and industry benchmarks from public sources. Ideal for external sharing.',
    icon: GlobeAltIcon,
  },
  {
    value: 'enhanced',
    label: 'Enhanced',
    description: 'Includes real account data, scores, pipeline metrics. Requires internal data source connections.',
    icon: ServerStackIcon,
  },
]

const segments = [
  { value: 'tier_e1', label: 'E1: $1.5k–$10k' },
  { value: 'tier_e2', label: 'E2: $10k–$50k' },
  { value: 'tier_e3', label: 'E3: $50k–$250k' },
  { value: 'tier_e4', label: 'E4: $250k–$1M' },
  { value: 'tier_e5', label: 'E5: $1M+' },
]

export function Playbooks() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<string>('all')
  const [playbooks, setPlaybooks] = useState<PlaybookListItem[]>([])
  const [, setLoading] = useState(true)
  
  // Generate modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [playbookType, setPlaybookType] = useState<'enterprise' | 'segment'>('enterprise')
  const [selectedSegment, setSelectedSegment] = useState('tier_e1')
  const [dataLevel, setDataLevel] = useState('public_only')
  const [generating, setGenerating] = useState(false)
  const [hasInternalData, setHasInternalData] = useState(false)

  useEffect(() => {
    fetchPlaybooks()
    fetchConfigStatus()
  }, [])

  const fetchPlaybooks = async () => {
    try {
      const res = await fetch('/api/playbooks')
      if (res.ok) {
        const data = await res.json()
        setPlaybooks(data)
      }
    } catch (err) {
      console.error('Failed to fetch playbooks:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchConfigStatus = async () => {
    try {
      const res = await fetch('/api/admin/config')
      if (res.ok) {
        const data = await res.json()
        setHasInternalData(data.has_internal_data)
      }
    } catch (err) {
      console.error('Failed to fetch config:', err)
    }
  }

  const generatePlaybook = async () => {
    setGenerating(true)
    try {
      const endpoint = playbookType === 'enterprise'
        ? '/api/playbooks/generate/enterprise-strategy'
        : `/api/playbooks/generate/segment/${selectedSegment}`

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_level: dataLevel }),
      })

      if (res.ok) {
        const result: GenerateResult = await res.json()
        setShowGenerateModal(false)
        navigate(`/playbooks/${result.playbook_id}`)
      }
    } catch (err) {
      console.error('Failed to generate playbook:', err)
    } finally {
      setGenerating(false)
    }
  }

  const filteredPlaybooks = filter === 'all' 
    ? playbooks 
    : playbooks.filter(p => p.playbook_type === filter)

  // Mock playbooks if API returns empty (for demo purposes)
  const displayPlaybooks = playbooks.length > 0 ? filteredPlaybooks : [
    {
      id: 'pb-001',
      name: 'Enterprise Strategy 2025',
      playbook_type: 'enterprise_strategy',
      status: 'approved',
      segment: null,
      updated_at: '2025-01-20T00:00:00Z',
      owner_name: 'Strategy Team',
    },
    {
      id: 'pb-002',
      name: 'Segment Playbook: E1 ($1.5k–$10k)',
      playbook_type: 'segment_playbook',
      status: 'draft',
      segment: 'tier_e1',
      updated_at: '2025-01-22T00:00:00Z',
      owner_name: 'SMB Team',
    },
    {
      id: 'pb-003',
      name: 'Segment Playbook: E2 ($10k–$50k)',
      playbook_type: 'segment_playbook',
      status: 'pending_review',
      segment: 'tier_e2',
      updated_at: '2025-01-21T00:00:00Z',
      owner_name: 'Mid-Market Team',
    },
  ].filter(p => filter === 'all' || p.playbook_type === filter)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Playbooks</h1>
          <p className="mt-1 text-sm text-slate-400">
            Consulting-style strategy decks and segment playbooks
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowGenerateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-brand-600/30 hover:bg-brand-500 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          New Playbook
        </motion.button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {[
          { value: 'all', label: 'All' },
          { value: 'enterprise_strategy', label: 'Enterprise Strategy' },
          { value: 'segment_playbook', label: 'Segment Playbooks' },
          { value: 'gtm_motion', label: 'GTM Motions' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-brand-600/20 text-brand-400 border border-brand-500/50'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white hover:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Playbook list */}
      <div className="space-y-4">
        {displayPlaybooks.map((playbook, index) => {
          const status = statusConfig[playbook.status] || statusConfig.draft
          return (
            <motion.div
              key={playbook.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/playbooks/${playbook.id}`}
                className="block rounded-xl card-gradient border border-white/10 p-6 hover:border-brand-500/50 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-500/20">
                      <DocumentTextIcon className="h-6 w-6 text-accent-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-brand-300 transition-colors">
                        {playbook.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="text-sm text-slate-400">
                          {typeLabels[playbook.playbook_type] || playbook.playbook_type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      <status.icon className="h-3.5 w-3.5" />
                      {status.label}
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-slate-500 group-hover:text-brand-400 transition-colors" />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-6 text-sm text-slate-400">
                  {playbook.owner_name && <span>Owner: {playbook.owner_name}</span>}
                  <span>Updated: {new Date(playbook.updated_at).toLocaleDateString()}</span>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      {displayPlaybooks.length === 0 && (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-4 text-slate-400">No playbooks found</p>
          <button 
            onClick={() => setShowGenerateModal(true)}
            className="mt-4 text-brand-400 hover:text-brand-300"
          >
            Create your first playbook →
          </button>
        </div>
      )}

      {/* Generate Playbook Modal */}
      <Transition appear show={showGenerateModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowGenerateModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl card-gradient border border-white/10 p-6 shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title className="text-xl font-semibold text-white">
                      Generate New Playbook
                    </Dialog.Title>
                    <button
                      onClick={() => setShowGenerateModal(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Playbook Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        Playbook Type
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setPlaybookType('enterprise')}
                          className={`p-4 rounded-lg border text-left transition-all ${
                            playbookType === 'enterprise'
                              ? 'border-brand-500 bg-brand-500/10'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <p className="font-medium text-white">Enterprise Strategy</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Full strategy deck with TAM, trends, growth model
                          </p>
                        </button>
                        <button
                          onClick={() => setPlaybookType('segment')}
                          className={`p-4 rounded-lg border text-left transition-all ${
                            playbookType === 'segment'
                              ? 'border-brand-500 bg-brand-500/10'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <p className="font-medium text-white">Segment Playbook</p>
                          <p className="text-xs text-slate-400 mt-1">
                            GTM playbook for a specific MRR tier
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Segment Selection (if segment playbook) */}
                    {playbookType === 'segment' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-3">
                          Select Segment
                        </label>
                        <select
                          value={selectedSegment}
                          onChange={(e) => setSelectedSegment(e.target.value)}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                          {segments.map((seg) => (
                            <option key={seg.value} value={seg.value} className="bg-slate-900">
                              {seg.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Data Source Level */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        Data Sources
                      </label>
                      <RadioGroup value={dataLevel} onChange={setDataLevel} className="space-y-3">
                        {dataLevelOptions.map((option) => (
                          <RadioGroup.Option
                            key={option.value}
                            value={option.value}
                            disabled={option.value === 'enhanced' && !hasInternalData}
                            className={({ checked, disabled }) => `
                              relative flex cursor-pointer rounded-lg border p-4 transition-all
                              ${checked ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 bg-white/5'}
                              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}
                            `}
                          >
                            {({ checked }) => (
                              <div className="flex items-start gap-4 w-full">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                                  checked ? 'bg-brand-500/30' : 'bg-white/10'
                                }`}>
                                  <option.icon className={`h-5 w-5 ${checked ? 'text-brand-400' : 'text-slate-400'}`} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <RadioGroup.Label className="font-medium text-white">
                                      {option.label}
                                    </RadioGroup.Label>
                                    {checked && (
                                      <CheckCircleIcon className="h-5 w-5 text-brand-400" />
                                    )}
                                  </div>
                                  <RadioGroup.Description className="text-xs text-slate-400 mt-1">
                                    {option.description}
                                  </RadioGroup.Description>
                                  {option.value === 'enhanced' && !hasInternalData && (
                                    <p className="text-xs text-amber-400 mt-2">
                                      ⚠ No internal data sources connected. Configure in Admin Setup.
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </RadioGroup.Option>
                        ))}
                      </RadioGroup>
                    </div>

                    {/* Generate Button */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={generatePlaybook}
                        disabled={generating}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors"
                      >
                        {generating ? (
                          <>
                            <SparklesIcon className="h-5 w-5 animate-pulse" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <SparklesIcon className="h-5 w-5" />
                            Generate Playbook
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowGenerateModal(false)}
                        className="px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}
