# Enterprise Strategy Platform v0.9

A BCG/Bain-quality strategic analysis platform for Comcast Business Enterprise executives. Combines public market intelligence, internal business data, competitive analysis, and AI-powered insights to support growth from **$4B ARR at 14%** to **15%+ annual growth**.

## Features

### 🎯 Core Capabilities

| Feature | Description |
|---------|-------------|
| **Dashboard** | Executive KPIs, growth trajectory, segment health |
| **Strategy Report** | Comprehensive BCG-style strategy document with PDF export |
| **Customer Segments** | E1-E5 tier analysis with AI-generated market intelligence |
| **MSA Markets** | Top 50 US metros with sales capacity planning & LLM analysis |
| **Competitive Intel** | Web scraping + AI analysis vs 30+ competitors |
| **Market Intel** | TAM/SAM research with footnoted sources |
| **Product Roadmap** | Portfolio competitiveness & roadmap recommendations |
| **Q&A Insights** | Ask strategic questions, get AI-powered answers |
| **Voice AI Advisor** | Real-time conversational AI using Grok (xAI) |

### 🤖 AI-Powered Analysis

- **LLM Integration**: xAI Grok, OpenAI GPT-4, Anthropic Claude
- **Voice AI Agent**: Real-time voice conversations using Grok Realtime API
- **Competitive Analysis**: Automated website scraping with LLM synthesis
- **Market Research**: AI-generated research with cited sources
- **Strategy Synthesis**: BCG-quality insights from all data sources

## Quick Start

### Prerequisites

- Docker & Docker Compose
- 4GB+ RAM
- LLM API key (xAI Grok recommended)

### Docker Deployment (Recommended)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/GTMEnt.git
cd GTMEnt

# Build and run
docker-compose up --build -d

# View logs
docker logs -f gtm-enterprise-platform
```

The app will be available at `http://localhost:3700`

### Initial Configuration

1. Navigate to `http://localhost:3700`
2. Login with default credentials: `admin` / `admin`
3. Change your password when prompted
4. Go to **Settings** → Configure your LLM API key (xAI Grok recommended)
5. Go to **Settings** → Update CB Data with your enterprise metrics

## Architecture

```
GTMEnt/
├── src/                          # Python Backend (FastAPI)
│   ├── api/                      # Main API application
│   ├── admin/                    # Admin configuration & user management
│   ├── cb_config/                # Comcast Business configuration
│   ├── competitive/              # Competitive intelligence service
│   ├── insights/                 # Q&A insights service
│   ├── jobs/                     # Background job queue
│   ├── market_intel/             # Market research & data fetching
│   ├── product_roadmap/          # Product analysis service
│   ├── segments/                 # Segment & MSA analysis
│   ├── strategy_report/          # Strategy report generation
│   └── voice/                    # Voice AI WebSocket proxy
│
├── frontend/                     # React/TypeScript Frontend
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   ├── context/              # React contexts (auth, config, voice)
│   │   ├── lib/voice-agent/      # Voice AI client implementations
│   │   └── pages/                # Page components
│   └── package.json
│
├── docker-compose.yml            # Docker orchestration
├── Dockerfile                    # Multi-stage build
└── requirements.txt              # Python dependencies
```

## Data Persistence

All data is persisted in `/app/data` (Docker volume: `gtm-app-data`):

| File | Description |
|------|-------------|
| `admin_config.json` | API keys, users, voice settings |
| `cb_config.json` | Company metrics, segment config |
| `competitive_analyses.json` | All competitive LLM analyses |
| `competitors.json` | Scraped competitor data |
| `msa_intel.json` | MSA market intelligence (48 MSAs) |
| `segment_intel.json` | Segment LLM analyses |
| `strategy_reports.json` | Generated strategy reports |
| `product_roadmap_intel.json` | Product roadmap analysis |
| `insights.json` | Q&A conversation history |
| `public_data_cache.json` | Cached public data sources |
| `job_queue.json` | Background job tracking |

## Segment Tiers

