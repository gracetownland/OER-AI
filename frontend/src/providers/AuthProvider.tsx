import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

interface AuthContextType {
    token: string | null;
    isLoading: boolean;
    error: Error | null;
    refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchToken = async () => {
        try {
            setIsLoading(true);
            const endpoint = import.meta.env.VITE_API_ENDPOINT;
            if (!endpoint) {
                throw new Error("VITE_API_ENDPOINT is not defined");
            }

            const response = await fetch(`${endpoint}/user/publicToken`);
            if (!response.ok) {
                throw new Error(`Failed to fetch token: ${response.statusText}`);
            }

            const data = await response.json();
            setToken(data.token);
            setError(null);
        } catch (err) {
            console.error("Error fetching public token:", err);
            setError(err instanceof Error ? err : new Error("Unknown error"));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchToken();
    }, []);

    return (
        <AuthContext.Provider
            value={{ token, isLoading, error, refreshToken: fetchToken }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthToken() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuthToken must be used within an AuthProvider");
    }
    return context;
}
