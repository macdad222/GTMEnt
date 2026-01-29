# Enterprise Strategy Playbook Platform

A role-based platform for Comcast Business executives to generate BCG/Altman-style enterprise strategy decks and segment playbooks. Built to support the **15% annual Enterprise growth target** over 5 years.

## Overview

This platform provides:

- **Market Intelligence**: TAM/SAM/SOM analysis by segment and solution area, with market trends and explicit assumptions
- **Segment Analysis**: MRR-tier segmentation (E1–E5) with growth potential, churn risk, and attach propensity scoring
- **Playbook Generation**: Consulting-style strategy decks with evidence panels, citations, and LLM-assisted drafting
- **Export Capabilities**: One-click PPT/PDF deck generation with appendix
- **Experiment Tracking**: A/B testing framework to measure playbook lift and attribute growth

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+ (for frontend)
- PostgreSQL (optional, for production)

### Docker Setup (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up --build
```

The app will be available at `http://localhost:3700`

### Local Development Setup

#### Backend

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp env.example .env
# Edit .env with your settings

# Run the API server
python main.py
```

The API will be available at `http://localhost:3700/api/docs`

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The UI will be available at `http://localhost:3000`

## Architecture

```
src/
├── api/                 # FastAPI application
│   ├── app.py          # Application factory
│   └── routes.py       # API endpoints
├── knowledge_base/      # Public source ingestion
│   ├── models.py       # Source, Chunk, Citation
│   ├── ingestion.py    # SEC EDGAR, Comcast Business site
│   └── vector_store.py # ChromaDB for RAG
├── market_intel/        # TAM/trends analysis
│   ├── models.py       # MarketModel, TAMEstimate, Trend
│   ├── public_sources.py
│   └── tam_calculator.py
├── data_model/          # Unified customer model
│   ├── models.py       # Account, Opportunity, etc.
│   ├── semantic_layer.py # KPI definitions
│   └── identity_resolution.py
├── segmentation/        # MRR-tier classification
│   ├── mrr_tier.py
│   ├── scoring.py      # Growth, churn, attach scores
│   └── views.py        # Segment summaries
├── playbook/            # Playbook generation
│   ├── models.py       # Playbook, Section, Version
│   ├── templates.py    # Template registry
│   ├── generator.py    # Orchestration
│   └── llm_assistant.py
├── export/              # Deck generation
│   ├── pptx_generator.py
│   └── pdf_generator.py
└── measurement/         # Experiment tracking
    ├── models.py
    ├── tracker.py
    └── analyzer.py
```

## Segment Tiers

| Tier | MRR Range | Description |
|------|-----------|-------------|
| E1 | $1.5k–$10k | Entry enterprise: small multi-site |
| E2 | $10k–$50k | Mid-market: regional multi-site |
| E3 | $50k–$250k | Upper mid-market: national presence |
| E4 | $250k–$1M | Large enterprise: significant footprint |
| E5 | $1M+ | Strategic: Fortune 500 / major accounts |

## Key KPIs

- **Growth**: New Logo ARR, Expansion ARR, NRR
- **Retention**: GRR, Gross Churn Rate
- **Efficiency**: Sales Cycle Days, Quote-to-Cash Days, Win Rate
- **Attach**: SD-WAN Attach Rate, SASE Attach Rate
- **Health**: Bandwidth Utilization, Incident Rate

## First 10 Workflows (Growth Acceleration)

1. Account_plan_in_15min (Dynamics)
2. Lead_to_account_matching_and_routing (Marketing→Dynamics)
3. Meeting_to_next_steps (Dynamics)
4. Opportunity_risk_radar (Dynamics)
5. Proposal_RFP_response (Docs + Dynamics)
6. Quote_build_and_approve (Orion)
7. Order_completeness_gate (Orion→ServiceNow)
8. Provisioning_status_proactive_updates (ServiceNow)
9. Config_change_fast_path (IVR/ServiceNow)
10. Renewal_expansion_trigger_engine (Dynamics + telemetry)

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/dashboard` | Executive dashboard summary |
| `GET /api/market/model` | Market model with TAM/trends |
| `GET /api/segments` | List enterprise segments |
| `GET /api/playbooks` | List playbooks |
| `POST /api/playbooks/generate/enterprise-strategy` | Generate strategy deck |
| `POST /api/playbooks/generate/segment/{tier}` | Generate segment playbook |
| `POST /api/export` | Export playbook to PPTX/PDF |
| `GET /api/kpis` | KPI definitions |

## Data Sources

### Public (MVP)
- SEC EDGAR (10-K filings)
- Comcast Business website (product pages)
- Government data (Census, FCC, BLS)

### Internal (Phase 1)
- Dynamics (CRM)
- Orion (CPQ)
- ServiceNow (Ticketing)
- Google IVR (Contact Center)
- Billing/RevOps
- Network telemetry

## Governance

- **Role-based access control**: Exec, Segment Leader, Sales Leader, Analyst
- **Market data governance**: Source allowlist, citation requirements
- **AI guardrails**: Human accountability, policy checks, audit trails
- **Playbook approval workflow**: Draft → Review → Approved

## License

Proprietary - Comcast Business Internal Use Only

