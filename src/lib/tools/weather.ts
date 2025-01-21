// Importation de la bibliothèque Zod pour la validation des données
import { z } from 'zod';

// Importation de la clé API privée pour accéder aux services d'OpenWeather depuis les variables d'environnement
import { PRIVATE_OPENWEATHER_API_KEY } from '$env/static/private';

// Définition de l'URL de base de l'API OpenWeather pour récupérer la météo
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Définition de l'objet weatherTool qui contient la logique de récupération de la météo
export const weatherTool = {
  // Nom du tool (utilisé pour identifier ce tool spécifique)
  name: 'get_weather',

  // Description du tool
  description: 'Obtient la météo actuelle pour une ville donnée',

  // Définition des paramètres que ce tool accepte, avec validation via Zod
  parameters: z.object({
    // Paramètre requis : le nom de la ville
    city: z.string().describe('Le nom de la ville dont on veut la météo'),
    
    // Paramètre optionnel : le code pays (ex : FR pour la France, US pour les États-Unis)
    country: z.string().optional().describe('Le code pays optionnel (ex: FR, US)')
  }).describe('Paramètres pour obtenir la météo'),

  // Fonction exécutée pour récupérer la météo
  execute: async ({ city, country }: { city: string; country?: string }) => {
    
    // Vérification si la clé API est présente, sinon une erreur est lancée
    if (!PRIVATE_OPENWEATHER_API_KEY) {
      throw new Error('OPENWEATHER_API_KEY non configurée dans le fichier .env');
    }

    // Construction de l'emplacement pour la requête (ville et éventuellement le pays)
    const location = country ? `${city},${country}` : city;
    
    // Envoi de la requête à l'API OpenWeather pour obtenir la météo pour la ville spécifiée
    const response = await fetch(
      `${BASE_URL}?q=${location}&appid=${PRIVATE_OPENWEATHER_API_KEY}&units=metric&lang=fr`
    );

    // Si la réponse de l'API n'est pas valide (statut HTTP différent de 2xx), une erreur est lancée
    if (!response.ok) {
      // Récupération du message d'erreur de l'API
      const error = await response.json();
      throw new Error(`Erreur météo: ${error.message || 'Impossible de récupérer la météo'}`);
    }

    // Si la requête réussit, on parse les données JSON retournées
    const data = await response.json();

    // Retour des données météo sous forme d'objet avec température, description, humidité et vitesse du vent
    return {
      temperature: data.main.temp, // Température actuelle
      description: data.weather[0].description, // Description de l'état météo (ex: "Ensoleillé")
      humidity: data.main.humidity, // Taux d'humidité
      windSpeed: data.wind.speed // Vitesse du vent
    };
  }
};
