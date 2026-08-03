import React from 'react';
import { Outlet } from 'react-router-dom';
import NavSidebar from '../components/NavSidebar.jsx';
import { useSocket } from '../hooks/useSocket.js';

export default function AppLayout() {
  // Connected once at the layout level so the socket + fleet buffer stay
  // alive across page navigation instead of reconnecting on every route change.
  useSocket();

  return (
    <div className="flex h-screen overflow-hidden bg-deep">
      <NavSidebar />
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
