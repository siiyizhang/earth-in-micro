import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import AppIndex from './AppIndex.tsx'
import AppLowPoly from './AppLowPoly.tsx'
import AppLeisure from './AppLeisure.tsx'
import AppAbout from './AppAbout.tsx'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/index" replace />} />
      <Route path="/index" element={<AppIndex />} />
      <Route path="/education" element={<AppLowPoly issStyle="line" />} />
      <Route path="/leisure" element={<AppLeisure issStyle="line" />} />
      <Route path="/about" element={<AppAbout />} />
    </Routes>
  </BrowserRouter>
)
