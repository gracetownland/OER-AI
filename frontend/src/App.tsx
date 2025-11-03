import { BrowserRouter, Routes, Route } from "react-router";
import AIChatPage from "./pages/ChatInterface/ChatInterface";
import HomePage from "./pages/HomePage";
import { UserSessionProvider } from "./providers/UserSessionContext";
import { ModeProvider } from "@/providers/ModeContext";
import TextbookLayout from "./layouts/TextbookLayout";
import PracticeMaterialPage from "./pages/PracticeMaterial/PracticeMaterialPage";

function App() {
  return (
    <BrowserRouter>
      <UserSessionProvider>
        <ModeProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/textbook/:id" element={<TextbookLayout />}>
              <Route path="chat" element={<AIChatPage />} />
              <Route path="practice" element={<PracticeMaterialPage />} />
            </Route>
          </Routes>
        </ModeProvider>
      </UserSessionProvider>
      </BrowserRouter>
  );
}

export default App;
