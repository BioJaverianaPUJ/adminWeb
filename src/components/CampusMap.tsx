import { campusReference } from "../../shared/campus-reference";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Coordinate } from "../../shared/types";
interface Props {
  points: Coordinate[];
  mode?: "polygon" | "point" | "circle" | "view";
  radius?: number;
  color?: string;
  onChange?: (points: Coordinate[]) => void;
  boundary?: Coordinate[];
}
export function CampusMap({
  points,
  mode = "view",
  radius = 30,
  color = "#b8d55d",
  onChange,
  boundary = [],
}: Props) {
  const el = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    layer = useRef<L.LayerGroup | null>(null),
    props = useRef({ points, mode, onChange });
  props.current = { points, mode, onChange };
  useEffect(() => {
    const m = L.map(el.current!, {
      center: points[0] ?? [4.6282, -74.0644],
      zoom: 17,
      minZoom: 14,
      maxZoom: 19,
    });
    map.current = m;
    if (points.length !== 1)
      m.fitBounds(
        L.latLngBounds(points.length >= 3 ? points : campusReference),
        { padding: [24, 24], animate: false },
      );
    const cartoKey = import.meta.env.VITE_CARTO_BASEMAP_KEY?.trim();
    const tileUrl = cartoKey
      ? `https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=${encodeURIComponent(cartoKey)}`
      : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      className: cartoKey ? "" : "campus-basemap",
      referrerPolicy: "strict-origin-when-cross-origin",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>' +
        (cartoKey
          ? ' · &copy; <a href="https://carto.com/attributions">CARTO</a>'
          : ""),
    }).addTo(m);
    const status = m.attributionControl;
    status.setPrefix(false);
    tiles.on("tileerror", () =>
      status.setPrefix("Mapa no disponible. Puedes usar las coordenadas."),
    );
    layer.current = L.layerGroup().addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => {
      const p = props.current;
      if (p.mode === "view") return;
      const point: Coordinate = [
        Number(e.latlng.lat.toFixed(7)),
        Number(e.latlng.lng.toFixed(7)),
      ];
      p.onChange?.(p.mode === "polygon" ? [...p.points, point] : [point]);
    });
    let initialFit = false;
    const observer = new ResizeObserver(() => {
      m.invalidateSize();
      if (!initialFit && points.length !== 1 && el.current!.clientHeight > 0) {
        m.fitBounds(
          L.latLngBounds(points.length >= 3 ? points : campusReference),
          { padding: [24, 24], animate: false },
        );
        initialFit = true;
      }
    });
    observer.observe(el.current!);
    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
    };
    // The map instance is stable; drawing changes are applied to the layer below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const group = layer.current;
    if (!group) return;
    group.clearLayers();
    const perimeter = boundary.length >= 3 ? boundary : campusReference;
    L.polygon(
      [
        [
          [5, -75],
          [5, -73],
          [4, -73],
          [4, -75],
        ],
        perimeter,
      ],
      {
        stroke: false,
        fillColor: "#002e28",
        fillOpacity: 0.34,
        interactive: false,
      },
    ).addTo(group);
    L.polygon(perimeter, {
      color: "#285d46",
      weight: 3,
      fillOpacity: 0.03,
      interactive: false,
    }).addTo(group);
    if (points.length >= 3 && mode !== "point" && mode !== "circle")
      L.polygon(points, { color, fillOpacity: 0.2 }).addTo(group);
    if (mode === "circle" && points[0])
      L.circle(points[0], { radius, color }).addTo(group);
    (mode === "view" && points.length > 1 ? [] : points).forEach((point, i) => {
      const marker = L.marker(point, {
        draggable: mode !== "view",
        icon: L.divIcon({
          className: "map-point",
          html: `<span>${i + 1}</span>`,
          iconSize: [28, 28],
        }),
      }).addTo(group);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        const next = [...props.current.points];
        next[i] = [Number(pos.lat.toFixed(7)), Number(pos.lng.toFixed(7))];
        props.current.onChange?.(next);
      });
    });
  }, [points, mode, radius, color, boundary]);
  return (
    <div className="map-frame">
      <div className="map-toolbar">
        <span>Campus Bogotá · referencia OSM</span>
        <button
          type="button"
          onClick={() =>
            map.current?.fitBounds(
              L.latLngBounds(boundary.length >= 3 ? boundary : campusReference),
              { padding: [24, 24], animate: false },
            )
          }
        >
          Centrar campus
        </button>
      </div>
      <div
        ref={el}
        className="campus-map"
        role="region"
        aria-label="Mapa interactivo del campus"
      />
    </div>
  );
}
