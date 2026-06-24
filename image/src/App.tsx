import React, { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import JSZip from 'jszip';
import { 
  Compass, 
  Download,
  Upload,
  Trash2, 
  Layers, 
  Key, 
  Check, 
  Copy, 
  Maximize2, 
  AlertTriangle, 
  X, 
  Move, 
  CheckCircle2, 
  Lock, 
  Info,
  HelpCircle,
  Plus,
  FolderArchive,
  Loader2
} from 'lucide-react';

// Color Palette for generated bounding boxes
const COLORS = [
  '#3b82f6', // blue
  '#f97316', // orange
  '#a855f7', // purple
  '#10b981', // emerald
  '#ef4444', // red
  '#eab308', // yellow
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#6366f1'  // indigo
];

interface Box {
  id: string;
  color: string;
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
  scale: number;
  rotation?: number;
  page_w_in?: number;
  page_h_in?: number;
  page_w_mm?: number;
  page_h_mm?: number;
}

function calculateMapScale(map: mapboxgl.Map): number {
  const center = map.getCenter();
  const mapZoom = map.getZoom();
  const equatorialCircumference = 40075016.686;
  const metersPerPixel = (Math.cos(center.lat * Math.PI / 180) * equatorialCircumference) / (512 * Math.pow(2, mapZoom));
  const screenMetersPerPixel = 0.0254 / 96; // 96 DPI screen
  return Math.round(metersPerPixel / screenMetersPerPixel);
}

function calculatePageDimensions(xmin: number, ymin: number, xmax: number, ymax: number, scale: number) {
  const R = 6378137; // Earth radius in meters
  const midLat = ((ymin + ymax) / 2) * Math.PI / 180;
  
  // Latitude and longitude differences
  const latDiff = Math.abs(ymax - ymin) * Math.PI / 180;
  const lngDiff = Math.abs(xmax - xmin) * Math.PI / 180;
  
  const heightMeters = latDiff * R;
  const widthMeters = lngDiff * R * Math.cos(midLat);
  
  // Page width and height in mm
  const page_w_mm = (widthMeters / scale) * 1000;
  const page_h_mm = (heightMeters / scale) * 1000;
  
  // Page width and height in inches
  const page_w_in = page_w_mm / 25.4;
  const page_h_in = page_h_mm / 25.4;
  
  return {
    page_w_in: Number(page_w_in.toFixed(3)),
    page_h_in: Number(page_h_in.toFixed(3)),
    page_w_mm: Number(page_w_mm.toFixed(1)),
    page_h_mm: Number(page_h_mm.toFixed(1))
  };
}

function syncBoxDerivedValues(box: Box): Box {
  const dims = calculatePageDimensions(box.xmin, box.ymin, box.xmax, box.ymax, box.scale);
  return {
    ...box,
    page_w_in: dims.page_w_in,
    page_h_in: dims.page_h_in,
    page_w_mm: dims.page_w_mm,
    page_h_mm: dims.page_h_mm
  };
}

function updateBoxFromPageWidthInches(box: Box, w_in: number): Box {
  const R = 6378137;
  const midLat = ((box.ymin + box.ymax) / 2) * Math.PI / 180;
  const widthMeters = (w_in * 25.4 * box.scale) / 1000;
  const lngDiff = (widthMeters / (R * Math.cos(midLat))) * (180 / Math.PI);
  
  return {
    ...box,
    xmax: box.xmin + lngDiff,
    page_w_in: Number(w_in.toFixed(3)),
    page_w_mm: Number((w_in * 25.4).toFixed(1))
  };
}

function updateBoxFromPageHeightInches(box: Box, h_in: number): Box {
  const R = 6378137;
  const heightMeters = (h_in * 25.4 * box.scale) / 1000;
  const latDiff = (heightMeters / R) * (180 / Math.PI);
  
  return {
    ...box,
    ymax: box.ymin + latDiff,
    page_h_in: Number(h_in.toFixed(3)),
    page_h_mm: Number((h_in * 25.4).toFixed(1))
  };
}

function updateBoxFromPageWidthMm(box: Box, w_mm: number): Box {
  const w_in = w_mm / 25.4;
  return updateBoxFromPageWidthInches(box, w_in);
}

function updateBoxFromPageHeightMm(box: Box, h_mm: number): Box {
  const h_in = h_mm / 25.4;
  return updateBoxFromPageHeightInches(box, h_in);
}

function lngLatToMercator(lng: number, lat: number) {
  const x = lng * (Math.PI / 180);
  const latRad = lat * (Math.PI / 180);
  const y = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  return [x, y];
}

function mercatorToLngLat(x: number, y: number) {
  const lng = x * (180 / Math.PI);
  const latRad = 2 * Math.atan(Math.exp(y)) - Math.PI / 2;
  const lat = latRad * (180 / Math.PI);
  return [lng, lat];
}

function rotatePoint(lng: number, lat: number, centerLng: number, centerLat: number, angleDegrees: number) {
  if (!angleDegrees) return [lng, lat];
  const [x, y] = lngLatToMercator(lng, lat);
  const [cx, cy] = lngLatToMercator(centerLng, centerLat);
  
  const angleRad = (angleDegrees * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  
  const dx = x - cx;
  const dy = y - cy;
  
  const rotatedX = cx + (dx * cosA + dy * sinA);
  const rotatedY = cy + (-dx * sinA + dy * cosA);
  
  return mercatorToLngLat(rotatedX, rotatedY);
}

function getBoxCoordinates(b: Box): number[][] {
  const centerLng = (b.xmin + b.xmax) / 2;
  const centerLat = (b.ymin + b.ymax) / 2;
  const rot = b.rotation ?? 0;
  
  const p1 = rotatePoint(b.xmin, b.ymin, centerLng, centerLat, rot);
  const p2 = rotatePoint(b.xmax, b.ymin, centerLng, centerLat, rot);
  const p3 = rotatePoint(b.xmax, b.ymax, centerLng, centerLat, rot);
  const p4 = rotatePoint(b.xmin, b.ymax, centerLng, centerLat, rot);
  
  return [p1, p2, p3, p4, p1];
}

function formatStyleUrl(style: string | null): string {
  if (!style) return 'mapbox://styles/mapbox/dark-v11';
  if (style.startsWith('mapbox://') || style.startsWith('http://') || style.startsWith('https://')) {
    return style;
  }
  if (style.includes('/')) {
    return `mapbox://styles/${style}`;
  }
  const standardStyles = ['streets-v12', 'outdoors-v12', 'light-v11', 'dark-v11', 'satellite-v9', 'satellite-streets-v12', 'navigation-day-v1', 'navigation-night-v1'];
  if (standardStyles.includes(style)) {
    return `mapbox://styles/mapbox/${style}`;
  }
  return `mapbox://styles/${style}`;
}

function getInitialTokenAndStyle() {
  let token = '';
  let styleUrl = 'mapbox://styles/mapbox/dark-v11';

  const hash = window.location.hash.slice(1);
  if (hash) {
    const params = new URLSearchParams(hash);
    const hashToken = params.get('token');
    const hashStyle = params.get('style');
    if (hashToken) {
      token = hashToken;
    }
    if (hashStyle) {
      styleUrl = hashStyle;
    }
  }

  if (!token) {
    token = localStorage.getItem('mapbox_token') || '';
  }
  if (styleUrl === 'mapbox://styles/mapbox/dark-v11') {
    const localStyle = localStorage.getItem('mapbox_style');
    if (localStyle) {
      styleUrl = localStyle;
    }
  }

  styleUrl = formatStyleUrl(styleUrl);
  return { token, styleUrl };
}

function getZoomFromScale(scale: number, latitude: number): number {
  const equatorialCircumference = 40075016.686;
  const metersPerPixelAtZoom0 = (Math.cos(latitude * Math.PI / 180) * equatorialCircumference) / 512;
  const desiredMetersPerPixel = (scale * 0.0254) / 96; // 96 DPI screen
  return Math.log2(metersPerPixelAtZoom0 / desiredMetersPerPixel);
}

function getZoomFromScaleAndDpi(scale: number, latitude: number, dpi: number): number {
  const equatorialCircumference = 40075016.686;
  const metersPerPixelAtZoom0 = (Math.cos(latitude * Math.PI / 180) * equatorialCircumference) / 512;
  const desiredMetersPerPixel = (scale * 0.0254) / dpi;
  return Math.log2(metersPerPixelAtZoom0 / desiredMetersPerPixel);
}

function encodeCmykTiff(width: number, height: number, rgbaPixels: Uint8ClampedArray, dpi: number): ArrayBuffer {
  const pixelCount = width * height;
  const imageBytes = pixelCount * 4; // 4 bytes per pixel (C, M, Y, K)
  const headerSize = 8;
  const ifdSize = 2 + 16 * 12 + 4; // 16 tags, each 12 bytes, plus 2-byte count and 4-byte next-IFD offset = 198 bytes
  const extraSize = 8 + 8 + 8; // BitsPerSample: 8 bytes, XResolution: 8 bytes, YResolution: 8 bytes = 24 bytes
  const totalHeaderAndIfd = headerSize + ifdSize + extraSize + 2; // 8 + 198 + 24 + 2 = 232 bytes (which is imageDataOffset)
  const totalSize = totalHeaderAndIfd + imageBytes;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // 1. TIFF Header
  // "II" (Intel Little Endian)
  view.setUint8(0, 0x49);
  view.setUint8(1, 0x49);
  // Magic number 42
  view.setUint16(2, 42, true);
  // Offset to first IFD (we place it at byte 8)
  view.setUint32(4, 8, true);

  // 2. IFD - Image File Directory (starts at byte 8)
  const ifdOffset = 8;
  view.setUint16(ifdOffset, 16, true); // 16 tags

  // Offset definitions for extra data
  const bitsPerSampleOffset = 208;
  const xResOffset = 216;
  const yResOffset = 224;
  const imageDataOffset = 232;

  // Helper to write IFD entry
  const writeEntry = (entryIdx: number, tag: number, type: number, count: number, valueOrOffset: number) => {
    const entryOffset = ifdOffset + 2 + entryIdx * 12;
    view.setUint16(entryOffset, tag, true);
    view.setUint16(entryOffset + 2, type, true);
    view.setUint32(entryOffset + 4, count, true);
    view.setUint32(entryOffset + 8, valueOrOffset, true);
  };

  // Write sorted directory entries (sorted strictly by tag ID ascending)
  writeEntry(0, 256, 4, 1, width); // ImageWidth (LONG)
  writeEntry(1, 257, 4, 1, height); // ImageLength (LONG)
  writeEntry(2, 258, 3, 4, bitsPerSampleOffset); // BitsPerSample (SHORT) - points to [8, 8, 8, 8]
  writeEntry(3, 259, 3, 1, 1); // Compression (SHORT) - No compression
  writeEntry(4, 262, 3, 1, 5); // PhotometricInterpretation (SHORT) - CMYK (5)
  writeEntry(5, 273, 4, 1, imageDataOffset); // StripOffsets (LONG) - offset to image data
  writeEntry(6, 277, 3, 1, 4); // SamplesPerPixel (SHORT) - 4
  writeEntry(7, 278, 4, 1, height); // RowsPerStrip (LONG)
  writeEntry(8, 279, 4, 1, imageBytes); // StripByteCounts (LONG)
  writeEntry(9, 282, 5, 1, xResOffset); // XResolution (RATIONAL) - points to [dpi, 1]
  writeEntry(10, 283, 5, 1, yResOffset); // YResolution (RATIONAL) - points to [dpi, 1]
  writeEntry(11, 284, 3, 1, 1); // PlanarConfiguration (SHORT) - Chunky format (1)
  writeEntry(12, 296, 3, 1, 2); // ResolutionUnit (SHORT) - Inches (2)
  writeEntry(13, 332, 3, 1, 1); // InkSet (SHORT) - CMYK (1)
  writeEntry(14, 334, 3, 1, 4); // NumberOfInks (SHORT) - 4
  writeEntry(15, 336, 3, 2, 0x00FF0000); // DotRange (SHORT) - count 2, value [0, 255] packed in 32-bit (little-endian: 0x00, 0x00, 0xFF, 0x00)

  // Next IFD Offset (4 bytes, 0 meaning end)
  view.setUint32(ifdOffset + 2 + 16 * 12, 0, true);

  // 3. Write extra data values
  // BitsPerSample: [8, 8, 8, 8] (4 SHORTs)
  view.setUint16(bitsPerSampleOffset, 8, true);
  view.setUint16(bitsPerSampleOffset + 2, 8, true);
  view.setUint16(bitsPerSampleOffset + 4, 8, true);
  view.setUint16(bitsPerSampleOffset + 6, 8, true);

  // XResolution: [dpi, 1] (2 LONGs)
  view.setUint32(xResOffset, dpi, true);
  view.setUint32(xResOffset + 4, 1, true);

  // YResolution: [dpi, 1] (2 LONGs)
  view.setUint32(yResOffset, dpi, true);
  view.setUint32(yResOffset + 4, 1, true);

  // 4. Transform RGBA pixels to CMYK and write to imageDataOffset (starting at 232)
  let destIdx = imageDataOffset;
  for (let i = 0; i < pixelCount; i++) {
    const srcIdx = i * 4;
    const r = rgbaPixels[srcIdx];
    const g = rgbaPixels[srcIdx + 1];
    const b = rgbaPixels[srcIdx + 2];

    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    const k = 1 - Math.max(rNorm, gNorm, bNorm);
    let c = 0;
    let m = 0;
    let y = 0;

    if (k < 1) {
      c = (1 - rNorm - k) / (1 - k);
      m = (1 - gNorm - k) / (1 - k);
      y = (1 - bNorm - k) / (1 - k);
    }

    view.setUint8(destIdx, Math.round(c * 255));
    view.setUint8(destIdx + 1, Math.round(m * 255));
    view.setUint8(destIdx + 2, Math.round(y * 255));
    view.setUint8(destIdx + 3, Math.round(k * 255));
    destIdx += 4;
  }

  return buffer;
}

export default function App() {
  const [token, setToken] = useState<string>(() => {
    const { token } = getInitialTokenAndStyle();
    return token;
  });
  const [styleUrl, setStyleUrl] = useState<string>(() => {
    const { styleUrl } = getInitialTokenAndStyle();
    return styleUrl;
  });
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(() => {
    const { token } = getInitialTokenAndStyle();
    return !token;
  });
  
  // App state
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tempInputs, setTempInputs] = useState<Record<string, string>>({});
  const [drawMode, setDrawMode] = useState<'draw' | 'pan'>('draw');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewportScale, setViewportScale] = useState<number>(50000);
  const [isEditingScale, setIsEditingScale] = useState(false);
  const [scaleInputValue, setScaleInputValue] = useState('');
  const [showScaleTooltip, setShowScaleTooltip] = useState(false);
  const [viewportRotation, setViewportRotation] = useState<number>(0);
  const [isEditingRotation, setIsEditingRotation] = useState(false);
  const [rotationInputValue, setRotationInputValue] = useState('');
  const [showRotationTooltip, setShowRotationTooltip] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  
  // Draw / handle ref state
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const nextIdRef = useRef<number>(1);
  
  // Interaction states as refs to avoid Mapbox listener closures
  const isResizingRef = useRef(false);
  const isDrawingRef = useRef(false);
  const drawStartPtRef = useRef<mapboxgl.Point | null>(null);
  const [drawingRect, setDrawingRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  
  const isDraggingBoxRef = useRef(false);
  const dragStartDataRef = useRef<{
    boxId: string;
    startLngLat: mapboxgl.LngLat;
    startCoords: { xmin: number; ymin: number; xmax: number; ymax: number };
  } | null>(null);

  const [handles, setHandles] = useState<{
    corners: { id: string; x: number; y: number }[];
    edges: { id: string; x: number; y: number }[];
  } | null>(null);



  // Sync state and localStorage if URL hash changes or is present on mount
  useEffect(() => {
    const syncFromHash = () => {
      const { token: hashToken, styleUrl: hashStyle } = getInitialTokenAndStyle();
      let changed = false;
      if (hashToken && hashToken !== token) {
        setToken(hashToken);
        localStorage.setItem('mapbox_token', hashToken);
        changed = true;
      }
      if (hashStyle && hashStyle !== styleUrl) {
        setStyleUrl(hashStyle);
        localStorage.setItem('mapbox_style', hashStyle);
        changed = true;
      }
      if (changed) {
        window.location.reload();
      }
    };

    // Run once on mount to ensure localStorage is in sync with hash
    const { token: hashToken, styleUrl: hashStyle } = getInitialTokenAndStyle();
    if (hashToken && hashToken !== localStorage.getItem('mapbox_token')) {
      localStorage.setItem('mapbox_token', hashToken);
    }
    if (hashStyle && hashStyle !== localStorage.getItem('mapbox_style')) {
      localStorage.setItem('mapbox_style', hashStyle);
    }

    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [token, styleUrl]);

  // Scroll active card into view when selected
  useEffect(() => {
    if (activeId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`card-${activeId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeId]);

  // Show Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Safe Token submission
  const handleTokenSubmit = (submittedToken: string, submittedStyle: string) => {
    if (!submittedToken.startsWith('pk.')) {
      showToast('Invalid token! Token must start with "pk."');
      return;
    }
    localStorage.setItem('mapbox_token', submittedToken);
    
    const formattedStyle = formatStyleUrl(submittedStyle);
    localStorage.setItem('mapbox_style', formattedStyle);
    
    setToken(submittedToken);
    setStyleUrl(formattedStyle);
    setIsTokenModalOpen(false);

    // Sync to URL hash
    const cleanStyleForHash = submittedStyle.replace('mapbox://styles/', '');
    window.location.hash = `token=${submittedToken}&style=${cleanStyleForHash}`;
    
    // Reload window to re-initialize map clean
    window.location.reload();
  };

  const handleClearToken = () => {
    localStorage.removeItem('mapbox_token');
    localStorage.removeItem('mapbox_style');
    // Clear URL hash
    window.location.hash = '';
    setToken('');
    setIsTokenModalOpen(true);
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    setIsMapLoaded(false);
  };

  // Helper to sync Mapbox Source data
  const updateMapData = (currentBoxes: Box[]) => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;
    const source = map.getSource('boxes') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: currentBoxes.map(b => ({
          type: 'Feature',
          properties: { id: b.id, color: b.color },
          geometry: {
            type: 'Polygon',
            coordinates: [getBoxCoordinates(b)]
          }
        }))
      });
    }
  };

  // Update SVG handles positions based on map position and active ID
  const updateHandles = useCallback(() => {
    const map = mapRef.current;
    if (!map || !activeId || !isMapLoaded || drawMode === 'pan') {
      setHandles(null);
      return;
    }
    const activeBox = boxes.find(b => b.id === activeId);
    if (!activeBox) {
      setHandles(null);
      return;
    }

    try {
      const coords = getBoxCoordinates(activeBox);
      const sw = map.project(coords[0] as [number, number]);
      const se = map.project(coords[1] as [number, number]);
      const ne = map.project(coords[2] as [number, number]);
      const nw = map.project(coords[3] as [number, number]);

      setHandles({
        corners: [
          { id: 'nw', x: nw.x, y: nw.y },
          { id: 'ne', x: ne.x, y: ne.y },
          { id: 'sw', x: sw.x, y: sw.y },
          { id: 'se', x: se.x, y: se.y }
        ],
        edges: [
          { id: 'n', x: (nw.x + ne.x) / 2, y: (nw.y + ne.y) / 2 },
          { id: 's', x: (sw.x + se.x) / 2, y: (sw.y + se.y) / 2 },
          { id: 'w', x: (nw.x + sw.x) / 2, y: (nw.y + sw.y) / 2 },
          { id: 'e', x: (ne.x + se.x) / 2, y: (ne.y + se.y) / 2 }
        ]
      });
    } catch (e) {
      // Bounds might be out of range during quick pans
    }
  }, [activeId, boxes, isMapLoaded, drawMode]);

  // Keep map data in sync with state changes
  useEffect(() => {
    updateMapData(boxes);
    updateHandles();
  }, [boxes, isMapLoaded]);

  // React to activeId changes
  useEffect(() => {
    const map = mapRef.current;
    if (map && isMapLoaded) {
      map.setFilter('boxes-active', ['==', 'id', activeId || '__none__']);
    }
    updateHandles();
  }, [activeId, isMapLoaded, updateHandles]);

  // Sync tempInputs when activeId changes or box is modified from map dragging/resizing
  useEffect(() => {
    if (!activeId) {
      setTempInputs({});
      return;
    }
    const box = boxes.find(b => b.id === activeId);
    if (!box) {
      setTempInputs({});
      return;
    }

    setTempInputs({
      xmin: box.xmin.toString(),
      ymin: box.ymin.toString(),
      xmax: box.xmax.toString(),
      ymax: box.ymax.toString(),
      scale: box.scale?.toString() ?? '',
      rotation: box.rotation?.toString() ?? '0',
      page_w_in: box.page_w_in?.toString() ?? '',
      page_h_in: box.page_h_in?.toString() ?? '',
      page_w_mm: box.page_w_mm?.toString() ?? '',
      page_h_mm: box.page_h_mm?.toString() ?? ''
    });
  }, [activeId, boxes]);

  // Map Initialization
  useEffect(() => {
    if (!token || mapRef.current) return;

    try {
      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({
        container: mapContainerRef.current!,
        style: styleUrl || 'mapbox://styles/mapbox/dark-v11',
        center: [-98, 38.88],
        zoom: 3.5,
        minZoom: 1,
        boxZoom: false, // disable shift+drag zoom so it doesn't conflict with box dragging
        pitch: 0,
        maxPitch: 0,
        pitchWithRotate: false,
        preserveDrawingBuffer: true
      });

      mapRef.current = map;

      map.on('load', () => {
        setIsMapLoaded(true);
        setViewportRotation(map.getBearing());

        // Navigation controls
        map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-left');
        map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

        // Bounding boxes data source
        map.addSource('boxes', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });

        // Bounding boxes fill layer
        map.addLayer({
          id: 'boxes-fill',
          type: 'fill',
          source: 'boxes',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.16
          }
        });

        // Bounding boxes border outline
        map.addLayer({
          id: 'boxes-line',
          type: 'line',
          source: 'boxes',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2
          }
        });

        // Active highlighted border outline
        map.addLayer({
          id: 'boxes-active',
          type: 'line',
          source: 'boxes',
          filter: ['==', 'id', '__none__'],
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 3,
            'line-dasharray': [4, 3]
          }
        });
      });

      // Cleanup
      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    } catch (e) {
      console.error("Mapbox init failed: ", e);
      showToast("Failed to initialize Mapbox. Check style and token.");
    }
  }, [token]);

  // Hook map events for Drag-and-Drop Translate and Drawing Boxes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const handleMouseDown = (e: mapboxgl.MapMouseEvent) => {
      // Prioritize handle resizing
      if (isResizingRef.current) return;

      // 1. Direct Drag-and-drop Translate Box Functionality (for any box clicked on) - Only in draw mode!
      if (drawMode === 'draw') {
        const features = map.queryRenderedFeatures(e.point, { layers: ['boxes-fill'] });
        if (features.length > 0) {
          const clickedBoxId = features[0].properties?.id;
          const targetBox = boxes.find(b => b.id === clickedBoxId);
          if (targetBox) {
            isDraggingBoxRef.current = true;
            dragStartDataRef.current = {
              boxId: clickedBoxId,
              startLngLat: e.lngLat,
              startCoords: {
                xmin: targetBox.xmin,
                ymin: targetBox.ymin,
                xmax: targetBox.xmax,
                ymax: targetBox.ymax
              }
            };
            map.dragPan.disable();
            map.getCanvas().style.cursor = 'grabbing';
            setActiveId(clickedBoxId);
            e.preventDefault();
            return;
          }
        }
      } else {
        // In pan mode, clicking on a box can still select it, without disabling map pan
        const features = map.queryRenderedFeatures(e.point, { layers: ['boxes-fill'] });
        if (features.length > 0) {
          const clickedBoxId = features[0].properties?.id;
          setActiveId(clickedBoxId);
        }
      }

      // 2. Drawing box from scratch
      if (drawMode === 'draw') {
        map.dragPan.disable();
        isDrawingRef.current = true;
        drawStartPtRef.current = e.point;
        setDrawingRect({
          left: e.point.x,
          top: e.point.y,
          width: 0,
          height: 0
        });
      }
    };

    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      // 1. Handle active Translate operation
      if (isDraggingBoxRef.current && dragStartDataRef.current) {
        const { boxId, startLngLat, startCoords } = dragStartDataRef.current;
        const deltaLng = e.lngLat.lng - startLngLat.lng;
        const deltaLat = e.lngLat.lat - startLngLat.lat;

        setBoxes(prev => prev.map(b => {
          if (b.id === boxId) {
            return syncBoxDerivedValues({
              ...b,
              xmin: startCoords.xmin + deltaLng,
              ymin: startCoords.ymin + deltaLat,
              xmax: startCoords.xmax + deltaLng,
              ymax: startCoords.ymax + deltaLat
            });
          }
          return b;
        }));
        return;
      }

      // 2. Handle active Box Drawing operation
      if (isDrawingRef.current && drawStartPtRef.current) {
        const start = drawStartPtRef.current;
        const left = Math.min(start.x, e.point.x);
        const top = Math.min(start.y, e.point.y);
        const width = Math.abs(start.x - e.point.x);
        const height = Math.abs(start.y - e.point.y);
        setDrawingRect({ left, top, width, height });
        return;
      }

      // 3. Hover styling cues
      if (isResizingRef.current) return;

      const features = map.queryRenderedFeatures(e.point, { layers: ['boxes-fill'] });
      if (features.length > 0 && drawMode === 'draw') {
        map.getCanvas().style.cursor = 'grab';
      } else if (drawMode === 'draw') {
        map.getCanvas().style.cursor = 'crosshair';
      } else {
        map.getCanvas().style.cursor = '';
      }
    };

    const handleMouseUp = (e: mapboxgl.MapMouseEvent) => {
      // 1. Finish dragging box translate
      if (isDraggingBoxRef.current) {
        isDraggingBoxRef.current = false;
        dragStartDataRef.current = null;
        map.dragPan.enable();
        const features = map.queryRenderedFeatures(e.point, { layers: ['boxes-fill'] });
        map.getCanvas().style.cursor = features.length > 0 ? 'grab' : '';
        return;
      }

      // 2. Finish box drawing
      if (isDrawingRef.current && drawStartPtRef.current) {
        isDrawingRef.current = false;
        const start = drawStartPtRef.current;
        drawStartPtRef.current = null;
        map.dragPan.enable();
        setDrawingRect(null);

        const left = Math.min(start.x, e.point.x);
        const top = Math.min(start.y, e.point.y);
        const width = Math.abs(start.x - e.point.x);
        const height = Math.abs(start.y - e.point.y);

        if (width > 5 && height > 5) {
          const bearing = map.getBearing();

          // Unproject all 4 corners of the drawn rectangle on the screen
          const pTL = map.unproject([left, top]);
          const pTR = map.unproject([left + width, top]);
          const pBL = map.unproject([left, top + height]);
          const pBR = map.unproject([left + width, top + height]);

          // Compute geographic center of these 4 points
          const centerLng = (pTL.lng + pTR.lng + pBL.lng + pBR.lng) / 4;
          const centerLat = (pTL.lat + pTR.lat + pBL.lat + pBR.lat) / 4;

          // Unrotate points around geographic center by -bearing to get axis-aligned geographic coordinates
          const uTL = rotatePoint(pTL.lng, pTL.lat, centerLng, centerLat, -bearing);
          const uTR = rotatePoint(pTR.lng, pTR.lat, centerLng, centerLat, -bearing);
          const uBL = rotatePoint(pBL.lng, pBL.lat, centerLng, centerLat, -bearing);
          const uBR = rotatePoint(pBR.lng, pBR.lat, centerLng, centerLat, -bearing);

          // Get the axis-aligned bounds
          const xmin = Math.min(uTL[0], uTR[0], uBL[0], uBR[0]);
          const xmax = Math.max(uTL[0], uTR[0], uBL[0], uBR[0]);
          const ymin = Math.min(uTL[1], uTR[1], uBL[1], uBR[1]);
          const ymax = Math.max(uTL[1], uTR[1], uBL[1], uBR[1]);

          // Store the box rotation (clockwise) to match the map bearing rotation.
          let rot = bearing % 360;
          if (rot > 180) rot -= 360;
          if (rot <= -180) rot += 360;
          rot = Math.round(rot * 10) / 10;

          const newId = `box-${nextIdRef.current++}`;
          const newColor = COLORS[boxes.length % COLORS.length];
          const calculatedScale = calculateMapScale(map);

          const initialBox: Box = {
            id: newId,
            color: newColor,
            xmin,
            ymin,
            xmax,
            ymax,
            scale: calculatedScale,
            rotation: rot
          };
          const newBox = syncBoxDerivedValues(initialBox);

          setBoxes(prev => [newBox, ...prev]);
          setActiveId(newId);
        }
      }
    };

    map.on('mousedown', handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);

    // Map listeners for handle rendering updates
    const handleMapMove = () => {
      updateHandles();
      setViewportScale(calculateMapScale(map));
      setViewportRotation(map.getBearing());
    };
    map.on('move', handleMapMove);
    map.on('zoom', handleMapMove);

    return () => {
      map.off('mousedown', handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
      map.off('move', handleMapMove);
      map.off('zoom', handleMapMove);
    };
  }, [boxes, isMapLoaded, drawMode, updateHandles]);

  // Corner Handle resizing drag operation
  const startHandleResize = (e: React.MouseEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (drawMode === 'pan') return;
    const map = mapRef.current;
    if (!map || !activeId) return;

    isResizingRef.current = true;
    map.dragPan.disable();

    const handleResizeMove = (moveEv: MouseEvent) => {
      const rect = map.getCanvasContainer().getBoundingClientRect();
      const x = moveEv.clientX - rect.left;
      const y = moveEv.clientY - rect.top;
      const lngLat = map.unproject([x, y]);

      setBoxes(prev => prev.map(b => {
        if (b.id === activeId) {
          const updated = { ...b };
          const rot = b.rotation ?? 0;
          const centerLng = (b.xmin + b.xmax) / 2;
          const centerLat = (b.ymin + b.ymax) / 2;
          const unrotated = rotatePoint(lngLat.lng, lngLat.lat, centerLng, centerLat, -rot);

          const targetLng = unrotated[0];
          const targetLat = unrotated[1];

          if (corner === 'sw') {
            updated.xmin = targetLng;
            updated.ymin = targetLat;
          } else if (corner === 'se') {
            updated.xmax = targetLng;
            updated.ymin = targetLat;
          } else if (corner === 'nw') {
            updated.xmin = targetLng;
            updated.ymax = targetLat;
          } else if (corner === 'ne') {
            updated.xmax = targetLng;
            updated.ymax = targetLat;
          } else if (corner === 'n') {
            updated.ymax = targetLat;
          } else if (corner === 's') {
            updated.ymin = targetLat;
          } else if (corner === 'w') {
            updated.xmin = targetLng;
          } else if (corner === 'e') {
            updated.xmax = targetLng;
          }
          return syncBoxDerivedValues(updated);
        }
        return b;
      }));
    };

    const handleResizeUp = () => {
      isResizingRef.current = false;
      map.dragPan.enable();
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeUp);
    };

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeUp);
  };

  // Card Inputs update helper (only updates temporary text state to keep typing fast/smooth)
  const handleCardInputChange = (field: keyof Box, valueStr: string) => {
    setTempInputs(prev => ({
      ...prev,
      [field]: valueStr
    }));
  };

  // Commit changes to boxes (map) when user blurs or presses Enter
  const commitCardInput = (boxId: string, field: keyof Box, valueStr: string) => {
    const numericVal = parseFloat(valueStr);
    
    // If invalid number, revert tempInputs to current value from boxes state
    if (isNaN(numericVal) || !isFinite(numericVal)) {
      const box = boxes.find(b => b.id === boxId);
      if (box) {
        setTempInputs(prev => ({
          ...prev,
          [field]: box[field]?.toString() ?? ''
        }));
      }
      return;
    }

    let valToCommit = numericVal;
    if (field === 'rotation') {
      let norm = numericVal % 360;
      if (norm > 180) norm -= 360;
      if (norm <= -180) norm += 360;
      valToCommit = Math.round(norm * 10) / 10;
    }

    setBoxes(prev => prev.map(b => {
      if (b.id === boxId) {
        let updated = {
          ...b,
          [field]: valToCommit
        };

        if (field === 'page_w_in') {
          updated = updateBoxFromPageWidthInches(b, numericVal);
        } else if (field === 'page_h_in') {
          updated = updateBoxFromPageHeightInches(b, numericVal);
        } else if (field === 'page_w_mm') {
          updated = updateBoxFromPageWidthMm(b, numericVal);
        } else if (field === 'page_h_mm') {
          updated = updateBoxFromPageHeightMm(b, numericVal);
        } else {
          updated = syncBoxDerivedValues(updated);
        }

        return updated;
      }
      return b;
    }));
  };

  const removeBox = (boxId: string) => {
    setBoxes(prev => prev.filter(b => b.id !== boxId));
    if (activeId === boxId) {
      setActiveId(null);
    }
    showToast(`Removed ${boxId}`);
  };

  const clearAllBoxes = () => {
    setBoxes([]);
    setActiveId(null);
    showToast('Cleared all bounding boxes');
  };

  const zoomToBox = (box: Box) => {
    const map = mapRef.current;
    if (!map) return;
    map.fitBounds(
      [[box.xmin, box.ymin], [box.xmax, box.ymax]],
      { padding: 80, duration: 600 }
    );
  };

  const copyBBoxString = (box: Box) => {
    const str = `${box.xmin.toFixed(6)}, ${box.ymin.toFixed(6)}, ${box.xmax.toFixed(6)}, ${box.ymax.toFixed(6)}`;
    navigator.clipboard.writeText(str).then(() => {
      showToast(`Copied: ${box.id} bbox coordinates`);
    });
  };

  const startEditingScale = () => {
    setScaleInputValue(viewportScale.toString());
    setIsEditingScale(true);
  };

  const applyCustomScale = (scaleValue: number) => {
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    const equatorialCircumference = 40075016.686;
    const screenMetersPerPixel = 0.0254 / 96; // 96 DPI screen
    const targetZoom = Math.log2(
      (Math.cos(center.lat * Math.PI / 180) * equatorialCircumference) / 
      (512 * scaleValue * screenMetersPerPixel)
    );
    if (targetZoom >= 0 && targetZoom <= 22) {
      map.setZoom(targetZoom);
      showToast(`Adjusted map scale to 1:${scaleValue.toLocaleString()}`);
    } else {
      showToast("Entered scale value is out of bounds for zoom zoom levels");
    }
  };

  const startEditingRotation = () => {
    setRotationInputValue(viewportRotation.toFixed(1));
    setIsEditingRotation(true);
  };

  const applyCustomRotation = (rotValue: number) => {
    const map = mapRef.current;
    if (!map) return;
    
    // Normalize rotation value to fit Mapbox's range: [-180, 180] degrees.
    let targetBearing = rotValue % 360;
    if (targetBearing > 180) targetBearing -= 360;
    if (targetBearing < -180) targetBearing += 360;

    map.setBearing(targetBearing);
    setViewportRotation(targetBearing);
    showToast(`Adjusted map bearing to ${targetBearing.toFixed(1)}°`);
  };

  const triggerGeoJSONUpload = () => {
    const input = document.getElementById('geojson-upload-input');
    if (input) {
      input.click();
    }
  };

  const handleGeoJSONUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string') return;
        const data = JSON.parse(text);

        let features: any[] = [];
        if (data.type === 'FeatureCollection') {
          features = data.features || [];
        } else if (data.type === 'Feature') {
          features = [data];
        } else {
          showToast('Invalid GeoJSON: Must be Feature or FeatureCollection');
          return;
        }

        if (features.length === 0) {
          showToast('No features found in the GeoJSON.');
          return;
        }

        const newBoxes: Box[] = [];
        let skippedCount = 0;

        features.forEach((feature) => {
          const properties = feature.properties || {};
          
          // Try exact keys first
          let xmin = Number(properties['x-min'] !== undefined ? properties['x-min'] : properties['xmin']);
          let ymin = Number(properties['y-min'] !== undefined ? properties['y-min'] : properties['ymin']);
          let xmax = Number(properties['x-max'] !== undefined ? properties['x-max'] : properties['xmax']);
          let ymax = Number(properties['y-max'] !== undefined ? properties['y-max'] : properties['ymax']);

          const hasBBoxProps = !isNaN(xmin) && !isNaN(ymin) && !isNaN(xmax) && !isNaN(ymax);

          if (!hasBBoxProps) {
            // Compute from geometry ring
            if (feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')) {
              const rings = feature.geometry.type === 'Polygon' 
                ? feature.geometry.coordinates 
                : feature.geometry.coordinates[0];
              const outerRing = rings?.[0];
              if (outerRing && outerRing.length > 0) {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                outerRing.forEach((pt: any) => {
                  if (Array.isArray(pt) && pt.length >= 2) {
                    const lng = Number(pt[0]);
                    const lat = Number(pt[1]);
                    if (!isNaN(lng) && !isNaN(lat)) {
                      if (lng < minX) minX = lng;
                      if (lng > maxX) maxX = lng;
                      if (lat < minY) minY = lat;
                      if (lat > maxY) maxY = lat;
                    }
                  }
                });
                if (minX !== Infinity) {
                  xmin = minX;
                  ymin = minY;
                  xmax = maxX;
                  ymax = maxY;
                }
              }
            }
          }

          if (isNaN(xmin) || isNaN(ymin) || isNaN(xmax) || isNaN(ymax)) {
            skippedCount++;
            return;
          }

          let id = properties.id;
          if (!id) {
            id = `box-${nextIdRef.current++}`;
          } else {
            id = String(id);
            if (boxes.some(b => b.id === id) || newBoxes.some(b => b.id === id)) {
              id = `${id}-imported-${nextIdRef.current++}`;
            } else {
              const match = id.match(/^box-(\d+)$/);
              if (match) {
                const num = parseInt(match[1], 10);
                if (num >= nextIdRef.current) {
                  nextIdRef.current = num + 1;
                }
              }
            }
          }

          const color = properties.color || COLORS[(boxes.length + newBoxes.length) % COLORS.length];

          let scale = Number(properties.scale);
          if (isNaN(scale) || scale <= 0) {
            scale = mapRef.current ? calculateMapScale(mapRef.current) : 50000;
          }

          let rotation = Number(properties.rotation);
          if (isNaN(rotation)) {
            rotation = 0;
          }

          const initialBox: Box = {
            id,
            color,
            xmin,
            ymin,
            xmax,
            ymax,
            scale,
            rotation
          };

          const syncedBox = syncBoxDerivedValues(initialBox);
          newBoxes.push(syncedBox);
        });

        if (newBoxes.length === 0) {
          showToast(`No valid features could be imported. (Skipped ${skippedCount})`);
          return;
        }

        setBoxes(prev => [...newBoxes, ...prev]);
        setActiveId(newBoxes[0].id);

        const map = mapRef.current;
        if (map) {
          let globalMinX = Infinity, globalMinY = Infinity, globalMaxX = -Infinity, globalMaxY = -Infinity;
          newBoxes.forEach(b => {
            if (b.xmin < globalMinX) globalMinX = b.xmin;
            if (b.ymin < globalMinY) globalMinY = b.ymin;
            if (b.xmax > globalMaxX) globalMaxX = b.xmax;
            if (b.ymax > globalMaxY) globalMaxY = b.ymax;
          });

          if (globalMinX !== Infinity) {
            map.fitBounds(
              [[globalMinX, globalMinY], [globalMaxX, globalMaxY]],
              { padding: 80, duration: 800 }
            );
          }
        }

        let toastMsg = `Successfully imported ${newBoxes.length} boxes from GeoJSON!`;
        if (skippedCount > 0) {
          toastMsg += ` (Skipped ${skippedCount} invalid features)`;
        }
        showToast(toastMsg);
      } catch (err) {
        console.error(err);
        showToast('Failed to parse GeoJSON file.');
      } finally {
        e.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  // Export GeoJSON with custom x-min, y-min, x-max, y-max columns
  const downloadGeoJSON = () => {
    if (boxes.length === 0) return;

    const geojson = {
      type: 'FeatureCollection',
      features: boxes.map(b => ({
        type: 'Feature',
        properties: {
          id: b.id,
          color: b.color,
          // Mandatory newly calculated columns requested: x-min, y-min, x-max, y-max
          'x-min': Number(b.xmin.toFixed(6)),
          'y-min': Number(b.ymin.toFixed(6)),
          'x-max': Number(b.xmax.toFixed(6)),
          'y-max': Number(b.ymax.toFixed(6)),
          'scale': b.scale,
          'rotation': b.rotation ?? 0,
          'page_w_in': b.page_w_in,
          'page_h_in': b.page_h_in,
          'page_w_mm': b.page_w_mm,
          'page_h_mm': b.page_h_mm
        },
        geometry: {
          type: 'Polygon',
          coordinates: [getBoxCoordinates(b)]
        }
      }))
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bounding-boxes-${new Date().toISOString().slice(0, 10)}.geojson`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded GeoJSON with bbox calculation columns!`);
  };

  const downloadZIP = async () => {
    if (boxes.length === 0) return;
    
    setExportProgress({
      current: 0,
      total: boxes.length,
      message: 'Initializing ZIP packager...'
    });

    try {
      const zip = new JSZip();

      // 1. Add GeoJSON
      const geojson = {
        type: 'FeatureCollection',
        features: boxes.map(b => ({
          type: 'Feature',
          properties: {
            id: b.id,
            color: b.color,
            'x-min': Number(b.xmin.toFixed(6)),
            'y-min': Number(b.ymin.toFixed(6)),
            'x-max': Number(b.xmax.toFixed(6)),
            'y-max': Number(b.ymax.toFixed(6)),
            'scale': b.scale,
            'rotation': b.rotation ?? 0,
            'page_w_in': b.page_w_in,
            'page_h_in': b.page_h_in,
            'page_w_mm': b.page_w_mm,
            'page_h_mm': b.page_h_mm
          },
          geometry: {
            type: 'Polygon',
            coordinates: [getBoxCoordinates(b)]
          }
        }))
      };
      zip.file('bounding-boxes.geojson', JSON.stringify(geojson, null, 2));

      // 2. Capture each box
      for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i];
        setExportProgress({
          current: i + 1,
          total: boxes.length,
          message: `Rendering high-res screenshot for box ${b.id} (${i + 1} of ${boxes.length})...`
        });

        const centerLng = (b.xmin + b.xmax) / 2;
        const centerLat = (b.ymin + b.ymax) / 2;
        const dpi = 96; // 96 DPI matches onscreen map scale exactly
        const mapZoom = getZoomFromScaleAndDpi(b.scale, centerLat, dpi);

        const widthPixels = Math.round((b.page_w_in ?? 8.5) * dpi);
        const heightPixels = Math.round((b.page_h_in ?? 11) * dpi);

        // Create temporary offscreen container
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-10000px';
        container.style.top = '-10000px';
        container.style.width = `${widthPixels}px`;
        container.style.height = `${heightPixels}px`;
        container.style.zIndex = '-9999';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);

        // Instantiate offscreen map
        const tempMap = new mapboxgl.Map({
          container: container,
          style: styleUrl,
          accessToken: token,
          center: [centerLng, centerLat],
          zoom: mapZoom,
          bearing: b.rotation ?? 0,
          pitch: 0,
          preserveDrawingBuffer: true,
          interactive: false,
          attributionControl: false,
          fadeDuration: 0
        });

        // Wait for map to fully render and become idle
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            console.warn(`Render timed out for box ${b.id}`);
            resolve();
          }, 8000);

          tempMap.once('idle', () => {
            clearTimeout(timeout);
            setTimeout(() => {
              resolve();
            }, 600);
          });

          tempMap.on('error', (err) => {
            console.error('Offscreen map error:', err);
          });
        });

        // Capture data URL
        const canvas = tempMap.getCanvas();
        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1];

        // Capture raw pixels and encode as CMYK TIFF
        try {
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          const offscreenCanvas = document.createElement('canvas');
          offscreenCanvas.width = canvasWidth;
          offscreenCanvas.height = canvasHeight;
          const offscreenCtx = offscreenCanvas.getContext('2d');
          if (offscreenCtx) {
            offscreenCtx.drawImage(canvas, 0, 0);
            const imageData = offscreenCtx.getImageData(0, 0, canvasWidth, canvasHeight);
            const rgbaPixels = imageData.data;
            const physicalDpi = Math.round(dpi * (canvasWidth / widthPixels));
            const tiffBuffer = encodeCmykTiff(canvasWidth, canvasHeight, rgbaPixels, physicalDpi);
            zip.file(`${b.id}_cmyk.tif`, tiffBuffer);
          }
        } catch (tifErr) {
          console.error('Error generating CMYK TIFF:', tifErr);
        }

        // Clean up map and container
        tempMap.remove();
        container.remove();

        // Add to ZIP
        zip.file(`${b.id}.png`, base64Data, { base64: true });
      }

      setExportProgress({
        current: boxes.length,
        total: boxes.length,
        message: 'Bundling archive into ZIP...'
      });

      // Generate the ZIP
      const content = await zip.generateAsync({ type: 'blob' });
      
      // Download the ZIP
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mapbox-export-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      showToast('Successfully exported ZIP with GeoJSON and high-res screenshots!');
    } catch (err) {
      console.error('Error generating ZIP:', err);
      showToast('Failed to export ZIP.');
    } finally {
      setExportProgress(null);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden text-slate-100 bg-slate-950 font-sans">
      
      {/* 1. Header */}
      <header id="header" className="flex items-center gap-4 px-6 h-14 border-b border-slate-800 bg-slate-900/50 backdrop-blur z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
            <Compass className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-wide text-white uppercase">Bounding Box Drawer</span>
        </div>
        
        <div className="h-5 w-[1px] bg-slate-800" />

        {/* Drawing & Drag Indicators */}
        <div className="flex items-center gap-2 text-xs">
          <button 
            id="toggle-draw"
            onClick={() => setDrawMode('draw')}
            className={`px-3 py-1.5 rounded-md font-medium transition ${
              drawMode === 'draw' 
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-sm' 
                : 'text-slate-400 border border-transparent hover:text-slate-200'
            }`}
          >
            Draw Box Mode
          </button>
          <button 
            id="toggle-pan"
            onClick={() => setDrawMode('pan')}
            className={`px-3 py-1.5 rounded-md font-medium transition ${
              drawMode === 'pan' 
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-sm' 
                : 'text-slate-400 border border-transparent hover:text-slate-200'
            }`}
          >
            Pan Map Mode
          </button>
        </div>



        {/* Config and download controls in Header Right */}
        <div className="ml-auto flex items-center gap-2">
          {token && (
            <button 
              id="clear-token-btn"
              onClick={handleClearToken}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-red-400 px-3 py-1.5 border border-slate-800 hover:border-red-500/30 rounded-md transition"
            >
              <Lock className="w-3.5 h-3.5" />
              Reset Token
            </button>
          )}
          <button 
            id="import-geojson"
            onClick={triggerGeoJSONUpload}
            className="flex items-center gap-2 text-xs bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-white px-4 py-1.5 rounded-md transition font-medium shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Import GeoJSON
          </button>
          <input 
            type="file"
            id="geojson-upload-input"
            className="hidden"
            accept=".geojson,application/json,application/geo+json"
            onChange={handleGeoJSONUpload}
          />

          <button 
            id="download-geojson"
            onClick={downloadGeoJSON}
            disabled={boxes.length === 0}
            className="flex items-center gap-2 text-xs bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 hover:text-white px-4 py-1.5 rounded-md transition disabled:opacity-30 disabled:cursor-not-allowed font-medium shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export GeoJSON
          </button>

          <button 
            id="download-zip"
            onClick={downloadZIP}
            disabled={boxes.length === 0 || exportProgress !== null}
            className="flex items-center gap-2 text-xs bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 hover:border-indigo-500 text-indigo-400 hover:text-white px-4 py-1.5 rounded-md transition disabled:opacity-30 disabled:cursor-not-allowed font-medium shadow-sm"
          >
            <FolderArchive className="w-4 h-4" />
            Export ZIP Package
          </button>
        </div>
      </header>

      {/* 2. Main Body (Map + Sidebar) */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Map Container */}
        <div className="flex-1 h-full relative bg-slate-900" id="map-parent">
          {!token && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-10">
              <div className="text-center p-8 max-w-md bg-slate-900 rounded-xl border border-slate-800 shadow-2xl">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Mapbox Token Required</h3>
                <p className="text-slate-400 text-sm mb-6">
                  Please enter a valid Mapbox Access Token to configure and render the vector map.
                </p>
                <button 
                  onClick={() => setIsTokenModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition"
                >
                  Configure Token & Style
                </button>
              </div>
            </div>
          )}

          {/* Actual Map Canvas */}
          <div ref={mapContainerRef} className="w-full h-full" id="map-canvas" />

          {/* Floating interactive scale display above map scale bar */}
          {isMapLoaded && (
            <div 
              className="absolute left-[10px] bottom-[120px] z-10 font-sans text-xs bg-slate-900/90 hover:bg-slate-900 text-slate-100 px-2.5 py-1.5 rounded-md border border-slate-800 shadow-xl flex items-center gap-1.5 transition select-none group animate-fade-in"
              onMouseEnter={() => setShowScaleTooltip(true)}
              onMouseLeave={() => setShowScaleTooltip(false)}
            >
               {isEditingScale ? (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const parsed = parseInt(scaleInputValue.replace(/,/g, ''), 10);
                    if (!isNaN(parsed) && parsed > 0) {
                      applyCustomScale(parsed);
                      setIsEditingScale(false);
                    }
                  }}
                  className="flex items-center gap-1"
                  onClick={e => e.stopPropagation()}
                >
                  <span className="text-slate-400 font-bold">1:</span>
                  <input 
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={scaleInputValue}
                    onChange={e => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setScaleInputValue(clean);
                    }}
                    className="w-20 bg-slate-950/80 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-sans"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsEditingScale(false);
                      }
                    }}
                    onBlur={() => {
                      const parsed = parseInt(scaleInputValue.replace(/,/g, ''), 10);
                      if (!isNaN(parsed) && parsed > 0) {
                        applyCustomScale(parsed);
                      }
                      setIsEditingScale(false);
                    }}
                  />
                  <button type="submit" className="text-emerald-400 hover:text-emerald-300 p-0.5 rounded transition">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <div 
                  onClick={startEditingScale}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider bg-slate-800/60 px-1 py-0.5 rounded">scale</span>
                  <span className="text-white font-medium">
                    1:{viewportScale.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-blue-400 font-sans ml-1">(edit)</span>
                </div>
              )}

              {/* Tooltip */}
              {showScaleTooltip && !isEditingScale && (
                <div className="absolute left-0 bottom-full mb-2 bg-slate-950 text-slate-200 text-[11px] px-2.5 py-1.5 rounded border border-slate-800 shadow-2xl whitespace-nowrap z-20 pointer-events-none flex items-center gap-1.5 animate-fade-in">
                  <Info className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  <span>Select to edit</span>
                </div>
              )}
            </div>
          )}

          {/* Floating interactive rotation display between scale text and scale bar */}
          {isMapLoaded && (
            <div 
              className="absolute left-[10px] bottom-[80px] z-10 font-sans text-xs bg-slate-900/90 hover:bg-slate-900 text-slate-100 px-2.5 py-1.5 rounded-md border border-slate-800 shadow-xl flex items-center gap-1.5 transition select-none group animate-fade-in"
              onMouseEnter={() => setShowRotationTooltip(true)}
              onMouseLeave={() => setShowRotationTooltip(false)}
            >
              {isEditingRotation ? (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const parsed = parseFloat(rotationInputValue);
                    if (!isNaN(parsed)) {
                      applyCustomRotation(parsed);
                      setIsEditingRotation(false);
                    }
                  }}
                  className="flex items-center gap-1"
                  onClick={e => e.stopPropagation()}
                >
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={rotationInputValue}
                    onChange={e => {
                      const clean = e.target.value.replace(/[^0-9.-]/g, '');
                      setRotationInputValue(clean);
                    }}
                    className="w-16 bg-slate-950/80 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-sans"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsEditingRotation(false);
                      }
                    }}
                    onBlur={() => {
                      const parsed = parseFloat(rotationInputValue);
                      if (!isNaN(parsed)) {
                        applyCustomRotation(parsed);
                      }
                      setIsEditingRotation(false);
                    }}
                  />
                  <span className="text-slate-400 font-bold">°</span>
                  <button type="submit" className="text-emerald-400 hover:text-emerald-300 p-0.5 rounded transition">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <div 
                  onClick={startEditingRotation}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider bg-slate-800/60 px-1 py-0.5 rounded">Rotation</span>
                  <span className="text-white font-medium">
                    {viewportRotation.toFixed(1)}°
                  </span>
                  <span className="text-[10px] text-blue-400 font-sans ml-1">(edit)</span>
                </div>
              )}

              {/* Tooltip */}
              {showRotationTooltip && !isEditingRotation && (
                <div className="absolute left-0 bottom-full mb-2 bg-slate-950 text-slate-200 text-[11px] px-2.5 py-1.5 rounded border border-slate-800 shadow-2xl whitespace-nowrap z-20 pointer-events-none flex items-center gap-1.5 animate-fade-in">
                  <Info className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  <span>Select to edit map rotation (bearing)</span>
                </div>
              )}
            </div>
          )}

          {/* HTML Drag overlay bounding box */}
          {drawingRect && (
            <div 
              id="active-drawing-rect"
              className="absolute pointer-events-none border-2 border-blue-500 bg-blue-500/10 rounded-sm"
              style={{
                left: drawingRect.left,
                top: drawingRect.top,
                width: drawingRect.width,
                height: drawingRect.height,
                zIndex: 10
              }}
            />
          )}

          {/* SVG Overlay for Corner & Edge resize handles */}
          {isMapLoaded && handles && (
            <svg 
              id="resize-handle-svg"
              className="absolute inset-0 pointer-events-none w-full h-full z-[8]"
            >
              {/* Connect corners with outline */}
              {handles.corners.length === 4 && (
                <polygon 
                  points={`${handles.corners[0].x},${handles.corners[0].y} ${handles.corners[1].x},${handles.corners[1].y} ${handles.corners[3].x},${handles.corners[3].y} ${handles.corners[2].x},${handles.corners[2].y}`}
                  fill="transparent"
                  stroke={boxes.find(b => b.id === activeId)?.color || '#3b82f6'}
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              )}

              {/* Edge handles */}
              {handles.edges.map(e => {
                const cursors: { [key: string]: string } = {
                  n: 'ns-resize',
                  s: 'ns-resize',
                  w: 'ew-resize',
                  e: 'ew-resize'
                };
                return (
                  <g 
                    key={e.id}
                    className="pointer-events-auto cursor-pointer"
                    onMouseDown={(event) => startHandleResize(event, e.id)}
                    style={{ cursor: cursors[e.id] }}
                  >
                    <circle cx={e.x} cy={e.y} r={9} fill="transparent" />
                    <circle 
                      cx={e.x} 
                      cy={e.y} 
                      r={5} 
                      fill="white" 
                      stroke={boxes.find(b => b.id === activeId)?.color || '#3b82f6'} 
                      strokeWidth={2} 
                    />
                  </g>
                );
              })}

              {/* Corner handles */}
              {handles.corners.map(c => {
                const cursors: { [key: string]: string } = {
                  nw: 'nwse-resize',
                  ne: 'nesw-resize',
                  sw: 'nesw-resize',
                  se: 'nwse-resize'
                };
                return (
                  <g 
                    key={c.id}
                    className="pointer-events-auto cursor-pointer"
                    onMouseDown={(event) => startHandleResize(event, c.id)}
                    style={{ cursor: cursors[c.id] }}
                  >
                    <circle cx={c.x} cy={c.y} r={10} fill="transparent" />
                    <circle 
                      cx={c.x} 
                      cy={c.y} 
                      r={6.5} 
                      fill="white" 
                      stroke={boxes.find(b => b.id === activeId)?.color || '#3b82f6'} 
                      strokeWidth={2.5} 
                    />
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Sidebar Panel for Bounding Box coordinates */}
        <aside id="sidebar" className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col shrink-0 z-10 h-full">
          
          <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rectangles List</span>
            <div className="bg-slate-800 text-blue-400 text-xs font-bold font-mono px-2 py-0.5 rounded">
              {boxes.length}
            </div>
          </div>

          {/* List or Empty State */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0" id="cards-scroll-container">
            {boxes.length === 0 ? (
              <div id="empty-state" className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500">
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center mb-3">
                  <Plus className="w-5 h-5 text-slate-500" />
                </div>
                <h4 className="text-sm font-semibold text-slate-300 mb-1">No bounding boxes</h4>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  Make sure <strong>Draw Box Mode</strong> is selected. Click and drag on the map to define a bounding box region.
                </p>
                <div className="mt-4 p-2.5 bg-slate-800/40 border border-slate-800/80 rounded-lg text-[11px] text-slate-400 text-left max-w-xs leading-normal">
                  <p className="font-semibold mb-1 text-slate-300">💡 Drag Box Tip:</p>
                  You can click and drag existing boxes directly on the map in <strong>Draw Box Mode</strong> to translate or move them.
                </div>
              </div>
            ) : (
              boxes.map(box => {
                const isActive = activeId === box.id;
                return (
                  <div 
                    key={box.id}
                    id={`card-${box.id}`}
                    onClick={() => setActiveId(isActive ? null : box.id)}
                    className={`border rounded-lg bg-slate-950 transition overflow-hidden cursor-pointer shrink-0 ${
                      isActive 
                        ? 'border-blue-500 shadow-md shadow-blue-500/5' 
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-2 bg-slate-900/35">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: box.color }} />
                      <span className="font-semibold text-xs font-mono text-slate-200">{box.id}</span>
                      
                      <div className="ml-auto flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => zoomToBox(box)}
                          title="Zoom to box region"
                          className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => removeBox(box.id)}
                          title="Delete box"
                          className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Card Body - Coordinate Editors */}
                    {isActive ? (
                      <div className="p-3 flex flex-col gap-2 bg-slate-950/70" onClick={e => e.stopPropagation()}>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 border-b border-slate-800/40 pb-1 flex items-center justify-between">
                          <span>Map Extents (Geo Coordinates)</span>
                          <span className="text-[8px] text-blue-400 font-normal normal-case">Press Enter or click away to apply</span>
                        </div>
                        {/* Lng Min */}
                        <div className="grid grid-cols-12 items-center gap-1">
                          <span className="col-span-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">lng-min</span>
                          <input 
                            type="text"
                            inputMode="decimal"
                            data-box-input="true"
                            value={tempInputs.xmin ?? ''}
                            onChange={(e) => handleCardInputChange('xmin', e.target.value)}
                            onBlur={(e) => commitCardInput(box.id, 'xmin', e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { commitCardInput(box.id, 'xmin', e.currentTarget.value); e.currentTarget.blur(); } }}
                            className="col-span-8 bg-slate-900/80 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500 transition"
                          />
                        </div>
                        {/* Lat Min */}
                        <div className="grid grid-cols-12 items-center gap-1">
                          <span className="col-span-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">lat-min</span>
                          <input 
                            type="text"
                            inputMode="decimal"
                            data-box-input="true"
                            value={tempInputs.ymin ?? ''}
                            onChange={(e) => handleCardInputChange('ymin', e.target.value)}
                            onBlur={(e) => commitCardInput(box.id, 'ymin', e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { commitCardInput(box.id, 'ymin', e.currentTarget.value); e.currentTarget.blur(); } }}
                            className="col-span-8 bg-slate-900/80 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500 transition"
                          />
                        </div>
                        {/* Lng Max */}
                        <div className="grid grid-cols-12 items-center gap-1">
                          <span className="col-span-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">lng-max</span>
                          <input 
                            type="text"
                            inputMode="decimal"
                            data-box-input="true"
                            value={tempInputs.xmax ?? ''}
                            onChange={(e) => handleCardInputChange('xmax', e.target.value)}
                            onBlur={(e) => commitCardInput(box.id, 'xmax', e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { commitCardInput(box.id, 'xmax', e.currentTarget.value); e.currentTarget.blur(); } }}
                            className="col-span-8 bg-slate-900/80 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500 transition"
                          />
                        </div>
                        {/* Lat Max */}
                        <div className="grid grid-cols-12 items-center gap-1">
                          <span className="col-span-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">lat-max</span>
                          <input 
                            type="text"
                            inputMode="decimal"
                            data-box-input="true"
                            value={tempInputs.ymax ?? ''}
                            onChange={(e) => handleCardInputChange('ymax', e.target.value)}
                            onBlur={(e) => commitCardInput(box.id, 'ymax', e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { commitCardInput(box.id, 'ymax', e.currentTarget.value); e.currentTarget.blur(); } }}
                            className="col-span-8 bg-slate-900/80 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500 transition"
                          />
                        </div>

                        {/* Map Scale */}
                        <div className="grid grid-cols-12 items-center gap-1 mt-1 pt-1.5 border-t border-slate-800/40">
                          <span className="col-span-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider" title="Map scale ratio denominator (S)">scale</span>
                          <input 
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            data-box-input="true"
                            value={tempInputs.scale ?? ''}
                            onChange={(e) => {
                              const clean = e.target.value.replace(/[^0-9]/g, '');
                              handleCardInputChange('scale', clean);
                            }}
                            onBlur={(e) => commitCardInput(box.id, 'scale', e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { commitCardInput(box.id, 'scale', e.currentTarget.value); e.currentTarget.blur(); } }}
                            className="col-span-8 bg-slate-900/80 border border-slate-800 rounded px-2 py-1 text-xs font-sans text-slate-100 focus:outline-none focus:border-blue-500 transition font-semibold"
                          />
                        </div>

                        {/* Angle of Origin (Rotation) */}
                        <div className="grid grid-cols-12 items-center gap-1">
                          <span className="col-span-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider" title="Angle of origin in degrees">rotation (°)</span>
                          <input 
                            type="text"
                            inputMode="decimal"
                            data-box-input="true"
                            value={tempInputs.rotation ?? ''}
                            onChange={(e) => handleCardInputChange('rotation', e.target.value)}
                            onBlur={(e) => commitCardInput(box.id, 'rotation', e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { commitCardInput(box.id, 'rotation', e.currentTarget.value); e.currentTarget.blur(); } }}
                            className="col-span-8 bg-slate-900/80 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500 transition"
                          />
                        </div>

                        {/* Page Dimensions Group */}
                        <div className="border-t border-slate-800/40 my-1 pt-1.5 flex flex-col gap-2">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Page Size (Rectangle Dimensions)</span>
                          
                          {/* Page Width In */}
                          <div className="grid grid-cols-12 items-center gap-1">
                            <span className="col-span-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider" title="Page width in inches">width (in)</span>
                            <input 
                              type="text"
                              inputMode="decimal"
                              data-box-input="true"
                              value={tempInputs.page_w_in ?? ''}
                              onChange={(e) => handleCardInputChange('page_w_in', e.target.value)}
                              onBlur={(e) => commitCardInput(box.id, 'page_w_in', e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { commitCardInput(box.id, 'page_w_in', e.currentTarget.value); e.currentTarget.blur(); } }}
                              className="col-span-8 bg-slate-900/80 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500 transition"
                            />
                          </div>

                          {/* Page Height In */}
                          <div className="grid grid-cols-12 items-center gap-1">
                            <span className="col-span-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider" title="Page height in inches">height (in)</span>
                            <input 
                              type="text"
                              inputMode="decimal"
                              data-box-input="true"
                              value={tempInputs.page_h_in ?? ''}
                              onChange={(e) => handleCardInputChange('page_h_in', e.target.value)}
                              onBlur={(e) => commitCardInput(box.id, 'page_h_in', e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { commitCardInput(box.id, 'page_h_in', e.currentTarget.value); e.currentTarget.blur(); } }}
                              className="col-span-8 bg-slate-900/80 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500 transition"
                            />
                          </div>

                          {/* Page Width Mm */}
                          <div className="grid grid-cols-12 items-center gap-1">
                            <span className="col-span-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider" title="Page width in mm">width (mm)</span>
                            <input 
                              type="text"
                              inputMode="decimal"
                              data-box-input="true"
                              value={tempInputs.page_w_mm ?? ''}
                              onChange={(e) => handleCardInputChange('page_w_mm', e.target.value)}
                              onBlur={(e) => commitCardInput(box.id, 'page_w_mm', e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { commitCardInput(box.id, 'page_w_mm', e.currentTarget.value); e.currentTarget.blur(); } }}
                              className="col-span-8 bg-slate-900/80 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500 transition"
                            />
                          </div>

                          {/* Page Height Mm */}
                          <div className="grid grid-cols-12 items-center gap-1">
                            <span className="col-span-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider" title="Page height in mm">height (mm)</span>
                            <input 
                              type="text"
                              inputMode="decimal"
                              data-box-input="true"
                              value={tempInputs.page_h_mm ?? ''}
                              onChange={(e) => handleCardInputChange('page_h_mm', e.target.value)}
                              onBlur={(e) => commitCardInput(box.id, 'page_h_mm', e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { commitCardInput(box.id, 'page_h_mm', e.currentTarget.value); e.currentTarget.blur(); } }}
                              className="col-span-8 bg-slate-900/80 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500 transition"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 flex flex-col gap-1.5 bg-slate-950/30 text-[11px] font-mono text-slate-400 hover:bg-slate-950/50 transition duration-150 border-t border-slate-900/50" onClick={() => setActiveId(box.id)}>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-300">Scale: 1:{box.scale?.toLocaleString() || 'N/A'}</span>
                          <span className="text-slate-500">Rot: {box.rotation ?? 0}°</span>
                        </div>
                        {box.page_w_in && box.page_h_in && (
                          <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-900/30 pt-1">
                            <span>Size: {box.page_w_in}" × {box.page_h_in}"</span>
                            <span>{box.page_w_mm}mm × {box.page_h_mm}mm</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Card Footer Actions */}
                    <div className="px-3 py-1.5 border-t border-slate-800/50 bg-slate-900/10 flex gap-2" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => copyBBoxString(box)}
                        className="flex-1 py-1 text-[11px] font-medium text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 bg-slate-900/40 rounded transition"
                      >
                        Copy BBox
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer of Sidebar */}
          {boxes.length > 0 && (
            <div className="p-3 border-t border-slate-800 bg-slate-900/60 shrink-0 flex flex-col gap-2">
              <button 
                id="clear-all-btn"
                onClick={clearAllBoxes}
                className="w-full py-2 bg-slate-800 hover:bg-red-950/30 hover:text-red-400 border border-slate-700/50 hover:border-red-900/50 text-slate-300 font-medium text-xs rounded transition"
              >
                Clear All Rectangles
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* 2.5 Progress Overlay */}
      {exportProgress && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 text-center">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
            <h4 className="text-sm font-semibold text-white mb-2">Exporting Map Package</h4>
            
            <div className="w-full bg-slate-950 border border-slate-800/80 rounded-full h-2 mb-3 overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-300" 
                style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
              />
            </div>
            
            <p className="text-xs text-slate-400 font-medium leading-relaxed mb-1">
              {exportProgress.message}
            </p>
            
            <div className="text-[10px] text-slate-500 font-mono">
              Progress: {exportProgress.current} / {exportProgress.total} items
            </div>
          </div>
        </div>
      )}

      {/* 3. Toast Component */}
      {toastMessage && (
        <div id="toast-notif" className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 border border-slate-800 text-blue-400 text-xs px-4 py-2.5 rounded-lg shadow-xl shadow-black/40 flex items-center gap-2 z-50 transition animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 4. Token Configuration Modal Overlay */}
      {isTokenModalOpen && (
        <div id="token-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 relative">
            
            {token && (
              <button 
                onClick={() => setIsTokenModalOpen(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center mb-4 mx-auto shadow-lg shadow-blue-500/15">
              <Key className="w-5 h-5 text-white" />
            </div>

            <h3 className="text-lg font-semibold text-white text-center mb-1">Configure Mapbox</h3>
            <p className="text-xs text-slate-400 text-center mb-6 leading-relaxed">
              Enter your Mapbox Access Token and custom Style URL (optional). You can retrieve a free token from your <a href="https://account.mapbox.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Mapbox Account Dashboard</a>.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const submittedToken = (form.elements.namedItem('form-token') as HTMLInputElement).value.trim();
              const submittedStyle = (form.elements.namedItem('form-style') as HTMLInputElement).value.trim();
              handleTokenSubmit(submittedToken, submittedStyle);
            }} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Mapbox Access Token</label>
                <input 
                  type="text"
                  name="form-token"
                  required
                  placeholder="pk.eyJ1IjoiLi4u"
                  defaultValue={token}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Style URL (Optional)</label>
                <input 
                  type="text"
                  name="form-style"
                  placeholder="mapbox://styles/mapbox/dark-v11"
                  defaultValue={styleUrl}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 transition"
                />
                <span className="block text-[10px] text-slate-500 mt-1 leading-normal">
                  Standard Styles: dark-v11, light-v11, satellite-streets-v12, outdoors-v12, streets-v12
                </span>
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 font-medium text-xs rounded-lg transition text-white shadow-lg shadow-blue-600/10 mt-2"
              >
                Apply & Start Drawer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
