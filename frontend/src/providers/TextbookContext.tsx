import type { ReactNode } from "react";
import { TextbookContext, type TextbookContextType } from "./textbook";


export function TextbookProvider({ children, value }: { children: ReactNode; value: TextbookContextType }) {
  return (
    <TextbookContext.Provider value={value}>
      {children}
    </TextbookContext.Provider>
  );
}
