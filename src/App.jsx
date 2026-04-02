import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header.jsx";
import "./styles/App.css";

const Dashboard       = lazy(() => import("./pages/Dashboard.jsx"));
const StakingPage     = lazy(() => import("./pages/StakingPage.jsx"));
const OwnerPanel      = lazy(() => import("./pages/OwnerPanel.jsx"));
const UTH2MiningPage  = lazy(() => import("./pages/UTH2MiningPage.jsx"));

function PageLoader() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      color: "rgba(255,255,255,0.4)",
      fontSize: 14,
    }}>
      Cargando...
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="app">
        <Header />
        <main className="main-content">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"        element={<Dashboard />} />
              <Route path="/staking" element={<StakingPage />} />
              <Route path="/mining"  element={<UTH2MiningPage />} />
              <Route path="/owner"   element={<OwnerPanel />} />
              <Route path="*"        element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}
