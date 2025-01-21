import { json } from '@sveltejs/kit'; // Importation de la fonction `json` pour renvoyer des réponses au format JSON
import type { RequestHandler } from './$types'; // Importation du type `RequestHandler` pour la gestion des requêtes HTTP
import { openai } from '$lib/openai'; // Importation de l'instance OpenAI pour interagir avec l'API OpenAI
import { db } from '$lib/db'; // Importation de la base de données pour stocker les transcriptions
import { roles, transcriptions, type Role } from '$lib/db/schema'; // Importation des schémas de base de données pour la gestion des rôles et des transcriptions
import { eq } from 'drizzle-orm'; // Fonction `eq` pour effectuer des requêtes dans la base de données
import { tools } from '$lib/tools'; // Importation des outils disponibles pour le chatbot
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs'; // Importation du type pour les messages de complétion de chat

// Définition d'une interface pour la géolocalisation
interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
}

// Définition de la requête POST pour gérer l'enregistrement des audios et l'interaction avec OpenAI
export const POST = (async ({ request }) => {
  try {
    // Extraction des données envoyées par l'utilisateur via un formulaire
    const formData = await request.formData();
    const audioFile = formData.get('audio'); // Récupère le fichier audio envoyé par l'utilisateur
    const user = formData.get('user') ?? 'user'; // Récupère le nom de l'utilisateur (par défaut 'user')
    const geolocationData = formData.get('geolocation'); // Récupère les données de géolocalisation
    let coordinates: GeolocationCoordinates | null = null;

    // Vérification et parsing des données de géolocalisation
    if (geolocationData) {
      try {
        coordinates = JSON.parse(geolocationData as string) as GeolocationCoordinates;
      } catch (e) {
        console.warn('Invalid geolocation data:', e);
      }
    }

    // Vérification que l'utilisateur est valide
    if (typeof user !== 'string') {
      return json({ error: 'Invalid user' }, { status: 400 });
    }

    // Vérification de la validité du rôle de l'utilisateur
    const role = formData.get('role') as Role | undefined;
    if (!role || !roles.includes(role)) {
      return json({ error: 'Invalid role' }, { status: 400 });
    }

    // Vérification de la présence du fichier audio et de son type
    if (!audioFile || !(audioFile instanceof Blob)) {
      return json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Conversion du fichier audio pour l'API OpenAI
    const file = new File([audioFile], 'audio.wav', { type: audioFile.type });

    // Appel à l'API OpenAI Whisper pour la transcription de l'audio
    let transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1', // Utilisation du modèle de transcription Whisper de OpenAI
    });

    // Enregistrement de la transcription dans la base de données
    await db.insert(transcriptions).values({
      text: transcription.text,
      timestamp: new Date(),
      user: user,
      role: role,
    });

    // Get all transcriptions for the user
    let userTranscriptions = await db.select().from(transcriptions).where(eq(transcriptions.user, user));

    // Préparation des messages pour l'API OpenAI pour générer une réponse
    const messages = [
      {
        role: 'system' as const,
        content: 'Tu es un assistant virtuel sympathique et serviable. Réponds de manière concise et naturelle en français.'
      },
    ] as ChatCompletionMessageParam[];

    messages.push(...userTranscriptions.map(transcription => ({
      role: transcription.role === 'bot' ? 'assistant' : 'user',
      content: transcription.text,
    }) as ChatCompletionMessageParam));

    messages.push({
      role: 'user' as const,
      content: transcription.text // Utilisation de la transcription de l'utilisateur comme contenu
    });

    // Appel à l'API OpenAI pour obtenir une réponse du chatbot
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Modèle GPT-4 utilisé pour générer la réponse
      messages,
      tools: tools.map(tool => ({
        type: 'function', // Outil de type fonction
        function: {
          name: tool.name, // Nom de l'outil
          description: tool.description, // Description de l'outil
          parameters: {
            type: "object", // Paramètres de type objet
            properties: tool.parameters.shape, // Définition des propriétés des paramètres
            required: Object.keys(tool.parameters.shape).filter(
              key => !tool.parameters.shape[key].isOptional() // Identification des paramètres obligatoires
            )
          }
        }
      })),
      tool_choice: 'auto' // Choix automatique des outils à utiliser
    });

    let responseMessage = completion.choices[0].message; // Récupère le message de réponse du chatbot

    // Stockage des résultats d'outils et de la géolocalisation
    let toolData: Record<string, any> = {
      ...Object.fromEntries(tools.map(tool => [tool.name, null])), // Initialisation des outils avec des résultats nuls
      geolocation: coordinates // Ajout de la géolocalisation
    };

    // Vérification si OpenAI demande l'utilisation d'un outil spécifique
    if (responseMessage.tool_calls) {
      const toolResults = await Promise.all(
        responseMessage.tool_calls.map(async (toolCall) => {
          const tool = tools.find(t => t.name === toolCall.function.name);
          if (!tool) {
            throw new Error(`Outil non trouvé: ${toolCall.function.name}`);
          }

          const args = JSON.parse(toolCall.function.arguments); // Arguments à passer à l'outil
          const result = await tool.execute(args); // Exécution de l'outil
          toolData[tool.name] = result; // Stockage du résultat de l'outil

          return {
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            content: JSON.stringify(result)
          };
        })
      );

      // Ajout des résultats des outils dans la conversation
      messages.push({
        role: 'assistant' as const,
        content: responseMessage.content, // Ajout du message du chatbot
        tool_calls: responseMessage.tool_calls // Ajout des appels d'outils
      });
      messages.push(...toolResults); // Ajout des résultats des outils

      // Nouvelle requête OpenAI pour finaliser la réponse
      const finalCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages
      });

      responseMessage = finalCompletion.choices[0].message;
    }

    // Vérification si la réponse contient un lien à ouvrir
    const botReply = responseMessage?.content || "Désolé, je n'ai pas pu générer une réponse.";

    // Enregistrement de la réponse du chatbot dans la base de données
    await db.insert(transcriptions).values({
      text: botReply,
      timestamp: new Date(),
      user: user,
      role: 'bot', // Le rôle est "bot" pour la réponse générée
    });

    // Get all transcriptions for the user
    userTranscriptions = await db.select().from(transcriptions).where(eq(transcriptions.user, user));

    // Renvoi de la réponse finale, y compris les transcriptions et les données des outils
    return json({
      transcriptions: userTranscriptions, // Liste des transcriptions de l'utilisateur
      botReply, // Réponse générée par le bot
      data: toolData // Données des outils exécutés
    });
  } catch (error) {
    console.error('Error processing audio:', error); // Gestion des erreurs
    return json({ error: 'Failed to process audio' }, { status: 500 }); // Réponse en cas d'erreur
  }
}) satisfies RequestHandler; // Déclaration que cette fonction satisfait à l'interface RequestHandler