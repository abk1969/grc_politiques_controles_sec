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

### 1. Hybrid Analysis Pipeline (`App.tsx`)

**State Machine Flow**:
```
IDLE → MAPPING → PARSING → ANALYZING → SUCCESS
```

**6-Phase Pipeline**:
1. **Client-Side Excel Parsing**: `excelService.parseExcelFile()` extracts requirements from Excel
2. **PostgreSQL Upload**: `mlService.uploadExcelFile()` creates `ImportSession` record
3. **Claude AI Analysis**: `claudeService.analyzeRequirements()` generates full mappings with streaming progress
4. **Agentive Enrichment** (Optional): `agenticService` adds threat/risk/implementation fields
5. **Database Persistence**: `mlService.saveClaudeResults()` saves to PostgreSQL with `import_session_id` linkage
6. **Background ML Analysis**: `mlService.analyzeBatch()` runs 1 second later in background (non-blocking)

**Key Pattern**: Claude completes first (30s) and displays results immediately; ML analysis runs asynchronously in background (5min) and updates database independently. Agentive enrichment is optional and gracefully degrades on failure.

### 2. Import Session Traceability (`backend/models.py`)

**Purpose**: Track every import operation for history and recovery.

**Flow**:
- `POST /api/import/excel` creates `ImportSession` with metadata
- All `Requirement` and `ComplianceMapping` records link to `import_session_id`
- Frontend can reload past sessions via `ImportHistoryModal` → `mlService.loadImportSession()`

**Critical Fields**:
- `analysis_source`: Tracks which AI/ML engine analyzed (claude/gemini/ml/hybrid)
- `session_metadata`: JSONB field for extensible tracking
- `status`: processing/completed/failed
- `filename`, `source_sheet`: Original file metadata
- `total_requirements`: Count for validation

### 3. ML Model Singleton with Thread-Safe Lazy Loading (`backend/ml_model_singleton.py`)

**Why**: Sentence-Transformers models consume 400MB+ RAM. Loading multiple instances causes OOM crashes.

**Thread-Safe Pattern** (Double-Check Locking):
```python
class MLModelSingleton:
    _instance = None
    _lock = threading.Lock()
    _model = None

    def get_model(self):
        if self._model is None:
            with self._lock:
                if self._model is None:  # Double-check after acquiring lock
                    self._model = SentenceTransformer('paraphrase-multilingual-mpnet-base-v2')
        return self._model

# Global access via get_shared_ml_model()
```

**Usage**: All services (`MLMappingService`, `SCFKnowledgeBase`) share ONE model instance.

**Caching Strategy**:
- **File cache**: `backend/cache/scf_embeddings.pkl` (persisted across restarts, Docker volume)
- **Memory cache**: Model stays loaded for process lifetime
- **Cache invalidation**: Model name mismatch triggers rebuild
- **Cache config**: Centralized in `backend/cache_config.py` with Docker detection

### 4. SCF Knowledge Base Singleton (`backend/main.py` + `backend/scf_knowledge_service.py`)

**Thread-Safe Initialization Pattern** (`backend/main.py`):
```python
_scf_kb = None
_scf_kb_lock = threading.Lock()
_scf_kb_error = None

def get_scf_knowledge_base():
    global _scf_kb, _scf_kb_error
    if _scf_kb is None and _scf_kb_error is None:
        with _scf_kb_lock:
            if _scf_kb is None and _scf_kb_error is None:
                try:
                    _scf_kb = SCFKnowledgeBase()
                except Exception as e:
                    _scf_kb_error = e  # Store error to prevent retry storms
                    raise
    if _scf_kb_error:
        raise _scf_kb_error
    return _scf_kb
```

**Data Source**: Excel file at `/app/scf_knowledge_base.xlsx` with 1342+ SCF controls
- Sheet "SCF 2025.2": Control definitions
- Sheet "Threat Catalog": Associated threats
- Sheet "Risk Catalog": Associated risks

**Lazy Loading**: Initialized on first API request needing SCF data, not at startup.

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

### 8. Agentive Enrichment Pattern (`App.tsx` + `services/agenticService.ts`)

**Purpose**: Optional enhancement adding threat, risk, and control implementation analysis.

