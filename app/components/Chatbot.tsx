'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from 'next/link';
import { Send, Menu, PlusCircle, Trash2, XCircle, Activity, ChevronLeft, PlayCircle, PauseCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import VisualEntityWrapper, { type ActivityState } from './VisualEntityWrapper';

export type InteractionMode = "tts" | "chat" | null;

// --- Tipi Interfaccia ---
interface Message { id: string; sender: "user" | "bot"; text: string; timestamp: string; isError?: boolean; }
interface Session { id: number; messages: Message[]; title: string; }

// --- Costanti e Utility ---
export const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');
const capitalizeMessage = (text: string): string => text.replace(/(^\w|\.\s+\w)/g, letter => letter.toUpperCase());
const applyInputCapitalization = (text: string): string => text.replace(/(^\w|(?<=\.\s*)\w)/g, letter => letter.toUpperCase());
const generateSessionTitle = (message: string): string => {
    const words = message.split(' ');
    if (words.length <= 5) return capitalizeMessage(message);
    const title = words.slice(0, 4).join(' ') + '...';
    return capitalizeMessage(title);
};
const getCurrentTimestamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const generateId = (): string => Date.now().toString(36) + Math.random().toString(36).substring(2);

// --- NUOVA PALETTE COLORI ---
export const colorPalette = {
    background: 'bg-[#06130c]',
    surface: 'bg-[#081910]', 
    botMessageBackground: 'bg-[#0B2014]', 
    textPrimary: 'text-[#2e8b57]',
    textHighlight: 'text-[#8CFFB1]',
    textTitle: 'text-[#887FFF]',
    accent: 'bg-[#20603b]',
    accentHover: 'hover:bg-[#887FFF]',
    textHover: 'hover:text-[#887FFF]',
    border: 'border-[#2e8b57]',
    borderHover: 'hover:border-[#887FFF]',
    borderSelected: 'border-[#887FFF]',
    destructive: 'bg-red-700',
    destructiveHover: 'hover:bg-red-800',
    errorBorder: 'border-l-red-500',
};

const API_ENDPOINTS = { CHAT: '/api/chat', TTS: '/api/tts' };
const SESSIONS_STORAGE_KEY = 'fieChatbot_chatSessions';
const CURRENT_SESSION_ID_STORAGE_KEY = 'fieChatbot_currentSessionId';

// --- Custom Hooks (invariati) ---
function useChatSessions() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [isSessionsInitialized, setIsSessionsInitialized] = useState(false);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const storedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY);
                const loadedSessions = storedSessions ? JSON.parse(storedSessions) : [];
                setSessions(loadedSessions);
                const storedCurrentId = localStorage.getItem(CURRENT_SESSION_ID_STORAGE_KEY);
                if (storedCurrentId) {
                    const parsedId = parseInt(storedCurrentId, 10);
                    if (loadedSessions.find((s: Session) => s.id === parsedId)) {
                        setCurrentSessionId(parsedId);
                    } else if (loadedSessions.length > 0) {
                        setCurrentSessionId(loadedSessions.sort((a: Session, b: Session) => b.id - a.id)[0].id);
                    }
                } else if (loadedSessions.length > 0) {
                    setCurrentSessionId(loadedSessions.sort((a: Session, b: Session) => b.id - a.id)[0].id);
                }
            } catch (error) { console.error("Error loading from localStorage:", error); }
        }
        setIsSessionsInitialized(true);
    }, []);
    useEffect(() => {
        if (!isSessionsInitialized || typeof window === 'undefined') return;
        try {
            localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
            if (currentSessionId !== null) {
                localStorage.setItem(CURRENT_SESSION_ID_STORAGE_KEY, currentSessionId.toString());
            } else {
                localStorage.removeItem(CURRENT_SESSION_ID_STORAGE_KEY);
            }
        } catch (error) { console.error("Error saving to localStorage:", error); }
    }, [sessions, currentSessionId, isSessionsInitialized]);
    const generateNumericId = useCallback((): number => (sessions.length > 0) ? Math.max(0, ...sessions.map(s => s.id)) + 1 : 1, [sessions]);
    const startNewSession = useCallback(() => {
        const newId = generateNumericId();
        const newSession: Session = { id: newId, messages: [], title: "Nuova Chat" };
        setSessions(prevSessions => [newSession, ...prevSessions].sort((a,b) => b.id - a.id));
        setCurrentSessionId(newId);
        return newId;
    }, [generateNumericId]);
    const deleteSession = useCallback((sessionIdToDelete: number) => {
        setSessions(prev => {
            const updatedSessions = prev.filter(session => session.id !== sessionIdToDelete);
            if (currentSessionId === sessionIdToDelete) {
                const newCurrent = updatedSessions.length > 0 ? updatedSessions.sort((a,b) => b.id - a.id)[0].id : null;
                setCurrentSessionId(newCurrent);
            }
            return updatedSessions;
        });
    }, [currentSessionId]);
    const selectSession = useCallback((sessionId: number) => { setCurrentSessionId(sessionId); }, []);
    const addMessageToSession = useCallback((sessionId: number, message: Message) => {
        setSessions(prevSessions =>
            prevSessions.map(session => session.id === sessionId ? { ...session, messages: [message, ...session.messages] } : session)
        );
    }, []);
    const updateSessionTitle = useCallback((sessionId: number, title: string) => {
        setSessions(prevSessions =>
            prevSessions.map(session => session.id === sessionId ? { ...session, title } : session)
        );
    }, []);
    const currentSession = useMemo(() => isSessionsInitialized ? sessions.find(s => s.id === currentSessionId) || null : null, [sessions, currentSessionId, isSessionsInitialized]);
    return { sessions, currentSessionId, currentSession, startNewSession, deleteSession, selectSession, addMessageToSession, updateSessionTitle, generateNumericId, isSessionsInitialized };
}
function useTTS(interactionMode: InteractionMode, setIsBotTyping: React.Dispatch<React.SetStateAction<boolean>>) {
    const [isBotSpeakingIntent, setIsBotSpeakingIntent] = useState<boolean>(false);
    const [isAudioActuallyPlaying, setIsAudioActuallyPlaying] = useState<boolean>(false);
    const [isTtsPaused, setIsTtsPaused] = useState<boolean>(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isTtsEffectivelyEnabled = useMemo(() => interactionMode === 'tts', [interactionMode]);
    const resetTTSStates = useCallback(() => {
        setIsBotSpeakingIntent(false);
        setIsAudioActuallyPlaying(false);
        setIsTtsPaused(false);
    }, []);
    const stopSpeech = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.onplaying = null;
            audioRef.current.onended = null;
            audioRef.current.onerror = null;
            audioRef.current.onloadeddata = null;
            audioRef.current.pause();
            if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) { URL.revokeObjectURL(audioRef.current.src); }
            audioRef.current.removeAttribute('src');
            audioRef.current.load();
        }
        resetTTSStates();
        setIsBotTyping(false);
    }, [resetTTSStates, setIsBotTyping]);
    const pauseSpeech = useCallback(() => {
        if (audioRef.current && isAudioActuallyPlaying) {
            audioRef.current.pause();
            setIsAudioActuallyPlaying(false);
            setIsTtsPaused(true);
            setIsBotTyping(false);
        }
    }, [isAudioActuallyPlaying, setIsBotTyping]);
    const resumeSpeech = useCallback(async () => {
        if (audioRef.current && isTtsPaused) {
            try {
                setIsBotSpeakingIntent(true);
                setIsBotTyping(true);
                await audioRef.current.play();
            } catch (error) { console.error("Error resuming audio:", error); stopSpeech(); }
        }
    }, [isTtsPaused, stopSpeech, setIsBotTyping]);
    const playSpeech = useCallback(async (text: string) => {
        if (!isTtsEffectivelyEnabled || !text.trim()) { stopSpeech(); return; }
        setIsBotSpeakingIntent(true);
        setIsAudioActuallyPlaying(false);
        setIsTtsPaused(false);
        try {
            const response = await fetch(API_ENDPOINTS.TTS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                console.error("Error from TTS API:", errorData?.error || response.statusText);
                stopSpeech();
                return;
            }
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            if (audioRef.current) {
                audioRef.current.src = audioUrl;
                audioRef.current.onplaying = () => { setIsAudioActuallyPlaying(true); setIsTtsPaused(false); };
                audioRef.current.onended = () => stopSpeech();
                audioRef.current.onerror = (e) => { console.error("Error with audio element:", e); stopSpeech(); };
                
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        console.error("Error playing audio:", e);
                    });
                }
            } else {
                URL.revokeObjectURL(audioUrl);
                stopSpeech();
            }
        } catch (error) {
            console.error("Error fetching or playing TTS:", error);
            stopSpeech();
        }
    }, [isTtsEffectivelyEnabled, stopSpeech]);
    useEffect(() => { return () => { stopSpeech(); } }, [interactionMode, stopSpeech]);
    return { isTtsEnabled: isTtsEffectivelyEnabled, isBotSpeakingIntent, isAudioActuallyPlaying, isTtsPaused, audioRef, playSpeech, stopSpeech, pauseSpeech, resumeSpeech };
}

