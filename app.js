"use strict";

const WORLD_WIDTH = 112;
const WORLD_HEIGHT = 82;
const START_YEAR = 2026;
const MAX_HISTORY = 96;

const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d");
const chartCanvas = document.getElementById("chartCanvas");
const chartCtx = chartCanvas.getContext("2d");

const els = {
  playPause: document.getElementById("playPause"),
  stepYear: document.getElementById("stepYear"),
  resetCity: document.getElementById("resetCity"),
  speedSelect: document.getElementById("speedSelect"),
  layerButtons: document.getElementById("layerButtons"),
  toolButtons: document.getElementById("toolButtons"),
  brushSize: document.getElementById("brushSize"),
  brushOutput: document.getElementById("brushOutput"),
  housingPolicy: document.getElementById("housingPolicy"),
  transitPolicy: document.getElementById("transitPolicy"),
  industryPolicy: document.getElementById("industryPolicy"),
  greenPolicy: document.getElementById("greenPolicy"),
  chartMetric: document.getElementById("chartMetric"),
  yearLabel: document.getElementById("yearLabel"),
  popLabel: document.getElementById("popLabel"),
  budgetLabel: document.getElementById("budgetLabel"),
  pressureLabel: document.getElementById("pressureLabel"),
  metricPopulation: document.getElementById("metricPopulation"),
  metricJobs: document.getElementById("metricJobs"),
  metricValue: document.getElementById("metricValue"),
  metricSatisfaction: document.getElementById("metricSatisfaction"),
  metricTraffic: document.getElementById("metricTraffic"),
  metricVacant: document.getElementById("metricVacant"),
  districtList: document.getElementById("districtList"),
  cityLog: document.getElementById("cityLog"),
  legend: document.getElementById("legend"),
  hoverReadout: document.getElementById("hoverReadout"),
  zoomIn: document.getElementById("zoomIn"),
  zoomOut: document.getElementById("zoomOut")
};

const colors = {
  paper: "#edf1e7",
  parcel: "#f8f8f2",
  boundary: "#8f9b90",
  water: "#9fc9d7",
  road: "#59645f",
  rail: "#6a5aa0",
  residential: "#79b0de",
  commercial: "#d99135",
  industrial: "#9a9388",
  civic: "#c6b45d",
  park: "#68a96e",
  vacant: "#e9eadf",
  building: "#d7d2c3",
  buildingStroke: "#7d786d",
  heatLow: "#eef1e8",
  heatBlue: "#427fb2",
  heatYellow: "#d6b948",
  heatRed: "#c9524a",
  heatGreen: "#4f9865",
  zoneResidential: "#357fb9",
  zoneCommercial: "#bd7b2d",
  zoneIndustrial: "#7d766e"
};

const zoneLabels = {
  residential: "住宅誘導",
  commercial: "商業誘導",
  industrial: "産業誘導"
};

const useLabels = {
  vacant: "空地",
  residential: "住宅",
  commercial: "商業",
  industrial: "産業",
  park: "緑地",
  civic: "公共"
};

const districtOrder = ["中央", "北西", "北東", "南西", "南東"];

