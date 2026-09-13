"use strict";

/* ============================================================
   1. PARAMÈTRES DE SIMULATION — localStorage
   ============================================================ */

const SETTINGS_KEY = "battSim.settings.v2";
const DATA_KEY = "battSim.data.v1";

const DEFAULT_SETTINGS = {
  tarifJour: 0.2516,
  tarifNuit: 0.2068,
  hcStart: 22,
  hcEnd: 6,
  prixPanneaux: 1200,
  capaciteKwh: 5,
  prixBatterie: 4000,
  socMinPct: 10,
  socInitialPct: 50,
  rendementPct: 90,
  puissanceMaxKw: 3,
  dureeVieCycles: 6000,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn("Réglages illisibles, valeurs par défaut utilisées.", e);
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

let settings = loadSettings();

function fillSettingsForm() {
  document.getElementById("tarifJour").value = settings.tarifJour;
  document.getElementById("tarifNuit").value = settings.tarifNuit;
  document.getElementById("hcStart").value = settings.hcStart;
  document.getElementById("hcEnd").value = settings.hcEnd;
  document.getElementById("prixPanneaux").value = settings.prixPanneaux;
  document.getElementById("capaciteKwh").value = settings.capaciteKwh;
  document.getElementById("prixBatterie").value = settings.prixBatterie;
  document.getElementById("socMinPct").value = settings.socMinPct;
  document.getElementById("socInitialPct").value = settings.socInitialPct;
  document.getElementById("rendementPct").value = settings.rendementPct;
  document.getElementById("puissanceMaxKw").value = settings.puissanceMaxKw;
  document.getElementById("dureeVieCycles").value = settings.dureeVieCycles;
}

function readSettingsForm() {
  return {
    tarifJour: parseFloat(document.getElementById("tarifJour").value) || 0,
    tarifNuit: parseFloat(document.getElementById("tarifNuit").value) || 0,
    hcStart: clampInt(document.getElementById("hcStart").value, 0, 23, 22),
    hcEnd: clampInt(document.getElementById("hcEnd").value, 0, 23, 6),
    prixPanneaux: parseFloat(document.getElementById("prixPanneaux").value) || 0,
    capaciteKwh: parseFloat(document.getElementById("capaciteKwh").value) || 0.1,
    prixBatterie: parseFloat(document.getElementById("prixBatterie").value) || 0,
    socMinPct: clampInt(document.getElementById("socMinPct").value, 0, 90, 10),
    socInitialPct: clampInt(document.getElementById("socInitialPct").value, 0, 100, 50),
    rendementPct: clampInt(document.getElementById("rendementPct").value, 1, 100, 90),
    puissanceMaxKw: parseFloat(document.getElementById("puissanceMaxKw").value) || 0,
    dureeVieCycles: parseInt(document.getElementById("dureeVieCycles").value, 10) || 6000,
  };
}

function clampInt(val, min, max, fallback) {
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/* ============================================================
   2. DONNÉES HISTORISÉES — fusion et persistance
   ============================================================ */

// masterData : Map<tMs, {t, hour, prod, conso, retour, durH}>
let masterData = new Map();

function loadMasterData() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    masterData = new Map(arr.map((r) => [r.t, r]));
  } catch (e) {
    console.warn("Historique illisible, il sera reconstruit au prochain import.", e);
    masterData = new Map();
  }
}

function persistMasterData() {
  const arr = Array.from(masterData.values()).sort((a, b) => a.t - b.t);
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(arr));
    return { ok: true, count: arr.length };
  } catch (e) {
    console.warn("Impossible de sauvegarder l'historique complet (quota dépassé ?).", e);
    return { ok: false, count: arr.length };
  }
}

function clearMasterData() {
  masterData = new Map();
  localStorage.removeItem(DATA_KEY);
}

/* ============================================================
   3. NAVIGATION PAR ONGLETS
   ============================================================ */

function switchView(name) {
  document.querySelectorAll(".view").forEach((el) => el.classList.remove("active"));
  document.getElementById("view-" + name).classList.add("active");
  document.querySelectorAll("nav.tabbar button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === name);
  });
}

document.querySelectorAll("nav.tabbar button").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

/* ============================================================
   4. IMPORT CSV — automatique, sans étape de correspondance
   ============================================================ */

const fileStatusEl = document.getElementById("fileStatus");
const historyStatusEl = document.getElementById("historyStatus");

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Lecture impossible pour " + file.name));
    reader.readAsText(file, "UTF-8");
  });
}