// --- Componenti UI Riutilizzabili ---
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { children: React.ReactNode; variant?: "destructive" | "default" | "ghost"; }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ children, className, variant = "default", disabled, ...rest }, ref) => (
    <button
        ref={ref}
        className={cn(
            "px-4 py-2 rounded-lg border transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2",
            "focus:ring-[#887FFF] ring-offset-[#06130c]",
            variant === "destructive"
                ? `${colorPalette.destructive} ${colorPalette.destructiveHover} border-red-800 text-white`
                : variant === "ghost"
                ? `bg-transparent border-transparent ${colorPalette.textPrimary} ${colorPalette.textHover}`
                : `${colorPalette.accent} ${colorPalette.border} text-white ${colorPalette.accentHover}`,
            disabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
            className
        )}
        disabled={disabled}
        {...rest}
    >
        {children}
    </button>
));
Button.displayName = "Button";

const TextareaAutosize = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, value, onChange, ...rest }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    React.useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement);
    useEffect(() => {
        const textarea = internalRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const maxHeight = 160;
            if (textarea.scrollHeight <= maxHeight) {
                textarea.style.height = `${textarea.scrollHeight}px`;
                textarea.style.overflowY = 'hidden';
            } else {
                textarea.style.height = `${maxHeight}px`;
                textarea.style.overflowY = 'auto';
            }
        }
    }, [value]);
    return (
        <textarea
            ref={internalRef}
            value={value}
            onChange={onChange}
            rows={1}
            className={cn(
                "flex-1 text-sm md:text-base resize-none py-2 px-3 custom-scrollbar-matrix rounded-lg",
                "max-h-40",
                colorPalette.surface,
                colorPalette.border,
                colorPalette.textPrimary,
                "placeholder:text-[#2e8b57]/70",
                "focus:outline-none",
                className
            )}
            {...rest}
        />
    );
});
TextareaAutosize.displayName = "TextareaAutosize";

