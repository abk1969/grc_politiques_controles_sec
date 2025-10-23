-- Migration: Ajouter la table import_sessions et les colonnes manquantes
-- Date: 2025-10-09

-- Créer la table import_sessions si elle n'existe pas
CREATE TABLE IF NOT EXISTS import_sessions (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(500) NOT NULL,
    source_sheet VARCHAR(255),
    total_requirements INTEGER DEFAULT 0,
    analysis_source VARCHAR(50) DEFAULT 'pending',
    status VARCHAR(50) DEFAULT 'processing',
    tags TEXT,
    session_metadata JSONB,
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ajouter la colonne import_session_id à requirements si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'requirements'
        AND column_name = 'import_session_id'
    ) THEN
        ALTER TABLE requirements
        ADD COLUMN import_session_id INTEGER REFERENCES import_sessions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Ajouter la colonne import_session_id à compliance_mappings si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'compliance_mappings'
        AND column_name = 'import_session_id'
    ) THEN
        ALTER TABLE compliance_mappings
        ADD COLUMN import_session_id INTEGER REFERENCES import_sessions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_import_sessions_date ON import_sessions(import_date);
CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON import_sessions(status);
CREATE INDEX IF NOT EXISTS idx_import_sessions_source ON import_sessions(analysis_source);
CREATE INDEX IF NOT EXISTS idx_requirements_session ON requirements(import_session_id);
CREATE INDEX IF NOT EXISTS idx_mappings_session ON compliance_mappings(import_session_id);

-- Créer le trigger pour updated_at sur import_sessions
DROP TRIGGER IF EXISTS update_import_sessions_updated_at ON import_sessions;
CREATE TRIGGER update_import_sessions_updated_at
    BEFORE UPDATE ON import_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Afficher le résultat
SELECT 'Migration terminée avec succès!' as status;
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('import_sessions', 'requirements', 'compliance_mappings')
ORDER BY table_name, ordinal_position;