/**
 * Parse le format réel des exports Shelly EM3 : une succession de blocs
 * ("Phase A", "Phase B", "Phase C", "Total", "Retour Phase A", ...), chacun
 * suivi d'une ligne d'en-tête "Temps, Wh" puis de lignes "date , valeur".
 * Retourne un objet { "Phase A": Map(dateStr -> valeur Wh), ... }.
 */
function parseShellyBlocks(text) {
  const sections = {};
  let current = null;
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const commaIdx = line.indexOf(",");

    // Ligne sans virgule : titre de section (ex. "Phase A", "Retour Phase A")
    if (commaIdx === -1) {
      current = line;
      if (!sections[current]) sections[current] = new Map();
      continue;
    }

    // Ligne d'en-tête "Temps, Wh" à l'intérieur d'un bloc : on l'ignore
    if (/^temps/i.test(line)) continue;

    // Ligne de donnée "date , valeur"
    if (!current) continue;
    const datePart = line.slice(0, commaIdx).trim();
    const valPart = line.slice(commaIdx + 1).trim();
    const val = parseFloat(valPart.replace(",", "."));
    if (Number.isNaN(val)) continue;
    sections[current].set(datePart, val);
  }

  return sections;
}

function findSection(sections, exactNames) {
  const keys = Object.keys(sections);
  for (const name of exactNames) {
    const match = keys.find((k) => k.trim().toLowerCase() === name.toLowerCase());
    if (match) return sections[match];
  }
  return null;
}

/**
 * Construit les points normalisés {t, hour, prod, conso, retour, durH} en kWh
 * à partir des blocs "Phase A" (conso réseau), "Phase B" (production PV) et
 * "Retour Phase A" (surplus exporté, stocké en valeurs négatives dans le fichier).
 */
function buildPointsFromSections(sections) {
  const consoSection = findSection(sections, ["Phase A"]);
  const prodSection = findSection(sections, ["Phase B"]);
  const retourSection = findSection(sections, ["Retour Phase A"]);

  if (!consoSection && !prodSection) return null; // format non reconnu

  const dateKeys = new Set([
    ...(consoSection ? consoSection.keys() : []),
    ...(prodSection ? prodSection.keys() : []),
  ]);

  const dated = [];
  for (const dateStr of dateKeys) {
    const date = parseTimestamp(dateStr);
    if (!date) continue;
    const consoWh = consoSection ? (consoSection.get(dateStr) || 0) : 0;
    const prodWh = prodSection ? (prodSection.get(dateStr) || 0) : 0;
    const retourRawWh = retourSection ? (retourSection.get(dateStr) || 0) : 0;
    dated.push({
      tMs: date.getTime(),
      hour: date.getHours(),
      consoWh,
      prodWh,
      retourWh: Math.max(0, -retourRawWh), // le fichier stocke l'export en négatif
    });
  }
  dated.sort((a, b) => a.tMs - b.tMs);
  if (dated.length === 0) return null;

  let intervalHours = 1;
  if (dated.length > 1) {
    const diffs = [];
    for (let i = 1; i < Math.min(dated.length, 200); i++) {
      diffs.push((dated[i].tMs - dated[i - 1].tMs) / 3600000);
    }
    diffs.sort((a, b) => a - b);
    const median = diffs[Math.floor(diffs.length / 2)];
    if (median > 0 && Number.isFinite(median)) intervalHours = median;
  }

  return dated.map((d) => ({
    t: d.tMs,
    hour: d.hour,
    prod: d.prodWh / 1000,
    conso: d.consoWh / 1000,
    retour: d.retourWh / 1000,
    durH: intervalHours,
  }));
}

async function handleSelectedFiles(fileList) {
  const files = Array.from(fileList).filter((f) => /\.csv$/i.test(f.name));
  if (files.length === 0) {
    fileStatusEl.textContent = "Aucun fichier .csv trouvé dans la sélection.";
    fileStatusEl.className = "file-status err";
    return;
  }
  await importFiles(files);
}