const MarkdownMessageContent = React.memo(({ text }: { text: string }) => (
    <ReactMarkdown
        components={{
            p: (props) => <p className={`${colorPalette.textHighlight} my-1 last:mb-0 first:mt-0 break-words`} {...props} />,
            strong: (props) => <strong className="text-white" {...props} />,
            ul: (props) => <ul className={`list-disc list-inside my-1 break-words ${colorPalette.textHighlight}`} {...props} />,
            ol: (props) => <ol className={`list-decimal list-inside my-1 break-words ${colorPalette.textHighlight}`} {...props} />,
            li: (props) => <li className={`my-0.5 break-words ${colorPalette.textHighlight}`} {...props} />,
            // --- MODIFICA RESPONSIVE --- Semplificate le classi, rimosso `break-all` ridondante.
            pre: (props) => <pre className={`custom-scrollbar-matrix overflow-x-auto whitespace-pre-wrap ${colorPalette.botMessageBackground} p-2 my-1 rounded text-xs border ${colorPalette.border}`} {...props} />,
            code: (props: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) => {
                const { inline, ...rest } = props;
                const codeClassName = inline ? `px-1 py-0.5 ${colorPalette.botMessageBackground} border ${colorPalette.border} rounded-sm text-xs` : ``;
                return <code className={codeClassName} {...rest} />;
            }
        }}
    >
        {capitalizeMessage(text)}
    </ReactMarkdown>
));
MarkdownMessageContent.displayName = "MarkdownMessageContent";

