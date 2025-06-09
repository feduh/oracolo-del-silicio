// lib/ragService.ts
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import fs from 'fs/promises';
import path from 'path';

// --- INIZIALIZZAZIONE ---
const embeddings = new OpenAIEmbeddings({ apiKey: process.env.OPENAI_API_KEY });
let vectorStore: MemoryVectorStore | null = null;

/**
 * Estrae ricorsivamente tutto il testo da un oggetto o array JSON, 
 * mantenendo il contesto dei nomi delle proprietà per dare più significato al testo.
 * @param obj L'oggetto/array da cui estrarre il testo.
 * @param prefix Un prefisso per contestualizzare il testo (es. "Capitolo Storia: ").
 * @returns Una stringa di testo concatenata.
 */
function recursivelyExtractText(obj: unknown, prefix = ''): string {
    let text = '';
    // Ignora i valori nulli o non-oggetti
    if (obj === null || typeof obj !== 'object') {
        return '';
    }

    // Itera su tutte le chiavi dell'oggetto o indici dell'array
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = (obj as Record<string, unknown>)[key];
            // Crea un nuovo prefisso per dare contesto. Se è un array, non aggiunge l'indice numerico.
            const newPrefix = Array.isArray(obj) ? prefix : (prefix ? `${prefix} > ${key}` : key);

            if (typeof value === 'string' && value.trim() !== '') {
                // Se il valore è una stringa, lo aggiunge al testo finale con il suo contesto.
                text += `${newPrefix}: ${value}\n`;
            } else if (typeof value === 'object') {
                // Se è un altro oggetto o array, continua la ricerca al suo interno.
                text += recursivelyExtractText(value, newPrefix);
            }
        }
    }
    return text;
}

/**
 * Carica i dati dai file JSON, li elabora e costruisce l'indice vettoriale in memoria.
 * Questa funzione viene eseguita una sola volta all'avvio del server.
 */
export async function buildVectorStore() {
    // Evita di ricostruire l'indice se è già presente (es. in ambienti di sviluppo con hot-reloading)
    if (vectorStore) {
        console.log("Vector store already exists. Skipping build.");
        return;
    }

    console.log("Building vector store from scratch...");
    const dataFolderPath = path.join(process.cwd(), 'data');

    try {
        const files = await fs.readdir(dataFolderPath);
        const jsonFiles = files.filter(file => file.endsWith('.json'));

        if (jsonFiles.length === 0) {
            console.warn("No JSON files found in data/ folder. RAG service will be inactive.");
            return;
        }

        let allTextContent = "";
        for (const file of jsonFiles) {
            const filePath = path.join(dataFolderPath, file);
            try {
                const rawData = await fs.readFile(filePath, 'utf-8');
                const jsonData = JSON.parse(rawData);
                // Usa la funzione ricorsiva per estrarre il testo in modo robusto
                allTextContent += recursivelyExtractText(jsonData) + "\n===\n";
            } catch (e) {
                console.error(`Error processing file ${file}:`, e);
            }
        }

        if (!allTextContent.trim()) {
            console.warn("No text could be extracted from JSON files. RAG service will be inactive.");
            return;
        }

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const docs = await splitter.createDocuments([allTextContent]);

        console.log(`Created ${docs.length} document chunks. Creating embeddings...`);
        
        // Crea l'indice vettoriale usando i documenti e il client per gli embeddings
        vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);
        
        console.log(`Indexing complete. Vector store is ready with ${docs.length} documents.`);

    } catch (e) {
        console.error("A critical error occurred while building the vector store:", e);
        vectorStore = null;
    }
}

/**
 * Cerca nell'indice i documenti più pertinenti a una data domanda.
 * @param query La domanda dell'utente.
 * @param k Il numero di risultati da restituire (default: 5).
 * @returns Una stringa contenente il testo dei documenti più simili.
 */
export async function retrieveAndAugment(query: string, k: number = 5): Promise<string> {
    if (!vectorStore) {
        console.warn("Vector store is not available for retrieval.");
        return "";
    }

    console.log(`Searching for ${k} most similar documents for query: "${query}"`);

    // Usa il metodo ottimizzato di MemoryVectorStore per la ricerca di similarità
    const searchResults = await vectorStore.similaritySearch(query, k);

    if (searchResults.length === 0) {
        console.log("No relevant documents found.");
        return "";
    }

    const retrievedText = searchResults
        .map(result => result.pageContent)
        .join("\n\n---\n\n");

    console.log(`Retrieved ${searchResults.length} chunks for context.`);
    return retrievedText;
}

// Avvia la costruzione dell'indice all'avvio del server.
buildVectorStore();