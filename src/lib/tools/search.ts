import { z } from 'zod';
import { PRIVATE_EXA_API_KEY } from '$env/static/private';

export const googleSearchTool = {
  name: 'search_google',
  description: 'Effectue une recherche web via Exa.ai',
  parameters: z.object({
    query: z.string().describe('Les mots clés de recherche'),
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
        query,
        num_results: limit,
        type: "keyword"
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erreur Exa.ai, ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return {
      results: data.results.map((result: any) => ({
        title: result.title,
        url: result.url,
        text: result.text,
        highlights: result.highlights,
        publishedDate: result.publishedDate,
        author: result.author,
        score: result.score,
        autopromptString: data.autopromptString
      }))
    };
  }
};
