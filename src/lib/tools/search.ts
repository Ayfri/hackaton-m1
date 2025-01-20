import { z } from 'zod';

export const googleSearchTool = {
  name: 'search_google',
  description: 'Effectue une recherche Google',
  parameters: z.object({
    query: z.string().describe('Les termes de recherche'),
    limit: z.number().optional().default(5).describe('Nombre maximum de résultats')
  }),
  execute: async ({ query, limit }: { query: string; limit?: number }) => {
    // Simulation de résultats
    return {
      results: [
        {
          title: `Résultat simulé 1 pour "${query}"`,
          snippet: "Ceci est un extrait simulé du premier résultat...",
          url: `https://example.com/1?q=${encodeURIComponent(query)}`
        },
        {
          title: `Résultat simulé 2 pour "${query}"`,
          snippet: "Ceci est un extrait simulé du deuxième résultat...",
          url: `https://example.com/2?q=${encodeURIComponent(query)}`
        }
      ].slice(0, limit)
    };
  }
};