const state = {
  seed: 1867,
  year: START_YEAR,
  budget: 920,
  playing: false,
  timer: null,
  layer: "land",
  tool: "road",
  brush: 1,
  zoom: 1,
  panX: 0,
  panY: 0,
  dragging: false,
  panning: false,
  lastPointer: null,
  hoverParcelId: null,
  parcels: [],
  roads: [],
  water: [],
  stations: [],
  policies: {
    housing: 1,
    transit: 4,
    industry: 0,
    green: 5
  },
  metrics: {},
  history: [],
  logs: []
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function random() {
  state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

function randBetween(min, max) {
  return lerp(min, max, random());
}

function formatNumber(value) {
  return Math.round(value).toLocaleString("ja-JP");
}

function formatMoney(value) {
  const sign = value < 0 ? "-" : "";
  return `${sign}${Math.abs(Math.round(value)).toLocaleString("ja-JP")}億`;
}

function formatSigned(value) {
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function resetSimulation() {
  state.seed = 1867;
  state.year = START_YEAR;
  state.budget = 920;
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  state.hoverParcelId = null;
  state.history = [];
  state.logs = [];
  state.parcels = [];
  state.stations = [];

  buildBaseMap();
  recalculateCity();
  seedInitialBuildings();
  recalculateCity();
  pushHistory();
  pushLog("2026年: 区画ごとの自然開発が始まりました。");
  render();
  updateUI();
}

function buildBaseMap() {
  state.water = [
    [
      { x: 23, y: -4 },
      { x: 29, y: 0 },
      { x: 31, y: 14 },
      { x: 28, y: 24 },
      { x: 31, y: 37 },
      { x: 26, y: 50 },
      { x: 29, y: 62 },
      { x: 25, y: 86 },
      { x: 18, y: 86 },
      { x: 20, y: 62 },
      { x: 17, y: 50 },
      { x: 21, y: 36 },
      { x: 18, y: 25 },
      { x: 22, y: 13 }
    ],
    [
      { x: 86, y: 66 },
      { x: 112, y: 66 },
      { x: 112, y: 82 },
      { x: 94, y: 82 },
      { x: 91, y: 76 },
      { x: 84, y: 74 }
    ]
  ];

  state.roads = [
    { name: "北幹線", width: 1.9, points: [{ x: 9, y: 23 }, { x: 104, y: 23 }] },
    { name: "中央幹線", width: 2.2, points: [{ x: 6, y: 48 }, { x: 108, y: 48 }] },
    { name: "南環状", width: 2.0, points: [{ x: 11, y: 65 }, { x: 92, y: 65 }] },
    { name: "市庁通り", width: 2.1, points: [{ x: 55, y: 9 }, { x: 55, y: 74 }] },
    { name: "東産業通り", width: 1.8, points: [{ x: 80, y: 17 }, { x: 80, y: 67 }] },
    { name: "河岸道路", width: 1.5, points: [{ x: 20, y: 47 }, { x: 27, y: 48 }, { x: 36, y: 48 }] }
  ];

  state.stations = [
    { x: 55, y: 48, name: "中央" },
    { x: 80, y: 48, name: "東町" },
    { x: 41, y: 23, name: "北口" }
  ];

  addBlock(7, 8, 18, 21, 2, 2, "北西");
  addBlock(33, 8, 52, 21, 3, 2, "北西");
  addBlock(58, 7, 78, 21, 3, 2, "北東");
  addBlock(84, 9, 104, 21, 2, 2, "北東");
  addBlock(7, 27, 19, 45, 2, 2, "南西");
  addBlock(33, 27, 52, 45, 3, 2, "中央");
  addBlock(58, 27, 78, 45, 3, 2, "中央");
  addBlock(84, 27, 104, 45, 2, 2, "北東");
  addBlock(8, 52, 19, 72, 2, 2, "南西");
  addBlock(33, 52, 52, 72, 3, 2, "南西");
  addBlock(58, 52, 78, 72, 3, 2, "南東");
  addBlock(84, 52, 104, 64, 2, 2, "南東");

  state.parcels.forEach((parcel) => {
    parcel.zone = initialZone(parcel);
    parcel.use = "vacant";
    parcel.coverageLimit = zoneCoverageLimit(parcel.zone, parcel.centroid);
    parcel.farLimit = zoneFarLimit(parcel.zone, parcel.centroid);
    parcel.streetUpgrade = parcel.frontage > 0.55 ? 1 : 0;
    parcel.publicUse = null;
    parcel.building = null;
    parcel.landValue = 20;
    parcel.valueTrend = 0;
  });
}

function addBlock(x0, y0, x1, y1, cols, rows, district) {
  const xs = [];
  const ys = [];
  for (let c = 0; c <= cols; c += 1) {
    const base = lerp(x0, x1, c / cols);
    xs.push(c === 0 || c === cols ? base : base + randBetween(-1.3, 1.3));
  }
  for (let r = 0; r <= rows; r += 1) {
    const base = lerp(y0, y1, r / rows);
    ys.push(r === 0 || r === rows ? base : base + randBetween(-1.1, 1.1));
  }

  const points = [];
  for (let r = 0; r <= rows; r += 1) {
    points[r] = [];
    for (let c = 0; c <= cols; c += 1) {
      const edge = r === 0 || r === rows || c === 0 || c === cols;
      points[r][c] = {
        x: xs[c] + (edge ? 0 : randBetween(-0.45, 0.45)),
        y: ys[r] + (edge ? 0 : randBetween(-0.45, 0.45))
      };
    }
  }

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const polygon = [
        points[r][c],
        points[r][c + 1],
        points[r + 1][c + 1],
        points[r + 1][c]
      ];
      const centroid = polygonCentroid(polygon);
      if (state.water.some((water) => pointInPolygon(centroid, water))) continue;
      const area = Math.abs(polygonArea(polygon));
      state.parcels.push({
        id: `P${String(state.parcels.length + 1).padStart(2, "0")}`,
        name: `${district}-${state.parcels.length + 1}`,
        district,
        points: polygon,
        centroid,
        area,
        frontage: roadFrontage(centroid),
        access: 0,
        stationAccess: 0,
        parkAccess: 0,
        traffic: 0,
        pollution: 0,
        satisfaction: 0.5,
        population: 0,
        jobs: 0
      });
    }
  }
}

function initialZone(parcel) {
  const { x, y } = parcel.centroid;
  if (x > 82 && y > 48) return "industrial";
  if (x > 82 && y < 30) return "commercial";
  if (x > 58 && y > 26 && y < 52) return "commercial";
  if (Math.abs(x - 55) < 10 && Math.abs(y - 48) < 12) return "commercial";
  if (x < 20 && y > 50) return "industrial";
  return "residential";
}

function zoneCoverageLimit(zone, centroid) {
  const central = centrality(centroid);
  if (zone === "commercial") return clamp(0.62 + central * 0.1, 0.58, 0.78);
  if (zone === "industrial") return 0.62;
  return clamp(0.48 + central * 0.08, 0.42, 0.6);
}

function zoneFarLimit(zone, centroid) {
  const central = centrality(centroid);
  if (zone === "commercial") return clamp(2.6 + central * 2.5, 2.1, 5.4);
  if (zone === "industrial") return 1.8;
  return clamp(1.1 + central * 1.6, 0.9, 2.8);
}

function seedInitialBuildings() {
  state.parcels.forEach((parcel) => {
    const chance = parcel.zone === "commercial" ? 0.74 : parcel.zone === "industrial" ? 0.54 : 0.66;
    if (random() < chance) {
      createOrUpdateBuilding(parcel, clamp(0.32 + parcel.access * 0.34 + parcel.stationAccess * 0.2, 0.2, 0.82), true);
    }
  });
}

function simulateYear() {
  const previous = { ...state.metrics };
  state.year += 1;
  recalculateCity();
  developParcels();
  recalculateCity();
  updateBudget();
  pushHistory();
  createYearLog(previous);
  render();
  updateUI();
}

function recalculateCity() {
  computeAccess();
  computeParcelEconomy();
  state.metrics = collectMetrics();
}

function computeAccess() {
  state.parcels.forEach((parcel) => {
    const roadDistance = Math.min(...state.roads.map((road) => distanceToPolyline(parcel.centroid, road.points)));
    const stationDistance = Math.min(...state.stations.map((station) => distance(parcel.centroid, station)));
    const upgrade = parcel.streetUpgrade * 0.09;
    parcel.frontage = roadDistance < 2.8 ? 1 : clamp(1 - roadDistance / 14, 0, 1);
    parcel.access = clamp(1 - roadDistance / 18 + upgrade, 0, 1);
    parcel.stationAccess = clamp(1 - stationDistance / 20, 0, 1);
  });

  state.parcels.forEach((parcel) => {
    let park = 0;
    let pollution = 0;
    for (const other of state.parcels) {
      const d = Math.max(1, distance(parcel.centroid, other.centroid));
      if (d > 22) continue;
      const influence = 1 - d / 22;
      if (other.use === "park") park += influence * 0.38;
      if (other.use === "industrial" && other.building) {
        pollution += influence * (0.2 + other.building.intensity * 0.42);
      }
    }
    parcel.parkAccess = clamp(park, 0, 1);
    parcel.pollution = clamp(pollution - state.policies.green * 0.025, 0, 1);
  });
}

function computeParcelEconomy() {
  for (const parcel of state.parcels) {
    if (parcel.use === "park") {
      parcel.population = 0;
      parcel.jobs = Math.round(parcel.area * 0.18);
      parcel.traffic = 0.05;
      parcel.landValue = smoothValue(parcel.landValue, 30 + parcel.parkAccess * 20 + parcel.access * 12);
      parcel.satisfaction = clamp(0.62 + parcel.parkAccess * 0.16 - parcel.traffic * 0.08, 0, 1);
      continue;
    }

    if (!parcel.building) {
      parcel.population = 0;
      parcel.jobs = 0;
      parcel.traffic = clamp(0.06 + parcel.access * 0.1, 0, 0.25);
      parcel.landValue = smoothValue(parcel.landValue, rawLandValue(parcel));
      parcel.satisfaction = clamp(0.42 + parcel.parkAccess * 0.18 - parcel.pollution * 0.22, 0, 1);
      continue;
    }

    const floorArea = parcel.building.floorArea;
    if (parcel.use === "residential") {
      parcel.population = Math.round(floorArea * 4.8);
      parcel.jobs = Math.round(floorArea * 0.22);
    } else if (parcel.use === "commercial") {
      parcel.population = Math.round(floorArea * 0.38);
      parcel.jobs = Math.round(floorArea * 3.8);
    } else {
      parcel.population = Math.round(floorArea * 0.16);
      parcel.jobs = Math.round(floorArea * 2.8);
    }

    const travelDemand = parcel.population * 0.42 + parcel.jobs * 0.56;
    const capacity = 130 + state.policies.transit * 18 + parcel.frontage * 130 + parcel.stationAccess * 150;
    parcel.traffic = clamp(travelDemand / Math.max(1, capacity), 0, 1.18);
    parcel.landValue = smoothValue(parcel.landValue, rawLandValue(parcel));

    const housingCost = parcel.use === "residential" ? parcel.landValue / 190 : 0.18;
    const comfort =
      0.36 +
      parcel.access * 0.17 +
      parcel.stationAccess * 0.12 +
      parcel.parkAccess * 0.18 +
      state.policies.green * 0.012 -
      parcel.pollution * 0.24 -
      parcel.traffic * 0.2 -
      housingCost * 0.12 +
      parcel.building.quality * 0.1;
    parcel.satisfaction = clamp(comfort, 0, 1);
  }
}

function rawLandValue(parcel) {
  const zonePremium = parcel.zone === "commercial" ? 14 : parcel.zone === "industrial" ? 4 : 8;
  const buildingPremium = parcel.building ? parcel.building.intensity * 18 : 0;
  const value =
    18 +
    centrality(parcel.centroid) * 26 +
    parcel.access * 26 +
    parcel.stationAccess * 28 +
    parcel.parkAccess * 16 +
    zonePremium +
    buildingPremium -
    parcel.traffic * 15 -
    parcel.pollution * 24;
  return clamp(value, 4, 100);
}

function smoothValue(current, next) {
  const trend = next - current;
  return clamp(current + trend * 0.36, 0, 100);
}

function developParcels() {
  const pressure = currentUrbanPressure();
  const shuffled = [...state.parcels].sort(() => random() - 0.5);

  for (const parcel of shuffled) {
    if (parcel.use === "park") continue;
    const desiredUse = chooseUse(parcel);
    const zoneMatch = parcel.zone === desiredUse ? 0.11 : -0.08;
    const market =
      pressure * 0.22 +
      parcel.access * 0.2 +
      parcel.stationAccess * 0.2 +
      centrality(parcel.centroid) * 0.15 +
      parcel.landValue / 260 +
      zoneMatch -
      parcel.pollution * 0.14 -
      parcel.traffic * 0.1;

    if (!parcel.building) {
      if (random() < clamp(market, 0.08, 0.72)) {
        parcel.use = desiredUse;
        createOrUpdateBuilding(parcel, clamp(market + random() * 0.12, 0.18, 0.9), false);
      }
      continue;
    }

    const age = state.year - parcel.building.yearBuilt;
    const redevelopmentPressure = market + age * 0.012 + parcel.landValue / 360;
    if (parcel.zone !== parcel.use && random() < 0.2) parcel.use = desiredUse;
    if (redevelopmentPressure > 0.62 && random() < clamp((redevelopmentPressure - 0.55) * 0.42, 0.02, 0.28)) {
      parcel.use = desiredUse;
      createOrUpdateBuilding(parcel, clamp(redevelopmentPressure, 0.28, 1), false);
    } else {
      parcel.building.quality = clamp(parcel.building.quality - 0.015 + state.policies.green * 0.002, 0.22, 1);
    }
  }
}

function chooseUse(parcel) {
  if (parcel.zone && random() < 0.66) return parcel.zone;
  const residential =
    0.45 +
    state.policies.housing * 0.025 +
    parcel.parkAccess * 0.18 -
    parcel.pollution * 0.22 -
    parcel.stationAccess * 0.04;
  const commercial = 0.25 + parcel.access * 0.2 + parcel.stationAccess * 0.32 + centrality(parcel.centroid) * 0.16;
  const industrial =
    0.16 +
    state.policies.industry * 0.028 +
    parcel.access * 0.14 -
    parcel.parkAccess * 0.12 -
    state.policies.green * 0.018;

  const weights = [
    ["residential", Math.max(0.03, residential)],
    ["commercial", Math.max(0.03, commercial)],
    ["industrial", Math.max(0.02, industrial)]
  ];
  let pick = random() * weights.reduce((sum, item) => sum + item[1], 0);
  for (const [use, weight] of weights) {
    pick -= weight;
    if (pick <= 0) return use;
  }
  return "residential";
}

function createOrUpdateBuilding(parcel, intensity, initial) {
  const coverageBase = parcel.use === "commercial" ? 0.42 : parcel.use === "industrial" ? 0.46 : 0.34;
  const coverage = clamp(coverageBase + intensity * 0.28, 0.18, parcel.coverageLimit);
  const farBias =
    parcel.use === "commercial"
      ? 1.6 + parcel.stationAccess * 1.7
      : parcel.use === "industrial"
        ? 0.85 + parcel.access * 0.5
        : 0.75 + parcel.stationAccess * 0.8 + state.policies.housing * 0.06;
  const far = clamp(coverage * (1 + intensity * 3.2 + farBias), coverage * 1.1, parcel.farLimit);
  const floors = clamp(Math.round(far / Math.max(0.12, coverage)), 1, 12);
  parcel.building = {
    footprint: insetPolygon(parcel.points, coverage),
    coverage,
    far,
    floors,
    intensity,
    floorArea: parcel.area * far,
    quality: initial ? randBetween(0.52, 0.82) : randBetween(0.64, 0.95),
    yearBuilt: state.year
  };
}

function updateBudget() {
  const metrics = state.metrics;
  const revenue = metrics.population * 0.011 + metrics.jobs * 0.016 + metrics.value * 1.9;
  const maintenance =
    state.parcels.reduce((sum, parcel) => sum + parcel.streetUpgrade * 1.7 + (parcel.use === "park" ? 2.5 : 0), 0) +
    state.stations.length * 8.5 +
    state.policies.transit * 7.4 +
    Math.max(0, state.policies.housing) * 4.8 +
    Math.max(0, state.policies.green - 5) * 3.6 +
    Math.max(0, state.policies.industry) * 4.2;
  state.budget += Math.round(revenue - maintenance);
}

function collectMetrics() {
  let population = 0;
  let jobs = 0;
  let value = 0;
  let satisfaction = 0;
  let traffic = 0;
  let vacant = 0;
  let developed = 0;
  let totalArea = 0;
  let buildingArea = 0;

  for (const parcel of state.parcels) {
    population += parcel.population;
    jobs += parcel.jobs;
    value += parcel.landValue * parcel.area;
    satisfaction += parcel.satisfaction * parcel.area;
    traffic += parcel.traffic * parcel.area;
    totalArea += parcel.area;
    if (!parcel.building && parcel.use !== "park") vacant += 1;
    if (parcel.building) {
      developed += 1;
      buildingArea += parcel.building.floorArea;
    }
  }

  return {
    population,
    jobs,
    value: value / Math.max(1, totalArea),
    satisfaction: satisfaction / Math.max(1, totalArea),
    traffic: traffic / Math.max(1, totalArea),
    vacant,
    developed,
    parcels: state.parcels.length,
    buildingArea,
    pressure: currentUrbanPressure()
  };
}

function currentUrbanPressure() {
  const previousPopulation = state.metrics.population || 17000;
  const previousJobs = state.metrics.jobs || 15000;
  const jobRatio = previousJobs / Math.max(1, previousPopulation);
  const yearPush = clamp((state.year - START_YEAR) * 0.02, 0, 0.36);
  const policyPush = state.policies.housing * 0.017 + state.policies.industry * 0.014;
  const congestionDrag = (state.metrics.traffic || 0.26) * 0.2;
  return clamp(0.44 + jobRatio * 0.08 + yearPush + policyPush - congestionDrag, 0.16, 1.08);
}

function pushHistory() {
  state.history.push({
    year: state.year,
    population: state.metrics.population || 0,
    jobs: state.metrics.jobs || 0,
    value: state.metrics.value || 0,
    satisfaction: (state.metrics.satisfaction || 0) * 100,
    traffic: (state.metrics.traffic || 0) * 100,
    budget: state.budget,
    pressure: (state.metrics.pressure || 0) * 100
  });
  if (state.history.length > MAX_HISTORY) state.history.shift();
}

function createYearLog(previous) {
  if (!previous || !previous.population) return;
  const current = state.metrics;
  const popDelta = (current.population - previous.population) / Math.max(1, previous.population);
  const trafficDelta = current.traffic - previous.traffic;
  const valueDelta = current.value - previous.value;

  if (popDelta > 0.055) {
    pushLog(`${state.year}年: ${hotDistrict("population")}で区画更新が連鎖しました。`);
  } else if (trafficDelta > 0.04) {
    pushLog(`${state.year}年: ${hotDistrict("traffic")}の街路負荷が上昇しました。`);
  } else if (valueDelta > 2.2) {
    pushLog(`${state.year}年: ${hotDistrict("value")}の地価が強含みです。`);
  } else if (current.satisfaction < 0.35 && random() < 0.42) {
    pushLog(`${state.year}年: 生活満足度が低下し、再整備圧が高まっています。`);
  } else if (random() < 0.25) {
    pushLog(`${state.year}年: 建蔽率と地価に沿った小規模な建替えが進みました。`);
  }
}

function pushLog(text) {
  state.logs.unshift(text);
  if (state.logs.length > 10) state.logs.pop();
}

function hotDistrict(metric) {
  const districts = districtStats();
  let best = districts[0];
  for (const district of districts) {
    if (district[metric] > best[metric]) best = district;
  }
  return best.name;
}

function districtStats() {
  const byName = Object.fromEntries(
    districtOrder.map((name) => [
      name,
      { name, count: 0, area: 0, population: 0, jobs: 0, satisfaction: 0, traffic: 0, value: 0 }
    ])
  );

  for (const parcel of state.parcels) {
    const district = byName[parcel.district];
    district.count += 1;
    district.area += parcel.area;
    district.population += parcel.population;
    district.jobs += parcel.jobs;
    district.satisfaction += parcel.satisfaction * parcel.area;
    district.traffic += parcel.traffic * parcel.area;
    district.value += parcel.landValue * parcel.area;
  }

  return districtOrder.map((name) => {
    const district = byName[name];
    district.satisfaction /= Math.max(1, district.area);
    district.traffic /= Math.max(1, district.area);
    district.value /= Math.max(1, district.area);
    return district;
  });
}

function applyToolToParcel(parcel) {
  if (!parcel || state.tool === "inspect") return;
  const targets = parcelsInBrush(parcel);
  let cost = 0;

  for (const target of targets) {
    if (state.tool === "road") {
      if (target.streetUpgrade < 3) {
        target.streetUpgrade += 1;
        cost += 18;
      }
    } else if (state.tool === "station") {
      if (!hasNearbyStation(target.centroid, 3.8)) {
        state.stations.push({ ...target.centroid, name: `新駅${state.stations.length + 1}` });
        cost += 96;
      }
    } else if (state.tool === "park") {
      if (target.use !== "park" || target.building) {
        target.use = "park";
        target.publicUse = "park";
        target.building = null;
        cost += 22;
      }
    } else if (state.tool === "zoneResidential") {
      if (target.zone !== "residential") {
        target.zone = "residential";
        target.coverageLimit = zoneCoverageLimit(target.zone, target.centroid);
        target.farLimit = zoneFarLimit(target.zone, target.centroid);
        cost += 2;
      }
    } else if (state.tool === "zoneCommercial") {
      if (target.zone !== "commercial") {
        target.zone = "commercial";
        target.coverageLimit = zoneCoverageLimit(target.zone, target.centroid);
        target.farLimit = zoneFarLimit(target.zone, target.centroid);
        cost += 2;
      }
    } else if (state.tool === "zoneIndustrial") {
      if (target.zone !== "industrial") {
        target.zone = "industrial";
        target.coverageLimit = zoneCoverageLimit(target.zone, target.centroid);
        target.farLimit = zoneFarLimit(target.zone, target.centroid);
        cost += 2;
      }
    } else if (state.tool === "clear") {
      if (target.use !== "vacant" || target.publicUse || target.building) {
        target.use = "vacant";
        target.publicUse = null;
        target.building = null;
        cost += 9;
      }
    }
  }

  if (cost) {
    state.budget -= cost;
    recalculateCity();
    pushHistory();
    render();
    updateUI();
  }
}

function parcelsInBrush(parcel) {
  const radius = [0, 7, 12, 18][state.brush] || 0;
  if (!radius) return [parcel];
  return state.parcels.filter((item) => distance(item.centroid, parcel.centroid) <= radius);
}

function hasNearbyStation(point, radius) {
  return state.stations.some((station) => distance(station, point) <= radius);
}

function render() {
  resizeCanvasToDisplay(canvas, ctx);
  renderMap();
  renderChart();
}

function resizeCanvasToDisplay(target, context) {
  const rect = target.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));
  if (target.width !== width || target.height !== height) {
    target.width = width;
    target.height = height;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function mapGeometry() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const base = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT) * 0.92;
  const scale = base * state.zoom;
  return {
    scale,
    offsetX: (width - WORLD_WIDTH * scale) / 2 + state.panX,
    offsetY: (height - WORLD_HEIGHT * scale) / 2 + state.panY,
    width,
    height
  };
}

