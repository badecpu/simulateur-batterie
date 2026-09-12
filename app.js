"use strict";

/* ============================================================
   1. PARAMÈTRES DE SIMULATION — localStorage
   ============================================================ */

const SETTINGS_KEY = "battSim.settings.v2";
const DATA_KEY = "battSim.data.v1";
const ASSUMED_UNIT = "Wh"; // export historique Shelly EM3 : énergie en Wh par ligne

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

function parseCsv(text) {
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve(result),
      error: (err) => reject(err),
    });
  });
}

/**
 * Détecte automatiquement les colonnes Horodatage / Consommation / Production / Retour
 * à partir des en-têtes, par mots-clés sémantiques uniquement (jamais par lettre de
 * phase, car le câblage A/B/C varie d'une installation à l'autre).
 */
function detectColumns(headers) {
  const find = (include, exclude) =>
    headers.find((h) => {
      const low = h.toLowerCase();
      const included = include.some((k) => low.includes(k));
      const excluded = (exclude || []).some((k) => low.includes(k));
      return included && !excluded;
    });

  const time = find(["time", "date", "horodatage", "timestamp"]);
  const prod = find(["solar", "pv", "prod", "panneau", "onduleur"], ["retour", "return"]);
  const conso = find(["conso", "linky", "import", "achat", "grid"], ["retour", "return", "export"]);
  const retour = find(["retour", "return", "export", "surplus", "injec"]);

  return { time, conso, prod, retour };
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
  let lastDetected = null;

  for (const file of files) {
    try {
      const text = await readFileAsText(file);
      const result = await parseCsv(text);
      if (!result.data || !result.data.length || !result.meta.fields) { skippedFiles++; continue; }

      const map = detectColumns(result.meta.fields);
      if (!map.time || !map.conso || !map.prod) {
        console.warn("Colonnes non détectées dans " + file.name, result.meta.fields);
        skippedFiles++;
        continue;
      }
      lastDetected = map;

      const normalized = normalizeRows(result.data, map);
      for (const row of normalized) {
        masterData.set(row.t, row); // une nouvelle importation remplace une éventuelle ligne existante au même horodatage
      }
      addedRows += normalized.length;
    } catch (err) {
      console.warn("Fichier ignoré (" + file.name + ") :", err);
      skippedFiles++;
    }
  }

  const persistResult = persistMasterData();

  let msg = addedRows + " lignes traitées depuis " + files.length + " fichier(s)";
  if (skippedFiles) msg += " (" + skippedFiles + " fichier(s) ignoré(s) — colonnes non reconnues)";
  if (lastDetected) {
    msg += ". Colonnes détectées — Conso : " + lastDetected.conso +
      " · Prod : " + lastDetected.prod +
      (lastDetected.retour ? " · Retour : " + lastDetected.retour : " · Retour : non trouvée (surplus supposé nul)");
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
  let d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d;

  const m = String(raw).match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})[ T]?(\d{1,2})?:?(\d{2})?:?(\d{2})?/
  );
  if (m) {
    let [, dd, mm, yyyy, hh, min, ss] = m;
    if (yyyy.length === 2) yyyy = "20" + yyyy;
    d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh || 0), Number(min || 0), Number(ss || 0));
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function toNumber(raw) {
  if (raw == null || raw === "") return 0;
  const n = parseFloat(String(raw).replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

function isNightHour(hour, hcStart, hcEnd) {
  if (hcStart === hcEnd) return false;
  if (hcStart < hcEnd) return hour >= hcStart && hour < hcEnd;
  return hour >= hcStart || hour < hcEnd;
}

/**
 * Convertit les lignes brutes d'un fichier en points normalisés {t, hour, prod, conso, retour, durH}
 * exprimés en kWh. L'unité des colonnes source est supposée être des Wh par ligne
 * (format standard des exports historiques Shelly). La durée d'intervalle (durH) est
 * déduite des horodatages de CE fichier et conservée pour la simulation (limite de puissance).
 */
function normalizeRows(rawRows, map) {
  const dated = [];
  for (const row of rawRows) {
    const date = parseTimestamp(row[map.time]);
    if (!date) continue;
    dated.push({
      tMs: date.getTime(),
      hour: date.getHours(),
      prodRaw: toNumber(row[map.prod]),
      consoRaw: toNumber(row[map.conso]),
      retourRaw: map.retour ? toNumber(row[map.retour]) : 0,
    });
  }
  dated.sort((a, b) => a.tMs - b.tMs);
  if (dated.length === 0) return [];

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

  const toKwh = (val) => (ASSUMED_UNIT === "kWh" ? val : val / 1000);

  return dated.map((d) => ({
    t: d.tMs,
    hour: d.hour,
    prod: toKwh(d.prodRaw),
    conso: toKwh(d.consoRaw),
    retour: Math.max(0, toKwh(d.retourRaw)),
    durH: intervalHours,
  }));
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
