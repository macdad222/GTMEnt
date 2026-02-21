# Enterprise Strategy Platform v1.0

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

- Docker Engine 27+ and Docker Compose v2.30+
- 4GB+ RAM
- LLM API key (xAI Grok recommended, Anthropic Claude supported)

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
│   ├── auth/                     # JWT authentication & middleware
│   ├── cb_config/                # Comcast Business configuration
│   ├── competitive/              # Competitive intelligence service
│   ├── insights/                 # Q&A insights service
│   ├── jobs/                     # Background job queue
│   ├── market_intel/             # Market research & data fetching
│   ├── product_roadmap/          # Product analysis service
│   ├── segments/                 # Segment & MSA analysis
│   ├── strategy_report/          # Strategy report generation
│   ├── tasks/                    # Celery async task definitions
│   ├── voice/                    # Voice AI WebSocket proxy
│   ├── celery_app.py             # Celery application config
│   ├── database.py               # SQLAlchemy engine & session
│   ├── db_models.py              # ORM models (User, Job, AppConfig)
│   └── db_utils.py               # DB key-value helpers
│
├── frontend/                     # React/TypeScript Frontend
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   ├── context/              # React contexts (auth, config, voice)
│   │   ├── lib/voice-agent/      # Voice AI client implementations
│   │   ├── utils/                # API helpers
│   │   └── pages/                # Page components
│   └── package.json
│
├── alembic/                      # Database migrations
├── docker-compose.yml            # Docker orchestration (4 services)
├── Dockerfile                    # Multi-stage build (Node + Python)
└── requirements.txt              # Python dependencies (pinned)
```

## Version Matrix

All versions below are what this project was built and tested against. Using different major versions may cause compatibility issues.

### Infrastructure

| Component | Version | Image / Source |
|-----------|---------|----------------|
| Docker Engine | 29.1.2 | Desktop |
| Docker Compose | 2.40.3 | Desktop plugin |
| PostgreSQL | 16.12 | `postgres:16-alpine` |
| Redis | 7.4.7 | `redis:7-alpine` |
| Python | 3.11.14 | `python:3.11-slim` |
| Node.js | 20.x (LTS) | `node:20-alpine` (build stage only) |
| Gunicorn | 25.1.0 | pip |

### Backend (Python) — Key Packages

| Package | Pinned Version | Purpose |
|---------|---------------|---------|
| fastapi | 0.129.2 | Web framework |
| uvicorn | 0.41.0 | ASGI server (Gunicorn worker) |
| sqlalchemy | 2.0.46 | ORM / database toolkit |
| alembic | 1.18.4 | Database migrations |
| psycopg2-binary | 2.9.11 | PostgreSQL driver |
| celery | 5.6.2 | Async task queue |
| redis | 6.4.0 | Redis client (Celery broker) |
| pydantic | 2.12.5 | Data validation |
| python-jose | 3.5.0 | JWT token handling |
| passlib | 1.7.4 | Password hashing |
| bcrypt | 4.0.1 | bcrypt backend (pinned — 4.1+ breaks passlib) |
| openai | 2.21.0 | OpenAI / xAI API client |
| langchain | 1.2.10 | LLM orchestration |
| langchain-openai | 1.1.10 | LangChain OpenAI integration |
| httpx | 0.28.1 | Async HTTP client |
| beautifulsoup4 | 4.14.3 | HTML parsing (web scraping) |
| pandas | 3.0.1 | Data processing |
| numpy | 2.4.2 | Numerical operations |
| slowapi | 0.1.9 | Rate limiting |
| chromadb | 1.5.1 | Vector store |

### Frontend (Node.js) — Key Packages

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.2.0 | UI framework |
| react-dom | ^18.2.0 | React DOM renderer |
| react-router-dom | ^6.22.1 | Client-side routing |
| typescript | ^5.3.3 | Type checking |
| vite | ^5.1.4 | Build tool / dev server |
| tailwindcss | ^3.4.1 | Utility CSS framework |
| framer-motion | ^11.0.8 | Animations |
| @heroicons/react | ^2.1.1 | Icon library |
| @headlessui/react | ^1.7.18 | Accessible UI primitives |
| recharts | ^2.12.2 | Charts |
| react-markdown | ^9.0.1 | Markdown rendering |

### Known Version Constraints

| Constraint | Reason |
|------------|--------|
| `bcrypt==4.0.1` | passlib 1.7.4 is incompatible with bcrypt 4.1+ (`__about__` removed) |
| `python:3.11-slim` | Python 3.12+ has breaking changes with some deps; 3.11 is stable LTS |
| `node:20-alpine` | LTS line; used only in Docker build stage, not at runtime |
| `postgres:16-alpine` | Tested with PG 16; PG 17 should work but is untested |

## Data Persistence

All data is persisted in PostgreSQL (Docker volume: `gtm-postgres-data`):

| Table / Key Pattern | Description |
|---------------------|-------------|
| `users` | User accounts (JWT auth) |
| `jobs` | Background job tracking and status |
| `app_config.admin_config` | API keys, voice settings |
| `app_config.cb_config` | Company metrics, segment config |
| `app_config.competitive_*` | Competitor data and LLM analyses |
| `app_config.msa_intel` | MSA market intelligence (48 MSAs) |
| `app_config.segment_intel` | Segment LLM analyses |
| `app_config.strategy_*` | Strategy reports |
| `app_config.product_*` | Product roadmap analysis |
| `app_config.insights_*` | Q&A conversation history |
| `app_config.summary_*` | Cached LLM summaries |

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
# Export PostgreSQL data
docker compose exec postgres pg_dump -U gtm_user gtm_enterprise > gtm-backup.sql

# Transfer to production
scp gtm-backup.sql user@production:/path/to/GTMEnt/

# On production — import data
docker compose exec -T postgres psql -U gtm_user gtm_enterprise < gtm-backup.sql

# Start the application
docker compose up -d
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENV` | production | Environment mode |
| `LOG_LEVEL` | INFO | Logging verbosity |
| `DATABASE_URL` | postgresql://... | PostgreSQL connection string |
| `REDIS_URL` | redis://gtm-redis:6379/0 | Redis connection for Celery |
| `JWT_SECRET` | (auto-generated) | Secret key for JWT tokens |
| `GATE_ACCESS_CODE` | (set in admin) | Shared access code for registration |
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

Requires PostgreSQL 16+ and Redis 7+ running locally.

```bash
# Backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="postgresql://gtm_user:gtm_pass@localhost:5432/gtm_enterprise"
export REDIS_URL="redis://localhost:6379/0"
uvicorn src.api.app:app --host 0.0.0.0 --port 3700 --reload

# Celery worker (separate terminal)
celery -A src.celery_app worker --loglevel=info

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Rebuilding After Changes

```bash
docker compose down
docker compose build
docker compose up -d
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