function renderMap() {
  const geo = mapGeometry();
  ctx.clearRect(0, 0, geo.width, geo.height);
  drawMapPaper(geo);
  drawWater(geo);
  drawParcels(geo);
  drawRoads(geo);
  drawStations(geo);
  drawDistrictLabels(geo);
  drawBrushPreview(geo);
}

function drawMapPaper(geo) {
  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, geo.width, geo.height);
  ctx.save();
  ctx.strokeStyle = "rgba(100, 116, 105, 0.08)";
  ctx.lineWidth = 1;
  const step = geo.scale * 5;
  const startX = geo.offsetX % step;
  const startY = geo.offsetY % step;
  for (let x = startX; x < geo.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, geo.height);
    ctx.stroke();
  }
  for (let y = startY; y < geo.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(geo.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWater(geo) {
  for (const polygon of state.water) {
    ctx.fillStyle = colors.water;
    ctx.strokeStyle = "rgba(70, 110, 126, 0.42)";
    ctx.lineWidth = 1.2;
    drawPolygon(polygon, geo);
    ctx.fill();
    ctx.stroke();
  }
}

function drawParcels(geo) {
  for (const parcel of state.parcels) {
    const hovered = parcel.id === state.hoverParcelId;
    ctx.fillStyle = parcelColor(parcel);
    ctx.strokeStyle = hovered ? "#182b22" : colors.boundary;
    ctx.lineWidth = hovered ? 2.2 : 1;
    drawPolygon(parcel.points, geo);
    ctx.fill();
    ctx.stroke();

    if (parcel.building) drawBuilding(parcel, geo);
    drawRegulationMark(parcel, geo);
  }
}

function drawBuilding(parcel, geo) {
  const shade = clamp(parcel.building.floors / 12, 0, 1);
  const shadow = 0.24 + shade * 0.36;
  ctx.save();
  ctx.fillStyle = `rgba(60, 58, 52, ${shadow})`;
  drawPolygon(parcel.building.footprint.map((point) => ({ x: point.x + 0.38 * shade, y: point.y + 0.38 * shade })), geo);
  ctx.fill();

  ctx.fillStyle =
    parcel.use === "residential"
      ? blend(colors.residential, "#ffffff", 0.28)
      : parcel.use === "commercial"
        ? blend(colors.commercial, "#ffffff", 0.22)
        : blend(colors.industrial, "#ffffff", 0.25);
  ctx.strokeStyle = colors.buildingStroke;
  ctx.lineWidth = 1.1;
  drawPolygon(parcel.building.footprint, geo);
  ctx.fill();
  ctx.stroke();

  if (geo.scale > 7) {
    const center = parcel.centroid;
    const screen = worldToScreen(center, geo);
    ctx.fillStyle = "rgba(23,33,27,0.55)";
    ctx.font = "600 10px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${parcel.building.floors}F`, screen.x, screen.y);
  }
  ctx.restore();
}

function drawRegulationMark(parcel, geo) {
  if (state.layer !== "land") return;
  const center = worldToScreen(parcel.centroid, geo);
  ctx.save();
  ctx.globalAlpha = parcel.building ? 0.34 : 0.72;
  ctx.strokeStyle =
    parcel.zone === "residential"
      ? colors.zoneResidential
      : parcel.zone === "commercial"
        ? colors.zoneCommercial
        : colors.zoneIndustrial;
  ctx.lineWidth = 1.3;
  const radius = Math.max(3, Math.min(7, geo.scale * 0.55));
  ctx.strokeRect(center.x - radius, center.y - radius, radius * 2, radius * 2);
  ctx.restore();
}

function drawRoads(geo) {
  ctx.save();
  for (const road of state.roads) {
    drawPolyline(road.points, geo, road.width * geo.scale + 4, "rgba(255, 255, 255, 0.82)");
    drawPolyline(road.points, geo, road.width * geo.scale, colors.road);
    drawPolyline(road.points, geo, Math.max(1, road.width * geo.scale * 0.08), "rgba(255,255,255,0.38)");
  }
  ctx.restore();
}

function drawStations(geo) {
  ctx.save();
  for (const station of state.stations) {
    const point = worldToScreen(station, geo);
    const radius = Math.max(5, geo.scale * 0.68);
    ctx.fillStyle = colors.rail;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawDistrictLabels(geo) {
  const labels = [
    ["北西", 35, 16],
    ["北東", 83, 16],
    ["中央", 62, 39],
    ["南西", 35, 63],
    ["南東", 82, 63]
  ];
  ctx.save();
  ctx.fillStyle = "rgba(23, 33, 27, 0.34)";
  ctx.font = "600 12px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const [label, x, y] of labels) {
    const point = worldToScreen({ x, y }, geo);
    ctx.fillText(label, point.x, point.y);
  }
  ctx.restore();
}

function drawBrushPreview(geo) {
  const parcel = hoveredParcel();
  if (!parcel) return;
  const targets = parcelsInBrush(parcel);
  ctx.save();
  ctx.strokeStyle = "rgba(22, 36, 29, 0.7)";
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = 2;
  for (const target of targets) {
    drawPolygon(target.points, geo);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function parcelColor(parcel) {
  if (state.layer !== "land") return heatParcelColor(parcel);
  if (parcel.use === "park") return blend(colors.park, "#ffffff", 0.25);
  if (!parcel.building) {
    if (parcel.zone === "residential") return "#e4eef3";
    if (parcel.zone === "commercial") return "#f3e5cb";
    if (parcel.zone === "industrial") return "#e5e0d9";
    return colors.vacant;
  }
  if (parcel.use === "residential") return blend(colors.residential, "#ffffff", 0.55);
  if (parcel.use === "commercial") return blend(colors.commercial, "#ffffff", 0.55);
  if (parcel.use === "industrial") return blend(colors.industrial, "#ffffff", 0.48);
  return colors.parcel;
}

function heatParcelColor(parcel) {
  let value = 0;
  if (state.layer === "population") value = clamp(parcel.population / 1100, 0, 1);
  if (state.layer === "value") value = clamp(parcel.landValue / 95, 0, 1);
  if (state.layer === "traffic") value = clamp(parcel.traffic / 1, 0, 1);
  if (state.layer === "satisfaction") value = clamp(parcel.satisfaction, 0, 1);

  if (state.layer === "satisfaction") return gradient3(colors.heatRed, colors.heatYellow, colors.heatGreen, value);
  if (state.layer === "traffic") return gradient3(colors.heatLow, colors.heatYellow, colors.heatRed, value);
  if (state.layer === "value") return gradient3(colors.heatLow, colors.heatYellow, colors.heatRed, value);
  return gradient3(colors.heatLow, colors.heatBlue, colors.rail, value);
}

function renderChart() {
  resizeCanvasToDisplay(chartCanvas, chartCtx);
  const width = chartCanvas.clientWidth;
  const height = chartCanvas.clientHeight;
  chartCtx.clearRect(0, 0, width, height);
  chartCtx.fillStyle = "#fbfcfa";
  chartCtx.fillRect(0, 0, width, height);

  const metric = els.chartMetric.value;
  const data = state.history.map((item) => item[metric]);
  if (data.length < 2) return;

  const pad = { left: 36, right: 12, top: 14, bottom: 24 };
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = Math.max(1, max - min);
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  chartCtx.strokeStyle = "#dfe5dc";
  chartCtx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = pad.top + (plotH / 3) * i;
    chartCtx.beginPath();
    chartCtx.moveTo(pad.left, y);
    chartCtx.lineTo(width - pad.right, y);
    chartCtx.stroke();
  }

  chartCtx.strokeStyle = metric === "traffic" ? colors.heatRed : metric === "budget" ? colors.rail : colors.heatBlue;
  chartCtx.lineWidth = 2.4;
  chartCtx.beginPath();
  data.forEach((value, index) => {
    const x = pad.left + (plotW * index) / (data.length - 1);
    const y = pad.top + plotH - ((value - min) / span) * plotH;
    if (index === 0) chartCtx.moveTo(x, y);
    else chartCtx.lineTo(x, y);
  });
  chartCtx.stroke();

  chartCtx.fillStyle = "#65736c";
  chartCtx.font = "11px Segoe UI, sans-serif";
  chartCtx.textAlign = "left";
  chartCtx.fillText(shortMetric(max, metric), 8, pad.top + 4);
  chartCtx.fillText(shortMetric(min, metric), 8, height - pad.bottom + 4);
  chartCtx.textAlign = "center";
  chartCtx.fillText(String(state.history[0].year), pad.left, height - 7);
  chartCtx.fillText(String(state.history[state.history.length - 1].year), width - pad.right - 16, height - 7);
}

function shortMetric(value, metric) {
  if (metric === "budget") return formatMoney(value);
  if (metric === "satisfaction" || metric === "traffic" || metric === "pressure") return `${Math.round(value)}%`;
  return formatNumber(value);
}

function updateUI() {
  const metrics = state.metrics;
  els.yearLabel.textContent = String(state.year);
  els.popLabel.textContent = formatNumber(metrics.population || 0);
  els.budgetLabel.textContent = formatMoney(state.budget);
  els.pressureLabel.textContent = `${Math.round((metrics.pressure || 0) * 100)}%`;
  els.metricPopulation.textContent = formatNumber(metrics.population || 0);
  els.metricJobs.textContent = formatNumber(metrics.jobs || 0);
  els.metricValue.textContent = Math.round(metrics.value || 0).toString();
  els.metricSatisfaction.textContent = `${Math.round((metrics.satisfaction || 0) * 100)}%`;
  els.metricTraffic.textContent = `${Math.round((metrics.traffic || 0) * 100)}%`;
  els.metricVacant.textContent = formatNumber(metrics.vacant || 0);
  els.playPause.textContent = state.playing ? "⏸" : "▶";

  for (const input of [els.housingPolicy, els.transitPolicy, els.industryPolicy, els.greenPolicy]) {
    const output = input.parentElement.querySelector("output");
    const value = Number(input.value);
    output.textContent = input === els.housingPolicy || input === els.industryPolicy ? formatSigned(value) : String(value);
  }
  els.brushOutput.textContent = String(state.brush);

  updateLayerButtons();
  updateToolButtons();
  renderDistrictList();
  renderLog();
  renderLegend();
  updateHoverReadout();
  renderChart();
}

function updateLayerButtons() {
  els.layerButtons.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.layer === state.layer);
  });
}

function updateToolButtons() {
  els.toolButtons.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tool === state.tool);
  });
}

