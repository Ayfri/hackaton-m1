import { z } from 'zod'; // Importation de la bibliothèque Zod pour la validation des données
import { PRIVATE_EXA_API_KEY } from '$env/static/private'; // Importation de la clé API privée depuis les variables d'environnement

// Définition de l'outil de recherche de musique
export const musicSearchTool = {
  name: 'search_music', // Nom de l'outil
  description: 'Cherche une musique sur YouTube ou Spotify', // Description de l'outil
  parameters: z.object({ // Définition des paramètres attendus pour l'outil
    query: z.string().describe('Les termes de recherche pour trouver la musique'), // Le terme de recherche sous forme de chaîne de caractères
    limit: z.number().optional().default(5).describe('Nombre maximum de résultats') // Le nombre de résultats à retourner (optionnel, par défaut 5)
  }),
  // Fonction exécutée pour effectuer la recherche
  execute: async ({ query, limit = 5 }: { query: string; limit?: number }) => {
    // Vérifie si la clé API est définie dans les variables d'environnement
    if (!PRIVATE_EXA_API_KEY) {
      throw new Error('EXA_API_KEY non configurée dans le fichier .env'); // Si la clé API est manquante, lance une erreur
    }

    // Envoi de la requête à l'API Exa.ai pour effectuer la recherche
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST', // La méthode HTTP utilisée pour la requête
      headers: {
        'Content-Type': 'application/json', // Spécifie que le corps de la requête sera en JSON
        'X-API-Key': PRIVATE_EXA_API_KEY, // Envoi de la clé API dans l'en-tête
      },
      body: JSON.stringify({
        query: `${query} site:(youtube.com OR spotify.com)`, // La requête de recherche, limitée à YouTube et Spotify
        num_results: limit, // Nombre maximum de résultats à retourner
        use_autoprompt: true // Utilisation de l'autoprompt pour affiner la recherche (optionnel)
      })
    });

    // Vérifie si la réponse de l'API est correcte
    if (!response.ok) {
      const error = await response.json(); // Récupère l'erreur détaillée si la réponse n'est pas OK
      throw new Error(`Erreur Exa.ai, ${JSON.stringify(error)}`); // Lance une erreur avec les détails de l'erreur API
    }

    // Récupération des résultats JSON retournés par l'API
    const data = await response.json();

    // Retourne une liste des résultats filtrés et formatés
    return {
      results: data.results
        .filter((result: any) => // Filtrage des résultats pour ne garder que ceux provenant de YouTube ou Spotify
          result.url.includes('youtube.com') || 
          result.url.includes('spotify.com')
        )
        .map((result: any) => ({ // Transformation des résultats pour un format plus lisible
          title: result.title, // Titre de la musique
          url: result.url, // URL de la musique
          platform: result.url.includes('youtube.com') ? 'YouTube' : 'Spotify', // Détection de la plateforme (YouTube ou Spotify)
          description: result.text, // Description de la musique
          publishedDate: result.publishedDate // Date de publication de la musique
        }))
    };
  }
};
