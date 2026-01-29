import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

// Color palette
const colors = {
  primary: [30, 64, 175] as [number, number, number], // Blue-800
  secondary: [99, 102, 241] as [number, number, number], // Indigo-500
  accent: [245, 158, 11] as [number, number, number], // Amber-500
  success: [16, 185, 129] as [number, number, number], // Emerald-500
  danger: [239, 68, 68] as [number, number, number], // Red-500
  dark: [15, 23, 42] as [number, number, number], // Slate-900
  light: [241, 245, 249] as [number, number, number], // Slate-100
  white: [255, 255, 255] as [number, number, number],
  gray: [100, 116, 139] as [number, number, number], // Slate-500
};

function parseMarkdownTable(text: string): { headers: string[]; rows: string[][] } | null {
  const lines = text.trim().split('\n');
  if (lines.length < 3) return null;
  
  const parseRow = (line: string): string[] => {
    return line
      .split('|')
      .map(cell => cell.trim().replace(/\*\*/g, ''))
      .filter(cell => cell && !cell.match(/^[-:]+$/));
  };
  
  const headerIdx = lines.findIndex(line => line.includes('|'));
  if (headerIdx === -1) return null;
  
  const headers = parseRow(lines[headerIdx]);
  if (headers.length < 2) return null;
  
  const separatorIdx = lines.findIndex((line, i) => i > headerIdx && /^[-:\s|]+$/.test(line.replace(/\|/g, '').trim()));
  if (separatorIdx === -1) return null;
  
  const rows = lines
    .slice(separatorIdx + 1)
    .filter(line => line.includes('|'))
    .map(parseRow)
    .filter(row => row.length > 0);
  
  return { headers, rows };
}

function parseRecommendation(rec: string): { title: string; details: string[] } {
  const lines = rec.split('\n').filter(l => l.trim());
  const titleMatch = lines[0]?.match(/^\*?\*?\[?\d+\]?\*?\*?\s*\*?\*?(.+)/);
  const title = titleMatch ? titleMatch[1].trim().replace(/\*\*/g, '') : lines[0] || '';
  const details = lines.slice(1).map(l => l.trim());
  return { title, details };
}