function renderDistrictList() {
  const districts = districtStats();
  const maxPopulation = Math.max(1, ...districts.map((district) => district.population));
  els.districtList.innerHTML = "";
  for (const district of districts) {
    const row = document.createElement("div");
    row.className = "district-row";
    const percent = clamp((district.population / maxPopulation) * 100, 4, 100);
    row.innerHTML = `
      <span>${district.name}</span>
      <div class="bar"><i style="width:${percent}%"></i></div>
      <strong>${Math.round(district.satisfaction * 100)}%</strong>
    `;
    els.districtList.append(row);
  }
}

function renderLog() {
  els.cityLog.innerHTML = "";
  for (const item of state.logs) {
    const li = document.createElement("li");
    li.textContent = item;
    els.cityLog.append(li);
  }
}

function renderLegend() {
  const legends = {
    land: [
      ["住宅", colors.residential],
      ["商業", colors.commercial],
      ["産業", colors.industrial],
      ["建物", colors.building],
      ["街路", colors.road],
      ["水域", colors.water]
    ],
    population: [
      ["低", colors.heatLow],
      ["中", colors.heatBlue],
      ["高", colors.rail]
    ],
    value: [
      ["低", colors.heatLow],
      ["中", colors.heatYellow],
      ["高", colors.heatRed]
    ],
    traffic: [
      ["低", colors.heatLow],
      ["混雑", colors.heatYellow],
      ["過負荷", colors.heatRed]
    ],
    satisfaction: [
      ["低", colors.heatRed],
      ["中", colors.heatYellow],
      ["高", colors.heatGreen]
    ]
  };
  els.legend.innerHTML = "";
  for (const [label, color] of legends[state.layer]) {
    const item = document.createElement("span");
    item.className = "legend-item";
    item.innerHTML = `<i class="legend-swatch" style="background:${color}"></i><span>${label}</span>`;
    els.legend.append(item);
  }
}

