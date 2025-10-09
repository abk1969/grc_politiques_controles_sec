# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GRC Compliance Mapping AI is a React + TypeScript application that uses Google's Gemini AI to analyze policy requirements from Excel files and automatically map them to compliance frameworks (SCF, ISO 27001/27002, COBIT 5).

## Development Commands

- **Install dependencies**: `npm install`
- **Run dev server**: `npm run dev` (starts on port 3000)
- **Build for production**: `npm run build`
- **Preview production build**: `npm run preview`

## Environment Configuration

The application requires a Gemini API key set in `.env.local`:
```
GEMINI_API_KEY=your_api_key_here
```

The Vite config exposes this as `process.env.API_KEY` and `process.env.GEMINI_API_KEY` to the application.

## Application Architecture

### Application State Flow

The app uses a state machine pattern (AppState enum) with the following flow:
1. **IDLE** → User selects Excel file
2. **MAPPING** → User maps Excel columns to required fields (id, requirement, verificationPoint)
3. **PARSING** → Excel file is parsed using the mapping
4. **ANALYZING** → Gemini AI analyzes requirements and generates compliance mappings
5. **SUCCESS** → Dashboard displays results with chat capability
6. **ERROR** → Error state for any failures

### Core Services

**excelService.ts**
- Expects an Excel sheet named "Politiques"
- Uses XLSX library (loaded via CDN in index.html)
- `getExcelHeaders()`: Extracts column headers for user mapping
- `parseExcelFile()`: Parses Excel data based on user-provided column mapping

**geminiService.ts**
- Uses `@google/genai` SDK with gemini-flash-latest model (always uses the latest Gemini Flash version)
- `analyzeComplianceData()`: Batch analyzes all requirements with structured JSON output (temperature: 0.1)
- `createRequirementChat()`: Creates per-requirement chat sessions for follow-up questions
- Response schema enforces strict typing for SCF, ISO 27001/27002, and COBIT 5 mappings

### Component Structure

**App.tsx** (main orchestrator, ~100 lines)
- Manages application state and coordinates components
- Wrapped in ErrorBoundary for error handling

**components/** directory:
- `ErrorBoundary.tsx`: React error boundary for graceful error handling
- `FileUploadScreen.tsx`: Initial file selection and loading states
- `ColumnMappingModal.tsx`: Maps Excel columns to application fields
- `DashboardScreen.tsx`: Two-tab interface (Dashboard stats + Requirements table)
- `ChatModal.tsx`: Per-requirement AI chat interface with streaming responses
- `Loader.tsx`: Reusable loading spinner component
- `StatCard.tsx`: Reusable statistics card component
- `icons.tsx`: All SVG icon components

**hooks/** directory:
- `useDebounce.ts`: Custom hook for debouncing values (used for search)

### Key Design Patterns

- **Component Architecture**: Modular structure with separated concerns (~8 reusable components)
- **Error Handling**: Custom error classes (GeminiAPIError, GeminiConfigError) + ErrorBoundary
- **Retry Logic**: Exponential backoff with 3 retries for API calls
- **Performance**: Debounced search (300ms), useMemo for expensive calculations
- **Memory Management**: AbortController for cleaning up async operations
- **Validation**: Zod schemas for runtime validation of API responses
- **Column Mapping**: Flexible system allowing users to map any Excel column names to required fields
- **Streaming Responses**: Chat uses `sendMessageStream()` for real-time AI response rendering
- **Accessibility**: ARIA labels, keyboard navigation (Escape key), role attributes
- **French UI**: All user-facing text is in French

## Data Flow

1. Excel file → `getExcelHeaders()` → User maps columns → `parseExcelFile()` → Requirement[]
2. Requirement[] → `analyzeComplianceData()` → AnalysisResult[] (with framework mappings)
3. User selects requirement → `createRequirementChat()` → Interactive chat session

## External Dependencies

- **React 19.2** with hooks (useState, useMemo, useCallback, useEffect, useRef)
- **Tailwind CSS** (via CDN)
- **XLSX** library (via CDN) - with runtime verification
- **@google/genai** SDK (via import map in index.html)
- **Zod** - Runtime validation library for API responses

## Important Notes

- The app is designed for AI Studio deployment with import maps in index.html
- No traditional node_modules resolution for runtime; dependencies loaded via aistudiocdn.com
- All AI prompts and responses are in French
- The app expects specific compliance framework knowledge (SCF, ISO 27001:2022, ISO 27002:2022, COBIT 5)
