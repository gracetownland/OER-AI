import { BrowserRouter, Routes, Route } from "react-router";
import AIChatPage from "./pages/ChatInterface/ChatInterface";
import HomePage from "./pages/HomePage";
import UserGuidelines from "./pages/UserGuidelines";
import { UserSessionProvider } from "./providers/UserSessionContext";
import { ModeProvider } from "@/providers/ModeContext";
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
function useLambdaWarmup() {
  const apiEndpoint = import.meta.env.VITE_API_ENDPOINT;

  if (!apiEndpoint) return;

  // Fire-and-forget warmup requests - use HEAD to trigger warmup without heavy processing
  // Practice Material Lambda
  fetch(`${apiEndpoint}/textbooks/warmup/practice_materials`, { method: 'HEAD' })
    .catch(() => { }); // Ignore errors - warmup is best-effort

  // Text Generation Lambda (if applicable)
  // fetch(`${apiEndpoint}/warmup/textgen`, { method: 'HEAD' }).catch(() => {});
}

function App() {
  // Trigger Lambda warmup once on app mount
  useLambdaWarmup();

  return (
    <BrowserRouter>
      <UserSessionProvider>
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
      </UserSessionProvider>
    </BrowserRouter>
  );
}

export default App;
