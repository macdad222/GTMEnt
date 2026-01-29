import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CpuChipIcon,
  ServerIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  DocumentMagnifyingGlassIcon,
  CurrencyDollarIcon,
  PencilSquareIcon,
  CubeIcon,
  UserCircleIcon,
  BookOpenIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  MapPinIcon,
  ScaleIcon,
  ChatBubbleLeftRightIcon,
  TrophyIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline'
import { useCBConfig } from '../context/CBConfigContext'

// Types
interface LLMProvider {
  provider: string
  provider_label: string
  model_name: string
  is_active: boolean
  has_key: boolean
  masked_key: string
  test_status: string | null
  last_tested: string | null
}

interface DataSource {
  id: string
  name: string
  source_type: string
  status: string
  is_public: boolean
  has_connection: boolean
  last_sync: string | null
  error_message: string | null
}

interface User {
  id: string
  username: string
  name: string
  role: string
  role_label: string
  is_active: boolean
  requires_password_change: boolean
  email: string | null
  created_at: string
  last_login: string | null
}

interface ConfigSummary {
  active_llm_provider: string | null
  active_llm_model: string | null
  llm_providers_configured: number
  data_sources_connected: number
  data_sources_total: number
  has_internal_data: boolean
  default_data_level: string
  total_users: number
  active_users: number
}

interface Role {
  value: string
  label: string
  description: string
}

interface PublicDataSource {
  id: string
  name: string
  description: string
  category: string
  category_label: string
  service_areas: string[]
  url: string
  api_available: boolean
  is_enabled: boolean
  last_refresh: string | null
  refresh_status: string
  has_data: boolean
  error_message: string | null
}

interface CategorySummary {
  category: string
  label: string
  total: number
  enabled: number
  refreshed: number
  sources: PublicDataSource[]
}

// CB Configuration types
interface CompanyMetrics {
  enterprise_arr: number
  enterprise_accounts: number
  growth_target_pct: number
  fiscal_year: number
  avg_mrr: number
  growth_rate_actual: number
  net_revenue_retention: number
  gross_revenue_churn: number
  cac_ratio: number
  customer_lifetime_value: number
  // Sales Bookings Targets
  bookings_target_2026_mrr: number
  bookings_target_2027_mrr: number
  bookings_target_2028_mrr: number
}

interface SegmentConfig {
  tier: string
  label: string
  description: string
  mrr_min: number
  mrr_max: number | null
  accounts: number
  arr: number
  avg_mrr: number
  growth_potential: number
  churn_risk: number
  attach_opportunity: number
  typical_industries: string[]
  key_products: string[]
  sales_motion: string
}

interface GrowthDataPoint {
  period: string
  actual: number
  target: number
}

interface CBConfiguration {
  id: string
  updated_at: string
  updated_by: string
  company_metrics: CompanyMetrics
  segments: SegmentConfig[]
  growth_trajectory: GrowthDataPoint[]
  primary_markets: string[]
  key_competitors: string[]
}

// Product Portfolio types
interface ProductConfig {
  id: string
  name: string
  category: string
  description: string
  current_arr: number
  current_penetration_pct: number
  yoy_growth_pct: number
  market_position: string
  market_rank: number
  key_competitors: string[]
  competitive_strengths: string[]
  competitive_gaps: string[]
  is_launched: boolean
  launch_date: string | null
  maturity: string
  target_penetration_pct: number
  target_arr_growth_pct: number
}

// Sales Capacity types
interface RepTypeQuota {
  rep_type: string
  rep_type_label: string
  count: number
  quota_per_rep_mrr: number  // MRR sold quota per rep per year
  is_quota_bearing: boolean
}

interface NationalSalesCapacity {
  fiscal_year: number
  rep_quotas: RepTypeQuota[]
  total_headcount: number
  total_quota_mrr: number  // Total MRR sold quota for the year
  new_logo_quota_pct: number
  expansion_quota_pct: number
  avg_ramp_time_months: number
  avg_quota_attainment_pct: number
  attrition_rate_pct: number
  rule_of_78_factor: number  // Multiplier for Year 1 ARR impact (default 6.5)
}

interface MSASalesOverride {
  msa_code: string
  msa_name: string
  sdr_count: number | null
  bdr_count: number | null
  inside_ae_count: number | null
  inside_am_count: number | null
  field_ae_count: number | null
  field_am_count: number | null
  strategic_ae_count: number | null
  major_am_count: number | null
  se_count: number | null
  partner_mgr_count: number | null
  sales_mgr_count: number | null
  total_quota_override_usd: number | null
  new_logo_quota_override_usd: number | null
  notes: string
  updated_at: string | null
}

interface SalesCapacityConfig {
  national: NationalSalesCapacity
  msa_overrides: Record<string, MSASalesOverride>
}

