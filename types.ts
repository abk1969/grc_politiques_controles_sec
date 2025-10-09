
export interface Requirement {
  id: number;
  requirement: string;
  verificationPoint: string;
}

export interface AnalysisResult extends Requirement {
  scfMapping: string;
  iso27001Mapping: string;
  iso27002Mapping: string;
  cobit5Mapping: string;
  analysis: string;
}

export enum AppState {
  IDLE,
  MAPPING,
  PARSING,
  ANALYZING,
  SUCCESS,
  ERROR,
}

export interface Stats {
  total: number;
  scf: number;
  iso27001: number;
  cobit5: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type ColumnMapping = {
  id: string;
  requirement: string;
  verificationPoint: string;
};

export interface ColumnSuggestion {
  field: keyof ColumnMapping;
  suggestedColumn: string;
  confidence: number; // 0-1
  reason: string;
}

export interface ColumnPreview {
  columnName: string;
  sampleData: (string | number)[];
  dataType: 'text' | 'number' | 'mixed';
  hasEmptyValues: boolean;
}

export interface ClaudeConversation {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  requirement: AnalysisResult;
}