function updateHoverReadout() {
  const parcel = hoveredParcel();
  if (!parcel) {
    els.hoverReadout.textContent = "区画を調査";
    return;
  }
  const building = parcel.building
    ? ` / ${parcel.building.floors}F / 建蔽${Math.round(parcel.building.coverage * 100)}% / 容積${Math.round(parcel.building.far * 100)}%`
    : "";
  const regulation = `上限 建蔽${Math.round(parcel.coverageLimit * 100)}% 容積${Math.round(parcel.farLimit * 100)}%`;
  els.hoverReadout.textContent =
    `${parcel.id} ${parcel.district} | ${useLabels[parcel.use]} / ${zoneLabels[parcel.zone]}${building} | ` +
    `地価 ${Math.round(parcel.landValue)} / 人口 ${formatNumber(parcel.population)} / 雇用 ${formatNumber(parcel.jobs)} / ` +
    `渋滞 ${Math.round(parcel.traffic * 100)}% / 満足 ${Math.round(parcel.satisfaction * 100)}% | ${regulation}`;
}

function hoveredParcel() {
  return state.parcels.find((parcel) => parcel.id === state.hoverParcelId) || null;
}

function pointerToWorld(event) {
  const rect = canvas.getBoundingClientRect();
  const geo = mapGeometry();
  return {
    x: (event.clientX - rect.left - geo.offsetX) / geo.scale,
    y: (event.clientY - rect.top - geo.offsetY) / geo.scale
  };
}

