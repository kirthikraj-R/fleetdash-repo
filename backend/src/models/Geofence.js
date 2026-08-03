import mongoose from 'mongoose';

/**
 * A geofence is stored as a GeoJSON Polygon so we can optionally use
 * MongoDB's native 2dsphere index to pre-filter "which zones is this point
 * even near" before running exact Turf.js boundary intersection — avoids
 * running a full point-in-polygon test against every zone for every ping.
 */
const GeofenceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  color: { type: String, default: '#FFB020' },
  kind: { type: String, enum: ['restricted', 'depot', 'delivery', 'custom'], default: 'custom' },
  geometry: {
    type: {
      type: String,
      enum: ['Polygon'],
      required: true,
    },
    coordinates: {
      type: [[[Number]]], // [ [ [lng, lat], [lng, lat], ... ] ]
      required: true,
    },
  },
  createdAt: { type: Date, default: Date.now },
});

GeofenceSchema.index({ geometry: '2dsphere' });

export const Geofence = mongoose.models.Geofence || mongoose.model('Geofence', GeofenceSchema);
