import { createContext, useContext } from 'react';
import type { Textbook } from '@/types/Textbook';

export type TextbookContextType = {
  textbook: Textbook | null;
  loading: boolean;
  error: Error | null;
};

export const TextbookContext = createContext<TextbookContextType | undefined>(undefined);

export function useTextbook() {
  const context = useContext(TextbookContext);
  if (!context) {
    throw new Error('useTextbook must be used within TextbookProvider');
  }
  return context;
}