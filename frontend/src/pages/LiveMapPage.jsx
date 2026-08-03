import React from 'react';
import TopBar from '../components/TopBar.jsx';
import ZoneLegend from '../components/ZoneLegend.jsx';
import VehicleList from '../components/VehicleList.jsx';
import MapView from '../components/MapView.jsx';
import AlertsPanel from '../components/AlertsPanel.jsx';
import VehicleDetailPanel from '../components/VehicleDetailPanel.jsx';
import BreachToast from '../components/BreachToast.jsx';

export default function LiveMapPage() {
  return (
    <div className="flex h-full flex-col">
      <TopBar title="Live Map" subtitle="Real-time vehicle tracking" />

      <div className="flex items-center justify-end px-6 py-2.5">
        <ZoneLegend />
      </div>

      <main className="flex min-h-0 flex-1 gap-4 p-4">
        <aside className="h-full w-[280px] shrink-0">
          <VehicleList />
        </aside>

        <section className="relative h-full min-w-0 flex-1">
          <MapView />
          <BreachToast />
        </section>

        <aside className="grid h-full w-[320px] shrink-0 grid-rows-[minmax(0,1fr)_minmax(0,260px)] gap-4">
          <AlertsPanel />
          <VehicleDetailPanel />
        </aside>
      </main>
    </div>
  );
}
