import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Landing from './pages/Landing.tsx'
import Editor from './pages/Editor.tsx'
import Repos from './pages/Repos.tsx'
import Profile from './pages/Profile.tsx'
import Diff from './pages/Diff.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/repos" element={<Repos />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/diff" element={<Diff />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