function parcelAtWorld(point) {
  for (let i = state.parcels.length - 1; i >= 0; i -= 1) {
    const parcel = state.parcels[i];
    if (pointInPolygon(point, parcel.points)) return parcel;
  }
  return null;
}

function handlePointerDown(event) {
  const point = pointerToWorld(event);
  const parcel = parcelAtWorld(point);
  state.hoverParcelId = parcel ? parcel.id : null;
  state.lastPointer = { x: event.clientX, y: event.clientY };
  state.panning = event.button === 2 || event.shiftKey;
  state.dragging = true;
  canvas.setPointerCapture(event.pointerId);
  if (parcel && !state.panning && state.tool !== "inspect") applyToolToParcel(parcel);
  updateHoverReadout();
  render();
}

function handlePointerMove(event) {
  const point = pointerToWorld(event);
  const parcel = parcelAtWorld(point);
  state.hoverParcelId = parcel ? parcel.id : null;

  if (state.dragging && state.panning && state.lastPointer) {
    state.panX += event.clientX - state.lastPointer.x;
    state.panY += event.clientY - state.lastPointer.y;
    state.lastPointer = { x: event.clientX, y: event.clientY };
  } else if (state.dragging && parcel && state.tool !== "inspect") {
    applyToolToParcel(parcel);
  }

  updateHoverReadout();
  render();
}

