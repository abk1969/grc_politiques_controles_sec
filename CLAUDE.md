# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GRC Compliance Mapping AI is a **fullstack hybrid analysis system** combining AI (Claude/Gemini) and ML (Sentence-Transformers) to automatically map compliance requirements from Excel files to security frameworks (SCF, ISO 27001/27002, COBIT 5).

**Architecture**: React 19 + TypeScript frontend, Python FastAPI backend, PostgreSQL 16 database, containerized with Docker.

## Development Commands

### Frontend
- **Install dependencies**: `npm install`
- **Dev server**: `npm run dev` (port 3002 on 0.0.0.0)
- **Build**: `npm run build`
- **Preview**: `npm run preview`

### Backend
- **Install dependencies**: `pip install -r backend/requirements.txt`
- **Run server**: `cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8001`
- **Database migrations**: SQL scripts in `database/` directory

### Docker (Recommended)
- **Start all services**: `docker compose up -d --build`
- **View logs**: `docker compose logs -f [backend|frontend|postgres]`
- **Stop services**: `docker compose down`
- **Rebuild**: `docker compose build --no-cache`
- **Access**:
  - Frontend: http://localhost:3001
  - Backend API: http://localhost:8000
  - API Docs: http://localhost:8000/docs
  - PostgreSQL: localhost:5432

### Testing
- **Backend tests**: `cd backend && pytest`

## Environment Configuration

Create `.env.local` (frontend) and `.env` (backend) with:

```bash
# AI API Keys
ANTHROPIC_API_KEY=your_anthropic_key
CLAUDE_API_KEY=your_claude_key
GEMINI_API_KEY=your_gemini_key

# Backend
DATABASE_URL=postgresql://user:password@localhost:5432/grc_compliance
POSTGRES_USER=grc_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=grc_compliance

# Frontend (Vite)
VITE_API_URL=http://localhost:8001
```

**Vite Environment Variable Exposure** (`vite.config.ts:15-21`):
- Exposes `ANTHROPIC_API_KEY`, `CLAUDE_API_KEY`, `GEMINI_API_KEY` to frontend
- Access via `import.meta.env.VITE_*` or injected `process.env.*`

## Critical Architecture Patterns

### 1. Hybrid Analysis Pipeline (`App.tsx:53-169`)

**State Machine Flow**:
```
IDLE → MAPPING → PARSING → ANALYZING → SUCCESS
```

**4-Phase Pipeline**:
1. **Client-Side Excel Parsing** (lines 63-67): `excelService.parseExcelFile()`
2. **PostgreSQL Upload** (lines 76-87): `mlService.uploadExcelFile()` → creates `ImportSession`
3. **Claude AI Analysis** (lines 94-107): `claudeService.analyzeRequirements()` → generates full mappings
4. **Background ML Analysis** (lines 127-160): `mlService.analyzeBatch()` → runs in parallel without blocking

**Key Pattern**: Claude analysis completes first and displays results; ML analysis runs asynchronously in background and updates database independently.

### 2. Import Session Traceability (`backend/models.py:149-185`)

**Purpose**: Track every import operation for history and recovery.

**Flow**:
- `POST /api/import/excel` creates `ImportSession` with metadata
- All `Requirement` and `ComplianceMapping` records link to `import_session_id`
- Frontend can reload past sessions via `ImportHistoryModal`

**Critical Fields**:
- `analysis_source`: Tracks which AI/ML engine analyzed (claude/gemini/ml/hybrid)
- `metadata`: JSON field for extensible tracking
- `status`: processing/completed/failed

### 3. ML Service Singleton with Lazy Loading (`backend/ml_service.py:19-48`)

**Why**: Sentence-Transformers models are 400MB+ in memory; load on-demand only.

**Pattern**:
```python
class MLService:
    _model = None  # Class variable

    def _load_model(self):
        if MLService._model is None:
            MLService._model = SentenceTransformer('paraphrase-multilingual-mpnet-base-v2')
```

**Caching Strategy**:
- File cache: `backend/cache/scf_embeddings.pkl` (persisted across restarts)
- Memory cache: Loaded embeddings kept in `_scf_embeddings` dict
- Cache invalidation: Model name mismatch triggers rebuild

