import { z } from 'zod';

export const musicSearchTool = {
  name: 'search_music',
  description: 'Cherche et lance une musique',
  parameters: z.object({
    query: z.string().describe('Les termes de recherche pour trouver la musique'),
    limit: z.number().optional().default(5).describe('Nombre maximum de résultats')
  }),
  execute: async ({ query, limit }: { query: string; limit?: number }) => {
    // Simulation de résultats
    return {
      results: [
        {
          title: `${query} - Titre simulé 1`,
          artist: "Artiste simulé 1",
          duration: "3:45"
        },
        {
          title: `${query} - Titre simulé 2`,
          artist: "Artiste simulé 2",
          duration: "4:12"
        }
      ].slice(0, limit)
    };
  }
};
