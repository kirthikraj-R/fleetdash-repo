import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getAllVehicles, getThroughput } from '../store/fleetBuffer.js';
import { useFleetStore } from '../store/fleetStore.js';
import { initials, driverPhone, licensePlate } from '../lib/driverDetails.js';

const DEFAULT_CENTER = [22.9734, 78.6569]; // geographic center of India
const DEFAULT_ZOOM = 5;
const UPDATE_INTERVAL_MS = 400; // matches the simulator's tick rate closely enough to feel live, without redrawing hundreds of markers 60x/sec

// Tuned for contrast against a light basemap rather than the original dark one.
const STATUS_COLOR = {
  active: '#0E8FA3',
  idle: '#94A0B4',
};

const ZONE_COLOR = {
  restricted: '#E0524F',
  depot: '#2E9E63',
  delivery: '#0E8FA3',
  custom: '#C67E12',
};

function popupHtml(vehicleId, current) {
  const driverName = current.meta?.driver || 'Unassigned';
  const hub = current.meta?.hub;
  const type = current.meta?.type || '—';
  const statusLabel = current.status === 'active' ? 'Active' : 'Idle';
  const statusColor = STATUS_COLOR[current.status] || STATUS_COLOR.active;

  return `
    <div class="fleetdash-popup-card">
      <div class="fp-header">
        <div class="fp-avatar">${initials(driverName)}</div>
        <div class="fp-header-text">
          <div class="fp-name">${driverName}</div>
          <div class="fp-sub">${vehicleId} · ${type}</div>
        </div>
      </div>
      <div class="fp-status" style="color:${statusColor}">
        <span class="fp-dot" style="background:${statusColor}"></span>${statusLabel}
      </div>
      <div class="fp-rows">
        <div class="fp-row"><span>Phone</span><b>${driverPhone(vehicleId)}</b></div>
        <div class="fp-row"><span>Plate</span><b>${licensePlate(vehicleId, hub)}</b></div>
        <div class="fp-row"><span>Speed</span><b>${current.speedKph.toFixed(0)} km/h</b></div>
        <div class="fp-row"><span>Fuel</span><b>${current.fuel?.toFixed(0) ?? '—'}%</b></div>
        ${hub ? `<div class="fp-row"><span>Region</span><b>${hub}</b></div>` : ''}
      </div>
    </div>
  `;
}

/**
 * Live map on real-world tiles.
 *
 * This still follows the same core rule as before: high-frequency vehicle
 * position updates never touch React state. They're read straight out of
 * fleetBuffer.js and pushed into Leaflet's own layers imperatively
 * (marker.setLatLng(...)), on a plain interval — completely bypassing
 * React's render cycle. Only low-frequency things (zones, filters,
 * selection, stats) go through the zustand store and cause normal
 * re-renders, same architecture as the original Canvas version.
 */
