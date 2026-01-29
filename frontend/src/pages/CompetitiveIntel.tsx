import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BuildingOffice2Icon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ShieldExclamationIcon,
  SparklesIcon,
  XMarkIcon,
  GlobeAltIcon,
  ClockIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  RocketLaunchIcon,
  ScaleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BoltIcon,
  TrophyIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { generateCompetitiveAnalysisPDF } from '../utils/pdfGenerator';
import { HelpSection } from '../components/HelpSection';
import { JobProgressToast } from '../components/JobProgressToast';
import { useJobPolling } from '../hooks/useJobPolling';

// Types
interface Competitor {
  id: string;
  name: string;
  ticker: string | null;
  category: string;
  category_label: string;
  business_url: string;
  is_active: boolean;
  last_scraped: string | null;
  has_data: boolean;
  scrape_error: string | null;
}

interface Category {
  value: string;
  label: string;
}

interface Analysis {
  id: string;
  created_at: string;
  competitors_analyzed: string[];
  llm_provider: string;
  llm_model: string;
  executive_summary: string;
  product_comparison: string;
  market_positioning: string;
  recommendations: string[];
  opportunities: string[];
  threats: string[];
  full_analysis: string;
}

interface AnalysisSummary {
  id: string;
  created_at: string;
  competitors_analyzed: string[];
  executive_summary: string;
}

// Category icon mapping
const categoryIcons: Record<string, React.ElementType> = {
  telco: BuildingOffice2Icon,
  cable: GlobeAltIcon,
  fiber: RocketLaunchIcon,
  cloud: SparklesIcon,
  msp: ShieldExclamationIcon,
  other: BuildingOffice2Icon,
};

// Category color mapping
const categoryColors: Record<string, string> = {
  telco: 'blue',
  cable: 'purple',
  fiber: 'emerald',
  cloud: 'cyan',
  msp: 'orange',
  other: 'slate',
};

// Horizontal Bar Chart Component
const HorizontalBarChart: React.FC<{
  items: { label: string; value: number; color: string }[];
  title: string;
  icon: React.ElementType;
  maxValue?: number;
}> = ({ items, title, icon: Icon, maxValue = 100 }) => (
  <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50">
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-5 w-5 text-slate-400" />
      <h4 className="font-semibold text-white">{title}</h4>
    </div>
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-300 truncate pr-2">{item.label}</span>
            <span className="text-slate-400">{item.value}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / maxValue) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
              className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Donut Chart Component
