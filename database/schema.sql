-- ============================================
-- GRC Compliance Mapping - PostgreSQL Schema
-- ============================================

-- Supprimer les tables existantes (si besoin)
DROP TABLE IF EXISTS analysis_history CASCADE;
DROP TABLE IF EXISTS compliance_mappings CASCADE;
DROP TABLE IF EXISTS scf_controls CASCADE;
DROP TABLE IF EXISTS requirements CASCADE;

-- ============================================
-- Table: requirements
-- Stocke les exigences extraites des fichiers Excel
-- ============================================
CREATE TABLE requirements (
    id SERIAL PRIMARY KEY,
    
    -- Identifiant original du fichier Excel
    original_id VARCHAR(255),
    
    -- Texte de l'exigence
    requirement TEXT NOT NULL,
    
    -- Point de vérification associé
    verification_point TEXT,
    
    -- Métadonnées
    source_file VARCHAR(500),
    source_sheet VARCHAR(255),
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Statut de l'analyse
    analysis_status VARCHAR(50) DEFAULT 'pending', -- pending, analyzed, manual
    
    -- Index pour recherche rapide
    CONSTRAINT unique_requirement UNIQUE (original_id, source_file)
);

-- ============================================
-- Table: scf_controls
-- Stocke les contrôles du Secure Controls Framework
-- ============================================
CREATE TABLE scf_controls (
    id SERIAL PRIMARY KEY,
    
    -- Identifiant du contrôle SCF
    control_id VARCHAR(100) UNIQUE NOT NULL,
    
    -- Titre du contrôle
    control_title TEXT NOT NULL,
    
    -- Description complète
    control_description TEXT,
    
    -- Domaine/Catégorie
    domain VARCHAR(255),
    
    -- Sous-catégorie
    category VARCHAR(255),
    
    -- Niveau de criticité
    criticality VARCHAR(50),
    
    -- Mappings vers d'autres frameworks
    iso27001_mapping TEXT,
    iso27002_mapping TEXT,
    cobit5_mapping TEXT,
    nist_mapping TEXT,
    
    -- Métadonnées
    version VARCHAR(50),
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: compliance_mappings
-- Stocke les mappings entre exigences et frameworks
-- ============================================
CREATE TABLE compliance_mappings (
    id SERIAL PRIMARY KEY,
    
    -- Référence à l'exigence
    requirement_id INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    
    -- Mappings vers les frameworks
    scf_mapping VARCHAR(500),
    iso27001_mapping VARCHAR(500),
    iso27002_mapping VARCHAR(500),
    cobit5_mapping VARCHAR(500),
    
    -- Analyse et justification
    analysis TEXT,
    confidence_score DECIMAL(3,2), -- 0.00 à 1.00
    
    -- Source du mapping
    mapping_source VARCHAR(50) DEFAULT 'manual', -- manual, ai, imported
    
    -- Métadonnées
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Un seul mapping actif par exigence
    is_active BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT fk_requirement FOREIGN KEY (requirement_id) REFERENCES requirements(id)
);

-- ============================================
-- Table: analysis_history
-- Historique des analyses IA
-- ============================================
CREATE TABLE analysis_history (
    id SERIAL PRIMARY KEY,
    
    -- Référence au mapping
    mapping_id INTEGER REFERENCES compliance_mappings(id) ON DELETE SET NULL,
    
    -- Détails de l'analyse
    model_used VARCHAR(100), -- gemini-flash-latest, claude-3, etc.
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_cost DECIMAL(10,4),
    
    -- Résultat
    analysis_result JSONB,
    
    -- Métadonnées
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER
);

-- ============================================
-- Index pour optimiser les performances
-- ============================================

-- Index sur requirements
CREATE INDEX idx_requirements_status ON requirements(analysis_status);
CREATE INDEX idx_requirements_source ON requirements(source_file);
CREATE INDEX idx_requirements_imported ON requirements(imported_at);

-- Index sur scf_controls
CREATE INDEX idx_scf_control_id ON scf_controls(control_id);
CREATE INDEX idx_scf_domain ON scf_controls(domain);
CREATE INDEX idx_scf_category ON scf_controls(category);

-- Index sur compliance_mappings
CREATE INDEX idx_mappings_requirement ON compliance_mappings(requirement_id);
CREATE INDEX idx_mappings_active ON compliance_mappings(is_active);
CREATE INDEX idx_mappings_source ON compliance_mappings(mapping_source);

-- Index sur analysis_history
CREATE INDEX idx_history_mapping ON analysis_history(mapping_id);
CREATE INDEX idx_history_date ON analysis_history(analyzed_at);

-- ============================================
-- Triggers pour mise à jour automatique
-- ============================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur requirements
CREATE TRIGGER update_requirements_updated_at
    BEFORE UPDATE ON requirements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger sur scf_controls
CREATE TRIGGER update_scf_controls_updated_at
    BEFORE UPDATE ON scf_controls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger sur compliance_mappings
CREATE TRIGGER update_compliance_mappings_updated_at
    BEFORE UPDATE ON compliance_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Vues utiles
-- ============================================

-- Vue: Exigences avec leurs mappings actifs
CREATE OR REPLACE VIEW v_requirements_with_mappings AS
SELECT 
    r.id,
    r.original_id,
    r.requirement,
    r.verification_point,
    r.source_file,
    r.analysis_status,
    cm.scf_mapping,
    cm.iso27001_mapping,
    cm.iso27002_mapping,
    cm.cobit5_mapping,
    cm.analysis,
    cm.confidence_score,
    cm.mapping_source,
    r.imported_at,
    r.updated_at
FROM requirements r
LEFT JOIN compliance_mappings cm ON r.id = cm.requirement_id AND cm.is_active = TRUE;

-- Vue: Statistiques d'analyse
CREATE OR REPLACE VIEW v_analysis_stats AS
SELECT 
    COUNT(*) as total_requirements,
    COUNT(CASE WHEN analysis_status = 'analyzed' THEN 1 END) as analyzed_count,
    COUNT(CASE WHEN analysis_status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN analysis_status = 'manual' THEN 1 END) as manual_count,
    ROUND(AVG(CASE WHEN cm.confidence_score IS NOT NULL THEN cm.confidence_score END), 2) as avg_confidence
FROM requirements r
LEFT JOIN compliance_mappings cm ON r.id = cm.requirement_id AND cm.is_active = TRUE;

-- ============================================
-- Données de test (optionnel)
-- ============================================

-- Insérer quelques contrôles SCF de test
INSERT INTO scf_controls (control_id, control_title, control_description, domain, category) VALUES
('SCF-IAC-01', 'Identity & Access Management', 'Implement identity and access management controls', 'Identity & Access Control', 'Access Control'),
('SCF-CRY-01', 'Cryptographic Controls', 'Implement cryptographic controls for data protection', 'Cryptography', 'Encryption'),
('SCF-LOG-01', 'Logging & Monitoring', 'Implement comprehensive logging and monitoring', 'Security Operations', 'Monitoring')
ON CONFLICT (control_id) DO NOTHING;

-- ============================================
-- Commentaires sur les tables
-- ============================================

COMMENT ON TABLE requirements IS 'Stocke les exigences extraites des fichiers Excel';
COMMENT ON TABLE scf_controls IS 'Référentiel des contrôles SCF (Secure Controls Framework)';
COMMENT ON TABLE compliance_mappings IS 'Mappings entre exigences et frameworks de conformité';
COMMENT ON TABLE analysis_history IS 'Historique des analyses IA avec coûts et performances';

COMMENT ON COLUMN requirements.analysis_status IS 'Statut: pending (en attente), analyzed (analysé par IA), manual (saisi manuellement)';
COMMENT ON COLUMN compliance_mappings.confidence_score IS 'Score de confiance de 0.00 à 1.00 pour les mappings générés par IA';
COMMENT ON COLUMN compliance_mappings.mapping_source IS 'Source: manual (manuel), ai (IA), imported (importé)';

-- ============================================
-- Fin du schéma
-- ============================================

-- Afficher un résumé
SELECT 'Schema created successfully!' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

