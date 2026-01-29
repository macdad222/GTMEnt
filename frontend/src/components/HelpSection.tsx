import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  QuestionMarkCircleIcon,
  XMarkIcon,
  LightBulbIcon,
  GlobeAltIcon,
  CloudArrowUpIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'

interface DataSource {
  label: string
  description: string
}

interface HelpSectionProps {
  title: string
  description: string
  publicDataSources: DataSource[]
  cbDataBenefits: string[]
  proprietaryDataBenefits: string[]
  tips?: string[]
}

export function HelpSection({
  title,
  description,
  publicDataSources,
  cbDataBenefits,
  proprietaryDataBenefits,
  tips,
}: HelpSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  return (
    <>
      {/* Help Button - Fixed position */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 transition-shadow group"
        title="Help & Documentation"
      >
        <QuestionMarkCircleIcon className="h-6 w-6" />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Help & Documentation
        </span>
      </button>

      {/* Help Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-slate-900 border-l border-white/10 shadow-2xl overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-white/10 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-brand-500/20">
                      <QuestionMarkCircleIcon className="h-6 w-6 text-brand-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{title}</h2>
                      <p className="text-sm text-slate-400">Documentation & Data Sources</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Description */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-brand-500/10 to-purple-500/10 border border-brand-500/30">
                  <p className="text-sm text-slate-300">{description}</p>
                </div>

                {/* Public Data Sources */}
                <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
                  <button
                    onClick={() => toggleSection('public')}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <GlobeAltIcon className="h-5 w-5 text-cyan-400" />
                      <span className="font-semibold text-white">Public Data Sources</span>
                    </div>
                    {expandedSection === 'public' ? (
                      <ChevronUpIcon className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-slate-400" />
                    )}
                  </button>
                  <AnimatePresence>
                    {expandedSection === 'public' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-2">
                          {publicDataSources.map((source, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-slate-900/50">
                              <p className="text-sm font-medium text-cyan-400">{source.label}</p>
                              <p className="text-xs text-slate-400 mt-1">{source.description}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* CB Data Benefits */}
                <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
                  <button
                    onClick={() => toggleSection('cbdata')}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <LightBulbIcon className="h-5 w-5 text-emerald-400" />
                      <span className="font-semibold text-white">Why CB Data Configuration Helps</span>
                    </div>
                    {expandedSection === 'cbdata' ? (
                      <ChevronUpIcon className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-slate-400" />
                    )}
                  </button>
                  <AnimatePresence>
                    {expandedSection === 'cbdata' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4">
                          <ul className="space-y-2">
                            {cbDataBenefits.map((benefit, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                <span className="text-emerald-400 mt-1">✓</span>
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Proprietary Data Benefits */}
                <div className="rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 overflow-hidden">
                  <button
                    onClick={() => toggleSection('proprietary')}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CloudArrowUpIcon className="h-5 w-5 text-amber-400" />
                      <span className="font-semibold text-white">With Proprietary Data</span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400 font-medium">
                        Recommended
                      </span>
                    </div>
                    {expandedSection === 'proprietary' ? (
                      <ChevronUpIcon className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-slate-400" />
                    )}
                  </button>
                  <AnimatePresence>
                    {expandedSection === 'proprietary' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4">
                          <p className="text-xs text-amber-300/80 mb-3">
                            Connecting internal systems (Dynamics CRM, Orion CPQ, ServiceNow) will significantly improve analysis accuracy:
                          </p>
                          <ul className="space-y-2">
                            {proprietaryDataBenefits.map((benefit, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                <span className="text-amber-400 mt-1">★</span>
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Tips */}
                {tips && tips.length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <LightBulbIcon className="h-4 w-4 text-yellow-400" />
                      Tips
                    </h4>
                    <ul className="space-y-2">
                      {tips.map((tip, idx) => (
                        <li key={idx} className="text-xs text-slate-400 flex items-start gap-2">
                          <span className="text-yellow-400">💡</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

