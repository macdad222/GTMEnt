import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Login } from './pages/Login'
import { CBConfigProvider } from './context/CBConfigContext'
import { AuthProvider } from './context/AuthContext'
import { VoiceAgentProvider } from './context/VoiceAgentContext'
import { GlobalVoiceAgent } from './components/GlobalVoiceAgent'

// ── Lazy-loaded page components (code splitting) ───────────────────────
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Segments = lazy(() => import('./pages/Segments').then(m => ({ default: m.Segments })))
const SegmentDetail = lazy(() => import('./pages/SegmentDetail').then(m => ({ default: m.SegmentDetail })))
const Playbooks = lazy(() => import('./pages/Playbooks').then(m => ({ default: m.Playbooks })))
const PlaybookDetail = lazy(() => import('./pages/PlaybookDetail').then(m => ({ default: m.PlaybookDetail })))
const MarketIntel = lazy(() => import('./pages/MarketIntel').then(m => ({ default: m.MarketIntel })))
const MSAAnalysis = lazy(() => import('./pages/MSAAnalysis').then(m => ({ default: m.MSAAnalysis })))
const ProductRoadmap = lazy(() => import('./pages/ProductRoadmap').then(m => ({ default: m.ProductRoadmap })))
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })))
const AdminSetup = lazy(() => import('./pages/AdminSetup').then(m => ({ default: m.AdminSetup })))
const DataStatus = lazy(() => import('./pages/DataStatus').then(m => ({ default: m.DataStatus })))
const CompetitiveIntel = lazy(() => import('./pages/CompetitiveIntel').then(m => ({ default: m.CompetitiveIntel })))
const QuestionsInsights = lazy(() => import('./pages/QuestionsInsights').then(m => ({ default: m.QuestionsInsights })))
const StrategyReport = lazy(() => import('./pages/StrategyReport').then(m => ({ default: m.StrategyReport })))
const Documentation = lazy(() => import('./pages/Documentation').then(m => ({ default: m.Documentation })))

// ── Loading fallback for Suspense ──────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin h-8 w-8 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm text-slate-400">Loading...</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CBConfigProvider>
          <VoiceAgentProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public route - Login */}
                <Route path="/login" element={<Login />} />

                {/* Protected routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="segments" element={<Segments />} />
                  <Route path="segments/:tier" element={<SegmentDetail />} />
                  <Route path="playbooks" element={<Playbooks />} />
                  <Route path="playbooks/:id" element={<PlaybookDetail />} />
                  <Route path="market" element={<MarketIntel />} />
                  <Route path="msa" element={<MSAAnalysis />} />
                  <Route path="product-roadmap" element={<ProductRoadmap />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="admin" element={<AdminSetup />} />
                  <Route path="data-status" element={<DataStatus />} />
                  <Route path="competitive" element={<CompetitiveIntel />} />
                  <Route path="insights" element={<QuestionsInsights />} />
                  <Route path="strategy-report" element={<StrategyReport />} />
                  <Route path="docs" element={<Documentation />} />
                </Route>
              </Routes>
            </Suspense>
            <GlobalVoiceAgent />
          </VoiceAgentProvider>
        </CBConfigProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
