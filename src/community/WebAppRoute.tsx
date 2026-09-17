import { lazy, Suspense } from "react";
const WebApp = lazy(() => import("./WebApp"));
export default function WebAppRoute() {
  return (
    <Suspense
      fallback={
        <div style={{ color: "white", padding: 32 }}>
          Loading Micro Explorer…
        </div>
      }
    >
      <WebApp />
    </Suspense>
  );
}
