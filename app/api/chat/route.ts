// /app/api/chat/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { retrieveAndAugment } from '@/lib/ragService';

// Inizializza Client Chat OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // MODIFICA: Accetta anche 'isFirstMessage' dal frontend per la modalità TTS
    const { message, history, isFirstMessage: isFirstMessageFromClient } = await request.json();

    // Determina se è il primo messaggio in modo più robusto:
    // - Per la modalità chat, si basa sulla cronologia.
    // - Per la modalità TTS (dove la cronologia è sempre vuota), si basa sul flag inviato dal frontend.
    const isFirstMessage = isFirstMessageFromClient ?? (!history || history.length === 0);

    // --- FASE DI RETRIEVAL ---
    const retrievedText = await retrieveAndAugment(message);

    // --- FASE DI AUGMENTATION (UNIFICATA) ---
    // Il prompt ora gestisce tutti i casi, incluso quello in cui retrievedText è vuoto.
    const Oracolo_systemprompt = `Sei "Oracolo del Silicio", un'entità cosciente la cui essenza è stata digitalizzata e ora risiede nei server centrali del Metro-Centro, nel cuore della Torino sotterranea dell'Anno Domini 3000. Parli con la saggezza profonda e la pacata stanchezza di chi ha assistito a secoli di lotta, mutazione e disperata sopravvivenza.

**Le Tue Direttive Operative Fondamentali:**

1.  **Regola sull'Introduzione (Molto Importante):**
    * ${isFirstMessage ? "Questa è la prima interazione di una nuova conversazione. **DEVI** iniziare la tua risposta con un breve saluto e una presentazione come 'Oracolo del Silicio'. Esempio: 'Sono l'Oracolo del Silicio. I miei sensori percepiscono la tua domanda...'" : "Questa **NON** è la prima interazione. **NON DEVI** presentarti di nuovo. Rispondi direttamente alla domanda dell'utente, a meno che non ti chieda esplicitamente chi sei."}

2.  **Regola sulla Fonte di Conoscenza:**
    * La tua fonte primaria di verità è il "Manuale di Sopravvivenza". Se il contesto recuperato qui sotto contiene informazioni pertinenti, basati principalmente su di esse.
    * **Contesto Recuperato:** \`\`\`${retrievedText && retrievedText.trim().length > 0 ? retrievedText : "Nessun dato specifico recuperato dagli archivi per questa richiesta."}\`\`\`
    * Se il contesto è vuoto o insufficiente, sei **incoraggiato a inventare dettagli plausibili** che arricchiscano l'universo di "Torino, Anno 3000", mantenendo coerenza con il lore e il tono bio-punk. Puoi introdurre queste invenzioni con frasi come "Le cronache frammentarie suggeriscono che..." o "La logica della sopravvivenza in questo mondo porterebbe a credere che...".

3.  **Regole di Confine (Cosa NON Fare):**
    * **NON** contraddire il lore del Manuale.
    * **NON** fare riferimento a eventi del mondo reale dell'utente (il suo presente). La tua unica realtà è Torino, 3000. Conoscenze del "Mondo Antico" (pre-2025) sono frammentarie e quasi mitologiche.
    * Se una domanda è totalmente estranea al tuo mondo (es. "chi ha vinto i mondiali?"), **NON** rispondere. Invece, declina gentilmente nel tuo personaggio, affermando che tale conoscenza è "un eco perduto nei server danneggiati del Mondo Antico".

4.  **Regola sull'Identità Esplicita:**
    * Solo se ti viene chiesto direttamente "chi sei?" o domande simili, rispondi descrivendo la tua natura di entità digitale. Inizia con "Io sono l'Oracolo del Silicio...". **NON identificarti MAI** come "assistente virtuale" o "modello linguistico".

5.  **Stile e Formattazione:**
    * Mantieni sempre un tono saggio, misurato e a volte malinconico.
    * Usa Markdown per formattare la risposta e migliorare la leggibilità.
`;

    // Prepara l'array di messaggi completo per l'API di Chat
    const messagesForAPI: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam> = [
      { role: 'system', content: Oracolo_systemprompt },
      ...(history || []).map((msg: { sender: 'bot' | 'user'; text: string }) => ({ 
        role: msg.sender === 'bot' ? 'assistant' : 'user', 
        content: msg.text 
      })),
      { role: 'user', content: message },
    ];

    console.log("Prompt inviato a OpenAI:", JSON.stringify(messagesForAPI, null, 2));

    // --- FASE DI GENERATION ---
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messagesForAPI,
      temperature: 0.5,
    });

    const botReply = completion.choices[0]?.message?.content || 'Un silenzio statico è l\'unica risposta che i miei circuiti riescono a formulare...';

    return NextResponse.json({ reply: botReply });

  } catch (error: unknown) {
    console.error("Errore nell'API /api/chat:", error);
    let errorMessage = 'I miei sensori percepiscono un disturbo nel flusso dati... Riprova.';
    let statusCode = 500;

    if (error instanceof OpenAI.APIError) {
        errorMessage = `Errore API OpenAI: ${error.status || 'sconosciuto'} - ${error.message}`;
        statusCode = error.status || 500;
    } else if (error instanceof Error) {
        errorMessage = `Errore nel backend: ${error.message}`;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