export function AdminSetup() {
  // Get centralized CB config context for propagating updates to other pages
  const { refreshAll: refreshCBConfig } = useCBConfig()
  
  // State
  const [llmProviders, setLLMProviders] = useState<LLMProvider[]>([])
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [configSummary, setConfigSummary] = useState<ConfigSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'llm' | 'data' | 'users' | 'public' | 'cbconfig' | 'products' | 'sales' | 'help'>('llm')
  
  // Public data sources state
  const [publicDataCategories, setPublicDataCategories] = useState<CategorySummary[]>([])
  const [refreshingSource, setRefreshingSource] = useState<string | null>(null)
  const [refreshingCategory, setRefreshingCategory] = useState<string | null>(null)
  
  // CB Configuration state
  const [cbConfig, setCbConfig] = useState<CBConfiguration | null>(null)
  const [editingMetrics, setEditingMetrics] = useState(false)
  const [editingSegment, setEditingSegment] = useState<string | null>(null)
  const [metricsForm, setMetricsForm] = useState<CompanyMetrics | null>(null)
  const [segmentForm, setSegmentForm] = useState<SegmentConfig | null>(null)
  const [savingConfig, setSavingConfig] = useState(false)
  
  // Product Portfolio state
  const [products, setProducts] = useState<ProductConfig[]>([])
  const [editingProduct, setEditingProduct] = useState<string | null>(null)
  const [productForm, setProductForm] = useState<ProductConfig | null>(null)
  
  // Sales Capacity state
  const [salesCapacity, setSalesCapacity] = useState<SalesCapacityConfig | null>(null)
  const [editingCapacity, setEditingCapacity] = useState(false)
  const [capacityForm, setCapacityForm] = useState<NationalSalesCapacity | null>(null)
  
  // LLM editing state
  const [editingProvider, setEditingProvider] = useState<string | null>(null)
  const [newApiKey, setNewApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  
  // User editing state
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', name: '', role: 'analyst', email: '' })

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [providersRes, sourcesRes, usersRes, rolesRes, configRes, publicRes, cbConfigRes, productsRes, capacityRes] = await Promise.all([
        fetch('/api/admin/llm-providers'),
        fetch('/api/admin/data-sources'),
        fetch('/api/admin/users'),
        fetch('/api/admin/roles'),
        fetch('/api/admin/config'),
        fetch('/api/market-intel/public-sources/by-category'),
        fetch('/api/cb-config'),
        fetch('/api/cb-config/products'),
        fetch('/api/cb-config/sales-capacity'),
      ])
      
      if (providersRes.ok) setLLMProviders(await providersRes.json())
      if (sourcesRes.ok) setDataSources(await sourcesRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json()
        setRoles(rolesData.roles)
      }
      if (configRes.ok) setConfigSummary(await configRes.json())
      if (publicRes.ok) setPublicDataCategories(await publicRes.json())
      if (cbConfigRes.ok) setCbConfig(await cbConfigRes.json())
      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData.products || [])
      }
      if (capacityRes.ok) setSalesCapacity(await capacityRes.json())
    } catch (err) {
      console.error('Failed to fetch admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  // LLM Provider actions
  const updateLLMProvider = async (provider: string, updates: { api_key?: string; is_active?: boolean }) => {
    try {
      const res = await fetch(`/api/admin/llm-providers/${provider}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        await fetchAllData()
        setEditingProvider(null)
        setNewApiKey('')
      }
    } catch (err) {
      console.error('Failed to update provider:', err)
    }
  }

  const testLLMProvider = async (provider: string) => {
    setTesting(provider)
    try {
      await fetch(`/api/admin/llm-providers/${provider}/test`, { method: 'POST' })
      await fetchAllData()
    } catch (err) {
      console.error('Failed to test provider:', err)
    } finally {
      setTesting(null)
    }
  }

  // User actions
  const createUser = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })
      if (res.ok) {
        await fetchAllData()
        setShowAddUser(false)
        setNewUser({ username: '', name: '', role: 'analyst', email: '' })
      }
    } catch (err) {
      console.error('Failed to create user:', err)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return
    try {
      await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      await fetchAllData()
    } catch (err) {
      console.error('Failed to delete user:', err)
    }
  }

  // Public data source actions
  const refreshPublicSource = async (sourceId: string) => {
    setRefreshingSource(sourceId)
    try {
      await fetch(`/api/market-intel/public-sources/${sourceId}/refresh`, { method: 'POST' })
      // Refresh just the public data categories
      const res = await fetch('/api/market-intel/public-sources/by-category')
      if (res.ok) setPublicDataCategories(await res.json())
    } catch (err) {
      console.error('Failed to refresh source:', err)
    } finally {
      setRefreshingSource(null)
    }
  }

  const refreshCategory = async (category: string) => {
    setRefreshingCategory(category)
    try {
      await fetch('/api/market-intel/public-sources/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      })
      // Refresh the categories
      const res = await fetch('/api/market-intel/public-sources/by-category')
      if (res.ok) setPublicDataCategories(await res.json())
    } catch (err) {
      console.error('Failed to refresh category:', err)
    } finally {
      setRefreshingCategory(null)
    }
  }

  const refreshAllPublicSources = async () => {
    setRefreshingCategory('all')
    try {
      await fetch('/api/market-intel/public-sources/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_all: true }),
      })
      const res = await fetch('/api/market-intel/public-sources/by-category')
      if (res.ok) setPublicDataCategories(await res.json())
    } catch (err) {
      console.error('Failed to refresh all sources:', err)
    } finally {
      setRefreshingCategory(null)
    }
  }

  // CB Configuration actions
  const saveCompanyMetrics = async () => {
    if (!metricsForm) return
    setSavingConfig(true)
    try {
      const res = await fetch('/api/cb-config/company-metrics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metricsForm),
      })
      if (res.ok) {
        const updated = await res.json()
        setCbConfig(updated)
        setEditingMetrics(false)
        setMetricsForm(null)
        // Refresh centralized context so Dashboard and other pages see updates
        await refreshCBConfig()
      }
    } catch (err) {
      console.error('Failed to save company metrics:', err)
    } finally {
      setSavingConfig(false)
    }
  }

  const saveSegmentConfig = async () => {
    if (!segmentForm) return
    setSavingConfig(true)
    try {
      const res = await fetch(`/api/cb-config/segments/${segmentForm.tier}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(segmentForm),
      })
      if (res.ok) {
        const updated = await res.json()
        setCbConfig(updated)
        setEditingSegment(null)
        setSegmentForm(null)
        // Refresh centralized context so Dashboard and other pages see updates
        await refreshCBConfig()
      }
    } catch (err) {
      console.error('Failed to save segment config:', err)
    } finally {
      setSavingConfig(false)
    }
  }

  // Product Portfolio actions
  const saveProduct = async () => {
    if (!productForm) return
    setSavingConfig(true)
    try {
      const res = await fetch(`/api/cb-config/products/${productForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm),
      })
      if (res.ok) {
        // Refresh products list
        const productsRes = await fetch('/api/cb-config/products')
        if (productsRes.ok) {
          const productsData = await productsRes.json()
          setProducts(productsData.products || [])
        }
        setEditingProduct(null)
        setProductForm(null)
        // Refresh centralized context so Product Roadmap and other pages see updates
        await refreshCBConfig()
      }
    } catch (err) {
      console.error('Failed to save product:', err)
    } finally {
      setSavingConfig(false)
    }
  }

  // Sales Capacity actions
  const saveSalesCapacity = async () => {
    if (!capacityForm) return
    setSavingConfig(true)
    try {
      const res = await fetch('/api/cb-config/sales-capacity/national', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(capacityForm),
      })
      if (res.ok) {
        // Refresh capacity
        const capacityRes = await fetch('/api/cb-config/sales-capacity')
        if (capacityRes.ok) setSalesCapacity(await capacityRes.json())
        setEditingCapacity(false)
        setCapacityForm(null)
        // Refresh centralized context so MSA Analysis and other pages see updates
        await refreshCBConfig()
      }
    } catch (err) {
      console.error('Failed to save sales capacity:', err)
    } finally {
      setSavingConfig(false)
    }
  }

  const formatCurrency = (value: number): string => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
    return `$${value.toFixed(0)}`
  }

  // Helper to get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'regulatory': return BuildingOfficeIcon
      case 'analyst': return ChartBarIcon
      case 'threat_intel': return ShieldCheckIcon
      case 'infrastructure': return ServerIcon
      case 'competitor': return DocumentMagnifyingGlassIcon
      default: return GlobeAltIcon
    }
  }

  // Helper to format last refresh time
  const formatLastRefresh = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-8 w-8 text-brand-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Setup</h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure LLM providers, data sources, and manage platform users
        </p>
      </div>

      {/* Quick Stats */}
      {configSummary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl card-gradient border border-white/10 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/20">
                <CpuChipIcon className="h-5 w-5 text-brand-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Active LLM</p>
                <p className="text-sm font-semibold text-white">
                  {configSummary.active_llm_provider || 'Not configured'}
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
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <ServerIcon className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Data Sources</p>
                <p className="text-sm font-semibold text-white">
                  {configSummary.data_sources_connected} / {configSummary.data_sources_total} connected
                </p>
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
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-500/20">
                <UserGroupIcon className="h-5 w-5 text-accent-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Active Users</p>
                <p className="text-sm font-semibold text-white">{configSummary.active_users}</p>
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
                configSummary.has_internal_data ? 'bg-emerald-500/20' : 'bg-amber-500/20'
              }`}>
                {configSummary.has_internal_data ? (
                  <CheckCircleIcon className="h-5 w-5 text-emerald-400" />
                ) : (
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-400" />
                )}
              </div>
              <div>
                <p className="text-xs text-slate-400">Data Level</p>
                <p className="text-sm font-semibold text-white">
                  {configSummary.default_data_level === 'enhanced' ? 'Enhanced' : 'Public Only'}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Tab navigation */}
      <div className="border-b border-white/10">
        <nav className="flex gap-4 overflow-x-auto">
          {[
            { id: 'llm', label: 'LLM Providers', icon: CpuChipIcon },
            { id: 'cbconfig', label: 'CB Data', icon: CurrencyDollarIcon },
            { id: 'products', label: 'Product Portfolio', icon: CubeIcon },
            { id: 'sales', label: 'Sales Capacity', icon: UserCircleIcon },
            { id: 'public', label: 'Public Data', icon: GlobeAltIcon },
            { id: 'data', label: 'Internal Data', icon: ServerIcon },
            { id: 'users', label: 'Users', icon: UserGroupIcon },
            { id: 'help', label: 'Documentation', icon: BookOpenIcon },
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
            </button>
          ))}
        </nav>
      </div>

      {/* LLM Providers Tab */}
      {activeTab === 'llm' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="rounded-xl card-gradient border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">LLM Provider Configuration</h3>
            <p className="text-sm text-slate-400 mb-6">
              Configure your preferred AI provider for playbook generation. Only one provider can be active at a time.
            </p>

            <div className="space-y-4">
              {llmProviders.map((provider) => (
                <div
                  key={provider.provider}
                  className={`p-4 rounded-lg border ${
                    provider.is_active
                      ? 'border-brand-500/50 bg-brand-500/10'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-3 w-3 rounded-full ${
                        provider.is_active ? 'bg-brand-400' : 'bg-slate-600'
                      }`} />
                      <div>
                        <p className="font-medium text-white">{provider.provider_label}</p>
                        <p className="text-xs text-slate-400">Model: {provider.model_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Test status */}
                      {provider.test_status === 'success' && (
                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                          <CheckCircleIcon className="h-4 w-4" /> Verified
                        </span>
                      )}
                      {provider.test_status === 'failed' && (
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <XCircleIcon className="h-4 w-4" /> Failed
                        </span>
                      )}

                      {/* API Key display */}
                      {provider.has_key && (
                        <span className="text-xs text-slate-500 font-mono">
                          {provider.masked_key}
                        </span>
                      )}

                      {/* Actions */}
                      {!provider.is_active && provider.has_key && (
                        <button
                          onClick={() => updateLLMProvider(provider.provider, { is_active: true })}
                          className="px-3 py-1 text-xs font-medium text-brand-400 bg-brand-500/20 rounded-lg hover:bg-brand-500/30"
                        >
                          Set Active
                        </button>
                      )}

                      <button
                        onClick={() => testLLMProvider(provider.provider)}
                        disabled={!provider.has_key || testing === provider.provider}
                        className="px-3 py-1 text-xs font-medium text-slate-300 bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-50"
                      >
                        {testing === provider.provider ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          'Test'
                        )}
                      </button>

                      <button
                        onClick={() => setEditingProvider(
                          editingProvider === provider.provider ? null : provider.provider
                        )}
                        className="px-3 py-1 text-xs font-medium text-slate-300 bg-white/10 rounded-lg hover:bg-white/20"
                      >
                        {provider.has_key ? 'Update Key' : 'Add Key'}
                      </button>
                    </div>
                  </div>

                  {/* Edit API Key form */}
                  {editingProvider === provider.provider && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex gap-3">
                        <div className="flex-1 relative">
                          <input
                            type={showApiKey ? 'text' : 'password'}
                            value={newApiKey}
                            onChange={(e) => setNewApiKey(e.target.value)}
                            placeholder={`Enter ${provider.provider_label} API key...`}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {showApiKey ? (
                              <EyeSlashIcon className="h-4 w-4" />
                            ) : (
                              <EyeIcon className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <button
                          onClick={() => updateLLMProvider(provider.provider, { api_key: newApiKey })}
                          disabled={!newApiKey}
                          className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingProvider(null)
                            setNewApiKey('')
                          }}
                          className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* CB Data Configuration Tab */}
      {activeTab === 'cbconfig' && cbConfig && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Last Updated Info */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Comcast Business Data Configuration</h3>
              <p className="text-sm text-slate-400 mt-1">
                Configure company metrics, segment data, and growth targets for the dashboard and analysis.
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Last updated: {new Date(cbConfig.updated_at).toLocaleString()} by {cbConfig.updated_by}
            </div>
          </div>

          {/* Company Metrics Card */}
          <div className="rounded-xl card-gradient border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/20">
                  <CurrencyDollarIcon className="h-5 w-5 text-brand-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Company Metrics</h4>
                  <p className="text-xs text-slate-400">Enterprise-wide financial and operational KPIs</p>
                </div>
              </div>
              {!editingMetrics ? (
                <button
                  onClick={() => {
                    setMetricsForm({ ...cbConfig.company_metrics })
                    setEditingMetrics(true)
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/10 text-white rounded-lg hover:bg-white/20"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  Edit Metrics
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={saveCompanyMetrics}
                    disabled={savingConfig}
                    className="px-4 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50"
                  >
                    {savingConfig ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingMetrics(false)
                      setMetricsForm(null)
                    }}
                    className="px-4 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {!editingMetrics ? (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-2xl font-bold text-white">{formatCurrency(cbConfig.company_metrics.enterprise_arr)}</p>
                    <p className="text-xs text-slate-400">Enterprise ARR</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-2xl font-bold text-white">{cbConfig.company_metrics.enterprise_accounts.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">Accounts</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-2xl font-bold text-emerald-400">{cbConfig.company_metrics.growth_target_pct}%</p>
                    <p className="text-xs text-slate-400">Growth Target</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-2xl font-bold text-brand-400">{cbConfig.company_metrics.growth_rate_actual}%</p>
                    <p className="text-xs text-slate-400">Current Growth</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-2xl font-bold text-white">{formatCurrency(cbConfig.company_metrics.avg_mrr)}</p>
                    <p className="text-xs text-slate-400">Avg MRR</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-2xl font-bold text-white">{cbConfig.company_metrics.fiscal_year}</p>
                    <p className="text-xs text-slate-400">Fiscal Year</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-2xl font-bold text-white">{cbConfig.company_metrics.net_revenue_retention}%</p>
                    <p className="text-xs text-slate-400">NRR</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-2xl font-bold text-amber-400">{cbConfig.company_metrics.gross_revenue_churn}%</p>
                    <p className="text-xs text-slate-400">Gross Churn</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-2xl font-bold text-white">{cbConfig.company_metrics.cac_ratio}x</p>
                    <p className="text-xs text-slate-400">CAC Ratio</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-2xl font-bold text-white">{formatCurrency(cbConfig.company_metrics.customer_lifetime_value)}</p>
                    <p className="text-xs text-slate-400">CLV</p>
                  </div>
                </div>

                {/* Sales Bookings Targets Section (View Mode) */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h5 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                    <ChartBarIcon className="h-4 w-4 text-accent-400" />
                    Sales Bookings Targets (MRR Sold)
                  </h5>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                      <p className="text-2xl font-bold text-cyan-400">{formatCurrency(cbConfig.company_metrics.bookings_target_2026_mrr || 50000000)}</p>
                      <p className="text-xs text-slate-400">2026 Target</p>
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
                      <p className="text-2xl font-bold text-emerald-400">{formatCurrency(cbConfig.company_metrics.bookings_target_2027_mrr || 60000000)}</p>
                      <p className="text-xs text-slate-400">2027 Target</p>
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                      <p className="text-2xl font-bold text-purple-400">{formatCurrency(cbConfig.company_metrics.bookings_target_2028_mrr || 72000000)}</p>
                      <p className="text-xs text-slate-400">2028 Target</p>
                    </div>
                  </div>
                </div>
              </>
            ) : metricsForm && (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Enterprise ARR ($)</label>
                  <input
                    type="number"
                    value={metricsForm.enterprise_arr}
                    onChange={(e) => setMetricsForm({ ...metricsForm, enterprise_arr: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Total Accounts</label>
                  <input
                    type="number"
                    value={metricsForm.enterprise_accounts}
                    onChange={(e) => setMetricsForm({ ...metricsForm, enterprise_accounts: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Growth Target (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={metricsForm.growth_target_pct}
                    onChange={(e) => setMetricsForm({ ...metricsForm, growth_target_pct: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Current Growth (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={metricsForm.growth_rate_actual}
                    onChange={(e) => setMetricsForm({ ...metricsForm, growth_rate_actual: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Avg MRR ($)</label>
                  <input
                    type="number"
                    value={metricsForm.avg_mrr}
                    onChange={(e) => setMetricsForm({ ...metricsForm, avg_mrr: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Fiscal Year</label>
                  <input
                    type="number"
                    value={metricsForm.fiscal_year}
                    onChange={(e) => setMetricsForm({ ...metricsForm, fiscal_year: parseInt(e.target.value) || 2025 })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">NRR (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={metricsForm.net_revenue_retention}
                    onChange={(e) => setMetricsForm({ ...metricsForm, net_revenue_retention: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Gross Churn (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={metricsForm.gross_revenue_churn}
                    onChange={(e) => setMetricsForm({ ...metricsForm, gross_revenue_churn: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">CAC Ratio (years)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={metricsForm.cac_ratio}
                    onChange={(e) => setMetricsForm({ ...metricsForm, cac_ratio: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">CLV ($)</label>
                  <input
                    type="number"
                    value={metricsForm.customer_lifetime_value}
                    onChange={(e) => setMetricsForm({ ...metricsForm, customer_lifetime_value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Sales Bookings Targets Section (Edit Mode) */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <h5 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                  <ChartBarIcon className="h-4 w-4 text-accent-400" />
                  Sales Bookings Targets (MRR Sold)
                </h5>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-cyan-400 mb-1">2026 Target ($)</label>
                    <input
                      type="number"
                      value={metricsForm.bookings_target_2026_mrr || 50000000}
                      onChange={(e) => setMetricsForm({ ...metricsForm, bookings_target_2026_mrr: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-emerald-400 mb-1">2027 Target ($)</label>
                    <input
                      type="number"
                      value={metricsForm.bookings_target_2027_mrr || 60000000}
                      onChange={(e) => setMetricsForm({ ...metricsForm, bookings_target_2027_mrr: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-purple-400 mb-1">2028 Target ($)</label>
                    <input
                      type="number"
                      value={metricsForm.bookings_target_2028_mrr || 72000000}
                      onChange={(e) => setMetricsForm({ ...metricsForm, bookings_target_2028_mrr: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
              </>
            )}
          </div>

          {/* Segment Configuration */}
          <div className="rounded-xl card-gradient border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-500/20">
                <ChartBarIcon className="h-5 w-5 text-accent-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Segment Configuration</h4>
                <p className="text-xs text-slate-400">Configure data for each enterprise segment tier</p>
              </div>
            </div>

            <div className="space-y-4">
              {cbConfig.segments.map((segment) => (
                <div
                  key={segment.tier}
                  className={`p-4 rounded-lg border ${
                    editingSegment === segment.tier
                      ? 'border-brand-500/50 bg-brand-500/10'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  {editingSegment !== segment.tier ? (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h5 className="font-medium text-white">{segment.label}</h5>
                          <span className="px-2 py-0.5 text-xs bg-white/10 text-slate-400 rounded">
                            {segment.sales_motion}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{segment.description}</p>
                        
                        <div className="grid grid-cols-3 gap-4 mt-4 sm:grid-cols-6">
                          <div>
                            <p className="text-lg font-semibold text-white">{segment.accounts.toLocaleString()}</p>
                            <p className="text-xs text-slate-500">Accounts</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-brand-400">{formatCurrency(segment.arr)}</p>
                            <p className="text-xs text-slate-500">ARR</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-white">{formatCurrency(segment.avg_mrr)}</p>
                            <p className="text-xs text-slate-500">Avg MRR</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-emerald-400">{(segment.growth_potential * 100).toFixed(0)}%</p>
                            <p className="text-xs text-slate-500">Growth Potential</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-amber-400">{(segment.churn_risk * 100).toFixed(0)}%</p>
                            <p className="text-xs text-slate-500">Churn Risk</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-blue-400">{(segment.attach_opportunity * 100).toFixed(0)}%</p>
                            <p className="text-xs text-slate-500">Attach Opp</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSegmentForm({ ...segment })
                          setEditingSegment(segment.tier)
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/10 text-white rounded-lg hover:bg-white/20"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                        Edit
                      </button>
                    </div>
                  ) : segmentForm && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-white">{segment.label}</h5>
                        <div className="flex gap-2">
                          <button
                            onClick={saveSegmentConfig}
                            disabled={savingConfig}
                            className="px-4 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 text-sm"
                          >
                            {savingConfig ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingSegment(null)
                              setSegmentForm(null)
                            }}
                            className="px-4 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Accounts</label>
                          <input
                            type="number"
                            value={segmentForm.accounts}
                            onChange={(e) => setSegmentForm({ ...segmentForm, accounts: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">ARR ($)</label>
                          <input
                            type="number"
                            value={segmentForm.arr}
                            onChange={(e) => setSegmentForm({ ...segmentForm, arr: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Avg MRR ($)</label>
                          <input
                            type="number"
                            value={segmentForm.avg_mrr}
                            onChange={(e) => setSegmentForm({ ...segmentForm, avg_mrr: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Growth Potential (0-1)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={segmentForm.growth_potential}
                            onChange={(e) => setSegmentForm({ ...segmentForm, growth_potential: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Churn Risk (0-1)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={segmentForm.churn_risk}
                            onChange={(e) => setSegmentForm({ ...segmentForm, churn_risk: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Attach Opp (0-1)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={segmentForm.attach_opportunity}
                            onChange={(e) => setSegmentForm({ ...segmentForm, attach_opportunity: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Description</label>
                          <input
                            type="text"
                            value={segmentForm.description}
                            onChange={(e) => setSegmentForm({ ...segmentForm, description: e.target.value })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Sales Motion</label>
                          <select
                            value={segmentForm.sales_motion}
                            onChange={(e) => setSegmentForm({ ...segmentForm, sales_motion: e.target.value })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          >
                            <option value="digital-led" className="bg-slate-900">Digital-Led</option>
                            <option value="inside-sales" className="bg-slate-900">Inside Sales</option>
                            <option value="field-sales" className="bg-slate-900">Field Sales</option>
                            <option value="strategic-sales" className="bg-slate-900">Strategic Sales</option>
                            <option value="executive-engagement" className="bg-slate-900">Executive Engagement</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-6">
            <h4 className="font-semibold text-blue-300 mb-2">About CB Data Configuration</h4>
            <ul className="text-sm text-blue-200/80 space-y-1">
              <li>• Changes made here will be reflected in the Dashboard and Segment Analysis pages</li>
              <li>• Company metrics drive the top-level KPIs and growth tracking</li>
              <li>• Segment data powers the segment-specific analysis and playbook generation</li>
              <li>• All data persists across sessions and container restarts</li>
              <li>• Use segment-specific LLM research on the Segments page for AI-powered intelligence</li>
            </ul>
          </div>
        </motion.div>
      )}

      {/* Product Portfolio Tab */}
      {activeTab === 'products' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div className="rounded-xl card-gradient border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Product Portfolio Configuration</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Configure Comcast Business product portfolio metrics and competitive positioning
                </p>
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-brand-500/30 transition-colors"
                >
                  {editingProduct === product.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Product Name</label>
                          <input
                            type="text"
                            value={productForm?.name || ''}
                            onChange={(e) => setProductForm({ ...productForm!, name: e.target.value })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Category</label>
                          <select
                            value={productForm?.category || ''}
                            onChange={(e) => setProductForm({ ...productForm!, category: e.target.value })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          >
                            <option value="connectivity">Connectivity</option>
                            <option value="secure_networking">Secure Networking</option>
                            <option value="cybersecurity">Cybersecurity</option>
                            <option value="voice_collab">Voice & Collaboration</option>
                            <option value="data_center">Data Center</option>
                            <option value="mobile">Mobile</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Current ARR ($)</label>
                          <input
                            type="number"
                            value={productForm?.current_arr || 0}
                            onChange={(e) => setProductForm({ ...productForm!, current_arr: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Penetration %</label>
                          <input
                            type="number"
                            step="0.1"
                            value={productForm?.current_penetration_pct || 0}
                            onChange={(e) => setProductForm({ ...productForm!, current_penetration_pct: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">YoY Growth %</label>
                          <input
                            type="number"
                            step="0.1"
                            value={productForm?.yoy_growth_pct || 0}
                            onChange={(e) => setProductForm({ ...productForm!, yoy_growth_pct: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Market Rank</label>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            value={productForm?.market_rank || 3}
                            onChange={(e) => setProductForm({ ...productForm!, market_rank: parseInt(e.target.value) || 3 })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Target Penetration %</label>
                          <input
                            type="number"
                            step="0.1"
                            value={productForm?.target_penetration_pct || 0}
                            onChange={(e) => setProductForm({ ...productForm!, target_penetration_pct: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Target ARR Growth %</label>
                          <input
                            type="number"
                            step="0.1"
                            value={productForm?.target_arr_growth_pct || 0}
                            onChange={(e) => setProductForm({ ...productForm!, target_arr_growth_pct: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setEditingProduct(null); setProductForm(null) }}
                          className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveProduct}
                          disabled={savingConfig}
                          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-500 disabled:opacity-50"
                        >
                          {savingConfig ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <h4 className="font-medium text-white">{product.name}</h4>
                            <p className="text-xs text-slate-400 capitalize">{product.category.replace('_', ' ')}</p>
                          </div>
                          {!product.is_launched && (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                              Planned {product.launch_date}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">{formatCurrency(product.current_arr)}</p>
                          <p className="text-xs text-slate-400">Current ARR</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-emerald-400">{product.current_penetration_pct.toFixed(1)}%</p>
                          <p className="text-xs text-slate-400">Penetration</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${product.yoy_growth_pct > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {product.yoy_growth_pct > 0 ? '+' : ''}{product.yoy_growth_pct.toFixed(1)}%
                          </p>
                          <p className="text-xs text-slate-400">YoY Growth</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-brand-400">#{product.market_rank}</p>
                          <p className="text-xs text-slate-400">Market Rank</p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingProduct(product.id)
                            setProductForm(product)
                          }}
                          className="p-2 text-slate-400 hover:text-white transition-colors"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-brand-500/10 to-brand-600/5 border border-brand-500/20">
              <p className="text-2xl font-bold text-white">
                {formatCurrency(products.reduce((sum, p) => sum + p.current_arr, 0))}
              </p>
              <p className="text-xs text-slate-400">Total Product ARR</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
              <p className="text-2xl font-bold text-emerald-400">{products.length}</p>
              <p className="text-xs text-slate-400">Products in Portfolio</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
              <p className="text-2xl font-bold text-amber-400">{products.filter(p => !p.is_launched).length}</p>
              <p className="text-xs text-slate-400">Planned Products</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
              <p className="text-2xl font-bold text-purple-400">
                {(products.reduce((sum, p) => sum + p.yoy_growth_pct, 0) / Math.max(products.length, 1)).toFixed(1)}%
              </p>
              <p className="text-xs text-slate-400">Avg YoY Growth</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Sales Capacity Tab */}
      {activeTab === 'sales' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* National Sales Capacity */}
          <div className="rounded-xl card-gradient border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">National Sales Capacity Configuration</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Configure rep types, quotas, and productivity assumptions for FY{salesCapacity?.national.fiscal_year || 2026}
                </p>
              </div>
              {!editingCapacity && (
                <button
                  onClick={() => {
                    setEditingCapacity(true)
                    setCapacityForm(salesCapacity?.national || null)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-500"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  Edit Configuration
                </button>
              )}
            </div>

            {editingCapacity && capacityForm ? (
              // Edit Mode
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Fiscal Year</label>
                    <input
                      type="number"
                      value={capacityForm.fiscal_year}
                      onChange={(e) => setCapacityForm({ ...capacityForm, fiscal_year: parseInt(e.target.value) || 2026 })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">New Logo Quota %</label>
                    <input
                      type="number"
                      step="1"
                      value={capacityForm.new_logo_quota_pct}
                      onChange={(e) => setCapacityForm({ ...capacityForm, new_logo_quota_pct: parseFloat(e.target.value) || 60 })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Expansion Quota %</label>
                    <input
                      type="number"
                      step="1"
                      value={capacityForm.expansion_quota_pct}
                      onChange={(e) => setCapacityForm({ ...capacityForm, expansion_quota_pct: parseFloat(e.target.value) || 40 })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Avg Ramp Time (months)</label>
                    <input
                      type="number"
                      value={capacityForm.avg_ramp_time_months}
                      onChange={(e) => setCapacityForm({ ...capacityForm, avg_ramp_time_months: parseInt(e.target.value) || 6 })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Avg Quota Attainment %</label>
                    <input
                      type="number"
                      step="1"
                      value={capacityForm.avg_quota_attainment_pct}
                      onChange={(e) => setCapacityForm({ ...capacityForm, avg_quota_attainment_pct: parseFloat(e.target.value) || 85 })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Attrition Rate %</label>
                    <input
                      type="number"
                      step="1"
                      value={capacityForm.attrition_rate_pct}
                      onChange={(e) => setCapacityForm({ ...capacityForm, attrition_rate_pct: parseFloat(e.target.value) || 15 })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-amber-400 mb-1">Rule of 78 Factor</label>
                    <input
                      type="number"
                      step="0.1"
                      value={capacityForm.rule_of_78_factor || 6.5}
                      onChange={(e) => setCapacityForm({ ...capacityForm, rule_of_78_factor: parseFloat(e.target.value) || 6.5 })}
                      className="w-full px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">6.5 = even, higher = front-loaded</p>
                  </div>
                </div>

                {/* Rep Type Grid */}
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Rep Types & Quotas</h4>
                  <div className="grid gap-2">
                    {capacityForm.rep_quotas.map((rq, index) => (
                      <div key={rq.rep_type} className="grid grid-cols-4 gap-4 p-3 bg-white/5 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">{rq.rep_type_label}</p>
                          <p className="text-xs text-slate-500">{rq.rep_type}</p>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Headcount</label>
                          <input
                            type="number"
                            value={rq.count}
                            onChange={(e) => {
                              const newQuotas = [...capacityForm.rep_quotas]
                              newQuotas[index] = { ...newQuotas[index], count: parseInt(e.target.value) || 0 }
                              setCapacityForm({ ...capacityForm, rep_quotas: newQuotas })
                            }}
                            className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">MRR Quota/Rep ($)</label>
                          <input
                            type="number"
                            value={rq.quota_per_rep_mrr}
                            onChange={(e) => {
                              const newQuotas = [...capacityForm.rep_quotas]
                              newQuotas[index] = { ...newQuotas[index], quota_per_rep_mrr: parseFloat(e.target.value) || 0 }
                              setCapacityForm({ ...capacityForm, rep_quotas: newQuotas })
                            }}
                            className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm"
                          />
                        </div>
                        <div className="flex items-center justify-end">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={rq.is_quota_bearing}
                              onChange={(e) => {
                                const newQuotas = [...capacityForm.rep_quotas]
                                newQuotas[index] = { ...newQuotas[index], is_quota_bearing: e.target.checked }
                                setCapacityForm({ ...capacityForm, rep_quotas: newQuotas })
                              }}
                              className="rounded border-white/20 bg-white/5 text-brand-500"
                            />
                            <span className="text-xs text-slate-400">Quota Bearing</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                  <button
                    onClick={() => { setEditingCapacity(false); setCapacityForm(null) }}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveSalesCapacity}
                    disabled={savingConfig}
                    className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-500 disabled:opacity-50"
                  >
                    {savingConfig ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            ) : salesCapacity?.national ? (
              // View Mode
              <div className="space-y-6">
                {/* MRR Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-brand-500/10 to-brand-600/5 border border-brand-500/20">
                    <p className="text-2xl font-bold text-white">{salesCapacity.national.total_headcount.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">Total Headcount</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(salesCapacity.national.total_quota_mrr)}</p>
                    <p className="text-xs text-slate-400">MRR Sold Quota</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20">
                    <p className="text-2xl font-bold text-cyan-400">{salesCapacity.national.new_logo_quota_pct}%</p>
                    <p className="text-xs text-slate-400">New Logo</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
                    <p className="text-2xl font-bold text-purple-400">{salesCapacity.national.expansion_quota_pct}%</p>
                    <p className="text-xs text-slate-400">Expansion</p>
                  </div>
                </div>

                {/* Rule of 78 ARR Impact */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/30">
                  <h4 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                    <span className="text-lg">📊</span> Rule of 78 ARR Impact
                  </h4>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <p className="text-xl font-bold text-white">
                        {formatCurrency(salesCapacity.national.total_quota_mrr * (salesCapacity.national.rule_of_78_factor || 6.5))}
                      </p>
                      <p className="text-xs text-slate-400">Year 1 ARR Impact</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-emerald-400">
                        {formatCurrency(salesCapacity.national.total_quota_mrr * 12)}
                      </p>
                      <p className="text-xs text-slate-400">Full Run-Rate ARR</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-amber-400">{salesCapacity.national.rule_of_78_factor || 6.5}x</p>
                      <p className="text-xs text-slate-400">Rule of 78 Factor</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    MRR sold in Jan = 12 months ARR in Y1; MRR sold in Dec = 1 month. 
                    Factor of {salesCapacity.national.rule_of_78_factor || 6.5} assumes {salesCapacity.national.rule_of_78_factor === 6.5 ? 'even' : 'weighted'} sales distribution.
                  </p>
                </div>

                {/* Rep Type Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Rep Type</th>
                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Headcount</th>
                        <th className="text-right py-3 px-4 text-slate-400 font-medium">MRR Quota/Rep</th>
                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Total MRR Quota</th>
                        <th className="text-center py-3 px-4 text-slate-400 font-medium">Quota Bearing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesCapacity.national.rep_quotas.map((rq) => (
                        <tr key={rq.rep_type} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-4">
                            <p className="font-medium text-white">{rq.rep_type_label}</p>
                          </td>
                          <td className="py-3 px-4 text-right text-white">{rq.count.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-slate-300">
                            {rq.quota_per_rep_mrr > 0 ? formatCurrency(rq.quota_per_rep_mrr) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-400 font-medium">
                            {rq.is_quota_bearing && rq.quota_per_rep_mrr > 0
                              ? formatCurrency(rq.count * rq.quota_per_rep_mrr)
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {rq.is_quota_bearing ? (
                              <CheckCircleIcon className="h-5 w-5 text-emerald-400 inline" />
                            ) : (
                              <XCircleIcon className="h-5 w-5 text-slate-500 inline" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-white/20 bg-white/5">
                        <td className="py-3 px-4 font-semibold text-white">Total</td>
                        <td className="py-3 px-4 text-right font-semibold text-white">
                          {salesCapacity.national.rep_quotas.reduce((sum, rq) => sum + rq.count, 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4"></td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                          {formatCurrency(salesCapacity.national.rep_quotas.reduce((sum, rq) => 
                            sum + (rq.is_quota_bearing ? rq.count * rq.quota_per_rep_mrr : 0), 0))}
                        </td>
                        <td className="py-3 px-4"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Productivity Assumptions */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                  <div className="p-4 rounded-lg bg-white/5">
                    <p className="text-lg font-semibold text-white">{salesCapacity.national.avg_ramp_time_months} months</p>
                    <p className="text-xs text-slate-400">Avg Ramp Time</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <p className="text-lg font-semibold text-white">{salesCapacity.national.avg_quota_attainment_pct}%</p>
                    <p className="text-xs text-slate-400">Avg Quota Attainment</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <p className="text-lg font-semibold text-white">{salesCapacity.national.attrition_rate_pct}%</p>
                    <p className="text-xs text-slate-400">Annual Attrition</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-400">No sales capacity data configured</p>
            )}
          </div>

          {/* MSA Overrides Section */}
          {salesCapacity && Object.keys(salesCapacity.msa_overrides).length > 0 && (
            <div className="rounded-xl card-gradient border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">MSA-Specific Overrides</h3>
              <p className="text-sm text-slate-400 mb-4">
                {Object.keys(salesCapacity.msa_overrides).length} MSAs have custom configurations
              </p>
              <div className="space-y-2">
                {Object.entries(salesCapacity.msa_overrides).map(([code, override]) => (
                  <div key={code} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="font-medium text-white">{override.msa_name}</p>
                      <p className="text-xs text-slate-400">{code}</p>
                    </div>
                    {override.notes && (
                      <p className="text-sm text-slate-400 max-w-md truncate">{override.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Public Data Sources Tab */}
      {activeTab === 'public' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Header with Refresh All */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Public Market Intelligence Sources</h3>
              <p className="text-sm text-slate-400 mt-1">
                Data is fetched once and cached until you request a refresh. Use these sources for market analysis, competitive intelligence, and strategy generation.
              </p>
            </div>
            <button
              onClick={refreshAllPublicSources}
              disabled={refreshingCategory === 'all'}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${refreshingCategory === 'all' ? 'animate-spin' : ''}`} />
              Refresh All
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <p className="text-2xl font-bold text-white">
                {publicDataCategories.reduce((sum, cat) => sum + cat.total, 0)}
              </p>
              <p className="text-xs text-slate-400">Total Sources</p>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <p className="text-2xl font-bold text-emerald-400">
                {publicDataCategories.reduce((sum, cat) => sum + cat.refreshed, 0)}
              </p>
              <p className="text-xs text-slate-400">Data Refreshed</p>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <p className="text-2xl font-bold text-brand-400">
                {publicDataCategories.filter(cat => cat.sources.some(s => s.api_available)).length}
              </p>
              <p className="text-xs text-slate-400">API-Enabled</p>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <p className="text-2xl font-bold text-accent-400">
                {publicDataCategories.length}
              </p>
              <p className="text-xs text-slate-400">Categories</p>
            </div>
          </div>

          {/* Categories */}
          {publicDataCategories.map((cat) => {
            const CategoryIcon = getCategoryIcon(cat.category)
            return (
              <div
                key={cat.category}
                className="rounded-xl card-gradient border border-white/10 overflow-hidden"
              >
                {/* Category Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/20">
                      <CategoryIcon className="h-5 w-5 text-brand-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{cat.label}</h4>
                      <p className="text-xs text-slate-400">
                        {cat.refreshed} of {cat.total} sources refreshed
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => refreshCategory(cat.category)}
                    disabled={refreshingCategory === cat.category}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50"
                  >
                    <ArrowPathIcon className={`h-4 w-4 ${refreshingCategory === cat.category ? 'animate-spin' : ''}`} />
                    Refresh Category
                  </button>
                </div>

                {/* Sources Grid */}
                <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {cat.sources.map((source) => (
                    <div
                      key={source.id}
                      className={`p-4 rounded-lg border ${
                        source.refresh_status === 'success'
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : source.refresh_status === 'failed'
                          ? 'border-red-500/30 bg-red-500/5'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-white hover:text-brand-400 transition-colors truncate block"
                          >
                            {source.name}
                          </a>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {source.description}
                          </p>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {source.api_available && (
                          <span className="px-1.5 py-0.5 text-xs bg-brand-500/20 text-brand-400 rounded">
                            API
                          </span>
                        )}
                        {source.service_areas.map((sa) => (
                          <span
                            key={sa}
                            className="px-1.5 py-0.5 text-xs bg-white/10 text-slate-400 rounded capitalize"
                          >
                            {sa.replace('_', ' ')}
                          </span>
                        ))}
                      </div>

                      {/* Status & Refresh */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                        <div className="flex items-center gap-2">
                          {source.refresh_status === 'success' ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-400">
                              <CheckCircleIcon className="h-3.5 w-3.5" />
                              {formatLastRefresh(source.last_refresh)}
                            </span>
                          ) : source.refresh_status === 'failed' ? (
                            <span className="flex items-center gap-1 text-xs text-red-400">
                              <XCircleIcon className="h-3.5 w-3.5" />
                              Failed
                            </span>
                          ) : source.refresh_status === 'in_progress' ? (
                            <span className="flex items-center gap-1 text-xs text-amber-400">
                              <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                              Refreshing...
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">Not yet fetched</span>
                          )}
                        </div>
                        <button
                          onClick={() => refreshPublicSource(source.id)}
                          disabled={refreshingSource === source.id}
                          className="p-1.5 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                          title="Refresh this source"
                        >
                          <ArrowPathIcon className={`h-4 w-4 ${refreshingSource === source.id ? 'animate-spin' : ''}`} />
                        </button>
                      </div>

                      {/* Error message */}
                      {source.error_message && (
                        <p className="mt-2 text-xs text-red-400 truncate" title={source.error_message}>
                          {source.error_message}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Info Box */}
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-6">
            <h4 className="font-semibold text-blue-300 mb-2">About Data Persistence</h4>
            <ul className="text-sm text-blue-200/80 space-y-1">
              <li>• Data is fetched once and cached locally until you request a refresh</li>
              <li>• Use individual refresh buttons to update specific sources</li>
              <li>• Use category refresh to update all sources in a category</li>
              <li>• Refresh All updates every source - use sparingly for large data sets</li>
              <li>• API-enabled sources support automated data fetching</li>
              <li>• Non-API sources provide reference links for manual research</li>
            </ul>
          </div>
        </motion.div>
      )}

      {/* Internal Data Sources Tab */}
      {activeTab === 'data' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="rounded-xl card-gradient border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Internal Data Connections</h3>
            <p className="text-sm text-slate-400 mb-6">
              Connect your enterprise systems for "Enhanced" playbook generation with real account data.
              These connections enable the platform to use actual customer, pipeline, and performance metrics.
            </p>

            {/* Public Sources */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Public Sources</h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dataSources.filter(ds => ds.is_public).map((ds) => (
                  <div
                    key={ds.id}
                    className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-white">{ds.name}</p>
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircleIcon className="h-4 w-4" /> Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Always available for deck generation
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Internal Sources */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3">Internal Data Sources</h4>
              <div className="space-y-3">
                {dataSources.filter(ds => !ds.is_public).map((ds) => (
                  <div
                    key={ds.id}
                    className={`p-4 rounded-lg border ${
                      ds.status === 'connected'
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{ds.name}</p>
                        <p className="text-xs text-slate-400 capitalize">{ds.source_type}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {ds.status === 'connected' ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-400">
                            <CheckCircleIcon className="h-4 w-4" /> Connected
                          </span>
                        ) : ds.status === 'pending' ? (
                          <span className="flex items-center gap-1 text-xs text-amber-400">
                            <ArrowPathIcon className="h-4 w-4" /> Pending
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <XCircleIcon className="h-4 w-4" /> Not configured
                          </span>
                        )}
                        <button className="px-3 py-1 text-xs font-medium text-slate-300 bg-white/10 rounded-lg hover:bg-white/20">
                          Configure
                        </button>
                      </div>
                    </div>
                    {ds.last_sync && (
                      <p className="text-xs text-slate-500 mt-2">
                        Last sync: {new Date(ds.last_sync).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Data Level Toggle Info */}
            <div className="mt-6 p-4 rounded-lg bg-white/5 border border-white/10">
              <h4 className="text-sm font-medium text-white mb-2">Playbook Data Modes</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-3 rounded bg-white/5">
                  <p className="font-medium text-white text-sm">Public Only</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Uses market trends, TAM analysis, and industry benchmarks from public sources.
                    Ideal for external sharing or when internal data is not connected.
                  </p>
                </div>
                <div className="p-3 rounded bg-white/5">
                  <p className="font-medium text-white text-sm">Enhanced</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Adds real account data, actual scores, pipeline metrics, and opportunity details.
                    Requires at least one internal data source connected.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="rounded-xl card-gradient border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">User Management</h3>
                <p className="text-sm text-slate-400">
                  Manage platform users and their access levels
                </p>
              </div>
              <button
                onClick={() => setShowAddUser(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-500"
              >
                <PlusIcon className="h-4 w-4" />
                Add User
              </button>
            </div>

            {/* Add User Form */}
            {showAddUser && (
              <div className="mb-6 p-4 rounded-lg bg-white/5 border border-brand-500/30">
                <h4 className="text-sm font-medium text-white mb-4">Add New User</h4>
                <p className="text-xs text-slate-400 mb-4">
                  New users will be prompted to set their password on first login.
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="Username (for login)"
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Display name"
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="Email (optional)"
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {roles.map((role) => (
                      <option key={role.value} value={role.value} className="bg-slate-900">
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={createUser}
                    disabled={!newUser.username || !newUser.name}
                    className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50"
                  >
                    Create User
                  </button>
                  <button
                    onClick={() => setShowAddUser(false)}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className="overflow-hidden rounded-lg border border-white/10">
              <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                      Last Login
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-white/5">
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-white">{user.name}</p>
                          <p className="text-xs text-slate-400">@{user.username}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user.role === 'admin'
                            ? 'bg-purple-500/20 text-purple-400'
                            : user.role === 'exec'
                            ? 'bg-brand-500/20 text-brand-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {user.role_label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          {user.is_active ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-400">
                              <span className="h-2 w-2 rounded-full bg-emerald-400" />
                              Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <span className="h-2 w-2 rounded-full bg-slate-500" />
                              Inactive
                            </span>
                          )}
                          {user.requires_password_change && (
                            <span className="text-xs text-amber-400">
                              Password not set
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-400">
                        {user.last_login
                          ? new Date(user.last_login).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => deleteUser(user.id)}
                          disabled={user.username === 'admin'}
                          className="p-2 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={user.username === 'admin' ? 'Cannot delete admin user' : 'Deactivate user'}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Role Descriptions */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Role Permissions</h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {roles.map((role) => (
                  <div key={role.value} className="p-3 rounded-lg bg-white/5">
                    <p className="font-medium text-white text-sm">{role.label}</p>
                    <p className="text-xs text-slate-400 mt-1">{role.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Help Docs Tab */}
      {activeTab === 'help' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Platform Overview */}
          <div className="rounded-xl card-gradient border border-white/10 p-6">
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
          </div>

          {/* Platform Sections */}
          <div className="rounded-xl card-gradient border border-white/10 p-6">
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
          </div>

          {/* Data Architecture */}
          <div className="rounded-xl card-gradient border border-white/10 p-6">
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
          </div>

          {/* Quick Start */}
          <div className="rounded-xl card-gradient border border-white/10 p-6">
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
          </div>
        </motion.div>
      )}
    </div>
  )
}

