import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import AIChatPage from "./pages/ChatInterface/ChatInterface";
import HomePage from "./pages/HomePage";
import UserGuidelines from "./pages/UserGuidelines";
import { UserSessionProvider } from "./providers/UserSessionContext";
import { ModeProvider } from "@/providers/ModeContext";
import { AuthProvider } from "@/providers/AuthProvider";
import TextbookLayout from "./layouts/TextbookLayout";
import PracticeMaterialPage from "./pages/PracticeMaterial/PracticeMaterialPage";
import FAQPage from "./pages/FAQ/FAQPage";
import MaterialEditorPage from "./pages/MaterialEditor/MaterialEditorPage";
import AdminLogin from "./pages/Admin/AdminLogin";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import TextbookDetailsPage from "./pages/Admin/TextbookDetailsPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { Amplify } from "aws-amplify";

Amplify.configure({
  API: {
    REST: {
      MyApi: {
        endpoint: import.meta.env.VITE_API_ENDPOINT,
      },
    },
  },
  Auth: {
    Cognito: {
      userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
    },
  },
});

// Pre-warm Lambdas on app load to reduce cold start latency
// Uses WebSocket to send a warmup action that triggers the practice material Lambda
// function warmupLambdas moved to component logic


function App() {
  return (
    <BrowserRouter>
      <UserSessionProvider>
        <AuthProvider>
          <ModeProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/guidelines" element={<UserGuidelines />} />
              <Route path="/textbook/:id" element={<TextbookLayout />}>
                <Route path="chat" element={<AIChatPage />} />
                <Route path="practice" element={<PracticeMaterialPage />} />
                <Route path="faq" element={<FAQPage />} />
                <Route path="material-editor" element={<MaterialEditorPage />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/textbook/:id"
                element={
                  <ProtectedRoute>
                    <TextbookDetailsPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </ModeProvider>
        </AuthProvider>
      </UserSessionProvider>
    </BrowserRouter>
  );
}

export default App;