### 4. SCF Knowledge Base Singleton (`backend/scf_knowledge_service.py:301-308`)

**Global Instance Pattern**:
```python
_scf_kb_instance = None

def get_scf_knowledge_base():
    global _scf_kb_instance
    if _scf_kb_instance is None:
        _scf_kb_instance = SCFKnowledgeBase()
    return _scf_kb_instance
```

**Data Source**: Excel file at `/app/scf_knowledge_base.xlsx` with 1342+ SCF controls
- Sheet "SCF 2025.2": Control definitions
- Sheet "Threat Catalog": Associated threats
- Sheet "Risk Catalog": Associated risks

### 5. Database Schema Design (`database/schema.sql`)

**5 Core Tables**:

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `requirements` | Policy requirements from Excel | `import_session_id` FK |
| `scf_controls` | SCF framework reference (1342+ controls) | Standalone reference |
| `compliance_mappings` | Bridges requirements to frameworks | `requirement_id` + `import_session_id` FKs |
| `analysis_history` | Audit trail for AI/ML runs | `requirement_id` FK |
| `import_sessions` | Import operation tracking | Parent of requirements/mappings |

**Critical Indexes** (lines 138-156):
- `idx_requirements_status`: Fast filtering by `analysis_status`
- `idx_mappings_active`: Active mappings only (for dashboard queries)
- `idx_scf_control_id`: Rapid control lookups

**Materialized Views** (lines 190-223):
- `v_requirements_with_mappings`: Pre-joined dashboard data
- `v_analysis_stats`: Aggregated statistics

### 6. Multi-Source Analysis Tracking

**Mapping Sources** (`backend/models.py:102`):
```python
mapping_source = Column(String(50))  # 'manual' | 'ml' | 'ai' | 'claude' | 'gemini' | 'imported'
```

**Confidence Scoring**:
- Claude results: `confidence_score=0.95` (high trust)
- ML results: Calculated cosine similarity (0.0-1.0)
- Manual entries: `confidence_score=1.0`

**Pattern**: System preserves which engine generated each mapping for later comparison and validation.

### 7. Frontend State Management (`App.tsx`)

**Critical State Variables**:
```typescript
const [appState, setAppState] = useState<AppState>(AppState.IDLE)
const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([])
const [currentImportSessionId, setCurrentImportSessionId] = useState<number | null>(null)
const [mlAnalysisRunning, setMlAnalysisRunning] = useState(false)
const abortControllerRef = useRef<AbortController | null>(null)
```

**AbortController Pattern** (`App.tsx:171-180`):
- Stored in ref to survive re-renders
- Enables cancellation of Claude analysis mid-flight
- Cleanup in effect cleanup function

### 8. Backend Timeout Handling (`services/mlService.ts:334-452`)

**Critical Pattern**: Import history endpoints have **10-15 second timeout** protection.

```typescript
const timeoutId = setTimeout(() => controller.abort(), 10000)
```

**Why**: PostgreSQL queries on large import sessions can exceed normal timeouts; frontend must handle gracefully.

## Component Architecture

### Key Components

**App.tsx** (main orchestrator)
- State machine controller
- Coordinates 4-phase analysis pipeline
- Manages import sessions

**DashboardScreen.tsx** (`components/DashboardScreen.tsx:1-232`)
- Two-tab interface: Dashboard stats + Requirements table
- **Advanced filtering** (lines 19-65): Text search across 10 fields, framework checkboxes
- **Enriched fields**: Displays `threat`, `risk`, `controlImplementation` from agentive analysis
- **Manual entry**: "Saisie manuelle" button opens `ManualRequirementModal`

**ImportHistoryModal.tsx** (`components/ImportHistoryModal.tsx`)
- Lists past `ImportSession` records
- Loads previous analysis via `mlService.loadImportSession()`
- Handles timeout errors gracefully

**ManualRequirementModal.tsx** (`components/ManualRequirementModal.tsx`)
- Agentive requirement creation
- Full `AnalysisResult` form with all mappings
- Enriched fields: threat, risk, control implementation

**ChatModalClaude.tsx** (`components/ChatModalClaude.tsx`)
- Per-requirement chat using Claude streaming API
- Contextual Q&A about specific compliance mappings

