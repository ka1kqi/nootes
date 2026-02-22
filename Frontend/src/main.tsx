import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AIAgentFab } from './components/AIAgentFab'
import Landing from './pages/Landing.tsx'
import Home from './pages/Home.tsx'
import Login from './pages/Login.tsx'
import Editor from './pages/Editor.tsx'
import Repos from './pages/Repos.tsx'
import MyRepos from './pages/MyRepos.tsx'
import Profile from './pages/Profile.tsx'
import Diff from './pages/Diff.tsx'
import Chat from './pages/Chat.tsx'
import AuraStore from './pages/AuraStore.tsx'
import Graph_Creation from './pages/Graph_Creation.tsx'
import Settings from './pages/Settings.tsx'

// Renders AIAgentFab on all pages except landing, home (inline chatbox), and login
function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const hideOn = new Set(['/', '/home', '/login'])
  return (
    <>
      {children}
      {!hideOn.has(location.pathname) && <AIAgentFab />}
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/editor" element={<Navigate to="/repos" replace />} />
            <Route path="/editor/:repoId" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
            <Route path="/repos" element={<Repos />} />
            <Route path="/my-repos" element={<ProtectedRoute><MyRepos /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/diff" element={<Diff />} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/store" element={<ProtectedRoute><AuraStore /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/graph" element={<Graph_Creation />} />
          </Routes>
        </AppShell>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
