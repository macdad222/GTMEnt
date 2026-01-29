import { motion } from 'framer-motion'
import {
  UserIcon,
  KeyIcon,
  BellIcon,
  DocumentTextIcon,
  ServerIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

const settingsSections = [
  {
    title: 'Profile',
    description: 'Manage your account settings and preferences',
    icon: UserIcon,
    items: [
      { label: 'Name', value: 'Demo User' },
      { label: 'Email', value: 'demo@comcast.com' },
      { label: 'Role', value: 'Executive' },
      { label: 'Territory', value: 'National' },
    ],
  },
  {
    title: 'Notifications',
    description: 'Configure how you receive updates',
    icon: BellIcon,
    items: [
      { label: 'Playbook approvals', value: 'Email + In-app', toggle: true },
      { label: 'KPI alerts', value: 'In-app only', toggle: true },
      { label: 'Weekly digest', value: 'Email', toggle: true },
    ],
  },
  {
    title: 'API & Integrations',
    description: 'Manage data source connections',
    icon: ServerIcon,
    items: [
      { label: 'Dynamics (CRM)', value: 'Connected', status: 'success' },
      { label: 'Orion (CPQ)', value: 'Connected', status: 'success' },
      { label: 'ServiceNow', value: 'Connected', status: 'success' },
      { label: 'Google IVR', value: 'Pending setup', status: 'warning' },
    ],
  },
  {
    title: 'Security',
    description: 'Authentication and access controls',
    icon: ShieldCheckIcon,
    items: [
      { label: 'SSO Provider', value: 'Okta' },
      { label: 'MFA', value: 'Enabled' },
      { label: 'Last login', value: '2025-01-23 09:42 AM' },
    ],
  },
]

export function Settings() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your account, integrations, and platform preferences
        </p>
      </div>

      {/* Settings sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {settingsSections.map((section, index) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="rounded-xl card-gradient border border-white/10 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/20">
                <section.icon className="h-5 w-5 text-brand-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{section.title}</h3>
                <p className="text-xs text-slate-400">{section.description}</p>
              </div>
            </div>

            <div className="space-y-3">
              {section.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-slate-400">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {'status' in item && item.status === 'success' && (
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    )}
                    {'status' in item && item.status === 'warning' && (
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                    )}
                    <span className="text-sm text-white">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Playbook templates */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl card-gradient border border-white/10 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-500/20">
            <DocumentTextIcon className="h-5 w-5 text-accent-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Playbook Templates</h3>
            <p className="text-xs text-slate-400">Manage available template structures</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="p-4 rounded-lg bg-white/5 border border-white/5">
            <h4 className="font-medium text-white">Enterprise Strategy Deck</h4>
            <p className="mt-1 text-xs text-slate-400">
              BCG/Altman-style enterprise-wide strategy with TAM, trends, and growth model
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">7 sections • ~30 pages</span>
              <button className="text-xs text-brand-400 hover:text-brand-300">Edit template</button>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white/5 border border-white/5">
            <h4 className="font-medium text-white">Segment Playbook</h4>
            <p className="mt-1 text-xs text-slate-400">
              Playbook for a specific MRR tier segment with ICP, plays, and KPIs
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">8 sections • ~15 pages</span>
              <button className="text-xs text-brand-400 hover:text-brand-300">Edit template</button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Data governance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-xl card-gradient border border-white/10 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
            <KeyIcon className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Data Governance</h3>
            <p className="text-xs text-slate-400">Market data sources and permissions</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div>
              <p className="font-medium text-white">Public Sources</p>
              <p className="text-xs text-slate-400">SEC filings, Comcast Business site, government data</p>
            </div>
            <span className="px-2 py-1 rounded text-xs font-medium text-emerald-400 bg-emerald-400/10">
              Active
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div>
              <p className="font-medium text-white">Licensed Sources</p>
              <p className="text-xs text-slate-400">IDC, Gartner, Omdia (requires license)</p>
            </div>
            <span className="px-2 py-1 rounded text-xs font-medium text-slate-400 bg-slate-400/10">
              Not configured
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

