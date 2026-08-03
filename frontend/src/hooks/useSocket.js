import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import msgpackParser from 'socket.io-msgpack-parser';
import { ingestBatch, hydrateSnapshot } from '../store/fleetBuffer.js';
import { useFleetStore } from '../store/fleetStore.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export function useSocket() {
  const socketRef = useRef(null);
  const setConnectionStatus = useFleetStore((s) => s.setConnectionStatus);
  const setZones = useFleetStore((s) => s.setZones);
  const pushAlert = useFleetStore((s) => s.pushAlert);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      parser: msgpackParser,
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnectionStatus('online'));
    socket.on('disconnect', () => setConnectionStatus('offline'));
    socket.io.on('reconnect_attempt', () => setConnectionStatus('connecting'));

    // High-frequency channel: written straight into the external buffer,
    // never touches React state. See store/fleetBuffer.js for why.
    socket.on('telemetry:batch', (batch) => {
      ingestBatch(batch);
    });

    // Low-frequency, must-not-drop channel: goes through zustand so the
    // alerts panel + toasts re-render normally.
    socket.on('geofence:event', (event) => {
      pushAlert(event);
    });

    socket.on('fleet:snapshot', (snapshot) => {
      hydrateSnapshot(snapshot);
    });

    socket.on('geofence:zones', (zones) => {
      setZones(zones);
    });

    return () => {
      socket.disconnect();
    };
  }, [setConnectionStatus, setZones, pushAlert]);

  return socketRef;
}
