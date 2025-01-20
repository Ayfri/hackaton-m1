import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { openai } from '$lib/openai';
import { db } from '$lib/db';
import { roles, transcriptions, type Role } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

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

    const transcription = await openai.audio.transcriptions.create({
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
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Tu es un assistant virtuel sympathique et serviable. Réponds de manière concise et naturelle en français.'
        },
        {
          role: 'user',
          content: transcription.text
        }
      ],
      max_tokens: 150
    });

    const botReply = chatResponse.choices[0]?.message?.content || "Désolé, je n'ai pas pu générer une réponse.";

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
      botReply
    });
  } catch (error) {
    console.error('Error processing audio:', error);
    return json({ error: 'Failed to process audio' }, { status: 500 });
  }
}) satisfies RequestHandler;
