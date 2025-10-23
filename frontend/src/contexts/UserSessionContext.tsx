import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface UserSessionContextType {
  userSessionId: string | null;
  isLoading: boolean;
  error: Error | null;
}

const UserSessionContext = createContext<UserSessionContextType | undefined>(undefined);

export function UserSessionProvider({ children }: { children: ReactNode }) {
  const [userSessionId, setUserSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const createUserSession = async () => {
      try {
        // First get a public token
        const tokenResponse = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/user/publicToken`);
        const { token } = await tokenResponse.json();

        // Create a user session
        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}/user_sessions`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to create user session');
        }

        const data = await response.json();
        setUserSessionId(data.userSessionId);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create user session'));
      } finally {
        setIsLoading(false);
      }
    };

    createUserSession();
  }, []); // Only run once when the app starts

  return (
    <UserSessionContext.Provider value={{ userSessionId, isLoading, error }}>
      {children}
    </UserSessionContext.Provider>
  );
}

export function useUserSession() {
  const context = useContext(UserSessionContext);
  if (context === undefined) {
    throw new Error('useUserSession must be used within a UserSessionProvider');
  }
  return context;
}