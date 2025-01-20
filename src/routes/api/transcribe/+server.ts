import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { openai } from '$lib/openai';
import { db } from '$lib/db';
import { transcriptions } from '$lib/db/schema';

export const POST = (async ({ request }) => {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');

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
    });

    // Analyze command
    let command = null;
    const text = transcription.text.toLowerCase();

    if (text.includes('météo')) {
      command = 'weather';
    } else if (text.includes('musique')) {
      command = 'music';
    } else if (text.includes('mail')) {
      command = 'email';
    }

    return json({
      text: transcription.text,
      command
    });
  } catch (error) {
    console.error('Error processing audio:', error);
    return json({ error: 'Failed to process audio' }, { status: 500 });
  }
}) satisfies RequestHandler;