async function importFiles(files) {
  fileStatusEl.textContent = "Import de " + files.length + " fichier(s) en cours…";
  fileStatusEl.className = "file-status";

  let addedRows = 0;
  let skippedFiles = 0;
  let anyRetourFound = false;

  for (const file of files) {
    try {
      const text = await readFileAsText(file);
      const sections = parseShellyBlocks(text);
      const points = buildPointsFromSections(sections);
      if (!points) {
        console.warn("Format non reconnu dans " + file.name, Object.keys(sections));
        skippedFiles++;
        continue;
      }
      if (findSection(sections, ["Retour Phase A"])) anyRetourFound = true;

      for (const row of points) {
        masterData.set(row.t, row); // une nouvelle importation remplace une éventuelle ligne existante au même horodatage
      }
      addedRows += points.length;
    } catch (err) {
      console.warn("Fichier ignoré (" + file.name + ") :", err);
      skippedFiles++;
    }
  }

  const persistResult = persistMasterData();

  let msg = addedRows + " lignes traitées depuis " + files.length + " fichier(s)";
  if (skippedFiles) msg += " (" + skippedFiles + " fichier(s) ignoré(s) — format non reconnu)";
  if (addedRows > 0 && !anyRetourFound) {
    msg += ". Bloc « Retour Phase A » introuvable : le surplus exporté est compté comme nul.";
  }
  fileStatusEl.textContent = msg;
  fileStatusEl.className = skippedFiles && addedRows === 0 ? "file-status err" : "file-status ok";

  if (!persistResult.ok) {
    fileStatusEl.textContent +=
      " Attention : l'historique complet (" + persistResult.count +
      " lignes) est trop volumineux pour être sauvegardé localement — seule cette session le conserve.";
  }

  updateHistoryStatus();
  runStoredSimulation();
}

function updateHistoryStatus() {
  const n = masterData.size;
  const text = n === 0
    ? "Aucune donnée en mémoire."
    : n.toLocaleString("fr-FR") + " points horaires en mémoire au total.";
  historyStatusEl.textContent = text;
  document.getElementById("dataSummaryText").textContent = text;
}

/* ============================================================
   5. NORMALISATION + MOTEUR DE SIMULATION
   ============================================================ */

function parseTimestamp(raw) {
  if (raw == null || raw === "") return null;
  const str = String(raw).trim();

  // Format JJ/MM/AAAA[ HH:mm[:ss]] des exports Shelly — testé EN PREMIER, car le
  // constructeur natif Date() interprète à tort "10/09/2026" comme MM/JJ/AAAA
  // (format américain) pour les jours ≤ 12, inversant silencieusement jour et mois.
  const m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})[ T]?(\d{1,2})?:?(\d{2})?:?(\d{2})?$/);
  if (m) {
    let [, dd, mm, yyyy, hh, min, ss] = m;
    if (yyyy.length === 2) yyyy = "20" + yyyy;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh || 0), Number(min || 0), Number(ss || 0));
    if (!Number.isNaN(d.getTime())) return d;
  }

  // Sinon, formats standards (ISO, RFC...) via le constructeur natif
  const d2 = new Date(str);
  if (!Number.isNaN(d2.getTime())) return d2;

  return null;
}

function isNightHour(hour, hcStart, hcEnd) {
  if (hcStart === hcEnd) return false;
  if (hcStart < hcEnd) return hour >= hcStart && hour < hcEnd;
  return hour >= hcStart || hour < hcEnd;
}

/**
 * Simule la batterie virtuelle sur l'ensemble des points historisés, triés par temps,
 * avec rendement aller-retour et limite de puissance de charge/décharge.
 */
