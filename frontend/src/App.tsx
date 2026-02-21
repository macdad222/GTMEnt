import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Dashboard } from './pages/Dashboard'
import { Segments } from './pages/Segments'
import { SegmentDetail } from './pages/SegmentDetail'
import { Playbooks } from './pages/Playbooks'
import { PlaybookDetail } from './pages/PlaybookDetail'
import { MarketIntel } from './pages/MarketIntel'
import { MSAAnalysis } from './pages/MSAAnalysis'
import { ProductRoadmap } from './pages/ProductRoadmap'
import { Settings } from './pages/Settings'
import { AdminSetup } from './pages/AdminSetup'
import { DataStatus } from './pages/DataStatus'
import { CompetitiveIntel } from './pages/CompetitiveIntel'
import { QuestionsInsights } from './pages/QuestionsInsights'
import { StrategyReport } from './pages/StrategyReport'
import { Documentation } from './pages/Documentation'
import { Login } from './pages/Login'
import { GatePage } from './pages/GatePage'
import { Register } from './pages/Register'
import { CBConfigProvider } from './context/CBConfigContext'
import { AuthProvider } from './context/AuthContext'
import { VoiceAgentProvider } from './context/VoiceAgentContext'
import { GlobalVoiceAgent } from './components/GlobalVoiceAgent'

export default function App() {
  return (
    <AuthProvider>
      <CBConfigProvider>
        <VoiceAgentProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/gate" element={<GatePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
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
        <GlobalVoiceAgent />
        </VoiceAgentProvider>
      </CBConfigProvider>
    </AuthProvider>
  )
}
