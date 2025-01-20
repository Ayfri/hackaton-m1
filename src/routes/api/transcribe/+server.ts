import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { openai } from '$lib/openai';
import { db } from '$lib/db';
import { roles, transcriptions, type Role } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { tools } from '$lib/tools';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs';

export const POST = (async ({ request }) => {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    const user = formData.get('user') ?? 'user';
    if (typeof user !== 'string') {
      return json({ error: 'Invalid user' }, { status: 400 });
    }
    const role = formData.get('role') as Role | undefined;
    if (!role || !roles.includes(role)) {
      return json({ error: 'Invalid role' }, { status: 400 });
    }

    if (!audioFile || !(audioFile instanceof Blob)) {
      return json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Convert Blob to File for OpenAI API
    const file = new File([audioFile], 'audio.wav', { type: audioFile.type });

    let transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
    });

    // Save transcription to database
    await db.insert(transcriptions).values({
      text: transcription.text,
      timestamp: new Date(),
      user: user,
      role: role,
    });

    // Get a response from the chatbot
    const messages = [
      {
        role: 'system' as const,
        content: 'Tu es un assistant virtuel sympathique et serviable. Réponds de manière concise et naturelle en français.'
      },
      {
        role: 'user' as const,
        content: transcription.text
      }
    ] as ChatCompletionMessageParam[];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: "object",
            properties: tool.parameters.shape,
            required: Object.keys(tool.parameters.shape).filter(
              key => !tool.parameters.shape[key].isOptional()
            )
          }
        }
      })),
      tool_choice: 'auto'
    });

    // Changer responseMessage en let
    let responseMessage = completion.choices[0].message;

    let toolData: Record<string, any> = Object.fromEntries(tools.map(tool => [tool.name, null]));

    if (responseMessage.tool_calls) {
      const toolResults = await Promise.all(
        responseMessage.tool_calls.map(async (toolCall) => {
          const tool = tools.find(t => t.name === toolCall.function.name);
          if (!tool) {
            throw new Error(`Outil non trouvé: ${toolCall.function.name}`);
          }

          const args = JSON.parse(toolCall.function.arguments);
          const result = await tool.execute(args);
          toolData[tool.name] = result;  // Sauvegarde des données brutes

          return {
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            content: JSON.stringify(result)
          };
        })
      );

      // Ajouter les résultats des outils à la conversation
      messages.push({
        role: 'assistant' as const,
        content: responseMessage.content,
        tool_calls: responseMessage.tool_calls
      });
      messages.push(...toolResults);

      // Obtenir une réponse finale
      const finalCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages
      });

      responseMessage = finalCompletion.choices[0].message;
    }

    const botReply = responseMessage?.content || "Désolé, je n'ai pas pu générer une réponse.";

    // Save the bot reply to the database
    await db.insert(transcriptions).values({
      text: botReply,
      timestamp: new Date(),
      user: user,
      role: 'bot',
    });

    // Get all transcriptions for the user
    const userTranscriptions = await db.select().from(transcriptions).where(eq(transcriptions.user, user));

    return json({
      transcriptions: userTranscriptions,
      botReply,
      data: toolData  // Ajout des données brutes dans la réponse
    });
  } catch (error) {
    console.error('Error processing audio:', error);
    return json({ error: 'Failed to process audio' }, { status: 500 });
  }
}) satisfies RequestHandler;