function runSimulation(points, cfg) {
  if (points.length === 0) {
    throw new Error("Aucune donnée à simuler.");
  }

  const capaciteKwh = cfg.capaciteKwh;
  const socMinKwh = capaciteKwh * (cfg.socMinPct / 100);
  let soc = capaciteKwh * (cfg.socInitialPct / 100);
  const efficacite = cfg.rendementPct / 100;
  const puissanceMaxKw = cfg.puissanceMaxKw > 0 ? cfg.puissanceMaxKw : Infinity;

  const series = [];

  // Synthèse "panneaux seuls" (indépendante de la batterie)
  let totalProduction = 0;
  let totalConsoGrid = 0; // Phase A — import réseau déjà mesuré
  let totalRetourBrut = 0; // surplus exporté / non autoconsommé
  let totalGainPanneaux = 0;
  let totalPerteEuros = 0;

  // Simulation batterie
  let totalStocke = 0;
  let totalCouvertParBatterie = 0;
  let totalEconomieBatterie = 0;

  for (const p of points) {
    totalProduction += p.prod;
    totalConsoGrid += p.conso;
    totalRetourBrut += p.retour;

    const tarif = isNightHour(p.hour, cfg.hcStart, cfg.hcEnd) ? cfg.tarifNuit : cfg.tarifJour;

    // Autoconsommation directe de cette ligne (avant toute batterie)
    const autoconsoDirecteLigne = Math.max(0, p.prod - p.retour);
    totalGainPanneaux += autoconsoDirecteLigne * tarif;
    totalPerteEuros += p.retour * tarif;

    // --- Charge de la batterie, limitée par la puissance max et le rendement ---
    const maxEnergieParIntervalle = puissanceMaxKw * p.durH;
    const energiePreleveeSurplus = Math.min(p.retour, maxEnergieParIntervalle);
    const placeDisponible = Math.max(0, capaciteKwh - soc);
    const stocke = Math.min(energiePreleveeSurplus * efficacite, placeDisponible);
    soc += stocke;
    totalStocke += stocke;

    // --- Décharge pour couvrir la consommation réseau ---
    const maxDechargeParIntervalle = puissanceMaxKw * p.durH;
    const disponible = Math.max(0, soc - socMinKwh);
    const dechargeable = Math.min(p.conso, disponible, maxDechargeParIntervalle);
    soc -= dechargeable;
    totalCouvertParBatterie += dechargeable;
    totalEconomieBatterie += dechargeable * tarif;

    series.push({
      t: new Date(p.t),
      prod: p.prod,
      consoTotale: p.conso + Math.max(0, p.prod - p.retour),
      socPct: capaciteKwh > 0 ? (soc / capaciteKwh) * 100 : 0,
    });
  }

  const spanMs = points[points.length - 1].t - points[0].t;
  const nbJours = Math.max(spanMs / 86400000, 1);
  const facteurAnnuel = 365 / nbJours;

  // Synthèse panneaux seuls
  const consommationTotale = totalConsoGrid + Math.max(0, totalProduction - totalRetourBrut);
  const autoconsoDirecteKwh = Math.max(0, totalProduction - totalRetourBrut);
  const autoconsoPctSansBatterie = totalProduction > 0 ? (autoconsoDirecteKwh / totalProduction) * 100 : 0;
  const gainPanneauxAnnuel = totalGainPanneaux * facteurAnnuel;
  const rentabilitePanneauxAnnees = gainPanneauxAnnuel > 0 ? cfg.prixPanneaux / gainPanneauxAnnuel : null;

  // Synthèse batterie
  const autoconsoAvecBatterieKwh = Math.min(totalProduction, autoconsoDirecteKwh + totalCouvertParBatterie);
  const autoconsoPctAvecBatterie = totalProduction > 0 ? (autoconsoAvecBatterieKwh / totalProduction) * 100 : 0;
  const nbCyclesPeriode = capaciteKwh > 0 ? totalStocke / capaciteKwh : 0;
  const nbCyclesParAn = nbCyclesPeriode * facteurAnnuel;
  const dureeVieAnnees = nbCyclesParAn > 0 ? cfg.dureeVieCycles / nbCyclesParAn : null;
  const economieBatterieAnnuelle = totalEconomieBatterie * facteurAnnuel;
  const rentabiliteBatterieAnnees = economieBatterieAnnuelle > 0 ? cfg.prixBatterie / economieBatterieAnnuelle : null;

  return {
    series,
    periodStart: new Date(points[0].t),
    periodEnd: new Date(points[points.length - 1].t),
    kpis: {
      totalProduction,
      consommationTotale,
      autoconsoDirecteKwh,
      autoconsoPctSansBatterie,
      totalGainPanneaux,
      rentabilitePanneauxAnnees,
      totalRetourBrut,
      totalPerteEuros,
      totalStocke,
      nbCyclesPeriode,
      totalCouvertParBatterie,
      totalEconomieBatterie,
      autoconsoPctAvecBatterie,
      dureeVieAnnees,
      rentabiliteBatterieAnnees,
      nbJours,
    },
  };
}

function runStoredSimulation() {
  if (masterData.size === 0) return;
  const points = Array.from(masterData.values()).sort((a, b) => a.t - b.t);
  try {
    const result = runSimulation(points, settings);
    renderResults(result);
  } catch (err) {
    console.error(err);
  }
}

/* ============================================================
   6b. VUE JOURNALIÈRE — navigation < / > entre les jours
   ============================================================ */

let dailySeries = [];   // série complète de la dernière simulation
let dayKeys = [];       // clés "YYYY-MM-DD" triées, une par jour disponible
let currentDayIndex = -1;
let dailyChartInstance = null;

