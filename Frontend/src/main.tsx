import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Landing from './pages/Landing.tsx'
import Login from './pages/Login.tsx'
import Editor from './pages/Editor.tsx'
import Repos from './pages/Repos.tsx'
import MyRepos from './pages/MyRepos.tsx'
import Profile from './pages/Profile.tsx'
import Diff from './pages/Diff.tsx'
import Chat from './pages/Chat.tsx'
import AuraStore from './pages/AuraStore.tsx'
import Graph_Creation from './pages/Graph_Creation.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/editor" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
          <Route path="/repos" element={<Repos />} />
          <Route path="/my-repos" element={<ProtectedRoute><MyRepos /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/diff" element={<Diff />} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/store" element={<ProtectedRoute><AuraStore /></ProtectedRoute>} />
          <Route path="/graph" element={<Graph_Creation />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
