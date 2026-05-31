"use strict";

const fs = require("node:fs");
const vm = require("node:vm");

class FakeContext {
  setTransform() {}
  clearRect() {}
  fillRect() {}
  strokeRect() {}
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  fill() {}
  stroke() {}
  save() {}
  restore() {}
  fillText() {}
  measureText(text) {
    return { width: String(text).length * 6 };
  }
}

class FakeElement {
  constructor(id, options = {}) {
    this.id = id;
    this.value = options.value || "";
    this.textContent = "";
    this.innerHTML = "";
    this.dataset = options.dataset || {};
    this.children = [];
    this.clientWidth = options.width || 320;
    this.clientHeight = options.height || 180;
    this.width = this.clientWidth;
    this.height = this.clientHeight;
    this.parentElement = null;
    this.classList = {
      toggle() {}
    };
  }

  addEventListener() {}
  setPointerCapture() {}
  releasePointerCapture() {}
  hasPointerCapture() {
    return false;
  }
  append(child) {
    this.children.push(child);
  }
  closest() {
    return null;
  }
  querySelector(selector) {
    if (selector === "output") return this.outputElement || null;
    return null;
  }
  querySelectorAll(selector) {
    if (selector === "button") return this.buttons || [];
    return [];
  }
  getContext() {
    return new FakeContext();
  }
  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      width: this.clientWidth,
      height: this.clientHeight
    };
  }
}

function makeRange(id, value) {
  const range = new FakeElement(id, { value: String(value) });
  const parent = new FakeElement(`${id}Parent`);
  parent.outputElement = new FakeElement(`${id}Output`);
  range.parentElement = parent;
  return range;
}

function makeButton(dataset) {
  return new FakeElement("button", { dataset });
}

const elements = {};
const ids = [
  "playPause",
  "stepYear",
  "resetCity",
  "speedSelect",
  "layerButtons",
  "toolButtons",
  "brushSize",
  "brushOutput",
  "housingPolicy",
  "transitPolicy",
  "industryPolicy",
  "greenPolicy",
  "chartMetric",
  "yearLabel",
  "popLabel",
  "budgetLabel",
  "pressureLabel",
  "metricPopulation",
  "metricJobs",
  "metricValue",
  "metricSatisfaction",
  "metricTraffic",
  "metricVacant",
  "districtList",
  "cityLog",
  "legend",
  "hoverReadout",
  "zoomIn",
  "zoomOut"
];

for (const id of ids) elements[id] = new FakeElement(id);
elements.mapCanvas = new FakeElement("mapCanvas", { width: 1040, height: 720 });
elements.chartCanvas = new FakeElement("chartCanvas", { width: 300, height: 142 });
elements.speedSelect.value = "700";
elements.chartMetric.value = "population";
elements.brushSize = makeRange("brushSize", 1);
elements.housingPolicy = makeRange("housingPolicy", 1);
elements.transitPolicy = makeRange("transitPolicy", 4);
elements.industryPolicy = makeRange("industryPolicy", 0);
elements.greenPolicy = makeRange("greenPolicy", 5);
elements.layerButtons.buttons = ["land", "population", "value", "traffic", "satisfaction"].map((layer) =>
  makeButton({ layer })
);
elements.toolButtons.buttons = [
  "road",
  "station",
  "park",
  "zoneResidential",
  "zoneCommercial",
  "zoneIndustrial",
  "clear",
  "inspect"
].map((tool) => makeButton({ tool }));

const context = {
  console,
  setInterval,
  clearInterval,
  Math,
  Number,
  String,
  Array,
  Object,
  Intl,
  window: {
    devicePixelRatio: 1,
    addEventListener() {}
  },
  document: {
    title: "",
    getElementById(id) {
      return elements[id];
    },
    createElement(id) {
      return new FakeElement(id);
    }
  }
};

context.window.window = context.window;
context.window.document = context.document;

const source = fs.readFileSync("app.js", "utf8");
vm.runInNewContext(source, context, { filename: "app.js" });

const sim = context.window.cityDriftLab;
sim.step();
sim.step();

const { state } = sim;
const result = {
  year: state.year,
  parcels: state.parcels.length,
  developed: state.metrics.developed,
  population: state.metrics.population,
  jobs: state.metrics.jobs,
  budget: state.budget,
  history: state.history.length,
  logs: state.logs.length
};

if (result.year !== 2028) throw new Error(`Expected year 2028, got ${result.year}`);
if (result.parcels < 40) throw new Error(`Expected at least 40 parcels, got ${result.parcels}`);
if (result.developed <= 0) throw new Error("Expected developed parcels to be positive");
if (result.population <= 0) throw new Error("Expected population to be positive");
if (result.jobs <= 0) throw new Error("Expected jobs to be positive");
if (result.history < 3) throw new Error("Expected history entries after stepping");
if (result.logs < 1) throw new Error("Expected city logs");

console.log(JSON.stringify(result, null, 2));