function dayKeyOf(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

function initDailyView(series) {
  dailySeries = series;
  const seen = new Set();
  dayKeys = [];
  for (const p of series) {
    const key = dayKeyOf(p.t);
    if (!seen.has(key)) { seen.add(key); dayKeys.push(key); }
  }
  dayKeys.sort();
  currentDayIndex = dayKeys.length - 1; // le jour le plus récent par défaut
  renderDailyView();
}

function renderDailyView() {
  if (dayKeys.length === 0) return;
  const key = dayKeys[currentDayIndex];
  const points = dailySeries.filter((p) => dayKeyOf(p.t) === key);

  const [y, m, d] = key.split("-");
  document.getElementById("dayLabel").textContent = d + "/" + m + "/" + y;
  document.getElementById("dayPrevBtn").disabled = currentDayIndex <= 0;
  document.getElementById("dayNextBtn").disabled = currentDayIndex >= dayKeys.length - 1;

  const labels = points.map((p) => String(p.t.getHours()).padStart(2, "0") + "h");

  const ctx = document.getElementById("dailyChart").getContext("2d");
  if (dailyChartInstance) dailyChartInstance.destroy();

  dailyChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Consommation totale (kWh)", data: points.map((p) => p.consoTotale), borderColor: "#7c93c9", backgroundColor: "#7c93c933", borderWidth: 1.5, pointRadius: 0, tension: 0.25, yAxisID: "yEnergy" },
        { label: "Production PV (kWh)", data: points.map((p) => p.prod), borderColor: "#f0a94e", backgroundColor: "#f0a94e33", borderWidth: 1.5, pointRadius: 0, tension: 0.25, yAxisID: "yEnergy" },
        { label: "Batterie (%)", data: points.map((p) => p.socPct), borderColor: "#4fc9a0", borderWidth: 2, pointRadius: 0, tension: 0.25, yAxisID: "ySoc" },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#93a1b0", maxTicksLimit: 8, font: { size: 10 } }, grid: { color: "#2a333f" } },
        yEnergy: { position: "left", title: { display: true, text: "kWh", color: "#93a1b0" }, ticks: { color: "#93a1b0" }, grid: { color: "#2a333f" } },
        ySoc: { position: "right", min: 0, max: 100, title: { display: true, text: "SOC %", color: "#93a1b0" }, ticks: { color: "#93a1b0" }, grid: { display: false } },
      },
    },
  });
}

document.getElementById("dayPrevBtn").addEventListener("click", () => {
  if (currentDayIndex > 0) { currentDayIndex--; renderDailyView(); }
});
document.getElementById("dayNextBtn").addEventListener("click", () => {
  if (currentDayIndex < dayKeys.length - 1) { currentDayIndex++; renderDailyView(); }
});

/* ============================================================
   6. RENDU DES RÉSULTATS (KPIs + graphique)
   ============================================================ */

let chartInstance = null;

function fmtKwh(v) { return v.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " kWh"; }
function fmtEuro(v) { return v.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " €"; }
function fmtPct(v) { return v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " %"; }
function fmtAnnees(v) {
  if (v == null) return "N/A";
  if (v > 99) return "> 99 ans";
  return v.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " ans";
}

function renderResults(result) {
  document.getElementById("resultsEmpty").style.display = "none";
  document.getElementById("results").style.display = "block";

  const k = result.kpis;

  document.getElementById("periodLabel").textContent =
    result.periodStart.toLocaleDateString("fr-FR") + " → " + result.periodEnd.toLocaleDateString("fr-FR");

  // Synthèse globale
  document.getElementById("kpiProdTotale").textContent = fmtKwh(k.totalProduction);
  document.getElementById("kpiConsoTotale").textContent = fmtKwh(k.consommationTotale);
  document.getElementById("kpiAutoconsoQty").textContent = fmtKwh(k.autoconsoDirecteKwh);
  document.getElementById("kpiAutoconsoPctSansBatt").textContent = fmtPct(k.autoconsoPctSansBatterie);
  document.getElementById("kpiGainPanneaux").textContent = fmtEuro(k.totalGainPanneaux);
  document.getElementById("kpiRentabilitePanneaux").textContent = fmtAnnees(k.rentabilitePanneauxAnnees);
  document.getElementById("kpiRentabilitePanneauxNote").textContent =
    "Pour " + settings.prixPanneaux.toLocaleString("fr-FR") + " € d'installation, extrapolation annuelle";
  document.getElementById("kpiExportTotale").textContent = fmtKwh(k.totalRetourBrut);
  document.getElementById("kpiPerteEuros").textContent = fmtEuro(k.totalPerteEuros);

  // Simulateur de batterie
  document.getElementById("kpiQtyStockee").textContent = fmtKwh(k.totalStocke);
  document.getElementById("kpiNbCycles").textContent =
    k.nbCyclesPeriode.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  document.getElementById("kpiQtyUtiliseeBatt").textContent = fmtKwh(k.totalCouvertParBatterie);
  document.getElementById("kpiEconomieBatt").textContent = fmtEuro(k.totalEconomieBatterie);
  document.getElementById("kpiAutoconsoPctAvecBatt").textContent = fmtPct(k.autoconsoPctAvecBatterie);
  document.getElementById("kpiDureeVie").textContent = fmtAnnees(k.dureeVieAnnees);
  document.getElementById("kpiRentabiliteBatt").textContent = fmtAnnees(k.rentabiliteBatterieAnnees);

  renderChart(result.series);
  initDailyView(result.series);
}

