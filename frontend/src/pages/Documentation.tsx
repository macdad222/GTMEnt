import { motion } from 'framer-motion'
import {
  BookOpenIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  CloudArrowUpIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  ChartBarIcon,
  MapPinIcon,
  ScaleIcon,
  ChatBubbleLeftRightIcon,
  TrophyIcon,
  DocumentTextIcon,
  ServerIcon,
} from '@heroicons/react/24/outline'

export function Documentation() {
  return (
    <div className="space-y-6">
      {/* Platform Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl card-gradient border border-white/10 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-brand-500/20">
            <BookOpenIcon className="h-8 w-8 text-brand-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Enterprise Strategy Platform</h2>
            <p className="text-slate-400">Complete Documentation & User Guide</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none">
          <div className="p-5 rounded-xl bg-gradient-to-r from-brand-500/10 to-purple-500/10 border border-brand-500/30 mb-6">
            <h3 className="text-lg font-semibold text-white mt-0 flex items-center gap-2">
              <RocketLaunchIcon className="h-5 w-5 text-brand-400" />
              What is This Platform?
            </h3>
            <p className="text-slate-300 mb-0">
              This is a <strong className="text-white">BCG/Bain-quality strategic analysis platform</strong> designed specifically for 
              Comcast Business Enterprise. It combines public market intelligence, internal business data, competitive analysis, 
              and AI-powered insights to help senior executives make data-driven decisions about growing the enterprise segment 
              from $4B ARR at 14% growth to 15%+ annual growth.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <h4 className="text-white font-semibold flex items-center gap-2 mt-0">
                <GlobeAltIcon className="h-5 w-5 text-cyan-400" />
                Public Data Sources
              </h4>
              <p className="text-sm text-slate-300 mb-3">
                The platform ingests and analyzes publicly available market data including:
              </p>
              <ul className="text-sm text-slate-400 space-y-2 mb-0">
                <li><strong className="text-slate-300">Government Sources:</strong> BLS, Census Bureau, FCC reports</li>
                <li><strong className="text-slate-300">Industry Reports:</strong> Gartner, IDC, Frost & Sullivan</li>
                <li><strong className="text-slate-300">Competitor Filings:</strong> SEC 10-K/10-Q, earnings transcripts</li>
                <li><strong className="text-slate-300">Market Research:</strong> Enterprise connectivity, SD-WAN, SASE markets</li>
                <li><strong className="text-slate-300">Economic Indicators:</strong> Business formation, employment, GDP</li>
              </ul>
            </div>

            <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <h4 className="text-white font-semibold flex items-center gap-2 mt-0">
                <CurrencyDollarIcon className="h-5 w-5 text-emerald-400" />
                Why CB Data Matters
              </h4>
              <p className="text-sm text-slate-300 mb-3">
                Configuring your Comcast Business data enables:
              </p>
              <ul className="text-sm text-slate-400 space-y-2 mb-0">
                <li><strong className="text-slate-300">Accurate Baselines:</strong> Your actual ARR, accounts, and growth rates</li>
                <li><strong className="text-slate-300">Segment Sizing:</strong> Real distribution across E1-E5 segments</li>
                <li><strong className="text-slate-300">Target Alignment:</strong> 2026-2028 bookings targets for planning</li>
                <li><strong className="text-slate-300">Quota Modeling:</strong> MRR-based quotas with Rule of 78 calculations</li>
                <li><strong className="text-slate-300">MSA Analysis:</strong> ARR distribution scales to your total enterprise ARR</li>
              </ul>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 mb-8">
            <h4 className="text-white font-semibold flex items-center gap-2 mt-0">
              <CloudArrowUpIcon className="h-5 w-5 text-amber-400" />
              The Power of Proprietary Data
            </h4>
            <p className="text-sm text-slate-300 mb-3">
              <strong className="text-amber-400">Currently, this platform uses public data and manually configured CB data.</strong> 
              Connecting proprietary internal data sources will unlock significantly more powerful analysis:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-sm font-medium text-white mb-1">With Internal Data:</p>
                <ul className="text-xs text-slate-400 space-y-1 mb-0">
                  <li>✓ Real account-level analysis from Dynamics CRM</li>
                  <li>✓ Actual pipeline and win rates from Orion CPQ</li>
                  <li>✓ Churn signals from ServiceNow tickets</li>
                  <li>✓ Customer satisfaction from IVR interactions</li>
                  <li>✓ Product penetration by account and segment</li>
                </ul>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-sm font-medium text-white mb-1">Benefits:</p>
                <ul className="text-xs text-slate-400 space-y-1 mb-0">
                  <li>✓ 10x more accurate segment analysis</li>
                  <li>✓ Account-level expansion recommendations</li>
                  <li>✓ Predictive churn identification</li>
                  <li>✓ Precise territory/quota modeling</li>
                  <li>✓ True competitive win/loss patterns</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Platform Sections */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl card-gradient border border-white/10 p-6"
      >
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <DocumentTextIcon className="h-6 w-6 text-brand-400" />
          Platform Sections Guide
        </h3>

        <div className="space-y-4">
          {/* Dashboard */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <ChartBarIcon className="h-5 w-5 text-blue-400" />
              </div>
              <h4 className="text-lg font-semibold text-white">Dashboard</h4>
            </div>
            <p className="text-sm text-slate-300 mb-3">
              Executive overview of enterprise performance with real-time KPIs, growth trajectory, and segment health indicators.
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 rounded bg-slate-900/50">
                <span className="text-cyan-400 font-medium">Data Used:</span>
                <span className="text-slate-400 ml-1">CB Config metrics, segment data</span>
              </div>
              <div className="p-2 rounded bg-slate-900/50">
                <span className="text-emerald-400 font-medium">With Internal Data:</span>
                <span className="text-slate-400 ml-1">Live CRM sync, real pipeline</span>
              </div>
            </div>
          </div>

          {/* Strategy Report */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <TrophyIcon className="h-5 w-5 text-amber-400" />
              </div>
              <h4 className="text-lg font-semibold text-white">Strategy Report</h4>
            </div>
            <p className="text-sm text-slate-300 mb-3">
              Comprehensive BCG/Bain-quality strategy document covering market analysis, competitive positioning, 
              segment strategies, geographic priorities, and implementation roadmap. Downloadable as PDF.
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 rounded bg-slate-900/50">
                <span className="text-cyan-400 font-medium">Data Used:</span>
                <span className="text-slate-400 ml-1">All platform data, LLM synthesis</span>
              </div>
              <div className="p-2 rounded bg-slate-900/50">
                <span className="text-emerald-400 font-medium">With Internal Data:</span>
                <span className="text-slate-400 ml-1">Account-level insights, true win/loss</span>
              </div>
            </div>
          </div>

          {/* Q&A Insights */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-purple-400" />
              </div>
              <h4 className="text-lg font-semibold text-white">Q&A Insights</h4>
            </div>
            <p className="text-sm text-slate-300 mb-3">
              Ask strategic questions and get AI-powered answers using all available data. Insights can be starred 
              and incorporated into other analyses for consistent strategic direction.
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 rounded bg-slate-900/50">
                <span className="text-cyan-400 font-medium">Data Used:</span>
                <span className="text-slate-400 ml-1">CB config, competitive intel, market research</span>
              </div>
              <div className="p-2 rounded bg-slate-900/50">
                <span className="text-emerald-400 font-medium">With Internal Data:</span>
                <span className="text-slate-400 ml-1">Account-specific answers, trend analysis</span>
              </div>
            </div>
          </div>

          {/* Segments */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <ChartBarIcon className="h-5 w-5 text-emerald-400" />
              </div>
              <h4 className="text-lg font-semibold text-white">Segments</h4>
            </div>
            <p className="text-sm text-slate-300 mb-3">
              Enterprise segment analysis (E1-E5) with AI-generated market intelligence, TAM/SAM sizing, 
              buyer personas, competitive landscape, and growth strategies per segment.
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 rounded bg-slate-900/50">
                <span className="text-cyan-400 font-medium">Data Used:</span>
                <span className="text-slate-400 ml-1">CB segment config, public market data</span>
              </div>
              <div className="p-2 rounded bg-slate-900/50">
                <span className="text-emerald-400 font-medium">With Internal Data:</span>
                <span className="text-slate-400 ml-1">True segment distribution, product attach</span>
              </div>
            </div>
          </div>

          {/* MSA Markets */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <MapPinIcon className="h-5 w-5 text-cyan-400" />
              </div>
              <h4 className="text-lg font-semibold text-white">MSA Markets</h4>
            </div>
            <p className="text-sm text-slate-300 mb-3">
              Geographic analysis of top 50 US metropolitan areas with infrastructure coverage, sales capacity planning, 
              segment distribution, and AI-generated market intelligence per MSA.
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 rounded bg-slate-900/50">
                <span className="text-cyan-400 font-medium">Data Used:</span>
                <span className="text-slate-400 ml-1">Census, BLS, CB ARR (scaled from config)</span>
              </div>
              <div className="p-2 rounded bg-slate-900/50">
                <span className="text-emerald-400 font-medium">With Internal Data:</span>
                <span className="text-slate-400 ml-1">Actual MSA-level ARR, headcount, accounts</span>
              </div>
            </div>
          </div>

          {/* Competitive Intel */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <ScaleIcon className="h-5 w-5 text-red-400" />
              </div>
              <h4 className="text-lg font-semibold text-white">Competitive Intelligence</h4>
            </div>
            <p className="text-sm text-slate-300 mb-3">
              Compare Comcast Business against competitors across categories (Telco, Cable, Fiber, Cloud, UCaaS, etc.). 
              Scrapes competitor websites and generates AI-powered competitive analysis with recommendations.
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 rounded bg-slate-900/50">
                <span className="text-cyan-400 font-medium">Data Used:</span>
                <span className="text-slate-400 ml-1">Web scrapes, public filings, LLM analysis</span>
              </div>
              <div className="p-2 rounded bg-slate-900/50">
                <span className="text-emerald-400 font-medium">With Internal Data:</span>
                <span className="text-slate-400 ml-1">Win/loss data, displacement patterns</span>
              </div>
            </div>
          </div>

          {/* Market Intel */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-indigo-500/20">
                <GlobeAltIcon className="h-5 w-5 text-indigo-400" />
              </div>
              <h4 className="text-lg font-semibold text-white">Market Intel</h4>
            </div>
            <p className="text-sm text-slate-300 mb-3">
              Market sizing and trends for enterprise connectivity, SD-WAN, SASE, cybersecurity, and cloud connectivity. 
              LLM-generated research with footnoted sources and downloadable PDF reports.
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 rounded bg-slate-900/50">
                <span className="text-cyan-400 font-medium">Data Used:</span>
                <span className="text-slate-400 ml-1">Industry reports, analyst data, LLM research</span>
              </div>
              <div className="p-2 rounded bg-slate-900/50">
                <span className="text-emerald-400 font-medium">With Internal Data:</span>
                <span className="text-slate-400 ml-1">Your market share, win rates by segment</span>
              </div>
            </div>
          </div>

          {/* Product Roadmap */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <RocketLaunchIcon className="h-5 w-5 text-orange-400" />
              </div>
              <h4 className="text-lg font-semibold text-white">Product Roadmap</h4>
            </div>
            <p className="text-sm text-slate-300 mb-3">
              Product competitiveness analysis across all portfolio categories. AI-generated recommendations for 
              product priorities, roadmap investments, and competitive differentiation.
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 rounded bg-slate-900/50">
                <span className="text-cyan-400 font-medium">Data Used:</span>
                <span className="text-slate-400 ml-1">Product config, competitive intel, market trends</span>
              </div>
              <div className="p-2 rounded bg-slate-900/50">
                <span className="text-emerald-400 font-medium">With Internal Data:</span>
                <span className="text-slate-400 ml-1">Actual product attach, revenue by product</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Data Architecture */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl card-gradient border border-white/10 p-6"
      >
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <ServerIcon className="h-6 w-6 text-brand-400" />
          Data Architecture
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Data Layer</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Current Source</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Future Integration</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Improvement</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-slate-800">
                <td className="py-3 px-4 font-medium text-white">Company Metrics</td>
                <td className="py-3 px-4">Manual config (CB Data tab)</td>
                <td className="py-3 px-4 text-emerald-400">Dynamics CRM + Finance</td>
                <td className="py-3 px-4 text-amber-400">Real-time accuracy</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-3 px-4 font-medium text-white">Segment Data</td>
                <td className="py-3 px-4">Configured estimates</td>
                <td className="py-3 px-4 text-emerald-400">Dynamics account data</td>
                <td className="py-3 px-4 text-amber-400">True distribution</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-3 px-4 font-medium text-white">MSA Data</td>
                <td className="py-3 px-4">Census + scaled ARR</td>
                <td className="py-3 px-4 text-emerald-400">Actual territory data</td>
                <td className="py-3 px-4 text-amber-400">Precise planning</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-3 px-4 font-medium text-white">Competitive Intel</td>
                <td className="py-3 px-4">Web scrapes + LLM</td>
                <td className="py-3 px-4 text-emerald-400">Win/loss database</td>
                <td className="py-3 px-4 text-amber-400">Actionable patterns</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-3 px-4 font-medium text-white">Pipeline Data</td>
                <td className="py-3 px-4">Not available</td>
                <td className="py-3 px-4 text-emerald-400">Orion CPQ</td>
                <td className="py-3 px-4 text-amber-400">Forecast accuracy</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-white">Customer Health</td>
                <td className="py-3 px-4">Not available</td>
                <td className="py-3 px-4 text-emerald-400">ServiceNow + IVR</td>
                <td className="py-3 px-4 text-amber-400">Churn prediction</td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Quick Start */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl card-gradient border border-white/10 p-6"
      >
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <LightBulbIcon className="h-6 w-6 text-amber-400" />
          Quick Start Guide
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 relative">
            <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold">1</div>
            <h4 className="text-white font-semibold mt-2 mb-2">Configure LLM</h4>
            <p className="text-xs text-slate-400">Add your Grok, OpenAI, or Anthropic API key in the LLM Providers tab</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 relative">
            <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold">2</div>
            <h4 className="text-white font-semibold mt-2 mb-2">Enter CB Data</h4>
            <p className="text-xs text-slate-400">Input your enterprise ARR, accounts, segments, and growth targets</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 relative">
            <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold">3</div>
            <h4 className="text-white font-semibold mt-2 mb-2">Scrape Competitors</h4>
            <p className="text-xs text-slate-400">Go to Competitive Intel and refresh data to scrape competitor websites</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 relative">
            <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold">4</div>
            <h4 className="text-white font-semibold mt-2 mb-2">Generate Reports</h4>
            <p className="text-xs text-slate-400">Create strategy reports, segment intel, and competitive analyses</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

