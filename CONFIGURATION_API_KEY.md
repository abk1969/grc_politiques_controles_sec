# 🔑 Configuration de la Clé API Gemini

## ❌ Problème Actuel

L'application affiche l'erreur suivante :
```
API key not valid. Please pass a valid API key.
```

**Cause :** La clé API Gemini n'est pas configurée ou est invalide.

## ✅ Solution Rapide

### Option 1 : Outil de Configuration Interactif (Recommandé)

J'ai ouvert un outil de configuration dans votre navigateur : `configure-api-key.html`

**Étapes :**
1. ✅ Cliquez sur "Obtenir une Clé API Gemini"
2. ✅ Connectez-vous à Google AI Studio
3. ✅ Créez une clé API (gratuit)
4. ✅ Copiez la clé
5. ✅ Collez-la dans l'outil
6. ✅ Cliquez sur "Télécharger le fichier .env.local"
7. ✅ Placez le fichier téléchargé à la racine du projet
8. ✅ Redémarrez le serveur

### Option 2 : Configuration Manuelle

1. **Obtenez votre clé API :**
   - Allez sur : https://aistudio.google.com/app/apikey
   - Connectez-vous avec votre compte Google
   - Cliquez sur "Create API Key"
   - Copiez la clé (commence par `AIza...`)

2. **Modifiez le fichier .env.local :**
   
   Ouvrez le fichier `.env.local` à la racine du projet et remplacez :
   ```
   GEMINI_API_KEY=VOTRE_CLE_API_ICI
   ```
   
   Par votre vraie clé :
   ```
   GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

3. **Redémarrez le serveur :**
   ```bash
   # Arrêtez le serveur (Ctrl+C)
   # Puis redémarrez
   npm run dev
   ```

4. **Rechargez la page** dans votre navigateur

## 🎯 Vérification

Après configuration, vous devriez :

1. ✅ Ne plus voir l'erreur "API key not valid"
2. ✅ Pouvoir uploader votre fichier Excel
3. ✅ Voir le modal de mapping s'ouvrir
4. ✅ Pouvoir confirmer le mapping
5. ✅ Voir l'analyse IA démarrer avec succès

## 🆓 Quota Gratuit Gemini

Google offre un quota gratuit généreux :
- **60 requêtes par minute**
- **1500 requêtes par jour**
- **1 million de tokens par mois**

C'est largement suffisant pour tester et développer !

## 🔒 Sécurité

**Important :**
- ❌ Ne commitez JAMAIS le fichier `.env.local` dans Git
- ❌ Ne partagez JAMAIS votre clé API publiquement
- ✅ Le fichier `.env.local` est déjà dans `.gitignore`
- ✅ Votre clé reste privée sur votre machine

## 🐛 Dépannage

### La clé ne fonctionne toujours pas

1. **Vérifiez le format :**
   - La clé doit commencer par `AIza`
   - Pas d'espaces avant ou après
   - Pas de guillemets autour de la clé

2. **Vérifiez le fichier :**
   ```bash
   # Le fichier doit être exactement nommé
   .env.local
   
   # Et contenir
   GEMINI_API_KEY=AIzaVotreCléIci
   ```

3. **Redémarrez complètement :**
   - Arrêtez le serveur (Ctrl+C)
   - Fermez le terminal
   - Ouvrez un nouveau terminal
   - Relancez `npm run dev`

### La clé est valide mais l'erreur persiste

1. **Vérifiez que le fichier .env.local est à la racine :**
   ```
   poli_cont_app/
   ├── .env.local          ← ICI
   ├── package.json
   ├── vite.config.ts
   └── ...
   ```

2. **Vérifiez la configuration Vite :**
   Le fichier `vite.config.ts` doit exposer la variable :
   ```typescript
   define: {
     'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
   }
   ```

3. **Rechargez complètement la page :**
   - Ctrl+Shift+R (hard reload)
   - Ou videz le cache du navigateur

## 📊 Test de la Configuration

Une fois la clé configurée, testez avec votre fichier Excel :

1. **Upload du fichier** : `202500908_Extratc_Exig_IA_Politiques_contrôles_vf.xlsx`
2. **Mapping automatique** : Les colonnes devraient être détectées
3. **Confirmation** : Cliquez sur "Confirmer le Mapping"
4. **Analyse IA** : L'analyse devrait démarrer sans erreur

## 🎉 Prochaines Étapes

Une fois la clé API configurée :

1. ✅ L'application pourra analyser vos exigences
2. ✅ Gemini AI mappera automatiquement aux frameworks (SCF, ISO 27001/27002, COBIT 5)
3. ✅ Vous pourrez voir le dashboard avec les résultats
4. ✅ Vous pourrez discuter avec l'IA pour chaque exigence

## 💡 Conseils

- **Testez d'abord** avec un petit fichier Excel (quelques lignes)
- **Surveillez** la console du navigateur (F12) pour les erreurs
- **Utilisez** le quota gratuit pour développer
- **Passez à un plan payant** seulement si nécessaire en production

## 📞 Support

Si vous rencontrez toujours des problèmes :

1. Vérifiez la console du navigateur (F12)
2. Vérifiez les logs du serveur dans le terminal
3. Assurez-vous que la clé API est active sur Google AI Studio
4. Vérifiez que vous n'avez pas atteint les limites de quota

---

**Fichiers de Configuration Créés :**
- ✅ `configure-api-key.html` - Outil interactif de configuration
- ✅ `.env.local` - Fichier de configuration (à compléter)
- ✅ Ce guide - Instructions détaillées

**Configurez votre clé API maintenant et testez l'application ! 🚀**

