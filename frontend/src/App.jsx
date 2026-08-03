import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LiveMapPage from './pages/LiveMapPage.jsx';
import FleetPage from './pages/FleetPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import GeofencesPage from './pages/GeofencesPage.jsx';

const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.jsx'));

function AnalyticsFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <span className="font-mono text-xs uppercase tracking-widest text-muted">Loading charts…</span>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/map" element={<LiveMapPage />} />
              <Route path="/fleet" element={<FleetPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/geofences" element={<GeofencesPage />} />
              <Route
                path="/analytics"
                element={
                  <Suspense fallback={<AnalyticsFallback />}>
                    <AnalyticsPage />
                  </Suspense>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