**AdvancedFilters.tsx** (`components/AdvancedFilters.tsx`)
- Framework multi-select (SCF/ISO27001/ISO27002/COBIT5)
- Debounced text search (300ms)
- Enriched field toggles

### Service Layer

**mlService.ts** (`services/mlService.ts`)
- Base URL: `process.env.VITE_API_URL` or `http://localhost:8001`
- **Key Functions**:
  - `uploadExcelFile()`: POST to `/api/import/excel` → returns `import_session_id`
  - `analyzeBatch()`: POST requirement IDs to `/api/analyze/batch`
  - `saveClaudeResults()`: POST to `/api/save-claude-results`
  - `getImportSessions()`: GET `/api/import-sessions` (with timeout handling)
  - `loadImportSession()`: GET `/api/import-sessions/{id}/results` (with timeout handling)

**claudeService.ts** (`services/claudeService.ts`)
- Claude API integration with streaming
- Structured output for compliance mappings

**excelService.ts** (`services/excelService.ts`)
- Client-side XLSX parsing (via CDN library)
- Column header extraction for mapping UI

**agenticService.ts** (`services/agenticService.ts`)
- Agentive analysis enhancements (threat/risk/implementation)

## Data Flow

### Complete Analysis Workflow

```
1. USER UPLOADS EXCEL
   ↓
2. FRONTEND: getExcelHeaders() → ColumnMappingModal
   ↓
3. USER: Maps columns (id, requirement, verificationPoint)
   ↓
4. FRONTEND: parseExcelFile() → Requirement[]
   ↓
5. BACKEND: POST /api/import/excel → Creates ImportSession
   ↓ (returns import_session_id)

6. FRONTEND: Claude analyzes all requirements
   ↓ (generates AnalysisResult[] with SCF/ISO/COBIT mappings)

7. FRONTEND: POST /api/save-claude-results
   ↓ (creates Requirement + ComplianceMapping records)
   ↓ (links to import_session_id)

8. FRONTEND: setTimeout → POST /api/analyze/batch (background)
   ↓ (ML finds similar SCF controls via embeddings)
   ↓ (updates requirement.analysis_status = 'analyzed')

9. DASHBOARD: Displays results
   ↓
10. USER: Can chat per-requirement, filter, or load past imports
```

## Backend API Routes

**Key Endpoints** (`backend/main.py`):

| Endpoint | Method | Purpose | Lines |
|----------|--------|---------|-------|
| `/api/import/excel` | POST | Bulk Excel import → creates ImportSession | 113-210 |
| `/api/analyze/batch` | POST | ML batch analysis via embeddings | 318-375 |
| `/api/save-claude-results` | POST | Save Claude analysis to database | 381-462 |
| `/api/import-sessions` | GET | List past imports (paginated) | 468-516 |
| `/api/import-sessions/{id}/results` | GET | Load specific import | 519-581 |
| `/api/requirements` | GET | List requirements (filterable) | 216-230 |
| `/api/stats` | GET | Dashboard statistics | 588-605 |
| `/api/analyze/similarity` | POST | Find similar SCF controls | 289-316 |

## Docker Architecture

**3-Tier Stack** (`docker-compose.yml`):

1. **PostgreSQL** (port 5432):
   - Image: `postgres:16-alpine`
   - Volume: `postgres_data` (persistent)
   - Health check enabled

2. **Backend** (port 8000):
   - Built from `backend/Dockerfile`
   - ML cache volume: `ml_cache:/app/cache` (persistent embeddings)
   - Depends on: postgres (health check)

3. **Frontend** (port 3001):
   - Multi-stage build: Node builder → Nginx production
   - Build args: API keys for environment injection
   - Depends on: backend

**Network**: `grc_network` bridge for inter-container communication

## Database Patterns

### Embedding Cache Strategy

**File**: `backend/cache/scf_embeddings.pkl`

**Structure**:
```python
{
    'model_name': 'paraphrase-multilingual-mpnet-base-v2',
    'embeddings': {
        'IAC-01': np.array([...]),  # 768D vector
        'CRY-01': np.array([...]),
        # ... 1342+ controls
    }
}
```

**Load Pattern** (`backend/ml_service.py:145-162`):
1. Check if file exists
2. Load pickle
3. Verify model name matches current model
4. If mismatch → recalculate and save

