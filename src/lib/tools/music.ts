import { z } from 'zod';
import { PRIVATE_EXA_API_KEY } from '$env/static/private';

export const musicSearchTool = {
  name: 'search_music',
  description: 'Cherche une musique sur YouTube ou Spotify',
  parameters: z.object({
    query: z.string().describe('Les termes de recherche pour trouver la musique'),
    limit: z.number().optional().default(5).describe('Nombre maximum de résultats')
  }),
  execute: async ({ query, limit = 5 }: { query: string; limit?: number }) => {
    if (!PRIVATE_EXA_API_KEY) {
      throw new Error('EXA_API_KEY non configurée dans le fichier .env');
    }

    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': PRIVATE_EXA_API_KEY,
      },
      body: JSON.stringify({
        query: `${query} site:(youtube.com OR spotify.com)`,
        num_results: limit,
        use_autoprompt: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erreur Exa.ai, ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return {
      results: data.results
        .filter((result: any) =>
          result.url.includes('youtube.com') ||
          result.url.includes('spotify.com')
        )
        .map((result: any) => ({
          title: result.title,
          url: result.url,
          platform: result.url.includes('youtube.com') ? 'YouTube' : 'Spotify',
          description: result.text,
          publishedDate: result.publishedDate
        }))
    };
  }
};
