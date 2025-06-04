import * as turf from '@turf/turf';
import type { Geometry, Position } from 'geojson';
import coastlineRaw from '../assets/coastlines.json';

export function getClosestPointInfo(
  lat: number,
  lon: number,
  maxDistanceMeters = 500
): {
  isNear: boolean;
  minDistance: number;
  closestPoint: Position;
} | null {
  const point = turf.point([lon, lat]);

  const geometries = (coastlineRaw as any).geometries as Geometry[];
  if (!geometries || geometries.length === 0) {
    console.warn('❌ No hay geometrías válidas en el GeoJSON.');
    return null;
  }

  let closestPoint: Position | null = null;
  let minDist = Infinity;

  for (const geometry of geometries) {
    // Convertimos MultiPolygon o Polygon en líneas
    if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') continue;
    const polyFeature = turf.feature(geometry);
    const lineCollection = turf.polygonToLine(polyFeature);

    const lineFeatures = lineCollection.type === 'FeatureCollection'
      ? lineCollection.features
      : [lineCollection];

    for (const line of lineFeatures) {
      const coords = line.geometry.coordinates;
      // Si es un MultiLineString, será un array de arrays → aplanamos
      const flatCoords = Array.isArray(coords[0][0])
      ? (coords as number[][][]).flat()
      : (coords as number[][]);

      for (const coord of flatCoords) {
        const dist = turf.distance(point, turf.point(coord), { units: 'meters' });
        if (dist < minDist) {
          minDist = dist;
          closestPoint = coord;
        }
      }
    }
  }

  if (closestPoint) {
    console.log('🧭 Punto más cercano en la costa:', closestPoint);
    console.log(`📏 Distancia al punto más cercano: ${minDist.toFixed(2)} m`);
    console.log(`📍 Tu punto: [${lon}, ${lat}]`);
    return {
      isNear: minDist <= maxDistanceMeters,
      minDistance: minDist,
      closestPoint,
    };
  } else {
    console.warn('❌ No se encontró ningún punto costero cercano');
    return null;
  }
}
