import { BrowserRouter, Routes, Route } from 'react-router'
import AIChatPage from './pages/ChatInterface/ChatInterface'
import HomePage from './pages/HomePage'
import { UserSessionProvider } from './contexts/UserSessionContext'

function App() {
  return (
    <UserSessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/textbook/:id/chat" element={<AIChatPage />} />
        </Routes>
      </BrowserRouter>
    </UserSessionProvider>
  )
}

export default App
