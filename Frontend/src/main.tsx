import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Landing from './pages/Landing.tsx'
import Login from './pages/Login.tsx'
import Editor from './pages/Editor.tsx'
import Repos from './pages/Repos.tsx'
import MyRepos from './pages/MyRepos.tsx'
import Profile from './pages/Profile.tsx'
import Diff from './pages/Diff.tsx'
import Chat from './pages/Chat.tsx'
import AuraStore from './pages/AuraStore.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/repos" element={<Repos />} />
        <Route path="/my-repos" element={<MyRepos />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/diff" element={<Diff />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/store" element={<AuraStore />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