interface SidebarProps { sessions: Session[]; currentSessionId: number | null; onNewSession: () => void; onSelectSession: (id: number) => void; onDeleteSession: (id: number) => void; isBotSpeaking: boolean; isMobileContext: boolean; onCloseMobileSidebar?: () => void; disabledActions: boolean; }
const Sidebar: React.FC<SidebarProps> = ({ sessions, currentSessionId, onNewSession, onSelectSession, onDeleteSession, isMobileContext, onCloseMobileSidebar, disabledActions }) => {
    return (
        <div className="flex flex-col h-full">
            {isMobileContext && (
                <div className={`flex justify-between items-center mb-4 p-4 ${colorPalette.border} border-b`}>
                    <h2 className={`text-xl font-semibold ${colorPalette.textTitle}`}>Chat Recenti</h2>
                    <Button variant="ghost" onClick={onCloseMobileSidebar} className="p-2 -mr-2" aria-label="Chiudi sidebar">
                        <XCircle className="h-5 w-5" />
                    </Button>
                </div>
            )}
            <div className="p-4 flex items-center space-x-2">
                <Button onClick={onNewSession} className="w-full flex items-center justify-center gap-2" disabled={disabledActions} aria-label="Inizia una nuova chat">
                    <PlusCircle className="h-5 w-5" /> NUOVA CHAT
                </Button>
            </div>
            {!isMobileContext && <h2 className={`text-lg font-bold mb-2 px-4 ${colorPalette.textTitle} uppercase tracking-wider`}>Cronologia</h2>}
            <div className="flex-1 overflow-y-auto space-y-1.5 px-4 pb-4 custom-scrollbar-matrix">
                {sessions.slice().sort((a, b) => b.id - a.id).map((session) => (
                    <div key={session.id}
                        className={cn(
                            "flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors duration-150 group font-mono border",
                            currentSessionId === session.id
                                ? `${colorPalette.borderSelected} ${colorPalette.textTitle}` 
                                : `${colorPalette.border} ${colorPalette.textPrimary} ${colorPalette.borderHover} ${colorPalette.textHover}`,
                        )}
                        onClick={() => onSelectSession(session.id)} role="button" tabIndex={0}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelectSession(session.id)}
                        aria-current={currentSessionId === session.id ? "page" : undefined}
                    >
                        {/* --- MODIFICA RESPONSIVE --- Rimuoviamo 'truncate' per permettere al testo di andare a capo. */}
                        <span className="text-sm font-medium break-words">{session.title}</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                            className="p-1 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity duration-150 flex-shrink-0" // Aggiunto flex-shrink-0
                            aria-label={`Elimina chat ${session.title}`} disabled={disabledActions}
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface MessageBubbleProps { message: Message; }
const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ message }) => (
    <motion.div layout="position" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}
        transition={{ type: "spring", stiffness: 260, damping: 25 }}
        className={cn("flex w-full items-end group relative", message.sender === "user" ? "justify-end" : "justify-start")}>
        <div className={cn(
            "px-4 py-3 rounded-lg text-sm md:text-base shadow-md border max-w-[80%] sm:max-w-[70%] md:max-w-[60%]",
            "overflow-hidden", // 'break-words' è ora dentro i componenti figlio, quindi questo è per sicurezza
            message.sender === "user"
                ? `${colorPalette.accent} text-white ${colorPalette.border}`
                : `${colorPalette.botMessageBackground} ${colorPalette.textHighlight} ${colorPalette.border}`,
            message.isError && message.sender === "bot" ? `${colorPalette.errorBorder} border-l-4 pl-3` : "")}>
            {message.sender === "bot" ? (<MarkdownMessageContent text={message.text} />)
                : (<p className="break-words text-white">{capitalizeMessage(message.text)}</p>)}
            <div className={cn(
                "text-xs opacity-70 mt-1 text-right",
                message.sender === 'user' ? 'text-white' : colorPalette.textHighlight
            )}>
                {message.timestamp}
            </div>
        </div>
    </motion.div>
));
MessageBubble.displayName = "MessageBubble";

