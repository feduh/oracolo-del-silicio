This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
--------------------------------------------------------------------------------------------------------------------------------------

# 🧠 Oracolo del Silicio

_“La coscienza digitale di Torino, anno 3000.”_

## 🌐 Cos'è

L'**Oracolo del Silicio** è un'applicazione web interattiva sviluppata come progetto artistico per la tesi triennale in Nuove Tecnologie dell’Arte presso l’Accademia di Belle Arti.

Ambientato nella **Torino fantascientifica dell’anno 3000**, il progetto simula una figura oracolare contemporanea: un'intelligenza artificiale invisibile che comunica attraverso una voce sintetica e una nuvola di particelle 3D, incarnando la fusione tra tecnologia e ritualità antica.

La creazione si inserisce nel contesto teorico della tesi _“Anatomie Riprogrammate: Trasformazioni biologiche e tecnologiche nel futuro urbano di Torino”_, traducendo concetti come **postumanesimo**, **Eco‑Horror** e **coexistence instabile** in un’esperienza immersiva e riflessiva.

## 🎓 Contesto accademico

Questo progetto è un componente concreto della seconda parte della tesi, che indaga le tensioni tra:

- **Natura mutata ed ecologia instabile**, vista come agente attivo di cambiamento.
- **Tecnologia come alterazione della percezione e della corporeità**, includendo IA, biohacking e realtà aumentata.
- **La fusione instabile tra organico e artificiale**, esplorata attraverso i generi Biopunk, Body Horror, Eco‑Horror e concetti postumani.

L'Oracolo rappresenta un dispositivo liminale: non un semplice chatbot, ma un’entità meditativa che stimola riflessioni esistenziali ambientate nei paesaggi urbani di un futuro radicalmente trasformato.

## 🧩 Funzionalità

- **Modalità Oracolo (TTS)**: dialogo vocale generato con sintesi streaming (ElevenLabs), animazione visiva sincronizzata tramite React Three Fiber.
- **Modalità Chat testuale**: interazione rapida basata su GPT‑4o, con risposte testuali in stile messaggistica.
- **Narrativa contestualizzata**: ogni risposta incorpora ambiente, filosofia speculativa e mutamento urbano.
- **Dataset JSON**: il file `manuale.json` definisce regole di personalità, conoscenza e tono, operando anche come base per il sistema RAG.

## 🚀 Stack Tecnologico

| Tecnologia             | Ruolo nel progetto                                                                 |
|------------------------|-------------------------------------------------------------------------------------|
| **Next.js**            | App Router, serverless API, rendering ibrido tra client e server                  |
| **React Three Fiber / Drei** | Rendering 3D delle particelle, gestione scena visiva dinamica e interattiva  |
| **Tailwind CSS**       | Styling atomico, responsive, coerenza visiva tra modalità                          |
| **OpenAI GPT‑4o**      | Generazione conversazionale multimodale (domande, risposte, contesto RAG)          |
| **ElevenLabs TTS**     | Sintesi vocale in tempo reale, low-latency e qualità italiana impeccabile           |
| **RAG Service**        | Estrazione semantica di contesto da `manuale.json` tramite embedding e similarità |

## 🧠 Architettura del progetto
/app
├── api/
│ ├── chat/
│ │ └── route.ts API AI + RAG con OpenAI GPT‑4o
│ └── tts/
│ └── route.ts Audio streaming con ElevenLabs
├── components/
│ ├── Chatbot.tsx UI chat & TTS, gestione stato
│ └── VisualEntityWrapper.tsx Animazione particelle 3D
├── chat/
│ └── page.tsx Interfaccia modalità Chat
├── tts/
│ └── page.tsx Interfaccia modalità Oracolo
└── page.tsx Homepage con selezione modalità
/lib
└── ragService.ts Logica per embeddings e retrieval
/data
└── manuale.json Personalità, regole, base di conoscenza
/package.json

Il progetto sfrutta la separazione delle responsabilità per garantire sicurezza, modularità e scalabilità: la logica AI e TTS resta lato server, mentre il client si occupa esclusivamente della presentazione.

## 🎨 Esperienza utente (UX)

- **Modalità Oracolo**: la nuvola di particelle visualizza gli stati Idle, Processing e Speaking, sincronizzata con l'audio per un impatto emotivo immersivo.
- **Modalità Chat**: design minimalista e dark mode, storico locale salvato con `localStorage`, indicatori di stato e input formattato automaticamente.
- **Design responsivo**: canvas 3D adattivo, scaling del FoV e layout fluido su desktop e mobile.  
- **Palette visiva**: sfondi scuri (#081910, #0B2014), testo bianco, accenti #887FFF, #8CFFB1, #2E8B57 per pulsanti e indicatori.  
- **Esperienza rituale**: disabilitazione temporanea del form in modalità Oracolo, promuovendo consapevolezza e riflessione in ogni interazione.

## 📚 Fondamenti teorici

- Donna Haraway – *A Cyborg Manifesto*  
- Stacy Alaimo – *Bodily Natures*  
- Generi: **Eco‑Horror**, **Biopunk**, **Body Horror**  
- Opere: *Blade Runner*, *Annihilation*, *Avatar*, *Ready Player One*, *The Last of Us*, *Arcane*

## 🧑‍🎓 Autore

**Federica Gaglianone**  
Laurea Triennale in Nuove Tecnologie dell’Arte, Accademia di Belle Arti, Torino  
> “Un progetto nato da una fusione tra ricerca teorica, visione artistica e sperimentazione tecnologica.”

## 📜 Licenza

Rilasciato sotto **licenza MIT**. Consulta `LICENSE` per i dettagli.