function handlePointerUp(event) {
  state.dragging = false;
  state.panning = false;
  state.lastPointer = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
}

function zoomMap(delta, origin) {
  const before = mapGeometry();
  const oldZoom = state.zoom;
  const nextZoom = clamp(state.zoom * delta, 0.78, 2.6);
  if (nextZoom === oldZoom) return;

  if (origin) {
    const worldX = (origin.x - before.offsetX) / before.scale;
    const worldY = (origin.y - before.offsetY) / before.scale;
    state.zoom = nextZoom;
    const after = mapGeometry();
    state.panX += origin.x - (after.offsetX + worldX * after.scale);
    state.panY += origin.y - (after.offsetY + worldY * after.scale);
  } else {
    state.zoom = nextZoom;
  }
  render();
}

function bindEvents() {
  els.playPause.addEventListener("click", () => {
    state.playing = !state.playing;
    scheduleTimer();
    updateUI();
  });

  els.stepYear.addEventListener("click", simulateYear);

  els.resetCity.addEventListener("click", () => {
    state.playing = false;
    scheduleTimer();
    resetSimulation();
  });

  els.speedSelect.addEventListener("change", scheduleTimer);

  els.layerButtons.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-layer]");
    if (!button) return;
    state.layer = button.dataset.layer;
    updateUI();
    render();
  });

  els.toolButtons.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-tool]");
    if (!button) return;
    state.tool = button.dataset.tool;
    updateUI();
    render();
  });

  els.brushSize.addEventListener("input", () => {
    state.brush = Number(els.brushSize.value);
    updateUI();
    render();
  });

  const policyInputs = [els.housingPolicy, els.transitPolicy, els.industryPolicy, els.greenPolicy];
  for (const input of policyInputs) {
    input.addEventListener("input", () => {
      state.policies.housing = Number(els.housingPolicy.value);
      state.policies.transit = Number(els.transitPolicy.value);
      state.policies.industry = Number(els.industryPolicy.value);
      state.policies.green = Number(els.greenPolicy.value);
      recalculateCity();
      pushHistory();
      updateUI();
      render();
    });
  }

  els.chartMetric.addEventListener("change", renderChart);
  els.zoomIn.addEventListener("click", () => zoomMap(1.18));
  els.zoomOut.addEventListener("click", () => zoomMap(1 / 1.18));

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const delta = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomMap(delta, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    },
    { passive: false }
  );

  window.addEventListener("resize", render);
}

