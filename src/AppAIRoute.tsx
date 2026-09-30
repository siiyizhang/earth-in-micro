import { lazy, Suspense } from 'react'

const AppAI = lazy(() => import('./AppAI'))

export default function AppAIRoute() {
  return <Suspense fallback={<div role="status" style={{ padding: 40, color: '#0abfbc' }}>Loading Eureka AI…</div>}><AppAI /></Suspense>
}
