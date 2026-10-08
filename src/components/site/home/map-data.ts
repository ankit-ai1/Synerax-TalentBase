/** Dot-matrix India map data (simplified outline — decorative, not survey-accurate) */

const OUTLINE: [number, number][] = [
  [74.0, 34.5], [75.5, 36.0], [77.8, 35.5], [79.0, 34.3], [78.8, 32.5], [79.5, 30.9], [81.0, 30.2], [83.5, 28.9], [85.8, 27.8], [88.1, 27.9],
  [88.8, 27.3], [89.8, 26.7], [92.0, 26.9], [94.0, 27.6], [95.5, 28.2], [97.2, 28.0], [96.0, 27.0], [95.0, 25.8], [94.5, 24.2], [93.3, 22.5],
  [92.5, 23.5], [91.8, 24.1], [91.2, 23.2], [90.4, 22.6], [89.0, 21.9], [88.0, 21.6], [86.8, 21.3], [86.4, 19.9], [85.0, 19.3], [84.1, 18.3],
  [82.3, 17.0], [81.3, 16.3], [80.3, 15.5], [80.1, 13.5], [80.3, 13.1], [79.9, 11.9], [79.8, 10.3], [78.9, 9.3], [77.5, 8.1], [76.6, 8.9],
  [76.3, 9.9], [75.8, 11.4], [74.8, 12.8], [74.1, 14.8], [73.4, 16.0], [72.9, 18.9], [72.8, 20.4], [72.6, 21.4], [72.0, 21.1], [70.4, 20.9],
  [69.0, 22.4], [68.4, 23.5], [69.5, 24.3], [71.0, 24.4], [70.6, 25.7], [69.6, 27.0], [70.8, 28.0], [72.0, 28.9], [73.4, 29.9], [74.4, 30.9],
  [74.6, 31.9], [75.3, 32.3], [74.6, 33.0],
];

export const project = (lon: number, lat: number) => ({ x: (lon - 68) * 14 + 10, y: (37 - lat) * 14.7 + 10 });
export const MAP_W = 435;
export const MAP_H = 470;

function inside(lon: number, lat: number) {
  let c = false;
  for (let i = 0, j = OUTLINE.length - 1; i < OUTLINE.length; j = i++) {
    const [xi, yi] = OUTLINE[i];
    const [xj, yj] = OUTLINE[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export const DOTS: { x: number; y: number }[] = (() => {
  const out: { x: number; y: number }[] = [];
  for (let lat = 36.5; lat > 6.5; lat -= 0.72) {
    for (let lon = 68.2; lon < 97.5; lon += 0.72) {
      if (inside(lon, lat)) out.push(project(lon, lat));
    }
  }
  return out;
})();

export const CITIES = {
  "Delhi NCR": project(77.2, 28.6),
  Noida: project(77.9, 28.2),
  Mumbai: project(72.9, 19.1),
  Pune: project(73.9, 18.5),
  Hyderabad: project(78.5, 17.4),
  Bengaluru: project(77.6, 12.97),
  Chennai: project(80.27, 13.08),
  Kolkata: project(88.36, 22.57),
} as const;
export type City = keyof typeof CITIES;

/** label placement (map units) so nearby cities never overlap; a short leader line joins label and dot */
export const LABELS: Record<City, { x: number; y: number; anchor: "start" | "end" }> = {
  "Delhi NCR": { x: 104, y: 120, anchor: "end" },
  Noida: { x: 176, y: 152, anchor: "start" },
  Mumbai: { x: 56, y: 258, anchor: "end" },
  Pune: { x: 68, y: 304, anchor: "end" },
  Hyderabad: { x: 188, y: 290, anchor: "start" },
  Bengaluru: { x: 118, y: 392, anchor: "end" },
  Chennai: { x: 206, y: 350, anchor: "start" },
  Kolkata: { x: 308, y: 232, anchor: "start" },
};

/** the Synerax "axis" — every route starts here (geographic centre of India) */
export const HUB = project(79.1, 21.1);

// TODO: replace with real data — sample time-to-fill and open-role figures
export const SECTOR_MAP: Record<string, { cities: City[]; fill: number; open: number }> = {
  "IT & software": { cities: ["Bengaluru", "Pune", "Hyderabad", "Noida", "Chennai"], fill: 18, open: 140 },
  BFSI: { cities: ["Mumbai", "Delhi NCR", "Pune", "Bengaluru"], fill: 21, open: 85 },
  Healthcare: { cities: ["Bengaluru", "Chennai", "Delhi NCR", "Kolkata", "Hyderabad"], fill: 16, open: 62 },
  Manufacturing: { cities: ["Pune", "Chennai", "Delhi NCR", "Kolkata"], fill: 24, open: 48 },
  "Retail & e-commerce": { cities: ["Mumbai", "Delhi NCR", "Bengaluru", "Kolkata"], fill: 12, open: 110 },
  Telecom: { cities: ["Delhi NCR", "Noida", "Mumbai", "Hyderabad"], fill: 19, open: 36 },
  Logistics: { cities: ["Delhi NCR", "Mumbai", "Kolkata", "Chennai"], fill: 10, open: 95 },
};