export default function MapView() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const vehicleLayerRef = useRef(null);
  const zoneLayerRef = useRef(null);
  const selectionRingRef = useRef(null);
  const markersRef = useRef(new Map()); // vehicleId -> L.CircleMarker
  const hasAutoFitRef = useRef(false);
  const intervalRef = useRef(null);
  const flashLayerRef = useRef(null);

  const zones = useFleetStore((s) => s.zones);
  const selectedVehicleId = useFleetStore((s) => s.selectedVehicleId);
  const selectedRef = useRef(selectedVehicleId);
  selectedRef.current = selectedVehicleId;

  const selectVehicle = useFleetStore((s) => s.selectVehicle);
  const setStats = useFleetStore((s) => s.setStats);
  const setVisibleVehicleList = useFleetStore((s) => s.setVisibleVehicleList);
  const search = useFleetStore((s) => s.search);
  const typeFilter = useFleetStore((s) => s.typeFilter);
  const filtersRef = useRef({ search, typeFilter });
  filtersRef.current = { search, typeFilter };

  const alerts = useFleetStore((s) => s.alerts);
  const lastAlertIdRef = useRef(null);

  // ---- Map setup (runs once) ----
  useEffect(() => {
    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      preferCanvas: true, // renders markers via <canvas> instead of individual SVG/DOM nodes — needed at this vehicle count
      zoomControl: true,
      attributionControl: true,
    });

    // Light basemap (CARTO Positron), no API key required.
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    zoneLayerRef.current = L.layerGroup().addTo(map);
    vehicleLayerRef.current = L.layerGroup().addTo(map);
    flashLayerRef.current = L.layerGroup().addTo(map);

    // Halo ring around whichever vehicle is currently selected.
    selectionRingRef.current = L.circleMarker(DEFAULT_CENTER, {
      radius: 11,
      color: '#1E293B',
      weight: 2,
      fill: false,
      opacity: 0,
      interactive: false,
    }).addTo(map);

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      clearInterval(intervalRef.current);
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // ---- Redraw geofence zones whenever the zone list changes ----
  useEffect(() => {
    const layer = zoneLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    for (const zone of zones) {
      const color = zone.color || ZONE_COLOR[zone.kind] || '#C67E12';
      const rings = zone.geometry.coordinates;
      const latLngs = rings.map((ring) => ring.map(([lng, lat]) => [lat, lng]));

      const polygon = L.polygon(latLngs, {
        color,
        weight: 1.5,
        opacity: 0.75,
        fillColor: color,
        fillOpacity: 0.1,
      }).addTo(layer);

      polygon.bindTooltip(zone.name, {
        permanent: false,
        direction: 'center',
        className: 'fleetdash-zone-tooltip',
      });
    }
  }, [zones]);

  // ---- Breach flash: a temporary ring at the alert's real-world location ----
  useEffect(() => {
    if (alerts.length === 0 || !mapRef.current) return;
    const latest = alerts[0];
    if (latest.id === lastAlertIdRef.current) return;
    lastAlertIdRef.current = latest.id;

    const color = latest.type === 'ENTER' && latest.zoneKind === 'restricted' ? '#E0524F' : '#C67E12';
    const circle = L.circle([latest.lat, latest.lng], {
      radius: 120,
      color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.15,
      interactive: false,
    }).addTo(flashLayerRef.current);

    setTimeout(() => flashLayerRef.current?.removeLayer(circle), 1600);
  }, [alerts]);

  // ---- The live update loop: reads fleetBuffer directly, bypasses React state ----
  useEffect(() => {
    function tick() {
      const map = mapRef.current;
      if (!map) return;

      const vehicles = getAllVehicles();
      const { search: term, typeFilter: type } = filtersRef.current;
      const normalizedTerm = term?.trim().toLowerCase();

      let speedSum = 0;
      let activeCount = 0;
      let idleCount = 0;
      const listForSidebar = [];
      const boundsPoints = [];

      for (const [id, entry] of vehicles) {
        const c = entry.current;
        speedSum += c.speedKph || 0;
        if (c.status === 'active') activeCount++;
        else idleCount++;

        const vType = c.meta?.type;
        const matchesFilter =
          (type === 'all' || vType === type) &&
          (!normalizedTerm || id.toLowerCase().includes(normalizedTerm) || (c.meta?.driver || '').toLowerCase().includes(normalizedTerm));

        if (matchesFilter) listForSidebar.push({ id, ...c });

        let marker = markersRef.current.get(id);
        const color = STATUS_COLOR[c.status] || STATUS_COLOR.active;

        if (!marker) {
          marker = L.circleMarker([c.lat, c.lng], {
            radius: 4.5,
            color: '#FFFFFF', // white ring for definition against the light basemap
            weight: 1.5,
            fillColor: color,
            fillOpacity: 1,
          });
          marker.on('click', () => {
            selectVehicle(id);
            const latest = markersRef.current.get(id);
            if (latest) {
              latest.bindPopup(popupHtml(id, latest.__lastPoint || c), { className: 'fleetdash-popup', closeButton: true }).openPopup();
            }
          });
          marker.__lastPoint = c;
          markersRef.current.set(id, marker);
        } else {
          marker.setLatLng([c.lat, c.lng]);
          marker.setStyle({ fillColor: color });
          marker.__lastPoint = c;
          // Keep an already-open popup live for whichever vehicle is selected.
          if (id === selectedRef.current && marker.isPopupOpen()) {
            marker.setPopupContent(popupHtml(id, c));
          }
        }

        const shouldShow = matchesFilter;
        const isOnMap = vehicleLayerRef.current.hasLayer(marker);
        if (shouldShow && !isOnMap) vehicleLayerRef.current.addLayer(marker);
        if (!shouldShow && isOnMap) vehicleLayerRef.current.removeLayer(marker);

        if (matchesFilter) boundsPoints.push([c.lat, c.lng]);
      }

      listForSidebar.sort((a, b) => b.speedKph - a.speedKph);
      setVisibleVehicleList(listForSidebar.slice(0, 150));
      setStats({
        vehicleCount: vehicles.size,
        avgSpeed: vehicles.size ? speedSum / vehicles.size : 0,
        activeCount,
        idleCount,
        throughput: getThroughput(),
      });

      // Selection halo follows the selected vehicle, or hides if none selected.
      const selectedId = selectedRef.current;
      const selectedEntry = selectedId ? vehicles.get(selectedId) : null;
      if (selectedEntry) {
        selectionRingRef.current.setLatLng([selectedEntry.current.lat, selectedEntry.current.lng]);
        selectionRingRef.current.setStyle({ opacity: 1 });
      } else {
        selectionRingRef.current.setStyle({ opacity: 0 });
      }

      // Auto-fit the view to the fleet's actual position, once, the first
      // time real data arrives — matters if the simulator has been running
      // long enough for vehicles to drift from the default center.
      if (!hasAutoFitRef.current && boundsPoints.length > 0) {
        map.fitBounds(L.latLngBounds(boundsPoints), { padding: [60, 60], maxZoom: 14 });
        hasAutoFitRef.current = true;
      }
    }

    tick();
    intervalRef.current = setInterval(tick, UPDATE_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl shadow-clay">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-4 top-4 z-[1000] select-none rounded-full bg-white/85 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-[#5B6472] shadow-clay-sm backdrop-blur">
        Scroll to zoom · Drag to pan · Click a vehicle for details
      </div>
    </div>
  );
}