function scheduleTimer() {
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
  if (!state.playing) return;
  state.timer = setInterval(simulateYear, Number(els.speedSelect.value));
}

function polygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const next = points[(i + 1) % points.length];
    area += points[i].x * next.y - next.x * points[i].y;
  }
  return area / 2;
}

function polygonCentroid(points) {
  const area = polygonArea(points);
  if (Math.abs(area) < 0.001) {
    return points.reduce((sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }), {
      x: 0,
      y: 0
    });
  }

  let x = 0;
  let y = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const cross = current.x * next.y - next.x * current.y;
    x += (current.x + next.x) * cross;
    y += (current.y + next.y) * cross;
  }
  return { x: x / (6 * area), y: y / (6 * area) };
}

function insetPolygon(points, coverage) {
  const center = polygonCentroid(points);
  const scale = clamp(Math.sqrt(coverage) * 0.82, 0.26, 0.72);
  return points.map((point) => ({
    x: center.x + (point.x - center.x) * scale,
    y: center.y + (point.y - center.y) * scale
  }));
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const pi = polygon[i];
    const pj = polygon[j];
    const intersects =
      pi.y > point.y !== pj.y > point.y &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y || 1) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function centrality(point) {
  return clamp(1 - distance(point, { x: 58, y: 43 }) / 55, 0, 1);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function roadFrontage(point) {
  const roadDistance = Math.min(...state.roads.map((road) => distanceToPolyline(point, road.points)));
  return roadDistance < 3 ? 1 : clamp(1 - roadDistance / 13, 0, 1);
}

function distanceToPolyline(point, points) {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i += 1) {
    best = Math.min(best, distanceToSegment(point, points[i], points[i + 1]));
  }
  return best;
}

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return distance(point, a);
  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared, 0, 1);
  return distance(point, { x: a.x + dx * t, y: a.y + dy * t });
}

function worldToScreen(point, geo) {
  return {
    x: geo.offsetX + point.x * geo.scale,
    y: geo.offsetY + point.y * geo.scale
  };
}

function drawPolygon(points, geo) {
  ctx.beginPath();
  points.forEach((point, index) => {
    const screen = worldToScreen(point, geo);
    if (index === 0) ctx.moveTo(screen.x, screen.y);
    else ctx.lineTo(screen.x, screen.y);
  });
  ctx.closePath();
}

function drawPolyline(points, geo, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  points.forEach((point, index) => {
    const screen = worldToScreen(point, geo);
    if (index === 0) ctx.moveTo(screen.x, screen.y);
    else ctx.lineTo(screen.x, screen.y);
  });
  ctx.stroke();
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function rgbToHex({ r, g, b }) {
  const part = (value) => Math.round(value).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

function blend(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex({
    r: lerp(ca.r, cb.r, t),
    g: lerp(ca.g, cb.g, t),
    b: lerp(ca.b, cb.b, t)
  });
}

function gradient3(a, b, c, t) {
  if (t < 0.5) return blend(a, b, t * 2);
  return blend(b, c, (t - 0.5) * 2);
}

bindEvents();
resetSimulation();

window.cityDriftLab = {
  step: simulateYear,
  reset: resetSimulation,
  state
};