export function generateCompetitiveAnalysisPDF(analysis: Analysis): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // Helper functions
  const addNewPage = () => {
    doc.addPage();
    yPos = margin;
  };

  const checkPageBreak = (neededHeight: number) => {
    if (yPos + neededHeight > pageHeight - margin) {
      addNewPage();
      return true;
    }
    return false;
  };

  const drawGradientHeader = () => {
    // Dark header background
    doc.setFillColor(...colors.dark);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    // Accent line
    doc.setFillColor(...colors.accent);
    doc.rect(0, 50, pageWidth, 2, 'F');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // COVER PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  
  drawGradientHeader();
  
  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...colors.white);
  doc.text('Competitive Intelligence', margin, 35);
  
  // Subtitle
  doc.setFontSize(14);
  doc.setTextColor(...colors.accent);
  doc.text('Strategic Analysis Report', margin, 43);
  
  yPos = 70;
  
  // Competitors analyzed box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos, contentWidth, 30, 3, 3, 'F');
  doc.setDrawColor(...colors.secondary);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, contentWidth, 30, 3, 3, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...colors.gray);
  doc.text('COMPETITORS ANALYZED', margin + 5, yPos + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.setTextColor(...colors.dark);
  doc.text(analysis.competitors_analyzed.join(' vs '), margin + 5, yPos + 22);
  
  yPos += 45;
  
  // Report info
  doc.setFillColor(...colors.light);
  doc.roundedRect(margin, yPos, contentWidth / 2 - 5, 25, 3, 3, 'F');
  doc.roundedRect(margin + contentWidth / 2 + 5, yPos, contentWidth / 2 - 5, 25, 3, 3, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...colors.gray);
  doc.text('GENERATED', margin + 5, yPos + 8);
  doc.text('AI MODEL', margin + contentWidth / 2 + 10, yPos + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...colors.dark);
  doc.text(new Date(analysis.created_at).toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }), margin + 5, yPos + 18);
  doc.text(`${analysis.llm_provider} / ${analysis.llm_model}`, margin + contentWidth / 2 + 10, yPos + 18);
  
  yPos += 40;
  
  // Executive Summary
  doc.setFillColor(...colors.primary);
  doc.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...colors.white);
  doc.text('EXECUTIVE SUMMARY', margin + 5, yPos + 5.5);
  
  yPos += 12;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...colors.dark);
  const summaryLines = doc.splitTextToSize(analysis.executive_summary, contentWidth - 10);
  doc.text(summaryLines, margin + 5, yPos + 5);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCT COMPARISON PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (analysis.product_comparison) {
    addNewPage();
    
    // Section header
    doc.setFillColor(...colors.accent);
    doc.rect(0, 0, pageWidth, 3, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...colors.dark);
    doc.text('Product & Service Comparison', margin, yPos + 10);
    
    yPos += 20;
    
    const tableData = parseMarkdownTable(analysis.product_comparison);
    if (tableData) {
      autoTable(doc, {
        startY: yPos,
        head: [tableData.headers],
        body: tableData.rows,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 4,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: colors.primary,
          textColor: colors.white,
          fontStyle: 'bold',
          fontSize: 9,
        },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: colors.accent, cellWidth: 35 },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: margin, right: margin },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STRATEGIC RECOMMENDATIONS PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (analysis.recommendations.length > 0) {
    addNewPage();
    
    doc.setFillColor(...colors.success);
    doc.rect(0, 0, pageWidth, 3, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...colors.dark);
    doc.text('Strategic Recommendations', margin, yPos + 10);
    
    yPos += 20;
    
    analysis.recommendations.slice(0, 7).forEach((rec, i) => {
      checkPageBreak(40);
      
      const parsed = parseRecommendation(rec);
      
      // Number badge
      doc.setFillColor(...colors.success);
      doc.circle(margin + 5, yPos + 5, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...colors.white);
      doc.text(String(i + 1), margin + 3.5, yPos + 7);
      
      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...colors.dark);
      const titleLines = doc.splitTextToSize(parsed.title, contentWidth - 20);
      doc.text(titleLines, margin + 15, yPos + 6);
      
      yPos += 10 + (titleLines.length - 1) * 5;
      
      // Details
      if (parsed.details.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...colors.gray);
        parsed.details.forEach(detail => {
          const detailLines = doc.splitTextToSize(detail, contentWidth - 25);
          doc.text(detailLines, margin + 15, yPos + 3);
          yPos += detailLines.length * 4 + 2;
        });
      }
      
      yPos += 8;
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // OPPORTUNITIES & THREATS PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  
  addNewPage();
  
  // Opportunities
  doc.setFillColor(...colors.secondary);
  doc.rect(0, 0, pageWidth, 3, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...colors.dark);
  doc.text('Opportunities', margin, yPos + 10);
  
  yPos += 18;
  
  analysis.opportunities.slice(0, 5).forEach((opp) => {
    checkPageBreak(20);
    
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(margin, yPos, contentWidth, 15, 2, 2, 'F');
    doc.setDrawColor(...colors.success);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, yPos, contentWidth, 15, 2, 2, 'S');
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...colors.dark);
    const oppLines = doc.splitTextToSize(opp, contentWidth - 15);
    doc.text(oppLines.slice(0, 2).join(' '), margin + 5, yPos + 9);
    
    yPos += 18;
  });
  
  yPos += 10;
  checkPageBreak(60);
  
  // Threats
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...colors.dark);
  doc.text('Competitive Threats', margin, yPos + 10);
  
  yPos += 18;
  
  analysis.threats.slice(0, 5).forEach((threat) => {
    checkPageBreak(20);
    
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin, yPos, contentWidth, 15, 2, 2, 'F');
    doc.setDrawColor(...colors.danger);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, yPos, contentWidth, 15, 2, 2, 'S');
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...colors.dark);
    const threatLines = doc.splitTextToSize(threat, contentWidth - 15);
    doc.text(threatLines.slice(0, 2).join(' '), margin + 5, yPos + 9);
    
    yPos += 18;
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER ON ALL PAGES
  // ═══════════════════════════════════════════════════════════════════════════
  
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(...colors.light);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    // Footer text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...colors.gray);
    doc.text('Comcast Business Enterprise | Competitive Intelligence Report', margin, pageHeight - 10);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════════════════════════════════════════
  
  const filename = `Competitive_Analysis_${analysis.competitors_analyzed.join('_vs_').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}


// ═══════════════════════════════════════════════════════════════════════════════
// MARKET INTELLIGENCE PDF GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

interface MarketResearch {
  id: string;
  generated_at: string;
  llm_provider: string;
  llm_model: string;
  research: {
    research_date?: string;
    executive_summary?: string;
    tam_data?: Array<{
      market: string;
      tam_usd_billions: number;
      tam_year: number;
      growth_rate_cagr: string;
      forecast_year?: number;
      source: string;
      source_url?: string;
      source_date?: string;
      methodology?: string;
      confidence?: string;
      notes?: string;
    }>;
    market_trends?: Array<{
      trend: string;
      description: string;
      impact?: string;
      direction?: string;
      growth_rate?: string;
      source?: string;
      source_date?: string;
      implications_for_comcast?: string;
    }>;
    competitive_landscape?: {
      summary?: string;
      key_players?: string[];
      market_concentration?: string;
      source?: string;
    };
    assumptions?: Array<{
      assumption: string;
      value: string;
      source?: string;
      source_url?: string;
    }>;
    footnotes?: Array<{
      id: number;
      citation: string;
      url?: string;
      accessed_date?: string;
    }>;
  };
}

export function generateMarketIntelPDF(research: MarketResearch): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  const addNewPage = () => {
    doc.addPage();
    yPos = margin;
  };

  const checkPageBreak = (neededHeight: number) => {
    if (yPos + neededHeight > pageHeight - margin - 15) {
      addNewPage();
      return true;
    }
    return false;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // COVER PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Dark header background
  doc.setFillColor(...colors.dark);
  doc.rect(0, 0, pageWidth, 55, 'F');
  
  // Accent line
  doc.setFillColor(...colors.primary);
  doc.rect(0, 55, pageWidth, 3, 'F');
  
  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(...colors.white);
  doc.text('Market Intelligence', margin, 35);
  
  // Subtitle
  doc.setFontSize(14);
  doc.setTextColor(...colors.accent);
  doc.text('Enterprise Telecommunications TAM Analysis', margin, 47);
  
  yPos = 75;
  
  // Report metadata
  doc.setFillColor(...colors.light);
  doc.roundedRect(margin, yPos, contentWidth, 25, 3, 3, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...colors.gray);
  doc.text('GENERATED BY', margin + 5, yPos + 8);
  doc.text('DATE', margin + contentWidth / 2, yPos + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...colors.dark);
  doc.text(`${research.llm_provider} / ${research.llm_model}`, margin + 5, yPos + 18);
  doc.text(new Date(research.generated_at).toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric'
  }), margin + contentWidth / 2, yPos + 18);
  
  yPos += 40;
  
  // Executive Summary
  if (research.research?.executive_summary) {
    doc.setFillColor(...colors.primary);
    doc.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...colors.white);
    doc.text('EXECUTIVE SUMMARY', margin + 5, yPos + 5.5);
    
    yPos += 12;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...colors.dark);
    const summaryLines = doc.splitTextToSize(research.research.executive_summary, contentWidth - 10);
    doc.text(summaryLines.slice(0, 15), margin + 5, yPos + 5);
    yPos += summaryLines.slice(0, 15).length * 5 + 10;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TAM DATA PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (research.research?.tam_data && research.research.tam_data.length > 0) {
    addNewPage();
    
    // Section header
    doc.setFillColor(...colors.accent);
    doc.rect(0, 0, pageWidth, 3, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...colors.dark);
    doc.text('Total Addressable Market (TAM)', margin, yPos + 10);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...colors.gray);
    doc.text('US Enterprise Market - All figures in USD billions', margin, yPos + 18);
    
    yPos += 28;
    
    // TAM Table
    const tamHeaders = ['Market Segment', 'TAM ($B)', 'CAGR', 'Confidence', 'Source'];
    const tamRows = research.research.tam_data.map(t => [
      t.market,
      `$${t.tam_usd_billions}B`,
      t.growth_rate_cagr || 'N/A',
      t.confidence || 'Medium',
      t.source?.substring(0, 30) + (t.source && t.source.length > 30 ? '...' : '') || 'N/A',
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [tamHeaders],
      body: tamRows,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 4,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: colors.primary,
        textColor: colors.white,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { halign: 'right', cellWidth: 25 },
        2: { halign: 'center', cellWidth: 25 },
        3: { halign: 'center', cellWidth: 25 },
        4: { cellWidth: 45 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: margin, right: margin },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // TAM Details
    checkPageBreak(80);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...colors.dark);
    doc.text('Detailed Market Breakdowns', margin, yPos);
    yPos += 8;
    
    research.research.tam_data.forEach((tam) => {
      checkPageBreak(35);
      
      // Market card
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, yPos, contentWidth, 28, 2, 2, 'F');
      doc.setDrawColor(...colors.secondary);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, yPos, contentWidth, 28, 2, 2, 'S');
      
      // Market name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...colors.dark);
      doc.text(tam.market, margin + 5, yPos + 7);
      
      // TAM amount
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...colors.primary);
      doc.text(`$${tam.tam_usd_billions}B`, margin + contentWidth - 40, yPos + 7);
      
      // Details
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...colors.gray);
      
      const detailsLine1 = `CAGR: ${tam.growth_rate_cagr || 'N/A'} | Year: ${tam.tam_year} | Confidence: ${tam.confidence || 'Medium'}`;
      doc.text(detailsLine1, margin + 5, yPos + 14);
      
      const sourceLine = `Source: ${tam.source || 'N/A'}${tam.source_date ? ` (${tam.source_date})` : ''}`;
      const sourceLines = doc.splitTextToSize(sourceLine, contentWidth - 10);
      doc.text(sourceLines[0], margin + 5, yPos + 20);
      
      if (tam.methodology) {
        const methodLines = doc.splitTextToSize(`Methodology: ${tam.methodology}`, contentWidth - 10);
        doc.text(methodLines[0], margin + 5, yPos + 25);
      }
      
      yPos += 32;
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MARKET TRENDS PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (research.research?.market_trends && research.research.market_trends.length > 0) {
    addNewPage();
    
    doc.setFillColor(...colors.success);
    doc.rect(0, 0, pageWidth, 3, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...colors.dark);
    doc.text('Market Trends & Dynamics', margin, yPos + 10);
    yPos += 20;
    
    research.research.market_trends.forEach((trend) => {
      checkPageBreak(40);
      
      // Trend card
      const impactColor = trend.impact === 'high' ? colors.danger : 
                         trend.impact === 'medium' ? colors.accent : colors.success;
      
      doc.setFillColor(...colors.light);
      doc.roundedRect(margin, yPos, contentWidth, 35, 2, 2, 'F');
      
      // Impact indicator
      doc.setFillColor(...impactColor);
      doc.rect(margin, yPos, 4, 35, 'F');
      
      // Trend title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...colors.dark);
      const trendTitleLines = doc.splitTextToSize(trend.trend, contentWidth - 70);
      doc.text(trendTitleLines[0], margin + 8, yPos + 8);
      
      // Impact badge
      doc.setFillColor(...impactColor);
      doc.roundedRect(margin + contentWidth - 35, yPos + 3, 30, 8, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...colors.white);
      doc.text((trend.impact || 'medium').toUpperCase(), margin + contentWidth - 32, yPos + 8);
      
      // Description
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...colors.gray);
      const descLines = doc.splitTextToSize(trend.description, contentWidth - 20);
      doc.text(descLines.slice(0, 2), margin + 8, yPos + 16);
      
      // Implications
      if (trend.implications_for_comcast) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(...colors.primary);
        const impLines = doc.splitTextToSize(`→ ${trend.implications_for_comcast}`, contentWidth - 20);
        doc.text(impLines[0], margin + 8, yPos + 30);
      }
      
      yPos += 40;
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SOURCES & FOOTNOTES PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (research.research?.footnotes && research.research.footnotes.length > 0) {
    addNewPage();
    
    doc.setFillColor(...colors.gray);
    doc.rect(0, 0, pageWidth, 3, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...colors.dark);
    doc.text('Sources & Citations', margin, yPos + 10);
    yPos += 20;
    
    research.research.footnotes.forEach((footnote) => {
      checkPageBreak(20);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...colors.primary);
      doc.text(`[${footnote.id}]`, margin, yPos);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...colors.dark);
      const citationLines = doc.splitTextToSize(footnote.citation, contentWidth - 15);
      doc.text(citationLines, margin + 10, yPos);
      
      yPos += citationLines.length * 4 + 2;
      
      if (footnote.url) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...colors.secondary);
        const urlLines = doc.splitTextToSize(footnote.url, contentWidth - 15);
        doc.text(urlLines[0], margin + 10, yPos);
        yPos += 5;
      }
      
      yPos += 5;
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ASSUMPTIONS PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (research.research?.assumptions && research.research.assumptions.length > 0) {
    checkPageBreak(60);
    
    if (yPos < 50) {
      // Already on a new page
    } else {
      addNewPage();
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...colors.dark);
    doc.text('Key Assumptions', margin, yPos + 10);
    yPos += 18;
    
    const assumptionHeaders = ['Assumption', 'Value', 'Source'];
    const assumptionRows = research.research.assumptions.map(a => [
      a.assumption,
      a.value,
      a.source || 'Internal estimate',
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [assumptionHeaders],
      body: assumptionRows,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 4,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: colors.gray,
        textColor: colors.white,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 60 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: margin, right: margin },
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER ON ALL PAGES
  // ═══════════════════════════════════════════════════════════════════════════
  
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(...colors.light);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    // Footer text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...colors.gray);
    doc.text('Comcast Business Enterprise | Market Intelligence Report', margin, pageHeight - 10);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
    
    // Disclaimer
    if (i === pageCount) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.text('Note: Market data sourced from public reports and LLM analysis. Verify figures before strategic decisions.', margin, pageHeight - 5);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════════════════════════════════════════
  
  const filename = `Market_Intelligence_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