| Tier | Alias | MRR Range | Description |
|------|-------|-----------|-------------|
| E1 | Enterprise Mid-Market | $1.5k–$10k | Entry enterprise, small multi-site |
| E2 | Enterprise Small | $10k–$50k | Regional multi-site |
| E3 | Enterprise Medium | $50k–$250k | National presence |
| E4 | Enterprise Large | $250k–$1M | Significant footprint |
| E5 | Enterprise X-Large | $1M+ | Fortune 500 / strategic accounts |

## API Endpoints

### Core APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/health` | GET | Health check |
| `/api/dashboard/summary` | GET | Executive dashboard data |
| `/api/cb-config` | GET/PUT | Company configuration |
| `/api/segments` | GET | Segment list with metrics |
| `/api/msas` | GET | MSA list with filters |
| `/api/competitive/analyses` | GET | Competitive analysis list |
| `/api/market-intel/research` | GET | Market research data |
| `/api/strategy-report` | GET/POST | Strategy report |

### LLM Analysis APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/msas/intel/generate-all` | POST | Generate all MSA intel (batch) |
| `/api/msas/{code}/intel/generate` | POST | Generate single MSA intel |
| `/api/competitive/analyze` | POST | Run competitive analysis |
| `/api/cb-config/segments/{tier}/intel/generate` | POST | Generate segment intel |
| `/api/product-roadmap/intel/generate` | POST | Generate product analysis |

### Voice AI

| Endpoint | Type | Description |
|----------|------|-------------|
| `/api/voice/grok` | WebSocket | Grok realtime voice proxy |

## Production Deployment

### Cloudflare Tunnel Setup

1. Install cloudflared on your server
2. Create tunnel: `cloudflared tunnel create gtm-enterprise`
3. Configure tunnel to point to `http://localhost:3700`
4. Run: `cloudflared tunnel run gtm-enterprise`

### Data Migration

```bash
# On development machine - export data
docker run --rm -v gtment_gtm-app-data:/data -v $(pwd):/backup alpine \
  tar cvf /backup/gtm-data-backup.tar /data

# Transfer to production
scp gtm-data-backup.tar user@production:/path/to/GTMEnt/

# On production - import data
docker volume create gtment_gtm-app-data
docker run --rm -v gtment_gtm-app-data:/data -v $(pwd):/backup alpine \
  sh -c "cd /data && tar xvf /backup/gtm-data-backup.tar --strip 1"

# Start the application
docker-compose up -d
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENV` | production | Environment mode |
| `LOG_LEVEL` | INFO | Logging verbosity |
| `CHROMA_PERSIST_DIR` | /app/data/chroma | ChromaDB storage |

## Voice AI Agent

The platform includes a real-time voice AI advisor powered by xAI Grok:

### Configuration

1. Go to **Settings** → **Voice Providers**
2. Enter your xAI API key
3. Select model (`grok-4-realtime`) and voice (Ara, Rex, Sal, Eve, Leo)
4. Click the microphone button (bottom-right) on any page

### Capabilities

- Real-time voice conversations
- Access to all platform data via tool calls
- Segment, MSA, competitive, and strategy queries
- Barge-in support (interrupt anytime)
- Context-aware responses per page

## Development

### Local Development (without Docker)

```bash
# Backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn src.api.app:app --host 0.0.0.0 --port 3700 --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Rebuilding After Changes

```bash
docker-compose down
docker-compose build
docker-compose up -d
```

## Troubleshooting

### Voice Agent Not Connecting

1. Ensure Grok API key is configured in Settings
2. Check browser console for WebSocket errors
3. Allow microphone permissions when prompted
4. Try disconnect/reconnect if initial connection fails

### LLM Analysis Failing

1. Verify API key is active in Settings → LLM Providers
2. Check that provider is set as "Active"
3. View job status in Data Status page
4. Check container logs: `docker logs gtm-enterprise-platform`

### Stale Jobs Stuck in Pending

```bash
# Fix stale pending jobs
curl -X POST "http://localhost:3700/api/jobs/fix-stale-pending?older_than_hours=1"
```

## License

Proprietary - Comcast Business Internal Use Only

---

**Developed by CMACLABS**