const DonutChart: React.FC<{
  opportunities: number;
  threats: number;
}> = ({ opportunities, threats }) => {
  const total = opportunities + threats;
  const oppPercent = (opportunities / total) * 100;
  const threatPercent = (threats / total) * 100;
  
  return (
    <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50">
      <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
        <ScaleIcon className="h-5 w-5 text-slate-400" />
        Opportunity vs Threat Balance
      </h4>
      <div className="flex items-center justify-center gap-8">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            {/* Background circle */}
            <circle
              cx="18" cy="18" r="15.915"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-slate-700"
            />
            {/* Opportunities arc */}
            <circle
              cx="18" cy="18" r="15.915"
              fill="none"
              stroke="url(#oppGradient)"
              strokeWidth="3"
              strokeDasharray={`${oppPercent} ${100 - oppPercent}`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
            {/* Threats arc */}
            <circle
              cx="18" cy="18" r="15.915"
              fill="none"
              stroke="url(#threatGradient)"
              strokeWidth="3"
              strokeDasharray={`${threatPercent} ${100 - threatPercent}`}
              strokeDashoffset={`-${oppPercent}`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="oppGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
              <linearGradient id="threatGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#f87171" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{total}</div>
              <div className="text-xs text-slate-400">Total</div>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400" />
            <div>
              <div className="text-white font-medium">{opportunities} Opportunities</div>
              <div className="text-sm text-slate-400">{oppPercent.toFixed(0)}% of insights</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-red-400" />
            <div>
              <div className="text-white font-medium">{threats} Threats</div>
              <div className="text-sm text-slate-400">{threatPercent.toFixed(0)}% of insights</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Competitive Radar Component
const CompetitiveRadar: React.FC<{
  dimensions: { name: string; comcast: number; competitor: number }[];
}> = ({ dimensions }) => {
  const numDimensions = dimensions.length;
  const angleStep = (2 * Math.PI) / numDimensions;
  const centerX = 100;
  const centerY = 100;
  const maxRadius = 70;

  const getPoint = (angle: number, value: number) => {
    const radius = (value / 100) * maxRadius;
    return {
      x: centerX + radius * Math.cos(angle - Math.PI / 2),
      y: centerY + radius * Math.sin(angle - Math.PI / 2),
    };
  };

  const comcastPoints = dimensions.map((d, i) => getPoint(i * angleStep, d.comcast));
  const competitorPoints = dimensions.map((d, i) => getPoint(i * angleStep, d.competitor));

  const comcastPath = comcastPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  const competitorPath = competitorPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50">
      <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
        <ChartBarIcon className="h-5 w-5 text-slate-400" />
        Competitive Positioning
      </h4>
      <div className="flex items-center justify-center">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {/* Grid circles */}
          {[20, 40, 60, 80, 100].map((pct) => (
            <circle
              key={pct}
              cx={centerX}
              cy={centerY}
              r={(pct / 100) * maxRadius}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-slate-600"
            />
          ))}
          {/* Grid lines */}
          {dimensions.map((_, i) => {
            const point = getPoint(i * angleStep, 100);
            return (
              <line
                key={i}
                x1={centerX}
                y1={centerY}
                x2={point.x}
                y2={point.y}
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-slate-600"
              />
            );
          })}
          {/* Competitor area */}
          <motion.path
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            d={competitorPath}
            fill="rgba(239, 68, 68, 0.2)"
            stroke="#ef4444"
            strokeWidth="2"
            style={{ transformOrigin: 'center' }}
          />
          {/* Comcast area */}
          <motion.path
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            d={comcastPath}
            fill="rgba(59, 130, 246, 0.3)"
            stroke="#3b82f6"
            strokeWidth="2"
            style={{ transformOrigin: 'center' }}
          />
          {/* Labels */}
          {dimensions.map((d, i) => {
            const labelPoint = getPoint(i * angleStep, 120);
            return (
              <text
                key={i}
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-400 text-[8px]"
              >
                {d.name}
              </text>
            );
          })}
        </svg>
      </div>
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-sm text-slate-300">Comcast</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-sm text-slate-300">Competitor Avg</span>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  color: string;
}> = ({ icon: Icon, label, value, trend, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-gradient-to-br from-${color}-900/40 to-${color}-800/20 rounded-xl p-4 border border-${color}-500/20`}
  >
    <div className="flex items-center justify-between mb-2">
      <Icon className={`h-5 w-5 text-${color}-400`} />
      {trend && (
        <div className={`flex items-center gap-1 text-xs ${
          trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400'
        }`}>
          {trend === 'up' ? <ArrowTrendingUpIcon className="h-4 w-4" /> : 
           trend === 'down' ? <ArrowTrendingDownIcon className="h-4 w-4" /> : null}
        </div>
      )}
    </div>
    <div className={`text-2xl font-bold text-${color}-400`}>{value}</div>
    <div className="text-sm text-slate-400">{label}</div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Markdown & Content Parsing Components
// ─────────────────────────────────────────────────────────────────────────────

// Parse markdown table into structured data
function parseMarkdownTable(text: string): { headers: string[]; rows: string[][] } | null {
  const lines = text.trim().split('\n');
  if (lines.length < 3) return null;
  
  const parseRow = (line: string): string[] => {
    return line
      .split('|')
      .map(cell => cell.trim())
      .filter(cell => cell && !cell.match(/^[-:]+$/));
  };
  
  const headers = parseRow(lines[0]);
  if (headers.length < 2) return null;
  
  // Skip separator line (line 1)
  const rows = lines.slice(2).map(parseRow).filter(row => row.length > 0);
  
  return { headers, rows };
}

// Styled Table Component for Product Comparison
const ComparisonTable: React.FC<{ content: string; competitorName?: string }> = ({ content }) => {
  const tableData = parseMarkdownTable(content);
  
  if (!tableData) {
    // Fallback: render as formatted text sections
    return <FormattedAnalysisText content={content} />;
  }
  
  const { headers, rows } = tableData;
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                className={`px-4 py-3 text-left text-sm font-semibold border-b border-slate-600 ${
                  i === 0 ? 'text-slate-400 bg-slate-800/50' : 
                  i === 1 ? 'text-blue-400 bg-blue-500/10' : 'text-red-400 bg-red-500/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  {i === 1 && <TrophyIcon className="h-4 w-4" />}
                  {i === 2 && <BuildingOffice2Icon className="h-4 w-4" />}
                  {header.replace(/\*\*/g, '')}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <motion.tr
              key={rowIndex}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: rowIndex * 0.05 }}
              className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors"
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-4 py-3 text-sm ${
                    cellIndex === 0 ? 'font-medium text-amber-400' : 'text-slate-300'
                  }`}
                >
                  {cell.replace(/\*\*/g, '')}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Parse structured recommendation
interface ParsedRecommendation {
  title: string;
  priority: number;
  action?: string;
  rationale?: string;
  successMetric?: string;
  complexity?: string;
}

function parseRecommendation(rec: string): ParsedRecommendation {
  // Try to parse structured format: **[1] Title** \n Action: ... \n Rationale: ...
  const titleMatch = rec.match(/^\*?\*?\[?(\d+)\]?\*?\*?\s*\*?\*?([^*\n]+)/);
  const priority = titleMatch ? parseInt(titleMatch[1]) : 0;
  const title = titleMatch ? titleMatch[2].trim() : rec.split('\n')[0].replace(/\*\*/g, '').trim();
  
  const actionMatch = rec.match(/Action:\s*(.+?)(?=\n|Rationale:|Success|Complexity:|$)/is);
  const rationaleMatch = rec.match(/Rationale:\s*(.+?)(?=\n|Action:|Success|Complexity:|$)/is);
  const metricMatch = rec.match(/Success\s*Metric:\s*(.+?)(?=\n|Action:|Rationale:|Complexity:|$)/is);
  const complexityMatch = rec.match(/Complexity:\s*(.+?)(?=\n|$)/is);
  
  return {
    title,
    priority,
    action: actionMatch?.[1]?.trim(),
    rationale: rationaleMatch?.[1]?.trim(),
    successMetric: metricMatch?.[1]?.trim(),
    complexity: complexityMatch?.[1]?.trim()?.replace(/[\.\*]/g, ''),
  };
}

// Styled Recommendation Card
const RecommendationCard: React.FC<{ rec: string; index: number }> = ({ rec, index }) => {
  const parsed = parseRecommendation(rec);
  
  const complexityColors: Record<string, string> = {
    'low': 'bg-green-500/20 text-green-400 border-green-500/30',
    'medium': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'high': 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  
  const complexityClass = complexityColors[parsed.complexity?.toLowerCase() || 'medium'] || complexityColors.medium;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-gradient-to-br from-slate-800/80 to-slate-900/50 rounded-xl border border-emerald-500/20 overflow-hidden hover:border-emerald-500/40 transition-all"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border-b border-emerald-500/20">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
          {index + 1}
        </div>
        <h4 className="font-semibold text-white flex-1">{parsed.title}</h4>
        {parsed.complexity && (
          <span className={`px-2 py-1 text-xs rounded-full border ${complexityClass}`}>
            {parsed.complexity}
          </span>
        )}
      </div>
      
      {/* Body */}
      <div className="p-4 space-y-3">
        {parsed.action && (
          <div className="flex items-start gap-2">
            <BoltIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-xs text-blue-400 uppercase tracking-wide">Action</span>
              <p className="text-slate-300 text-sm">{parsed.action}</p>
            </div>
          </div>
        )}
        {parsed.rationale && (
          <div className="flex items-start gap-2">
            <LightBulbIcon className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-xs text-amber-400 uppercase tracking-wide">Rationale</span>
              <p className="text-slate-300 text-sm">{parsed.rationale}</p>
            </div>
          </div>
        )}
        {parsed.successMetric && (
          <div className="flex items-start gap-2">
            <ArrowTrendingUpIcon className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-xs text-green-400 uppercase tracking-wide">Success Metric</span>
              <p className="text-slate-300 text-sm">{parsed.successMetric}</p>
            </div>
          </div>
        )}
        {/* If no structured data, show the raw text */}
        {!parsed.action && !parsed.rationale && (
          <p className="text-slate-300">{rec}</p>
        )}
      </div>
    </motion.div>
  );
};

// Check if text contains a markdown table
function containsMarkdownTable(text: string): boolean {
  const lines = text.trim().split('\n');
  // Table needs at least 3 lines: header, separator, data row
  if (lines.length < 3) return false;
  // Check for separator line with dashes
  return lines.some(line => /^\|[-:\s|]+\|$/.test(line.trim()));
}

// Render markdown table beautifully
const StyledMarkdownTable: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.trim().split('\n').filter(line => line.trim());
  
  // Find table start
  const tableStartIdx = lines.findIndex(line => line.includes('|'));
  if (tableStartIdx === -1) return <div className="text-slate-300">{content}</div>;
  
  // Parse header row
  const headerLine = lines[tableStartIdx];
  const headers = headerLine.split('|').map(h => h.trim()).filter(Boolean);
  
  // Find separator (skip it)
  const separatorIdx = lines.findIndex((line, i) => i > tableStartIdx && /^[-:\s|]+$/.test(line.replace(/\|/g, '').trim()));
  
  // Parse data rows
  const dataRows = lines
    .slice(separatorIdx + 1)
    .filter(line => line.includes('|'))
    .map(line => line.split('|').map(cell => cell.trim()).filter(Boolean));

  return (
    <div className="overflow-x-auto rounded-lg border border-amber-500/20 bg-gradient-to-br from-slate-900/80 to-slate-800/50">
      <table className="w-full">
        <thead>
          <tr className="bg-gradient-to-r from-amber-500/20 to-blue-500/20">
            {headers.map((header, i) => (
              <th
                key={i}
                className={`px-4 py-3 text-left text-sm font-semibold border-b border-slate-600 ${
                  i === 0 ? 'text-slate-300' : 
                  i === 1 ? 'text-blue-400' : 'text-red-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  {i === 1 && (
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20">
                      <TrophyIcon className="h-3.5 w-3.5 text-blue-400" />
                    </span>
                  )}
                  {i === 2 && (
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20">
                      <BuildingOffice2Icon className="h-3.5 w-3.5 text-red-400" />
                    </span>
                  )}
                  <span>{header.replace(/\*\*/g, '')}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, rowIndex) => (
            <motion.tr
              key={rowIndex}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: rowIndex * 0.03 }}
              className={`border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors ${
                rowIndex % 2 === 0 ? 'bg-slate-800/20' : 'bg-transparent'
              }`}
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-4 py-3 text-sm ${
                    cellIndex === 0 
                      ? 'font-medium text-amber-400 border-r border-slate-700/30' 
                      : 'text-slate-300'
                  }`}
                >
                  <div className={cellIndex === 0 ? '' : 'flex items-start gap-2'}>
                    {cellIndex > 0 && (
                      <CheckCircleSolid className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        cellIndex === 1 ? 'text-blue-400/60' : 'text-red-400/60'
                      }`} />
                    )}
                    <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(cell) }} />
                  </div>
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Format markdown analysis text into styled sections
const FormattedAnalysisText: React.FC<{ content: string }> = ({ content }) => {
  // Split by headers (## Header)
  const sections = content.split(/(?=^## )/m).filter(Boolean);
  
  const sectionIcons: Record<string, React.ElementType> = {
    'executive': SparklesIcon,
    'product': ScaleIcon,
    'technology': BoltIcon,
    'pricing': ArrowTrendingUpIcon,
    'market': GlobeAltIcon,
    'go-to-market': RocketLaunchIcon,
    'strengths': TrophyIcon,
    'weaknesses': ArrowTrendingDownIcon,
    'win': CheckCircleIcon,
    'opportunities': LightBulbIcon,
    'threats': ShieldExclamationIcon,
    'recommendations': LightBulbIcon,
    'key': SparklesIcon,
  };
  
  const sectionColors: Record<string, string> = {
    'executive': 'purple',
    'product': 'amber',
    'technology': 'blue',
    'pricing': 'green',
    'market': 'cyan',
    'go-to-market': 'indigo',
    'strengths': 'emerald',
    'weaknesses': 'red',
    'win': 'teal',
    'opportunities': 'cyan',
    'threats': 'red',
    'recommendations': 'emerald',
    'key': 'purple',
  };
  
  return (
    <div className="space-y-6">
      {sections.map((section, i) => {
        const headerMatch = section.match(/^##\s*(.+)$/m);
        const header = headerMatch?.[1]?.trim() || '';
        const body = section.replace(/^##\s*.+$/m, '').trim();
        
        // Find matching icon/color
        const headerLower = header.toLowerCase();
        let iconKey = Object.keys(sectionIcons).find(key => headerLower.includes(key)) || 'executive';
        const Icon = sectionIcons[iconKey];
        const color = sectionColors[iconKey] || 'slate';
        
        // Check if this section contains a table
        const hasTable = containsMarkdownTable(body);
        
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-xl border border-${color}-500/20 overflow-hidden`}
          >
            <div className={`flex items-center gap-3 px-4 py-3 bg-${color}-500/10 border-b border-${color}-500/20`}>
              <Icon className={`h-5 w-5 text-${color}-400`} />
              <h3 className="font-semibold text-white">{header}</h3>
              {hasTable && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">
                  Comparison
                </span>
              )}
            </div>
            <div className="p-4">
              {hasTable ? (
                <StyledMarkdownTable content={body} />
              ) : (
                <div className="text-slate-300 text-sm leading-relaxed">
                  {formatBodyText(body)}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// Format body text with bullet points, bold, etc.
function formatBodyText(text: string): React.ReactNode {
  // Replace markdown bold with styled spans
  const lines = text.split('\n');
  
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        
        // Check for bullet points
        const isBullet = trimmed.match(/^[-•*]\s+(.+)$/);
        const isNumbered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
        
        if (isBullet) {
          return (
            <div key={i} className="flex items-start gap-2 ml-2">
              <span className="text-blue-400 mt-1">•</span>
              <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(isBullet[1]) }} />
            </div>
          );
        }
        
        if (isNumbered) {
          return (
            <div key={i} className="flex items-start gap-2 ml-2">
              <span className="text-emerald-400 font-medium min-w-[1.5rem]">{isNumbered[1]}.</span>
              <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(isNumbered[2]) }} />
            </div>
          );
        }
        
        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed) }} />
        );
      })}
    </div>
  );
}

// Format inline markdown (bold, italic)
function formatInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-slate-200">$1</em>')
    .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-slate-700 rounded text-amber-300 text-xs">$1</code>');
}

// Analysis Section with enhanced visuals
function EnhancedAnalysisSection({
  title,
  icon: Icon,
  color,
  isExpanded,
  onToggle,
  children,
  badge,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <motion.div 
      className={`bg-gradient-to-r from-${color}-900/20 to-slate-800/50 rounded-xl overflow-hidden border border-${color}-500/20`}
      whileHover={{ borderColor: `var(--${color}-400)` }}
    >
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-${color}-500/20`}>
            <Icon className={`h-5 w-5 text-${color}-400`} />
          </div>
          <span className="font-semibold text-white">{title}</span>
          {badge}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDownIcon className="h-5 w-5 text-slate-400" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function CompetitiveIntel() {
  // State
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisSummary[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  
  // Job polling for async competitive analysis
  const {
    isPolling: analyzing,
    progress: analysisProgress,
    progressMessage: analysisProgressMessage,
    error: analysisError,
    startPolling: startAnalysisPolling,
    reset: resetAnalysisPolling,
  } = useJobPolling({
    interval: 2000,
    timeout: 180000, // 3 minutes
    onComplete: async () => {
      fetchAnalyses();
      setActiveTab('analyses');
    },
    onError: (err) => {
      alert(err || 'Analysis failed');
    }
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'compare' | 'analyses'>('compare');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    charts: true,
    products: true,
    recommendations: true,
    opportunities: true,
    threats: true,
    full: false,
  });

  // New competitor form
  const [newCompetitor, setNewCompetitor] = useState({
    name: '',
    business_url: '',
    ticker: '',
    category: 'other',
  });

  // Fetch data
  useEffect(() => {
    fetchCompetitors();
    fetchCategories();
    fetchAnalyses();
  }, []);

  const fetchCompetitors = async () => {
    try {
      const res = await fetch('/api/competitive/competitors?active_only=false');
      if (res.ok) {
        setCompetitors(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch competitors:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/competitive/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error('Failed to fetch categories:', e);
    }
  };

  const fetchAnalyses = async () => {
    try {
      const res = await fetch('/api/competitive/analyses');
      if (res.ok) {
        setRecentAnalyses(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch analyses:', e);
    }
  };

  const toggleCompetitor = (id: string) => {
    setSelectedCompetitors(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const activeIds = competitors.filter(c => c.is_active).map(c => c.id);
    setSelectedCompetitors(activeIds);
  };

  const clearSelection = () => {
    setSelectedCompetitors([]);
  };

  const handleAddCompetitor = async () => {
    if (!newCompetitor.name || !newCompetitor.business_url) return;

    try {
      const res = await fetch('/api/competitive/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCompetitor),
      });

      if (res.ok) {
        fetchCompetitors();
        setShowAddModal(false);
        setNewCompetitor({ name: '', business_url: '', ticker: '', category: 'other' });
      }
    } catch (e) {
      console.error('Failed to add competitor:', e);
    }
  };

  const handleScrapeAll = async () => {
    setScraping(true);
    try {
      await fetch('/api/competitive/scrape-all?force=true', { method: 'POST' });
      await fetchCompetitors();
    } catch (e) {
      console.error('Failed to scrape:', e);
    } finally {
      setScraping(false);
    }
  };

  const handleGenerateAnalysis = async () => {
    if (selectedCompetitors.length === 0) return;

    resetAnalysisPolling();
    
    try {
      const res = await fetch('/api/competitive/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitor_ids: selectedCompetitors,
          refresh_scrape: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        
        // New async API returns job_id
        if (data.job_id) {
          startAnalysisPolling(data.job_id);
        } else if (data.id) {
          // Fallback for sync response
          setCurrentAnalysis(data);
          fetchAnalyses();
          setActiveTab('analyses');
        }
      } else {
        const error = await res.json();
        alert(error.detail || 'Analysis failed');
      }
    } catch (e) {
      console.error('Failed to generate analysis:', e);
    }
  };

  // State for bulk individual analysis
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentName: '' });

  const handleGenerateAllIndividualAnalyses = async () => {
    const activeCompetitors = competitors.filter(c => c.is_active && c.has_data);
    
    if (activeCompetitors.length === 0) {
      alert('No competitors with scraped data. Please scrape competitor websites first.');
      return;
    }

    setBulkAnalyzing(true);
    setBulkProgress({ current: 0, total: activeCompetitors.length, currentName: '' });

    try {
      for (let i = 0; i < activeCompetitors.length; i++) {
        const competitor = activeCompetitors[i];
        setBulkProgress({ 
          current: i + 1, 
          total: activeCompetitors.length, 
          currentName: competitor.name 
        });

        try {
          const res = await fetch('/api/competitive/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              competitor_ids: [competitor.id],
              refresh_scrape: false,
            }),
          });

          if (!res.ok) {
            console.error(`Failed to analyze ${competitor.name}`);
          }
        } catch (e) {
          console.error(`Error analyzing ${competitor.name}:`, e);
        }

        // Small delay between requests to avoid overwhelming the API
        if (i < activeCompetitors.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Refresh the analyses list
      await fetchAnalyses();
      setActiveTab('analyses');
    } catch (e) {
      console.error('Failed to generate all analyses:', e);
    } finally {
      setBulkAnalyzing(false);
      setBulkProgress({ current: 0, total: 0, currentName: '' });
    }
  };

  const loadAnalysis = async (id: string) => {
    try {
      const res = await fetch(`/api/competitive/analyses/${id}`);
      if (res.ok) {
        setCurrentAnalysis(await res.json());
      }
    } catch (e) {
      console.error('Failed to load analysis:', e);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Group competitors by category
  const groupedCompetitors = competitors.reduce((acc, comp) => {
    const cat = comp.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(comp);
    return acc;
  }, {} as Record<string, Competitor[]>);

  // Find analysis for a specific competitor
  const getAnalysisForCompetitor = (competitorName: string): AnalysisSummary | undefined => {
    return recentAnalyses.find(a => 
      a.competitors_analyzed.some(name => 
        name.toLowerCase() === competitorName.toLowerCase()
      )
    );
  };

  // View analysis for a competitor
  const viewCompetitorAnalysis = async (competitorName: string) => {
    const analysis = getAnalysisForCompetitor(competitorName);
    if (analysis) {
      await loadAnalysis(analysis.id);
      setActiveTab('analyses');
    }
  };

  // Quick analyze a single competitor
  const quickAnalyzeCompetitor = async (competitorId: string) => {
    resetAnalysisPolling();
    
    try {
      const res = await fetch('/api/competitive/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitor_ids: [competitorId],
          refresh_scrape: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        
        // New async API returns job_id
        if (data.job_id) {
          startAnalysisPolling(data.job_id);
        } else if (data.id) {
          // Fallback for sync response
          setCurrentAnalysis(data);
          fetchAnalyses();
          setActiveTab('analyses');
        }
      } else {
        const error = await res.json();
        alert(error.detail || 'Analysis failed');
      }
    } catch (e) {
      console.error('Failed to generate analysis:', e);
    }
  };

  // Generate chart data from analysis
  const getRecommendationPriorities = () => {
    if (!currentAnalysis) return [];
    return currentAnalysis.recommendations.slice(0, 5).map((rec, i) => ({
      label: rec.split(':')[0].slice(0, 30) + (rec.length > 30 ? '...' : ''),
      value: 100 - (i * 15),
      color: i === 0 ? 'from-emerald-500 to-emerald-400' : 
             i === 1 ? 'from-blue-500 to-blue-400' :
             i === 2 ? 'from-purple-500 to-purple-400' :
             'from-slate-500 to-slate-400',
    }));
  };

  const getRadarDimensions = () => [
    { name: 'Products', comcast: 85, competitor: 75 },
    { name: 'Pricing', comcast: 70, competitor: 80 },
    { name: 'Innovation', comcast: 90, competitor: 70 },
    { name: 'Coverage', comcast: 80, competitor: 85 },
    { name: 'Support', comcast: 85, competitor: 70 },
    { name: 'Security', comcast: 95, competitor: 75 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ScaleIcon className="h-9 w-9 text-blue-400" />
            Competitive Intelligence
          </h1>
          <p className="text-slate-400 mt-1">
            Compare Comcast Business Enterprise against competitors
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleScrapeAll}
            disabled={scraping}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-5 w-5 ${scraping ? 'animate-spin' : ''}`} />
            {scraping ? 'Scraping...' : 'Refresh Data'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Add Competitor
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('compare')}
          className={`px-4 py-3 font-medium transition-colors relative ${
            activeTab === 'compare'
              ? 'text-blue-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <MagnifyingGlassIcon className="h-5 w-5" />
            Compare Competitors
          </div>
          {activeTab === 'compare' && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('analyses')}
          className={`px-4 py-3 font-medium transition-colors relative ${
            activeTab === 'analyses'
              ? 'text-blue-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5" />
            Analysis History
            {recentAnalyses.length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">
                {recentAnalyses.length}
              </span>
            )}
          </div>
          {activeTab === 'analyses' && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"
            />
          )}
        </button>
      </div>

      {/* Compare Tab */}
      {activeTab === 'compare' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Selection Controls */}
          <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <span className="text-slate-400">
                Selected: <span className="text-white font-medium">{selectedCompetitors.length}</span> competitors
              </span>
              <button
                onClick={selectAll}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                className="text-sm text-slate-400 hover:text-white"
              >
                Clear
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerateAnalysis}
                disabled={selectedCompetitors.length === 0 || analyzing || bulkAnalyzing}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5" />
                    Analyze Selected
                  </>
                )}
              </button>
              <button
                onClick={handleGenerateAllIndividualAnalyses}
                disabled={bulkAnalyzing || analyzing}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Generate individual Comcast vs. Competitor analysis for every competitor"
              >
                {bulkAnalyzing ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    {bulkProgress.current}/{bulkProgress.total}
                  </>
                ) : (
                  <>
                    <RocketLaunchIcon className="h-5 w-5" />
                    Analyze All (1-on-1)
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Bulk Analysis Progress Bar */}
          {bulkAnalyzing && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-emerald-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">
                  Generating Individual Analyses
                </span>
                <span className="text-sm text-slate-400">
                  {bulkProgress.current} of {bulkProgress.total}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-sm text-emerald-400">
                Analyzing: <span className="font-medium">{bulkProgress.currentName}</span> vs Comcast Business
              </p>
            </div>
          )}

          {/* Competitor Grid by Category */}
          <div className="space-y-6">
            {Object.entries(groupedCompetitors).map(([category, comps]) => {
              const Icon = categoryIcons[category] || BuildingOffice2Icon;
              const color = categoryColors[category] || 'slate';
              const catLabel = categories.find(c => c.value === category)?.label || category;

              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`h-5 w-5 text-${color}-400`} />
                    <h2 className="text-lg font-semibold text-white">{catLabel}</h2>
                    <span className={`px-2 py-0.5 text-xs rounded-full bg-${color}-500/20 text-${color}-400`}>
                      {comps.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {comps.map(comp => (
                      <motion.div
                        key={comp.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => toggleCompetitor(comp.id)}
                        className={`relative p-4 rounded-xl cursor-pointer transition-all border-2 ${
                          selectedCompetitors.includes(comp.id)
                            ? `border-${color}-500 bg-${color}-500/10`
                            : 'border-transparent bg-slate-800/50 hover:bg-slate-800'
                        }`}
                      >
                        {/* Selection indicator */}
                        <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedCompetitors.includes(comp.id)
                            ? `border-${color}-500 bg-${color}-500`
                            : 'border-slate-600'
                        }`}>
                          {selectedCompetitors.includes(comp.id) && (
                            <CheckCircleIcon className="h-4 w-4 text-white" />
                          )}
                        </div>

                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg bg-${color}-500/20`}>
                            <Icon className={`h-6 w-6 text-${color}-400`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white truncate">{comp.name}</h3>
                            {comp.ticker && (
                              <span className="text-xs text-slate-500">{comp.ticker}</span>
                            )}
                            <a
                              href={comp.business_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="block text-xs text-blue-400 hover:text-blue-300 truncate mt-1"
                            >
                              {comp.business_url}
                            </a>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="mt-3 flex items-center gap-2">
                          {comp.has_data ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-400">
                              <CheckCircleIcon className="h-4 w-4" />
                              Data ready
                            </span>
                          ) : comp.scrape_error ? (
                            <span className="flex items-center gap-1 text-xs text-red-400">
                              <ExclamationTriangleIcon className="h-4 w-4" />
                              Scrape failed
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <ClockIcon className="h-4 w-4" />
                              Not scraped
                            </span>
                          )}
                          {comp.last_scraped && (
                            <span className="text-xs text-slate-500">
                              {new Date(comp.last_scraped).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center gap-2">
                          {getAnalysisForCompetitor(comp.name) ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                viewCompetitorAnalysis(comp.name);
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                            >
                              <DocumentTextIcon className="h-3.5 w-3.5" />
                              View Analysis
                            </button>
                          ) : comp.has_data ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                quickAnalyzeCompetitor(comp.id);
                              }}
                              disabled={analyzing || bulkAnalyzing}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                            >
                              {analyzing ? (
                                <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <SparklesIcon className="h-3.5 w-3.5" />
                              )}
                              Analyze
                            </button>
                          ) : (
                            <span className="flex-1 text-center text-xs text-slate-500 py-1.5">
                              Scrape data first
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Analyses Tab */}
      {activeTab === 'analyses' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-4 gap-6"
        >
          {/* Analysis List */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Analyses</h2>
            {recentAnalyses.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-slate-800/50 rounded-xl">
                <ChartBarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No analyses yet</p>
                <p className="text-sm mt-1">Select competitors and generate an analysis</p>
              </div>
            ) : (
              recentAnalyses.map(a => (
                <motion.div
                  key={a.id}
                  whileHover={{ x: 4 }}
                  onClick={() => loadAnalysis(a.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-colors ${
                    currentAnalysis?.id === a.id
                      ? 'bg-blue-600/20 border border-blue-500/30'
                      : 'bg-slate-800/50 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <DocumentTextIcon className="h-4 w-4 text-blue-400" />
                    <span className="text-xs text-slate-400">
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {a.competitors_analyzed.slice(0, 2).map(name => (
                      <span
                        key={name}
                        className="px-2 py-0.5 text-xs rounded-full bg-slate-700 text-slate-300"
                      >
                        {name}
                      </span>
                    ))}
                    {a.competitors_analyzed.length > 2 && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-700 text-slate-400">
                        +{a.competitors_analyzed.length - 2}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300 line-clamp-2">
                    {a.executive_summary}
                  </p>
                </motion.div>
              ))
            )}
          </div>

          {/* Analysis Detail */}
          <div className="lg:col-span-3">
            {currentAnalysis ? (
              <div className="space-y-6">
                {/* Header with Stats */}
                <div className="bg-gradient-to-r from-blue-900/50 via-purple-900/40 to-slate-900/50 rounded-2xl p-6 border border-blue-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <TrophyIcon className="h-7 w-7 text-amber-400" />
                        Competitive Analysis Report
                      </h2>
                      <p className="text-slate-400 mt-1">
                        Generated {new Date(currentAnalysis.created_at).toLocaleDateString()} • {currentAnalysis.llm_model}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-wrap gap-2">
                        {currentAnalysis.competitors_analyzed.map(name => (
                          <span
                            key={name}
                            className="px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-300 text-sm font-medium border border-blue-500/30"
                          >
                            vs {name}
                          </span>
                        ))}
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => generateCompetitiveAnalysisPDF(currentAnalysis)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-amber-500/25 transition-shadow"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                        Download PDF
                      </motion.button>
                    </div>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <StatCard
                      icon={RocketLaunchIcon}
                      label="Opportunities"
                      value={currentAnalysis.opportunities.length}
                      trend="up"
                      color="cyan"
                    />
                    <StatCard
                      icon={ShieldExclamationIcon}
                      label="Threats"
                      value={currentAnalysis.threats.length}
                      trend="down"
                      color="red"
                    />
                    <StatCard
                      icon={LightBulbIcon}
                      label="Recommendations"
                      value={currentAnalysis.recommendations.length}
                      color="emerald"
                    />
                    <StatCard
                      icon={BuildingOffice2Icon}
                      label="Competitors"
                      value={currentAnalysis.competitors_analyzed.length}
                      color="purple"
                    />
                  </div>
                </div>

                {/* Executive Summary */}
                <EnhancedAnalysisSection
                  title="Executive Summary"
                  icon={SparklesIcon}
                  color="blue"
                  isExpanded={expandedSections.summary}
                  onToggle={() => toggleSection('summary')}
                  badge={<span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">Key Insight</span>}
                >
                  <div className="bg-gradient-to-r from-blue-900/20 to-transparent rounded-lg p-4 border-l-4 border-blue-500">
                    <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {currentAnalysis.executive_summary}
                    </p>
                  </div>
                </EnhancedAnalysisSection>

                {/* Charts Section */}
                <EnhancedAnalysisSection
                  title="Visual Analytics"
                  icon={ChartBarIcon}
                  color="purple"
                  isExpanded={expandedSections.charts}
                  onToggle={() => toggleSection('charts')}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <DonutChart 
                      opportunities={currentAnalysis.opportunities.length}
                      threats={currentAnalysis.threats.length}
                    />
                    <CompetitiveRadar dimensions={getRadarDimensions()} />
                    <div className="lg:col-span-2">
                      <HorizontalBarChart
                        items={getRecommendationPriorities()}
                        title="Strategic Priority Score"
                        icon={BoltIcon}
                      />
                    </div>
                  </div>
                </EnhancedAnalysisSection>

                {/* Product Comparison */}
                {currentAnalysis.product_comparison && (
                  <EnhancedAnalysisSection
                    title="Product & Service Comparison"
                    icon={ScaleIcon}
                    color="amber"
                    isExpanded={expandedSections.products}
                    onToggle={() => toggleSection('products')}
                    badge={
                      <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">
                        vs {currentAnalysis.competitors_analyzed[0] || 'Competitor'}
                      </span>
                    }
                  >
                    <ComparisonTable 
                      content={currentAnalysis.product_comparison}
                      competitorName={currentAnalysis.competitors_analyzed[0]}
                    />
                  </EnhancedAnalysisSection>
                )}

                {/* Strategic Recommendations */}
                <EnhancedAnalysisSection
                  title="Strategic Recommendations"
                  icon={LightBulbIcon}
                  color="emerald"
                  isExpanded={expandedSections.recommendations}
                  onToggle={() => toggleSection('recommendations')}
                  badge={
                    <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
                      {currentAnalysis.recommendations.length > 7 ? '7 Priority' : currentAnalysis.recommendations.length} Actions
                    </span>
                  }
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {currentAnalysis.recommendations.slice(0, 7).map((rec, i) => (
                      <RecommendationCard key={i} rec={rec} index={i} />
                    ))}
                  </div>
                  {currentAnalysis.recommendations.length > 7 && (
                    <p className="text-slate-500 text-sm mt-4 text-center">
                      Showing top 7 of {currentAnalysis.recommendations.length} recommendations
                    </p>
                  )}
                </EnhancedAnalysisSection>

                {/* Opportunities */}
                <EnhancedAnalysisSection
                  title="Growth Opportunities"
                  icon={RocketLaunchIcon}
                  color="cyan"
                  isExpanded={expandedSections.opportunities}
                  onToggle={() => toggleSection('opportunities')}
                  badge={<span className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-400">{currentAnalysis.opportunities.length}</span>}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentAnalysis.opportunities.map((opp, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-4 bg-gradient-to-br from-cyan-900/20 to-slate-800/50 rounded-xl border border-cyan-500/20"
                      >
                        <div className="flex items-start gap-3">
                          <CheckCircleSolid className="h-6 w-6 text-cyan-400 flex-shrink-0" />
                          <p className="text-slate-200">{opp}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </EnhancedAnalysisSection>

                {/* Threats */}
                <EnhancedAnalysisSection
                  title="Competitive Threats"
                  icon={ShieldExclamationIcon}
                  color="red"
                  isExpanded={expandedSections.threats}
                  onToggle={() => toggleSection('threats')}
                  badge={<span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">{currentAnalysis.threats.length}</span>}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentAnalysis.threats.map((threat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-4 bg-gradient-to-br from-red-900/20 to-slate-800/50 rounded-xl border border-red-500/20"
                      >
                        <div className="flex items-start gap-3">
                          <ExclamationTriangleIcon className="h-6 w-6 text-red-400 flex-shrink-0" />
                          <p className="text-slate-200">{threat}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </EnhancedAnalysisSection>

                {/* Full Analysis */}
                <EnhancedAnalysisSection
                  title="Full Analysis Report"
                  icon={DocumentTextIcon}
                  color="slate"
                  isExpanded={expandedSections.full}
                  onToggle={() => toggleSection('full')}
                  badge={
                    <span className="px-2 py-0.5 text-xs rounded-full bg-slate-500/20 text-slate-400">
                      Complete Report
                    </span>
                  }
                >
                  <FormattedAnalysisText content={currentAnalysis.full_analysis} />
                </EnhancedAnalysisSection>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center bg-slate-800/30 rounded-2xl">
                <ScaleIcon className="h-16 w-16 text-slate-600 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Select an Analysis
                </h3>
                <p className="text-slate-400 max-w-md">
                  Choose an analysis from the list or generate a new one by selecting competitors in the Compare tab.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Add Competitor Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Add Competitor</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 hover:bg-slate-700 rounded-lg"
                >
                  <XMarkIcon className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={newCompetitor.name}
                    onChange={(e) => setNewCompetitor(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., AT&T Business"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Business Services URL *
                  </label>
                  <input
                    type="url"
                    value={newCompetitor.business_url}
                    onChange={(e) => setNewCompetitor(prev => ({ ...prev, business_url: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://business.example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Stock Ticker
                    </label>
                    <input
                      type="text"
                      value={newCompetitor.ticker}
                      onChange={(e) => setNewCompetitor(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., T"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={newCompetitor.category}
                      onChange={(e) => setNewCompetitor(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCompetitor}
                  disabled={!newCompetitor.name || !newCompetitor.business_url}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors disabled:opacity-50"
                >
                  Add Competitor
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <HelpSection
        title="Competitive Intelligence"
        description="Compare Comcast Business against competitors across categories (Telco, Cable, Fiber, Cloud, UCaaS, SD-WAN/SASE, etc.). The platform scrapes competitor websites and uses AI to generate comprehensive competitive analysis with strategic recommendations."
        publicDataSources={[
          { label: 'Competitor Websites', description: 'Scraped product/service pages for positioning analysis' },
          { label: 'SEC Filings', description: '10-K/10-Q reports for financials and strategy' },
          { label: 'Earnings Transcripts', description: 'Management commentary and guidance' },
          { label: 'Industry Reports', description: 'Analyst coverage and market share data' },
        ]}
        cbDataBenefits={[
          'Product portfolio comparison with your actual offerings',
          'Competitive positioning relative to your strengths',
          'Recommendations tailored to your market position',
          'Threat assessment based on your segment focus',
        ]}
        proprietaryDataBenefits={[
          'Win/loss data from Dynamics CRM',
          'Displacement patterns by competitor',
          'Pricing intelligence from won/lost deals',
          'Competitive mentions from ServiceNow tickets',
          'Sales objection patterns from call recordings',
        ]}
        tips={[
          'Click "Analyze" on any competitor card to generate 1-on-1 analysis',
          '"Scrape All" updates website data for all active competitors',
          'Download analyses as PDF for executive presentations',
          'Add custom competitors using the "Add Competitor" button',
        ]}
      />
      
      {/* Job Progress Toast */}
      <JobProgressToast
        isVisible={analyzing}
        title="Generating Competitive Analysis"
        progress={analysisProgress}
        progressMessage={analysisProgressMessage}
        status={analyzing ? 'in_progress' : null}
        error={analysisError}
        onDismiss={resetAnalysisPolling}
      />
    </div>
  );
}

export default CompetitiveIntel;