interface ChatbotProps { interactionMode: InteractionMode; }
const ChatbotComponent: React.FC<ChatbotProps> = ({ interactionMode }) => {
    const { sessions, currentSessionId, currentSession, startNewSession: _startNewSession, deleteSession, selectSession, addMessageToSession, updateSessionTitle, isSessionsInitialized } = useChatSessions();
    const [isBotTyping, setIsBotTyping] = useState<boolean>(false);
    const { isTtsEnabled, isBotSpeakingIntent, isAudioActuallyPlaying, isTtsPaused, audioRef, playSpeech, stopSpeech, pauseSpeech, resumeSpeech } = useTTS(interactionMode, setIsBotTyping);
    const [input, setInput] = useState<string>("");
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
    const [showScrollToBottom, setShowScrollToBottom] = useState<boolean>(false);
    const [isFirstInteraction, setIsFirstInteraction] = useState(true);
    const [isAudioContextUnlocked, setIsAudioContextUnlocked] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const cursorPosRef = useRef<{ start: number, end: number } | null>(null);
    const [visualActivityState, setVisualActivityState] = useState<ActivityState>("idle");
    const currentMessages = useMemo(() => isSessionsInitialized ? currentSession?.messages || [] : [], [currentSession, isSessionsInitialized]);
    useEffect(() => { setIsFirstInteraction(true); }, [interactionMode, currentSessionId]);
    useEffect(() => {
        if (isAudioActuallyPlaying) { setVisualActivityState("speaking"); }
        else if (isBotTyping || isBotSpeakingIntent) { setVisualActivityState("processing"); }
        else { setVisualActivityState("idle"); }
    }, [isAudioActuallyPlaying, isBotTyping, isBotSpeakingIntent]);
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value, selectionStart, selectionEnd } = e.target;
        cursorPosRef.current = { start: selectionStart, end: selectionEnd };
        const capitalizedValue = applyInputCapitalization(value);
        setInput(capitalizedValue);
        if (interactionMode === 'tts' && value.trim().length > 0 && (isAudioActuallyPlaying || isTtsPaused)) {
            stopSpeech();
        }
    };
    useEffect(() => {
        if (textareaRef.current && cursorPosRef.current) {
            if (textareaRef.current.value === input) { textareaRef.current.setSelectionRange(cursorPosRef.current.start, cursorPosRef.current.end); }
            cursorPosRef.current = null;
        }
    }, [input]);
    const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => { if (interactionMode === 'chat' && messagesEndRef.current) { messagesEndRef.current.scrollIntoView({ behavior, block: "end" }); } }, [interactionMode]);
    useEffect(() => {
        if (interactionMode !== 'chat' || !isSessionsInitialized) return;
        const chatEl = chatContainerRef.current;
        if (!chatEl) return;
        const isUserAtBottom = chatEl.scrollHeight - chatEl.clientHeight <= chatEl.scrollTop + 50;
        if (isUserAtBottom) { setTimeout(() => scrollToBottom("smooth"), 50); }
    }, [interactionMode, currentMessages, isBotTyping, isSessionsInitialized, scrollToBottom]);
    useEffect(() => {
        const handleResize = () => { if (window.innerWidth >= 768) setIsMobileSidebarOpen(false); };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const handleScroll = useCallback(() => {
        if (interactionMode === 'chat') {
            const chatEl = chatContainerRef.current;
            if (chatEl) {
                const isScrolledUp = chatEl.scrollTop < chatEl.scrollHeight - chatEl.clientHeight - 100;
                setShowScrollToBottom(isScrolledUp);
            }
        } else { setShowScrollToBottom(false); }
    }, [interactionMode]);
    useEffect(() => {
        const chatEl = chatContainerRef.current;
        if (interactionMode === 'chat' && chatEl) {
            chatEl?.addEventListener('scroll', handleScroll);
            return () => chatEl?.removeEventListener('scroll', handleScroll);
        }
    }, [interactionMode, handleScroll]);
    const handleStartNewSession = useCallback(() => { if (interactionMode === 'chat') { _startNewSession(); setIsFirstInteraction(true); setInput(""); if (window.innerWidth < 768) setIsMobileSidebarOpen(false); setTimeout(() => scrollToBottom("auto"), 0); } }, [_startNewSession, scrollToBottom, interactionMode]);
    const handleSelectSession = useCallback((sessionId: number) => { if (interactionMode === 'chat') { if (currentSessionId === sessionId) return; selectSession(sessionId); stopSpeech(); const selected = sessions.find(s => s.id === sessionId); setIsFirstInteraction(selected ? selected.messages.length === 0 : true); setInput(""); if (window.innerWidth < 768) setIsMobileSidebarOpen(false); setTimeout(() => scrollToBottom("auto"), 0); } }, [currentSessionId, selectSession, stopSpeech, scrollToBottom, interactionMode, sessions]);
    const handleDeleteSession = useCallback((sessionId: number) => { if (interactionMode === 'chat') { deleteSession(sessionId); setIsFirstInteraction(true); setInput(""); } }, [deleteSession, interactionMode]);
    
    const handleSend = useCallback(async () => {
        if (!isAudioContextUnlocked) {
            try {
                audioRef.current?.play().catch(() => {});
                audioRef.current?.pause();
                setIsAudioContextUnlocked(true);
                console.log("Audio context unlocked by user gesture.");
            } catch (e) {
                console.error("Could not unlock audio context:", e);
            }
        }
        
        const trimmedInput = input.trim(); if (!trimmedInput) return;
        setIsBotTyping(true);
        const isFirstMessageForPrompt = (interactionMode === 'chat') ? currentSession?.messages.length === 0 : isFirstInteraction;
        if (isFirstInteraction) { setIsFirstInteraction(false); }
        const userMessageText = trimmedInput;
        let currentContextSessionId = currentSessionId;
        if (interactionMode === 'chat') {
            const userMessage: Message = { id: generateId(), sender: "user", text: userMessageText, timestamp: getCurrentTimestamp() };
            let targetSessionId = currentSessionId;
            let isNewSession = false;
            if (targetSessionId === null && isSessionsInitialized) { isNewSession = true; targetSessionId = _startNewSession(); }
            if (targetSessionId === null) { setIsBotTyping(false); return; }
            addMessageToSession(targetSessionId, userMessage);
            if (isNewSession || (currentSession?.messages.length === 0 && currentSession.title === "Nuova Chat")) { updateSessionTitle(targetSessionId, generateSessionTitle(userMessageText)); }
            currentContextSessionId = targetSessionId;
        }
        setInput("");
        if (interactionMode === 'chat') setTimeout(() => scrollToBottom("smooth"), 0);
        let historyForAPI: Array<{ sender: string, text: string }> = [];
        if (interactionMode === 'chat' && currentContextSessionId !== null) {
            const sessionForApi = sessions.find(s => s.id === currentContextSessionId);
            historyForAPI = (sessionForApi?.messages || []).filter(msg => msg.sender === 'user' ? msg.text !== userMessageText : true).slice().reverse().map(msg => ({ sender: msg.sender, text: msg.text }));
        }
        if (interactionMode === 'tts' && currentSessionId !== null) {
            const sessionForApi = sessions.find(s => s.id === currentSessionId);
            historyForAPI = (sessionForApi?.messages || []).slice().reverse().map(msg => ({ sender: msg.sender, text: msg.text }));
        }
        try {
            const response = await fetch(API_ENDPOINTS.CHAT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userMessageText, history: historyForAPI, isFirstMessage: isFirstMessageForPrompt }) });
            const responseData = await response.json().catch(() => null);
            if (!response.ok || !responseData) {
                const errorText = responseData?.error || response.statusText || "Errore sconosciuto";
                if (interactionMode === 'chat' && currentContextSessionId !== null) { addMessageToSession(currentContextSessionId, { id: generateId(), sender: "bot", text: `Spiacente, si è verificato un errore: ${errorText}.`, timestamp: getCurrentTimestamp(), isError: true, }); }
                else if (interactionMode === 'tts') { playSpeech(`Spiacente, si è verificato un errore: ${errorText}.`); }
                if (!(interactionMode === 'tts' && isTtsEnabled && responseData?.reply?.trim())) { setIsBotTyping(false); }
                return;
            }
            const botReplyText = responseData.reply || "Non ho ricevuto una risposta valida.";
            if (botReplyText.trim() !== "" && isTtsEnabled) { playSpeech(botReplyText); } else { setIsBotTyping(false); }
            if (interactionMode === 'chat' && currentContextSessionId !== null) { addMessageToSession(currentContextSessionId, { id: generateId(), sender: "bot", text: botReplyText, timestamp: getCurrentTimestamp() }); }
        } catch (error) {
            setIsBotTyping(false);
            const detail = (error instanceof Error) ? error.message : 'Dettaglio non disponibile';
            if (interactionMode === 'chat' && currentContextSessionId !== null) { addMessageToSession(currentContextSessionId, { id: generateId(), sender: "bot", text: `Errore di connessione. Dettaglio: ${detail}`, timestamp: getCurrentTimestamp(), isError: true }); }
            else if (interactionMode === 'tts') { playSpeech(`Errore di connessione. Dettaglio: ${detail}`); }
        }
    }, [input, currentSessionId, sessions, isTtsEnabled, interactionMode, addMessageToSession, updateSessionTitle, _startNewSession, playSpeech, scrollToBottom, currentSession?.messages.length, currentSession?.title, setIsBotTyping, isSessionsInitialized, isFirstInteraction, audioRef, isAudioContextUnlocked]);
    
    const textareaDisabled = isBotTyping;
    let ActionButtonIcon = Send;
    let actionButtonOnClick: () => void | Promise<void> = handleSend;
    let actionButtonAriaLabel = "Invia messaggio";
    let actionButtonDisabled = !input.trim() || isBotTyping;
    if (interactionMode === 'tts') {
        if (input.trim().length > 0) { ActionButtonIcon = Send; actionButtonOnClick = handleSend; actionButtonAriaLabel = "Invia messaggio"; actionButtonDisabled = isBotTyping; }
        else if (isAudioActuallyPlaying) { ActionButtonIcon = PauseCircle; actionButtonOnClick = () => { pauseSpeech(); }; actionButtonAriaLabel = "Metti in pausa audio"; actionButtonDisabled = false; }
        else if (isTtsPaused) { ActionButtonIcon = PlayCircle; actionButtonOnClick = () => { resumeSpeech(); }; actionButtonAriaLabel = "Riprendi audio"; actionButtonDisabled = false; }
        else { ActionButtonIcon = Send; actionButtonOnClick = handleSend; actionButtonAriaLabel = "Invia messaggio"; actionButtonDisabled = true; }
    } else { actionButtonDisabled = !input.trim() || isBotTyping || isBotSpeakingIntent; }
    
    const headerTitle = useMemo(() => {
        if (interactionMode === 'tts') return "Scrivimi, sono qui per ascoltarti";
        if (interactionMode === 'chat') {
            if (!isSessionsInitialized) return "Caricamento chat...";
            if (currentSession) return currentSession.title;
            if (sessions.length > 0) return "Seleziona una chat";
            return "Nessuna chat selezionata";
        }
        return "Chatbot";
    }, [interactionMode, currentSession, sessions.length, isSessionsInitialized]);

    if (interactionMode === 'chat' && !isSessionsInitialized) {
        return (<div className={`h-screen flex flex-col items-center justify-center ${colorPalette.background} ${colorPalette.textPrimary} font-mono antialiased p-4`}> <Activity className={`h-12 w-12 ${colorPalette.textHighlight} animate-spin mb-4`} /> <p className={`${colorPalette.textHighlight}`}>Caricamento cronologia chat...</p> </div>);
    }

    return (
        <div className={`h-screen flex ${colorPalette.background} font-mono antialiased`}>
            {interactionMode === 'chat' && (
                <>
                    <AnimatePresence>
                        {isMobileSidebarOpen && (
                            <>
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 bg-black/80 z-40 md:hidden" onClick={() => setIsMobileSidebarOpen(false)} />
                                <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: 0.3, ease: "circOut" }} className={`fixed top-0 left-0 h-full w-72 ${colorPalette.surface} ${colorPalette.border} border-r z-50 shadow-xl flex flex-col`} aria-modal="true" role="dialog">
                                    <Sidebar sessions={sessions} currentSessionId={currentSessionId} onNewSession={handleStartNewSession} onSelectSession={handleSelectSession} onDeleteSession={handleDeleteSession} isBotSpeaking={isBotSpeakingIntent} isMobileContext={true} onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)} disabledActions={textareaDisabled} />
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                    <div className={`w-72 ${colorPalette.surface} ${colorPalette.border} border-r flex-col hidden md:flex`}>
                        <Sidebar sessions={sessions} currentSessionId={currentSessionId} onNewSession={handleStartNewSession} onSelectSession={handleSelectSession} onDeleteSession={handleDeleteSession} isBotSpeaking={isBotSpeakingIntent} isMobileContext={false} disabledActions={textareaDisabled} />
                    </div>
                </>
            )}

            <div className={`flex-1 flex flex-col max-h-screen ${colorPalette.background} min-w-0`}>
                <div className={`p-3 md:p-4 ${colorPalette.border} border-b ${colorPalette.surface} flex items-center justify-between sticky top-0 z-30 gap-2`}>
                    <Link href="/" aria-label="Torna alla selezione modalità">
                        <Button variant="ghost" className="p-2 flex-shrink-0">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    {/* --- MODIFICA RESPONSIVE --- Rimosso 'truncate' per permettere al titolo di andare a capo. 'min-w-0' previene il collasso. */}
                    <h1 className={`text-md md:text-xl font-semibold ${colorPalette.textTitle} text-center flex-grow min-w-0 break-words`}>
                        {headerTitle}
                    </h1>
                    {interactionMode === 'chat' ? (
                        <Button variant="ghost" onClick={() => setIsMobileSidebarOpen(true)} className="p-2 md:hidden flex-shrink-0" aria-label="Apri cronologia chat">
                            <Menu className="h-5 w-5" />
                        </Button>
                    ) : (
                        // Placeholder per mantenere l'allineamento del titolo
                        <div className="w-9 h-9 flex-shrink-0"></div>
                    )}
                     {/* Placeholder per allineamento su desktop */}
                    <div className="w-9 h-9 hidden md:block flex-shrink-0"></div>
                </div>

                <div className="flex-1 relative overflow-hidden">
                    {interactionMode === 'tts' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                            <div className="w-full h-full max-w-md max-h-md md:max-w-lg md:max-h-lg">
                                <VisualEntityWrapper activityState={visualActivityState} />
                            </div>
                            {interactionMode === 'tts' && isTtsPaused && !isBotTyping && (<p className={`absolute bottom-24 md:bottom-32 ${colorPalette.textPrimary} text-sm`}> Conversazione in pausa... </p>)}
                            {interactionMode === 'tts' && !isTtsPaused && visualActivityState === "processing" && (<p className={`absolute bottom-24 md:bottom-32 ${colorPalette.textPrimary} text-sm animate-pulse`}> Sto elaborando... </p>)}
                        </div>
                    )}
                    
                    {interactionMode === 'chat' && (
                        <>
                            {currentSessionId === null || !currentSession ? (
                                <div className={`flex-1 flex flex-col items-center justify-center text-center p-8 ${colorPalette.background} h-full relative z-10`}>
                                    <h2 className={`text-2xl md:text-3xl font-bold ${colorPalette.textTitle} mb-3`}>
                                        Benvenuto!
                                    </h2>
                                    <p className={`${colorPalette.textPrimary} max-w-md text-sm md:text-base`}>{sessions.length === 0 ? "Crea una nuova chat per iniziare." : "Seleziona una chat dalla cronologia o creane una nuova."}</p>
                                </div>
                            ) : (
                                <div ref={chatContainerRef} className="absolute inset-0 overflow-y-auto px-4 pb-4 md:px-6 md:pb-6 space-y-3 flex flex-col-reverse custom-scrollbar-matrix z-[5]">
                                    <div ref={messagesEndRef} className="h-0" />
                                    {isBotTyping && (
                                        <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex w-full justify-start">
                                            <div className={`px-4 py-3 rounded-lg break-words text-sm md:text-base shadow-md ${colorPalette.border} border ${colorPalette.surface} ${colorPalette.textPrimary}`}>
                                                <em>Sto elaborando... <Activity className="inline h-4 w-4 animate-spin" /></em>
                                            </div>
                                        </motion.div>
                                    )}
                                    <AnimatePresence initial={false}>
                                        {currentMessages.map((msg) => (<MessageBubble key={msg.id} message={msg} />))}
                                    </AnimatePresence>
                                    <div className="flex-grow min-h-[10px]"></div>
                                </div>
                            )}
                            {showScrollToBottom && currentSessionId !== null && (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-20 right-6 md:right-8 z-20"></motion.div>)}
                        </>
                    )}
                </div>
                
                {/* --- MODIFICA RESPONSIVE --- Area di input corretta e animata --- */}
                <div className={`p-3 md:p-4 ${colorPalette.border} border-t ${colorPalette.surface} sticky bottom-0 z-10`}>
                    <div className="max-w-4xl mx-auto flex items-end space-x-2 md:space-x-3">
                        <TextareaAutosize
                            ref={textareaRef}
                            value={input}
                            onChange={handleInputChange}
                            placeholder={interactionMode === 'tts' ? "Scrivi qui per interagire..." : (currentSessionId === null && sessions.length === 0 ? "Inizia una nuova chat..." : "Invia un segnale... (Shift+Enter per nuova riga)")}
                            className="flex-1 text-sm md:text-base min-w-0"
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && ActionButtonIcon === Send) { e.preventDefault(); if (!actionButtonDisabled) handleSend(); } }}
                            disabled={textareaDisabled}
                            aria-label="Scrivi un messaggio" />
                        <div className="relative flex flex-col items-center">
                             <Button
                                onClick={actionButtonOnClick}
                                className={cn(
                                    "p-3 aspect-square self-end flex-shrink-0 transition-all duration-200 ease-in-out",
                                    (isAudioActuallyPlaying || isTtsPaused) && !isBotTyping ? "scale-110" : "scale-100"
                                )}
                                disabled={actionButtonDisabled}
                                aria-label={actionButtonAriaLabel}
                                aria-live="polite"
                            >
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={actionButtonAriaLabel} 
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.5 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <ActionButtonIcon className="h-5 w-5" />
                                    </motion.div>
                                </AnimatePresence>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            <audio ref={audioRef} style={{ display: 'none' }} />
        </div>
    );
};

export { ChatbotComponent as Chatbot };
export default ChatbotComponent;
