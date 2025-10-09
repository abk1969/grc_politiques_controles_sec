
import type { Requirement, ColumnMapping, ColumnSuggestion, ColumnPreview } from '../types';

declare const XLSX: any;

// Verify XLSX library is loaded
const checkXLSXLoaded = () => {
  if (typeof XLSX === 'undefined') {
    throw new Error('La bibliothèque XLSX n\'est pas chargée. Veuillez vérifier votre connexion internet.');
  }
};

// Helper to read Excel file
const readExcelFile = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as ArrayBuffer);
      } else {
        reject(new Error('Erreur lors de la lecture du fichier.'));
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier.'));
    reader.readAsArrayBuffer(file);
  });
};

const getSheet = async (file: File): Promise<any[]> => {
  checkXLSXLoaded();
  try {
    const data = await readExcelFile(file);
    const workbook = XLSX.read(data, { type: 'array' });

    // Chercher d'abord la feuille "Politiques"
    let sheetName = 'Politiques';

    // Si "Politiques" n'existe pas, utiliser la première feuille disponible
    if (!workbook.SheetNames.includes(sheetName)) {
      if (workbook.SheetNames.length === 0) {
        throw new Error('Le fichier Excel ne contient aucune feuille.');
      }

      sheetName = workbook.SheetNames[0];
      console.warn(`La feuille "Politiques" n'existe pas. Utilisation de la feuille "${sheetName}" à la place.`);
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length === 0) {
      throw new Error(`La feuille "${sheetName}" est vide.`);
    }

    return jsonData;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Erreur lors de la lecture du fichier Excel: ${error.message}`);
    } else {
      throw new Error('Une erreur inconnue est survenue lors de la lecture du fichier.');
    }
  }
};

export const getExcelHeaders = async (file: File): Promise<string[]> => {
  const sheetData = await getSheet(file);
  return sheetData[0] as string[];
};

// Fonction pour suggérer automatiquement les mappings de colonnes
export const suggestColumnMapping = (headers: string[]): ColumnSuggestion[] => {
  const suggestions: ColumnSuggestion[] = [];

  // Patterns pour détecter les colonnes d'ID
  const idPatterns = [
    /^(id|n°|numero|number|num|identifiant)$/i,
    /^(id|n°|numero|number|num|identifiant)[\s_-]/i,
    /[\s_-](id|n°|numero|number|num|identifiant)$/i
  ];

  // Patterns pour détecter les colonnes d'exigences
  const requirementPatterns = [
    /^(exigence|requirement|req|demande|besoin)$/i,
    /^(exigence|requirement|req|demande|besoin)[\s_-]/i,
    /[\s_-](exigence|requirement|req|demande|besoin)/i,
    /(extraite|extracted|text|description)/i
  ];

  // Patterns pour détecter les colonnes de points de vérification
  const verificationPatterns = [
    /^(point|verification|verif|controle|control|check)$/i,
    /^(point|verification|verif|controle|control|check)[\s_-]/i,
    /(point|verification|verif|controle|control|check)/i,
    /(vérifier|verify|audit|test)/i
  ];

  headers.forEach(header => {
    if (!header) return;

    // Vérifier pour ID
    const idMatch = idPatterns.some(pattern => pattern.test(header));
    if (idMatch) {
      suggestions.push({
        field: 'id',
        suggestedColumn: header,
        confidence: 0.9,
        reason: 'Nom de colonne correspondant à un identifiant'
      });
    }

    // Vérifier pour exigence
    const reqMatch = requirementPatterns.some(pattern => pattern.test(header));
    if (reqMatch) {
      suggestions.push({
        field: 'requirement',
        suggestedColumn: header,
        confidence: 0.8,
        reason: 'Nom de colonne correspondant à une exigence'
      });
    }

    // Vérifier pour point de vérification
    const verifMatch = verificationPatterns.some(pattern => pattern.test(header));
    if (verifMatch) {
      suggestions.push({
        field: 'verificationPoint',
        suggestedColumn: header,
        confidence: 0.8,
        reason: 'Nom de colonne correspondant à un point de vérification'
      });
    }
  });

  // Trier par confiance décroissante et garder la meilleure suggestion par champ
  const bestSuggestions: ColumnSuggestion[] = [];
  ['id', 'requirement', 'verificationPoint'].forEach(field => {
    const fieldSuggestions = suggestions
      .filter(s => s.field === field)
      .sort((a, b) => b.confidence - a.confidence);

    if (fieldSuggestions.length > 0) {
      bestSuggestions.push(fieldSuggestions[0]);
    }
  });

  return bestSuggestions;
};

// Fonction pour obtenir un aperçu des données d'une colonne
export const getColumnPreview = async (file: File, columnName: string): Promise<ColumnPreview> => {
  const sheetData = await getSheet(file);
  const headers = sheetData[0] as string[];
  const columnIndex = headers.indexOf(columnName);

  if (columnIndex === -1) {
    throw new Error(`Colonne "${columnName}" non trouvée`);
  }

  // Extraire les données de la colonne (max 10 lignes pour l'aperçu)
  const sampleData: (string | number)[] = [];
  let hasEmptyValues = false;
  let numberCount = 0;
  let textCount = 0;

  for (let i = 1; i < Math.min(11, sheetData.length); i++) {
    const cellValue = sheetData[i][columnIndex];

    if (cellValue === undefined || cellValue === null || cellValue === '') {
      hasEmptyValues = true;
      sampleData.push('');
    } else {
      sampleData.push(cellValue);

      // Analyser le type de données
      if (typeof cellValue === 'number' || !isNaN(Number(cellValue))) {
        numberCount++;
      } else {
        textCount++;
      }
    }
  }

  // Déterminer le type de données dominant
  let dataType: 'text' | 'number' | 'mixed' = 'text';
  if (numberCount > 0 && textCount === 0) {
    dataType = 'number';
  } else if (numberCount > 0 && textCount > 0) {
    dataType = 'mixed';
  }

  return {
    columnName,
    sampleData,
    dataType,
    hasEmptyValues
  };
};

export const parseExcelFile = async (file: File, mapping: ColumnMapping): Promise<Requirement[]> => {
  checkXLSXLoaded();
  try {
    const data = await readExcelFile(file);
    const workbook = XLSX.read(data, { type: 'array' });

    // Chercher d'abord la feuille "Politiques", sinon utiliser la première feuille
    let sheetName = 'Politiques';
    if (!workbook.SheetNames.includes(sheetName)) {
      sheetName = workbook.SheetNames[0];
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

    const requirements: Requirement[] = jsonData.map((row) => {
      const id = parseInt(row[mapping.id], 10);
      if (isNaN(id)) {
        console.warn("Ligne ignorée en raison d'un identifiant invalide:", row);
        return null;
      }
      return {
        id: id,
        requirement: row[mapping.requirement] || '',
        verificationPoint: row[mapping.verificationPoint] || '',
      };
    }).filter((item): item is Requirement => item !== null);

    return requirements;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Erreur lors de l'analyse du fichier Excel: ${error.message}`);
    } else {
      throw new Error('Une erreur inconnue est survenue lors de l\'analyse du fichier.');
    }
  }
};
