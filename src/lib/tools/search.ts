// Importation de la bibliothèque Zod pour la validation des paramètres
import { z } from 'zod';

// Importation de la clé API privée nécessaire pour accéder à l'API Exa.ai depuis les variables d'environnement
import { PRIVATE_EXA_API_KEY } from '$env/static/private';

// Définition de l'objet googleSearchTool qui contient la logique de recherche web via Exa.ai
export const googleSearchTool = {
  // Nom du tool (utilisé pour identifier ce tool spécifique)
  name: 'search_google',

  // Description du tool
  description: 'Effectue une recherche web via Exa.ai',

  // Définition des paramètres du tool, avec validation via Zod
  parameters: z.object({
    // Paramètre requis : les mots clés de recherche
    query: z.string().describe('Les mots clés de recherche'),

    // Paramètre optionnel : le nombre maximum de résultats à retourner (par défaut à 5)
    limit: z.number().optional().default(5).describe('Nombre maximum de résultats')
  }),

  // Fonction exécutée pour effectuer la recherche
  execute: async ({ query, limit = 5 }: { query: string; limit?: number }) => {

    // Vérification si la clé API est présente, sinon une erreur est lancée
    if (!PRIVATE_EXA_API_KEY) {
      throw new Error('EXA_API_KEY non configurée dans le fichier .env');
    }

    // Envoi d'une requête POST à l'API Exa.ai pour effectuer la recherche avec les mots-clés et la limite de résultats
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST', // Méthode HTTP utilisée pour la requête (POST)
      headers: {
        // En-têtes nécessaires pour la requête, y compris le type de contenu et la clé API
        'Content-Type': 'application/json',
        'X-API-Key': PRIVATE_EXA_API_KEY, // La clé API privée pour authentifier la requête
      },
      // Corps de la requête contenant les paramètres de la recherche, transformés en JSON
      body: JSON.stringify({
        query, // Les mots clés de la recherche
        num_results: limit, // Le nombre de résultats maximum
        type: "keyword" // Type de recherche (ici basé sur des mots clés)
      })
    });

    // Si la réponse de l'API n'est pas valide (statut HTTP différent de 2xx), une erreur est lancée
    if (!response.ok) {
      // Récupération du message d'erreur de l'API
      const error = await response.json();
      throw new Error(`Erreur Exa.ai, ${JSON.stringify(error)}`);
    }

    // Si la requête réussit, on parse les données JSON retournées par l'API
    const data = await response.json();

    // Retour des résultats sous forme d'objet avec les informations extraites des résultats de recherche
    return {
      results: data.results.map((result: any) => ({
        title: result.title, // Titre du résultat
        url: result.url, // URL du résultat
        text: result.text, // Texte associé au résultat
        highlights: result.highlights, // Points saillants du résultat
        publishedDate: result.publishedDate, // Date de publication du résultat
        author: result.author, // Auteur du contenu (si disponible)
        score: result.score, // Score de pertinence du résultat
        autopromptString: data.autopromptString // Chaîne de suggestion automatique (si disponible)
      }))
    };
  }
};
