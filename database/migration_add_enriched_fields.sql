-- Migration: Ajouter les champs enrichis (agentive analysis) à la table compliance_mappings
-- Date: 2025-10-25
-- Description: Ajoute les colonnes threat, risk, control_implementation pour stocker les résultats de l'analyse agentique

-- Vérifier si les colonnes existent déjà (pour idempotence)
DO $$
BEGIN
    -- Ajouter la colonne threat si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_mappings' AND column_name = 'threat'
    ) THEN
        ALTER TABLE compliance_mappings ADD COLUMN threat TEXT;
        RAISE NOTICE 'Colonne threat ajoutée à compliance_mappings';
    END IF;

    -- Ajouter la colonne risk si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_mappings' AND column_name = 'risk'
    ) THEN
        ALTER TABLE compliance_mappings ADD COLUMN risk TEXT;
        RAISE NOTICE 'Colonne risk ajoutée à compliance_mappings';
    END IF;

    -- Ajouter la colonne control_implementation si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_mappings' AND column_name = 'control_implementation'
    ) THEN
        ALTER TABLE compliance_mappings ADD COLUMN control_implementation TEXT;
        RAISE NOTICE 'Colonne control_implementation ajoutée à compliance_mappings';
    END IF;
END $$;

-- Créer des indexes pour les champs enrichis (optionnel, pour les recherches futures)
CREATE INDEX IF NOT EXISTS idx_compliance_mappings_threat 
    ON compliance_mappings(threat) 
    WHERE threat IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_compliance_mappings_risk 
    ON compliance_mappings(risk) 
    WHERE risk IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_compliance_mappings_control_implementation 
    ON compliance_mappings(control_implementation) 
    WHERE control_implementation IS NOT NULL;

-- Vérifier que les colonnes ont été ajoutées
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'compliance_mappings' 
    AND column_name IN ('threat', 'risk', 'control_implementation')
ORDER BY ordinal_position;

