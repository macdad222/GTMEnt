/**
 * CB Configuration Context
 * 
 * Provides centralized state management for Comcast Business configuration data.
 * When config is updated in Admin Setup, all consuming components automatically refresh.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

// Types
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

interface RepTypeQuota {
  rep_type: string
  rep_type_label: string
  count: number
  quota_per_rep_mrr: number
  is_quota_bearing: boolean
}

interface NationalSalesCapacity {
  fiscal_year: number
  rep_quotas: RepTypeQuota[]
  total_headcount: number
  total_quota_mrr: number
  new_logo_quota_pct: number
  expansion_quota_pct: number
  avg_ramp_time_months: number
  avg_quota_attainment_pct: number
  attrition_rate_pct: number
  rule_of_78_factor: number
}

interface SalesCapacityConfig {
  national: NationalSalesCapacity
  msa_overrides: Record<string, unknown>
}

interface MSAData {
  code: string
  short_name: string
  name: string
  region: string
  population_2023: number
  enterprise_establishments: number
  has_fiber: boolean
  has_coax: boolean
  infrastructure_type: string
  comcast_coverage_pct: number
  fiber_coverage_pct: number
  priority_tier: number
  priority_score: number
  current_arr_usd: number
  tam_usd: number
  sam_usd: number
  market_share_pct: number
  total_quota_bearing_headcount: number
  total_accounts: number
}

export interface CBConfiguration {
  id: string
  updated_at: string
  updated_by: string
  company_metrics: CompanyMetrics
  segments: SegmentConfig[]
  growth_trajectory: GrowthDataPoint[]
  primary_markets: string[]
  key_competitors: string[]
}

interface DashboardData {
  stats: Array<{
    name: string
    value: string
    change: string
    changeType: string
    icon: string
  }>
  segment_data: Array<{
    tier: string
    label: string
    arr: number
    accounts: number
    color: string
  }>
  growth_data: Array<{
    period: string
    actual: number
    target: number
  }>
  trends: Array<{
    title: string
    direction: string
    magnitude: string
  }>
}

interface CBConfigContextType {
  // Core config
  config: CBConfiguration | null
  dashboardData: DashboardData | null
  products: ProductConfig[]
  salesCapacity: SalesCapacityConfig | null
  msaList: MSAData[]
  
  // Loading states
  loading: boolean
  error: string | null
  
  // Actions
  refreshConfig: () => Promise<void>
  refreshDashboard: () => Promise<void>
  refreshProducts: () => Promise<void>
  refreshSalesCapacity: () => Promise<void>
  refreshMSAs: () => Promise<void>
  refreshAll: () => Promise<void>
  
  // Update timestamp for cache busting
  lastUpdated: Date | null
}

const CBConfigContext = createContext<CBConfigContextType | undefined>(undefined)

export function CBConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<CBConfiguration | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [products, setProducts] = useState<ProductConfig[]>([])
  const [salesCapacity, setSalesCapacity] = useState<SalesCapacityConfig | null>(null)
  const [msaList, setMsaList] = useState<MSAData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const refreshConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/cb-config')
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error('Failed to fetch CB config:', err)
      setError('Failed to load configuration')
    }
  }, [])

  const refreshDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/cb-config/dashboard-data')
      if (res.ok) {
        const data = await res.json()
        setDashboardData(data)
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    }
  }, [])

  const refreshProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/cb-config/products')
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      }
    } catch (err) {
      console.error('Failed to fetch products:', err)
    }
  }, [])

  const refreshSalesCapacity = useCallback(async () => {
    try {
      const res = await fetch('/api/cb-config/sales-capacity')
      if (res.ok) {
        const data = await res.json()
        setSalesCapacity(data)
      }
    } catch (err) {
      console.error('Failed to fetch sales capacity:', err)
    }
  }, [])

  const refreshMSAs = useCallback(async () => {
    try {
      const res = await fetch('/api/msa')
      if (res.ok) {
        const data = await res.json()
        setMsaList(data.msas || data || [])
      }
    } catch (err) {
      console.error('Failed to fetch MSAs:', err)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([
        refreshConfig(),
        refreshDashboard(),
        refreshProducts(),
        refreshSalesCapacity(),
        refreshMSAs(),
      ])
    } catch (err) {
      console.error('Failed to refresh all data:', err)
      setError('Failed to refresh data')
    } finally {
      setLoading(false)
    }
  }, [refreshConfig, refreshDashboard, refreshProducts, refreshSalesCapacity, refreshMSAs])

  // Initial load
  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  return (
    <CBConfigContext.Provider
      value={{
        config,
        dashboardData,
        products,
        salesCapacity,
        msaList,
        loading,
        error,
        refreshConfig,
        refreshDashboard,
        refreshProducts,
        refreshSalesCapacity,
        refreshMSAs,
        refreshAll,
        lastUpdated,
      }}
    >
      {children}
    </CBConfigContext.Provider>
  )
}

export function useCBConfig() {
  const context = useContext(CBConfigContext)
  if (context === undefined) {
    throw new Error('useCBConfig must be used within a CBConfigProvider')
  }
  return context
}

// Utility hook for dashboard-specific data
export function useDashboardData() {
  const { dashboardData, config, loading, refreshDashboard, lastUpdated } = useCBConfig()
  return { dashboardData, config, loading, refreshDashboard, lastUpdated }
}

// Utility hook for segments
export function useSegments() {
  const { config, loading, refreshConfig, lastUpdated } = useCBConfig()
  return { 
    segments: config?.segments || [], 
    companyMetrics: config?.company_metrics,
    loading, 
    refreshConfig, 
    lastUpdated 
  }
}

// Utility hook for products
export function useProducts() {
  const { products, loading, refreshProducts, lastUpdated } = useCBConfig()
  return { products, loading, refreshProducts, lastUpdated }
}

// Utility hook for sales capacity
export function useSalesCapacity() {
  const { salesCapacity, loading, refreshSalesCapacity, lastUpdated } = useCBConfig()
  return { salesCapacity, loading, refreshSalesCapacity, lastUpdated }
}

// Utility hook for MSAs
export function useMSAs() {
  const { msaList, loading, refreshMSAs, lastUpdated } = useCBConfig()
  return { msaList, loading, refreshMSAs, lastUpdated }
}

