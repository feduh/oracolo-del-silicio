'use client'

import React, { useState } from "react";
import Link from 'next/link';
import VisualEntityWrapper from "./components/VisualEntityWrapper"; 

import { Button, colorPalette, cn } from "./components/Chatbot";
import { MessageCircleMore, Volume2, Info, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CreditsModal = ({ onClose }: { onClose: () => void }) => {
    return (
        <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                
                className={cn(
                    "relative w-full max-w-lg p-6 md:p-8 rounded-lg shadow-lg border font-mono",
                    colorPalette.surface,
                    colorPalette.border,
                    colorPalette.textPrimary
                )}
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ duration: 0.2, ease: 'circOut' }}
                onClick={(e) => e.stopPropagation()}
            >
                <Button variant="ghost" onClick={onClose} className="absolute top-2 right-2 p-2" aria-label="Chiudi crediti">
                    <XCircle className="h-6 w-6" />
                </Button>
                
                <h2 className={cn("text-2xl font-bold mb-4", colorPalette.textTitle)}>
                    Crediti
                </h2>
                <div className="space-y-4 text-sm md:text-base text-left">
                    <div>
                        <h3 className={cn("font-bold", colorPalette.textHighlight)}>Sviluppato da:</h3>
                        <p className={cn(colorPalette.textPrimary)}>Federica Gaglianone</p>
                    </div>
                    <div>
                        <h3 className={cn("font-bold", colorPalette.textHighlight)}>Concept e Lore:</h3>
                        <p className={cn(colorPalette.textPrimary)}>&quot;Torino nell&apos;anno 3000 d.C.&quot;</p>
                        <p className={cn(colorPalette.textPrimary)}>Ideato da Federica Gaglianone & Google Gemini</p>
                    </div>
                    <div>
                        <h3 className={cn("font-bold", colorPalette.textHighlight)}>Tecnologie Principali:</h3>
                        <ul className={cn("list-disc list-inside space-y-1", colorPalette.textPrimary)}>
                            <li><span className={cn(colorPalette.textHighlight)}>IA (Linguaggio):</span> OpenAI GPT-4o</li>
                            <li><span className={cn(colorPalette.textHighlight)}>Sintesi Vocale (TTS):</span> ElevenLabs</li>
                            <li><span className={cn(colorPalette.textHighlight)}>Framework:</span> Next.js / React</li>
                            <li><span className={cn(colorPalette.textHighlight)}>Animazioni 3D:</span> Three.js (via React Three Fiber)</li>
                            <li><span className={cn(colorPalette.textHighlight)}>Stile e UI:</span> Tailwind CSS, Lucide Icons, Framer Motion</li>
                        </ul>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default function HomePage() {
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState<boolean>(false);

  return (
    <>
  
      <div className={cn("h-screen flex flex-col items-center justify-center font-mono antialiased p-4", colorPalette.background, colorPalette.textPrimary)}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-30" aria-hidden="true">
          <div className="w-64 h-64 md:w-80 md:h-80">
            <VisualEntityWrapper activityState={"idle"} />
          </div>
        </div>
        <div className="relative z-10 text-center">
          
          <h1 className={cn("text-4xl md:text-5xl font-bold mb-3", colorPalette.textTitle)}>
            Oracolo del Silicio
          </h1>
          <p className={cn("text-lg md:text-xl mb-10", colorPalette.textHighlight)}>
            Scegli la modalità di interazione:
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            
            <Link href="/tts" aria-label="Interagisci con Text-to-Speech">
              <Button
                className="w-full sm:w-auto text-lg py-3 px-6 flex items-center justify-center gap-2"
              >
                <Volume2 className="h-6 w-6" />
                Interagisci con l&#39;Oracolo
              </Button>
            </Link>

            <Link href="/chat" aria-label="Interagisci tramite Chat">
              <Button
                className="w-full sm:w-auto text-lg py-3 px-6 flex items-center justify-center gap-2"
              >
                <MessageCircleMore className="h-6 w-6" />
                Chatta con l&#39;Oracolo
              </Button>
            </Link>

          </div>
        </div>
        
        <div className="absolute bottom-4 right-4 z-20">
          <Button
            variant="ghost"
            className="p-2 rounded-full"
            onClick={() => setIsCreditsModalOpen(true)}
            aria-label="Mostra crediti"
          >
            <Info className="h-6 w-6" />
          </Button>
        </div>
      </div>
      
      <AnimatePresence>
          {isCreditsModalOpen && <CreditsModal onClose={() => setIsCreditsModalOpen(false)} />}
      </AnimatePresence>
    </>
  );
}