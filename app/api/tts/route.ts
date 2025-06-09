// app/api/tts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';

// Inizializza il client di ElevenLabs.
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

/**
 * Rimuove i comuni marcatori Markdown dal testo per renderlo più discorsivo.
 * @param markdownText Il testo con Markdown.
 * @returns Il testo senza marcatori Markdown, ottimizzato per TTS.
 */
function stripMarkdown(markdownText: string): string {
  if (typeof markdownText !== 'string') return '';

  let text = markdownText;

  text = text.replace(/^#{1,6}\s+(.*)/gm, '$1 ');
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2'); 
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');   
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1');
  text = text.replace(/^\s*[-\*\+]\s+/gm, '');      
  text = text.replace(/^\s*\d+[\.\)]\s+/gm, '');    
  text = text.replace(/^\s*([-*_]){3,}\s*$/gm, '');
  text = text.replace(/```[\s\S]*?```/g, ' '); 
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/^\s*>\s?/gm, '');
  text = text.replace(/(\r\n|\n|\r)+/gm, ' . '); 
  text = text.replace(/\s\s+/g, ' ').trim();

  return text;
}


export async function POST(request: NextRequest) {
  try {
    const { 
      text, 
      // ***** AZIONE RICHIESTA *****
      // Un errore 404 significa quasi sempre che questo ID non è valido
      voice_id = 'W71zT1VwIFFx3mMGH2uZ', 
      stability = 0.5,
      similarity_boost = 0.75,
      style = 0.5,
      use_speaker_boost = true,
    } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Il testo è obbligatorio per il TTS' }, { status: 400 });
    }
    const plainTextForTTS = stripMarkdown(text);
    if (plainTextForTTS.trim().length === 0) {
        return NextResponse.json({ error: 'Il testo pulito risulta vuoto.' }, { status: 400 });
    }
    if (plainTextForTTS.trim().length > 5000) { 
        return NextResponse.json({ error: 'Il testo pulito supera la lunghezza massima consentita (5000 caratteri)' }, { status: 413 });
    }

    console.log(`Testo pulito inviato a ElevenLabs TTS con voice_id: ${voice_id}`);
    
    // Genera l'audio in streaming
    const audioStream = await elevenlabs.generate({
        voice: voice_id,
        text: plainTextForTTS,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
            stability: stability,
            similarity_boost: similarity_boost,
            style: style,
            use_speaker_boost: use_speaker_boost
        },
        output_format: 'mp3_44100_128'
    });

    if (!audioStream) {
        console.error('ElevenLabs API call succeeded but response body is null.');
        return NextResponse.json({ error: 'Risposta vuota dal servizio TTS dopo una chiamata riuscita.' }, { status: 500 });
    }

    // Convert Node.js Readable to a web ReadableStream
    const stream = new ReadableStream({
      async pull(controller) {
        for await (const chunk of audioStream) {
          controller.enqueue(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk);
        }
        controller.close();
      }
    });

    return new Response(stream, {
      status: 200,
      headers: { 
        'Content-Type': 'audio/mpeg',
      },
    });

  } catch (error: unknown) {
    console.error('Errore nella generazione TTS con ElevenLabs:', error);

    let errorMessage = 'Errore interno del server durante la generazione del parlato.';
    let statusCode = 500;

    if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
      errorMessage = (error as { message: string }).message;

      // ***** GESTIONE ERRORI MIGLIORATA *****
      if (errorMessage.includes('Unauthenticated')) {
          statusCode = 401;
          errorMessage = "Errore di autenticazione con ElevenLabs. Verifica che la tua ELEVENLABS_API_KEY sia corretta.";
      } else if (errorMessage.includes('permission denied')) {
          statusCode = 403;
          errorMessage = "Permesso negato. La tua chiave API potrebbe non avere i permessi necessari o il tuo piano potrebbe essere insufficiente.";
      } else if (errorMessage.includes('validation_error')) {
          statusCode = 400;
          errorMessage = `Errore di validazione con ElevenLabs: ${errorMessage}`;
      } else if (errorMessage.includes('404')) { // Gestione esplicita dell'errore 404
          statusCode = 404;
          errorMessage = `Errore 404 - Voce non trovata. Controlla che il voice_id che stai usando sia corretto e sia stato aggiunto al tuo "VoiceLab" su ElevenLabs.`;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
