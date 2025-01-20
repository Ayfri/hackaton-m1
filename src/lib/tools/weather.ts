import { z } from 'zod';

import { PRIVATE_OPENWEATHER_API_KEY } from '$env/static/private';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

export const weatherTool = {
  name: 'get_weather',
  description: 'Obtient la météo actuelle pour une ville donnée',
  parameters: z.object({
    city: z.string().describe('Le nom de la ville dont on veut la météo'),
    country: z.string().optional().describe('Le code pays optionnel (ex: FR, US)')
  }).describe('Paramètres pour obtenir la météo'),
  execute: async ({ city, country }: { city: string; country?: string }) => {
    if (!PRIVATE_OPENWEATHER_API_KEY) {
      throw new Error('OPENWEATHER_API_KEY non configurée dans le fichier .env');
    }

    const location = country ? `${city},${country}` : city;
    const response = await fetch(
      `${BASE_URL}?q=${location}&appid=${PRIVATE_OPENWEATHER_API_KEY}&units=metric&lang=fr`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erreur météo: ${error.message || 'Impossible de récupérer la météo'}`);
    }

    const data = await response.json();
    return {
      temperature: data.main.temp,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed
    };
  }
};