**Graceful Degradation Pattern**:
```typescript
try {
  // Attempt agentive enrichment
  enrichedResults = await enrichResultsWithAgenticAnalysis(claudeResults);
  console.log('✓ Agentive enrichment successful');
} catch (error) {
  console.warn('⚠ Agentive enrichment failed, continuing with Claude results only');
  enrichedResults = claudeResults; // Use Claude results without enrichment
}
```

**Why**: Agentive analysis is valuable but not critical. System continues to function with Claude-only results if enrichment fails.

**Enriched Fields** (stored in `compliance_mappings` table):
- `threat`: Security threats addressed by the control
- `risk`: Associated risk scenarios
- `control_implementation`: Practical implementation guidance

**UI Integration**: Dashboard displays enriched fields when available; filters allow toggling enrichment visibility.

### 9. Backend Timeout Handling (`services/mlService.ts`)

**Critical Pattern**: Import history endpoints have **10-15 second timeout** protection.

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

try {
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);
} catch (error) {
  if (error.name === 'AbortError') {
    throw new MLAPIError('Request timeout - session trop volumineuse');
  }
}
```

**Why**: PostgreSQL queries on large import sessions (1000+ requirements) can exceed normal timeouts; frontend must handle gracefully.

**Affected Endpoints**:
- `getImportSessions()`: 10s timeout
- `loadImportSession(id)`: 15s timeout (more complex JOIN queries)

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
- Multi-agent orchestration pattern
- Graceful degradation on failure (analysis continues without enrichment)

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

7. FRONTEND: Agentive enrichment (optional)
   ↓ (adds threat, risk, controlImplementation fields)
   ↓ (gracefully degrades if fails)

8. FRONTEND: POST /api/save-claude-results
   ↓ (creates Requirement + ComplianceMapping records)
   ↓ (links to import_session_id)
   ↓ (stores enriched fields if available)

9. FRONTEND: setTimeout(1000) → POST /api/analyze/batch (background)
   ↓ (ML finds similar SCF controls via embeddings)
   ↓ (updates requirement.analysis_status = 'analyzed')

10. DASHBOARD: Displays results (enriched fields visible if available)
   ↓
11. USER: Can chat per-requirement, filter by framework/enrichment, or load past imports
```

## Backend API Routes

**Key Endpoints** (`backend/main.py`):

| Endpoint | Method | Purpose | Lines |
|----------|--------|---------|-------|
| `/api/import/excel` | POST | Bulk Excel import → creates ImportSession with duplicate detection |
| `/api/analyze/batch` | POST | ML batch analysis via embeddings (background processing) |
| `/api/save-claude-results` | POST | Save Claude + Agentive results to database |
| `/api/import-sessions` | GET | List past imports (paginated, may timeout on large datasets) |
| `/api/import-sessions/{id}/results` | GET | Load specific import with full mappings |
| `/api/requirements` | GET | List requirements (filterable by status, framework) |
| `/api/stats` | GET | Dashboard statistics from materialized views |
| `/api/analyze/similarity` | POST | Find similar SCF controls using embeddings |
| `/health` | GET | Health check endpoint for all services |

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

**Load Pattern** (`backend/ml_service.py`):
1. Check if file exists via `cache_config.get_embeddings_cache_path()`
2. Load pickle with model name validation
3. If model name mismatch → recalculate all embeddings and save
4. If file missing → calculate on-demand during first similarity search

**Docker Volume Persistence**: `ml_cache:/app/cache` ensures embeddings survive container restarts

**Cache Configuration** (`backend/cache_config.py`):
- Detects Docker vs local environment
- Provides centralized cache path management
- Ensures consistency across services

### Migration Pattern

**Current Schema**: `database/schema.sql` (base tables)
**Recent Migrations**:
- `migration_add_import_sessions.sql`: Import traceability
- `migration_add_enriched_fields.sql`: Agentive enrichment fields

**Pattern**: Incremental SQL files with idempotent checks; apply manually or via Alembic.

**Idempotent Design Example**:
```sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='compliance_mappings' AND column_name='threat') THEN
        ALTER TABLE compliance_mappings ADD COLUMN threat TEXT;
    END IF;
END $$;
```

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

### Error Handling and Resilience