function downsample(series, maxPoints) {
  if (series.length <= maxPoints) return series;
  const bucketSize = Math.ceil(series.length / maxPoints);
  const out = [];
  for (let i = 0; i < series.length; i += bucketSize) {
    const bucket = series.slice(i, i + bucketSize);
    const n = bucket.length;
    out.push({
      t: bucket[Math.floor(n / 2)].t,
      prod: bucket.reduce((s, p) => s + p.prod, 0),
      socPct: bucket.reduce((s, p) => s + p.socPct, 0) / n,
    });
  }
  return out;
}

function renderChart(series) {
  const points = downsample(series, 400);
  const labels = points.map((p) =>
    p.t.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
  );

  const ctx = document.getElementById("mainChart").getContext("2d");
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Production PV (kWh)", data: points.map((p) => p.prod), borderColor: "#f0a94e", backgroundColor: "#f0a94e33", borderWidth: 1.5, pointRadius: 0, tension: 0.25, yAxisID: "yEnergy" },
        { label: "Batterie (%)", data: points.map((p) => p.socPct), borderColor: "#4fc9a0", borderWidth: 2, pointRadius: 0, tension: 0.25, yAxisID: "ySoc" },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#93a1b0", maxTicksLimit: 6, font: { size: 10 } }, grid: { color: "#2a333f" } },
        yEnergy: { position: "left", title: { display: true, text: "kWh", color: "#93a1b0" }, ticks: { color: "#93a1b0" }, grid: { color: "#2a333f" } },
        ySoc: { position: "right", min: 0, max: 100, title: { display: true, text: "SOC %", color: "#93a1b0" }, ticks: { color: "#93a1b0" }, grid: { display: false } },
      },
    },
  });
}

/* ============================================================
   7. ÉVÉNEMENTS
   ============================================================ */

document.getElementById("csvInput").addEventListener("change", (evt) => {
  if (evt.target.files.length) handleSelectedFiles(evt.target.files);
  evt.target.value = "";
});

document.getElementById("pickFilesBtn").addEventListener("click", () => {
  document.getElementById("csvInputFiles").click();
});
document.getElementById("csvInputFiles").addEventListener("change", (evt) => {
  if (evt.target.files.length) handleSelectedFiles(evt.target.files);
  evt.target.value = "";
});

document.getElementById("saveSettingsBtn").addEventListener("click", () => {
  settings = readSettingsForm();
  saveSettings(settings);
  const toast = document.getElementById("saveToast");
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1600);
  runStoredSimulation();
});

document.getElementById("resetSettingsBtn").addEventListener("click", () => {
  settings = { ...DEFAULT_SETTINGS };
  saveSettings(settings);
  fillSettingsForm();
  runStoredSimulation();
});

document.getElementById("clearDataBtn").addEventListener("click", () => {
  if (!confirm("Effacer tout l'historique importé ?")) return;
  clearMasterData();
  updateHistoryStatus();
  document.getElementById("results").style.display = "none";
  document.getElementById("resultsEmpty").style.display = "block";
  document.getElementById("periodLabel").textContent = "Aucune donnée";
  fileStatusEl.textContent = "Aucune donnée importée pour le moment.";
  fileStatusEl.className = "file-status";
});

/* ============================================================
   8. INITIALISATION
   ============================================================ */

fillSettingsForm();
loadMasterData();
updateHistoryStatus();

if (masterData.size > 0) {
  runStoredSimulation();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.warn("Échec d'enregistrement du service worker :", err);
    });
  });
}
