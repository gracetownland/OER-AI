import { useState, useCallback, useRef, useEffect } from "react";
import { useWebSocket } from "./useWebSocket";

interface PracticeMaterialProgress {
    type: "practice_material_progress";
    status: "initializing" | "retrieving" | "generating" | "validating" | "complete" | "error";
    progress: number;
    data?: PracticeMaterialResult;
    error?: string;
}

export interface PracticeMaterialResult {
    title: string;
    questions?: any[];
    cards?: any[];
    sources_used: string[];
}

interface GeneratePracticeMaterialParams {
    textbook_id: string;
    topic: string;
    material_type?: "mcq" | "flashcard" | "short_answer";
    difficulty?: "beginner" | "intermediate" | "advanced";
    num_questions?: number;
    num_options?: number;
    num_cards?: number;
    card_type?: "definition" | "concept" | "example";
}

interface UsePracticeMaterialStreamReturn {
    generate: (params: GeneratePracticeMaterialParams) => void;
    cancel: () => void;
    status: PracticeMaterialProgress["status"] | "idle";
    progress: number;
    result: PracticeMaterialResult | null;
    error: string | null;
    isGenerating: boolean;
}

/**
 * Hook for generating practice materials with WebSocket streaming progress updates.
 * 
 * Progress stages:
 * - initializing (5-10%): Loading models and credentials
 * - retrieving (15-30%): Fetching relevant content from textbook
 * - generating (35-85%): LLM generating questions/cards
 * - validating (85-95%): Parsing and validating response
 * - complete (100%): Done!
 */
export const usePracticeMaterialStream = (
    websocketUrl: string | null
): UsePracticeMaterialStreamReturn => {
    const [status, setStatus] = useState<PracticeMaterialProgress["status"] | "idle">("idle");
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<PracticeMaterialResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const isGeneratingRef = useRef(false);

    const handleMessage = useCallback((message: any) => {
        // Only handle practice material progress messages
        if (message.type !== "practice_material_progress") {
            return;
        }

        const progressMsg = message as PracticeMaterialProgress;
        console.log("[PracticeMaterialStream] Progress:", progressMsg.status, progressMsg.progress);

        setStatus(progressMsg.status);
        setProgress(progressMsg.progress);

        if (progressMsg.status === "complete" && progressMsg.data) {
            setResult(progressMsg.data);
            isGeneratingRef.current = false;
        } else if (progressMsg.status === "error") {
            setError(progressMsg.error || "Unknown error");
            isGeneratingRef.current = false;
        }
    }, []);

    const {
        sendMessage,
        isConnected,
        connectionState,
    } = useWebSocket(websocketUrl, {
        onMessage: handleMessage,
    });

    const generate = useCallback((params: GeneratePracticeMaterialParams) => {
        if (!isConnected) {
            setError("WebSocket not connected");
            return;
        }

        if (isGeneratingRef.current) {
            console.warn("[PracticeMaterialStream] Generation already in progress");
            return;
        }

        // Reset state
        setStatus("initializing");
        setProgress(0);
        setResult(null);
        setError(null);
        isGeneratingRef.current = true;

        const message = {
            action: "generate_practice_material",
            textbook_id: params.textbook_id,
            topic: params.topic,
            material_type: params.material_type || "mcq",
            difficulty: params.difficulty || "intermediate",
            num_questions: params.num_questions || 5,
            num_options: params.num_options || 4,
            num_cards: params.num_cards || 10,
            card_type: params.card_type || "definition",
        };

        console.log("[PracticeMaterialStream] Sending generate request:", message);
        const success = sendMessage(message);

        if (!success) {
            setError("Failed to send message");
            setStatus("error");
            isGeneratingRef.current = false;
        }
    }, [isConnected, sendMessage]);

    const cancel = useCallback(() => {
        isGeneratingRef.current = false;
        setStatus("idle");
        setProgress(0);
        setError(null);
    }, []);

    // Debug connection state
    useEffect(() => {
        console.log("[PracticeMaterialStream] Connection state:", connectionState);
    }, [connectionState]);

    return {
        generate,
        cancel,
        status,
        progress,
        result,
        error,
        isGenerating: isGeneratingRef.current,
    };
};