**Frontend Error Handling Pattern** (`services/mlService.ts`):
```typescript
export class MLAPIError extends Error {
  constructor(message: string, public statusCode?: number, public originalError?: unknown) {
    super(message);
    this.name = 'MLAPIError';
  }
}

// Wrapper pattern for all fetch calls
try {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new MLAPIError(`HTTP ${response.status}: ${response.statusText}`, response.status);
  }
  return await response.json();
} catch (error) {
  if (error instanceof MLAPIError) throw error;
  throw new MLAPIError('Network error', undefined, error);
}
```

**Backend Error Prevention**:
- **Duplicate detection**: Silently skips duplicate requirements during import
- **Retry storms prevention**: SCF knowledge base stores initialization errors to prevent infinite retries
- **Thread-safe initialization**: Double-check locking prevents race conditions
- **Graceful degradation**: Agentive enrichment failure doesn't block analysis

**Database Resilience**:
- **Health checks**: Docker waits for PostgreSQL health before starting backend
- **Persistent volumes**: Data survives container restarts
- **Idempotent migrations**: Safe to run multiple times

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
- `backend/main.py`: SCF knowledge base lazy loading with thread-safe double-check locking
- `backend/ml_model_singleton.py`: Global ML model singleton
- `backend/cache_config.py`: Cache directory configuration (Docker vs local detection)

### Frontend Analysis Pipeline
- `App.tsx`: Complete 6-phase analysis orchestration (Excel parse → Claude → Agentive → Save → ML)
- `App.tsx`: Background ML launch (non-blocking, 1 second delay after results display)
- `App.tsx`: AbortController pattern for cancelling in-flight Claude requests

### Database Operations
- `backend/models.py`: SQLAlchemy ORM models (Requirement, ComplianceMapping, ImportSession)
- `database/schema.sql`: Core schema with critical indexes and materialized views
- `database/migration_add_import_sessions.sql`: Import traceability migration
- `database/migration_add_enriched_fields.sql`: Agentive enrichment fields (threat/risk/implementation)

### ML Core Logic
- `backend/ml_service.py`: Similarity search algorithm using cosine similarity
- `backend/scf_knowledge_service.py`: SCF semantic search and Excel data loading

### Timeout Handling
- `services/mlService.ts`: Import session loading with 10-15s timeouts and AbortController

### Service Layer
- `services/mlService.ts`: Backend communication with error handling and timeout protection
- `services/claudeService.ts`: Claude API integration with streaming support
- `services/agenticService.ts`: Agentive enrichment (threat/risk/implementation analysis)
- `services/excelService.ts`: Client-side Excel parsing via CDN XLSX library

## Common Development Tasks

### Adding a New Compliance Framework

1. **Backend**: Add column to `compliance_mappings` table (`backend/models.py:84-122`)
2. **Frontend**: Update `AnalysisResult` type (`types.ts`)
3. **Services**: Update Claude/Gemini prompts to include new framework
4. **Dashboard**: Add filter checkbox and display column

### Changing ML Model

1. Update model name in `backend/ml_model_singleton.py` (default is 'paraphrase-multilingual-mpnet-base-v2')
2. Delete `backend/cache/scf_embeddings.pkl` (or let cache invalidation handle it)
3. Restart backend → automatic recalculation on first query
4. **Warning**:
   - Confidence scores will change (different embedding space)
   - Consider reanalyzing existing mappings for consistency
   - First query will be slow (~5 min) while rebuilding cache

### Adding Analysis Source

1. Add value to `mapping_source` enum concept (`backend/models.py:102`)
2. Update `ImportSession.analysis_source` validation
3. Update frontend to handle new source in filters/display

## Deployment Notes

- **Production build**: Multi-stage Dockerfile optimizes image size (Node builder → Nginx production)
- **Health checks**: All services have `/health` endpoints (used by Docker healthcheck)
- **Volume persistence**:
  - `postgres_data`: PostgreSQL database (survives `docker compose down`)
  - `ml_cache`: Embeddings cache (survives backend restarts)
- **CORS Configuration** (`backend/main.py`):
  - Development: All localhost ports (3000-3003, 5173)
  - Production: Set `FRONTEND_URL` environment variable
  - Known deployments: Hardcoded Vercel URL included
- **Environment injection**: Docker Compose passes API keys as build args to frontend
- **Database migrations**: Run SQL scripts manually before deployment:
  ```bash
  docker exec -i grc-postgres psql -U postgres -d grc_compliance < database/migration_*.sql
  ```
- **ML Model warm-up**: First request after deployment takes ~5 min to build embeddings cache

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
