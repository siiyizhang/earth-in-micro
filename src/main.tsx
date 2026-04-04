import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import AppTexture from './AppTexture.tsx'
import AppFontB from './AppFontB.tsx'
import AppFontC from './AppFontC.tsx'
import AppLowPoly from './AppLowPoly.tsx'
import AppIndex from './AppIndex.tsx'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/index" replace />} />
      <Route path="/index" element={<AppIndex />} />
      <Route path="/leisure" element={<App issStyle="line" />} />
      <Route path="/texture" element={<AppTexture />} />
      <Route path="/font-b" element={<AppFontB />} />
      <Route path="/font-c" element={<AppFontC />} />
      <Route path="/iss-glow" element={<App issStyle="glow" />} />
      <Route path="/iss-line" element={<App issStyle="line" />} />
      <Route path="/education" element={<AppLowPoly issStyle="line" />} />
      <Route path="/low-poly" element={<AppLowPoly issStyle="line" />} />
    </Routes>
  </BrowserRouter>
)
