import { create } from 'zustand';

const MAX_ALERTS = 60;

export const useFleetStore = create((set, get) => ({
  connectionStatus: 'connecting', // 'connecting' | 'online' | 'offline'
  zones: [],
  alerts: [],
  selectedVehicleId: null,
  search: '',
  typeFilter: 'all',
  stats: { vehicleCount: 0, avgSpeed: 0, activeCount: 0, idleCount: 0, throughput: 0 },
  visibleVehicleList: [], // throttled, capped snapshot for the sidebar list

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setZones: (zones) => set({ zones }),

  pushAlert: (alert) =>
    set((state) => ({
      alerts: [{ ...alert, id: `${alert.vehicleId}-${alert.timestamp}` }, ...state.alerts].slice(0, MAX_ALERTS),
    })),

  clearAlerts: () => set({ alerts: [] }),

  selectVehicle: (vehicleId) => set({ selectedVehicleId: vehicleId }),
  setSearch: (search) => set({ search }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),

  setStats: (stats) => set({ stats }),
  setVisibleVehicleList: (list) => set({ visibleVehicleList: list }),
}));