### Migration Pattern

**Current Schema**: `database/schema.sql` (base tables)
**Recent Migration**: `database/migration_add_import_sessions.sql`

**Pattern**: Incremental SQL files for schema changes; apply manually or via Alembic.

## Performance Considerations

### ML Performance
- **Per-requirement encoding**: ~50ms
- **Batch encoding (100 requirements)**: ~5 seconds (with progress bar)
- **Similarity search (1342 controls)**: ~100ms (cosine similarity on cached embeddings)

### Caching Strategies
1. **Embedding cache**: File-based persistence across restarts
2. **Model cache**: In-memory singleton prevents reloading
3. **Database views**: Pre-joined queries for dashboard

### Frontend Optimizations
- **Debounced search**: 300ms delay (`hooks/useDebounce.ts`)
- **useMemo**: Expensive filtering calculations
- **AbortController**: Cancel in-flight requests
- **Streaming responses**: Real-time chat feedback

## Important Constraints

### CDN Dependencies
- XLSX library loaded via CDN in `index.html`
- Tailwind CSS via CDN
- `@google/genai` via import map (aistudiocdn.com)

**Pattern**: Not traditional npm resolution at runtime; libraries injected via script tags.

### French UI
- All user-facing text is French
- AI prompts in French
- Database content may be French (requirement text)

### Framework Knowledge
- Application expects specific framework versions:
  - SCF 2025.2
  - ISO 27001:2022
  - ISO 27002:2022
  - COBIT 5

### ML Model
- Fixed model: `paraphrase-multilingual-mpnet-base-v2` (multilingual support for French)
- Changing model requires cache invalidation
- 768-dimensional embeddings

## Critical Code Locations

### Backend Service Initialization
- `backend/main.py:63-81`: Lazy SCF knowledge base loading
- `backend/main.py:29-40`: Global ML service instance

### Frontend Analysis Pipeline
- `App.tsx:53-169`: 4-phase analysis orchestration
- `App.tsx:127-160`: Background ML launch (non-blocking)

### Database Operations
- `backend/models.py`: SQLAlchemy ORM models
- `database/schema.sql:138-156`: Critical indexes
- `database/schema.sql:190-223`: Pre-computed views

### ML Core Logic
- `backend/ml_service.py:195-263`: Similarity search algorithm
- `backend/scf_knowledge_service.py:188-226`: SCF semantic search

### Timeout Handling
- `services/mlService.ts:334-452`: Import session loading with 10-15s timeouts

## Common Development Tasks

### Adding a New Compliance Framework

1. **Backend**: Add column to `compliance_mappings` table (`backend/models.py:84-122`)
2. **Frontend**: Update `AnalysisResult` type (`types.ts`)
3. **Services**: Update Claude/Gemini prompts to include new framework
4. **Dashboard**: Add filter checkbox and display column

### Changing ML Model

1. Delete `backend/cache/scf_embeddings.pkl`
2. Update model name in `backend/ml_service.py:45`
3. Restart backend → automatic recalculation on first query
4. **Warning**: Confidence scores may change; consider reanalyzing existing mappings

### Adding Analysis Source

1. Add value to `mapping_source` enum concept (`backend/models.py:102`)
2. Update `ImportSession.analysis_source` validation
3. Update frontend to handle new source in filters/display

## Deployment Notes

- **Production build**: Multi-stage Dockerfile optimizes image size
- **Health checks**: All services have `/health` endpoints
- **Volume persistence**: PostgreSQL data + ML cache survive container restarts
- **CORS**: Configured for localhost development; update for production domains
- **Environment injection**: Docker Compose passes API keys as build args

## External Dependencies

**Frontend**:
- React 19.2, TypeScript, Vite 6.2
- @anthropic-ai/sdk ^0.65.0
- @google/genai ^1.22.0
- Zod 4.1.12 (validation)

**Backend**:
- FastAPI 0.109.0, Uvicorn 0.27.0
- SQLAlchemy 2.0.25, PostgreSQL driver
- Sentence-Transformers 2.3.1
- Pandas 2.2.0, NumPy 1.26.3
- Loguru 0.7.2 (logging)

**Database**:
- PostgreSQL 16 with pgvector extension
