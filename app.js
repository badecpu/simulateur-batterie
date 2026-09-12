"use strict";

/* ============================================================
   1. PARAMÈTRES DE SIMULATION — localStorage
   ============================================================ */

const SETTINGS_KEY = "battSim.settings.v1";
const COLMAP_KEY = "battSim.colmap.v1";
const DATA_KEY = "battSim.data.v1";

const DEFAULT_SETTINGS = {
  tarifJour: 0.2516,
  tarifNuit: 0.2068,
  hcStart: 22,
  hcEnd: 6,
  capaciteKwh: 5,
  prixBatterie: 4000,
  socMinPct: 10,
  socInitialPct: 50,
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
  document.getElementById("capaciteKwh").value = settings.capaciteKwh;
  document.getElementById("prixBatterie").value = settings.prixBatterie;
  document.getElementById("socMinPct").value = settings.socMinPct;
  document.getElementById("socInitialPct").value = settings.socInitialPct;
}

function readSettingsForm() {
  return {
    tarifJour: parseFloat(document.getElementById("tarifJour").value) || 0,
    tarifNuit: parseFloat(document.getElementById("tarifNuit").value) || 0,
    hcStart: clampInt(document.getElementById("hcStart").value, 0, 23, 22),
    hcEnd: clampInt(document.getElementById("hcEnd").value, 0, 23, 6),
    capaciteKwh: parseFloat(document.getElementById("capaciteKwh").value) || 0.1,
    prixBatterie: parseFloat(document.getElementById("prixBatterie").value) || 0,
    socMinPct: clampInt(document.getElementById("socMinPct").value, 0, 90, 10),
    socInitialPct: clampInt(document.getElementById("socInitialPct").value, 0, 100, 50),
  };
}

function clampInt(val, min, max, fallback) {
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/* ============================================================
   2. CORRESPONDANCE DES COLONNES — persistée, définie une fois
   ============================================================ */

function loadColMap() {
  try {
    const raw = localStorage.getItem(COLMAP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveColMap(map) {
  localStorage.setItem(COLMAP_KEY, JSON.stringify(map));
}

function clearColMap() {
  localStorage.removeItem(COLMAP_KEY);
}

let colMap = loadColMap(); // {time, conso, prod, retour, unit}

/* ============================================================
   3. DONNÉES HISTORISÉES — fusion et persistance
   ============================================================ */

// masterData : Map<tMs, {t, prod, conso, retour}> — clé = horodatage en ms
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
   4. NAVIGATION PAR ONGLETS
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
   5. IMPORT CSV — un ou plusieurs fichiers / un dossier entier
   ============================================================ */

const fileStatusEl = document.getElementById("fileStatus");
const historyStatusEl = document.getElementById("historyStatus");
const mappingCard = document.getElementById("mappingCard");
const mappingSummaryCard = document.getElementById("mappingSummaryCard");

let pendingFiles = null; // fichiers en attente de mapping (première importation)

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

async function handleSelectedFiles(fileList) {
  const files = Array.from(fileList).filter((f) => /\.csv$/i.test(f.name));
  if (files.length === 0) {
    fileStatusEl.textContent = "Aucun fichier .csv trouvé dans la sélection.";
    fileStatusEl.className = "file-status err";
    return;
  }

  if (!colMap) {
    // Première importation : on lit le premier fichier pour proposer le mapping,
    // puis on mémorise tous les fichiers pour les traiter une fois le mapping validé.
    fileStatusEl.textContent = "Lecture de " + files[0].name + " pour détecter les colonnes…";
    fileStatusEl.className = "file-status";
    try {
      const text = await readFileAsText(files[0]);
      const result = await parseCsv(text);
      if (!result.meta.fields || !result.meta.fields.length) {
        throw new Error("En-têtes introuvables dans " + files[0].name);
      }
      populateMapping(result.meta.fields);
      mappingCard.style.display = "block";
      pendingFiles = files;
      fileStatusEl.textContent =
        files.length + " fichier(s) sélectionné(s). Vérifie la correspondance des colonnes ci-dessous, puis clique sur « Importer et mémoriser ».";
      fileStatusEl.className = "file-status ok";
    } catch (err) {
      fileStatusEl.textContent = "Erreur : " + err.message;
      fileStatusEl.className = "file-status err";
    }
    return;
  }

  // Mapping déjà connu : on traite directement tous les fichiers.
  await importFiles(files, colMap);
}

async function importFiles(files, map) {
  fileStatusEl.textContent = "Import de " + files.length + " fichier(s) en cours…";
  fileStatusEl.className = "file-status";

  let addedRows = 0;
  let skippedFiles = 0;

  for (const file of files) {
    try {
      const text = await readFileAsText(file);
      const result = await parseCsv(text);
      if (!result.data || !result.data.length) { skippedFiles++; continue; }
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

  fileStatusEl.textContent =
    addedRows + " lignes traitées depuis " + files.length + " fichier(s)" +
    (skippedFiles ? " (" + skippedFiles + " fichier(s) ignoré(s))" : "") + ".";
  fileStatusEl.className = skippedFiles ? "file-status err" : "file-status ok";

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

/* --- Détection / sélection des colonnes (première importation) --- */

function populateMapping(headers) {
  const selects = {
    mapTime: document.getElementById("mapTime"),
    mapConso: document.getElementById("mapConso"),
    mapProd: document.getElementById("mapProd"),
    mapRetour: document.getElementById("mapRetour"),
  };

  Object.values(selects).forEach((sel) => {
    sel.innerHTML = "";
    headers.forEach((h) => {
      const opt = document.createElement("option");
      opt.value = h;
      opt.textContent = h;
      sel.appendChild(opt);
    });
  });

  // Détection par mots-clés sémantiques uniquement — jamais par lettre de phase
  // (la position A/B/C dépend du câblage propre à chaque installation).
  autoSelect(selects.mapTime, headers, ["time", "date", "horodatage", "timestamp"]);
  autoSelect(selects.mapProd, headers, ["solar", "pv", "prod", "panneau", "onduleur"], ["retour", "return"]);
  autoSelect(selects.mapConso, headers, ["conso", "linky", "import", "achat", "grid"], ["retour", "return", "export"]);
  autoSelect(selects.mapRetour, headers, ["retour", "return", "export", "surplus", "injec"]);
}

function autoSelect(selectEl, headers, includeKeywords, excludeKeywords) {
  const match = headers.find((h) => {
    const low = h.toLowerCase();
    const included = includeKeywords.some((k) => low.includes(k));
    const excluded = (excludeKeywords || []).some((k) => low.includes(k));
    return included && !excluded;
  });
  if (match) selectEl.value = match;
}

function showMappingSummary(map) {
  mappingCard.style.display = "none";
  mappingSummaryCard.style.display = "block";
  document.getElementById("mappingSummaryText").textContent =
    "Horodatage : " + map.time + " · Conso : " + map.conso +
    " · Prod : " + map.prod + " · Retour : " + map.retour + " · Unité : " + map.unit;
}

document.getElementById("editMappingBtn").addEventListener("click", () => {
  mappingSummaryCard.style.display = "none";
  mappingCard.style.display = "block";
  // Repropose les champs actuels comme valeurs par défaut si un fichier est ré-importé.
});

/* ============================================================
   6. NORMALISATION + MOTEUR DE SIMULATION
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
 * Convertit les lignes brutes d'un fichier en points normalisés {t, prod, conso, retour}
 * exprimés en kWh. La durée d'intervalle (pour l'unité "W") est déduite des horodatages
 * de CE fichier, car deux exports peuvent avoir des granularités différentes.
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
      retourRaw: toNumber(row[map.retour]),
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

  const toKwh = (val) => {
    if (map.unit === "kWh") return val;
    if (map.unit === "W") return (val * intervalHours) / 1000;
    return val / 1000; // Wh -> kWh
  };

  return dated.map((d) => ({
    t: d.tMs,
    hour: d.hour,
    prod: toKwh(d.prodRaw),
    conso: toKwh(d.consoRaw),
    retour: Math.max(0, toKwh(d.retourRaw)),
  }));
}

/**
 * Simule la batterie virtuelle sur l'ensemble des points historisés, triés par temps.
 */
function runSimulation(points, cfg) {
  if (points.length === 0) {
    throw new Error("Aucune donnée à simuler.");
  }

  const capaciteKwh = cfg.capaciteKwh;
  const socMinKwh = capaciteKwh * (cfg.socMinPct / 100);
  let soc = capaciteKwh * (cfg.socInitialPct / 100);

  const series = [];
  let totalProduction = 0;
  let totalRetourBrut = 0;
  let totalCouvertParBatterie = 0;
  let totalEconomie = 0;

  for (const p of points) {
    totalProduction += p.prod;
    totalRetourBrut += p.retour;

    const chargeable = Math.min(p.retour, Math.max(0, capaciteKwh - soc));
    soc += chargeable;

    const disponible = Math.max(0, soc - socMinKwh);
    const dechargeable = Math.min(Math.max(0, p.conso), disponible);
    soc -= dechargeable;

    totalCouvertParBatterie += dechargeable;

    const tarif = isNightHour(p.hour, cfg.hcStart, cfg.hcEnd) ? cfg.tarifNuit : cfg.tarifJour;
    totalEconomie += dechargeable * tarif;

    series.push({
      t: new Date(p.t),
      prod: p.prod,
      conso: p.conso,
      socPct: capaciteKwh > 0 ? (soc / capaciteKwh) * 100 : 0,
    });
  }

  const autoconsoDirecte = Math.max(0, totalProduction - totalRetourBrut);
  const autoconsoAvecBatterie = Math.min(totalProduction, autoconsoDirecte + totalCouvertParBatterie);
  const autoconsoPct = totalProduction > 0 ? (autoconsoAvecBatterie / totalProduction) * 100 : 0;

  const spanMs = points[points.length - 1].t - points[0].t;
  const nbJours = Math.max(spanMs / 86400000, 1);
  const economieAnnuelle = totalEconomie * (365 / nbJours);
  const amortissementAnnees = economieAnnuelle > 0 ? cfg.prixBatterie / economieAnnuelle : null;

  return {
    series,
    kpis: { totalProduction, autoconsoPct, totalEconomie, economieAnnuelle, amortissementAnnees, nbJours },
    periodStart: new Date(points[0].t),
    periodEnd: new Date(points[points.length - 1].t),
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
   7. RENDU DES RÉSULTATS (KPIs + graphique)
   ============================================================ */

let chartInstance = null;

function formatKwh(v) { return v.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " kWh"; }
function formatEuro(v) { return v.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " €"; }

function renderResults(result) {
  document.getElementById("resultsEmpty").style.display = "none";
  document.getElementById("results").style.display = "block";

  const { kpis, periodStart, periodEnd } = result;

  document.getElementById("periodLabel").textContent =
    periodStart.toLocaleDateString("fr-FR") + " → " + periodEnd.toLocaleDateString("fr-FR");

  document.getElementById("kpiProd").textContent = formatKwh(kpis.totalProduction);
  document.getElementById("kpiAutoconso").textContent =
    kpis.autoconsoPct.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " %";
  document.getElementById("kpiEconomie").innerHTML = formatEuro(kpis.totalEconomie) + " <small>sur la période</small>";

  const amortEl = document.getElementById("kpiAmortissement");
  if (kpis.amortissementAnnees == null) {
    amortEl.textContent = "N/A";
  } else if (kpis.amortissementAnnees > 99) {
    amortEl.textContent = "> 99 ans";
  } else {
    amortEl.textContent = kpis.amortissementAnnees.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " ans";
  }

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
      conso: bucket.reduce((s, p) => s + p.conso, 0),
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
        { label: "Production (kWh)", data: points.map((p) => p.prod), borderColor: "#f0a94e", backgroundColor: "#f0a94e33", borderWidth: 1.5, pointRadius: 0, tension: 0.25, yAxisID: "yEnergy" },
        { label: "Consommation réseau (kWh)", data: points.map((p) => p.conso), borderColor: "#7c93c9", backgroundColor: "#7c93c933", borderWidth: 1.5, pointRadius: 0, tension: 0.25, yAxisID: "yEnergy" },
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
   8. ÉVÉNEMENTS
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

document.getElementById("runSimBtn").addEventListener("click", async () => {
  const map = {
    time: document.getElementById("mapTime").value,
    conso: document.getElementById("mapConso").value,
    prod: document.getElementById("mapProd").value,
    retour: document.getElementById("mapRetour").value,
    unit: document.getElementById("mapUnit").value,
  };
  colMap = map;
  saveColMap(map);
  showMappingSummary(map);

  if (pendingFiles) {
    await importFiles(pendingFiles, map);
    pendingFiles = null;
  } else {
    runStoredSimulation();
  }
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
  if (!confirm("Effacer tout l'historique importé et la correspondance des colonnes ?")) return;
  clearMasterData();
  clearColMap();
  colMap = null;
  pendingFiles = null;
  updateHistoryStatus();
  mappingSummaryCard.style.display = "none";
  mappingCard.style.display = "none";
  document.getElementById("results").style.display = "none";
  document.getElementById("resultsEmpty").style.display = "block";
  document.getElementById("periodLabel").textContent = "Aucune donnée";
  fileStatusEl.textContent = "Aucune donnée importée pour le moment.";
  fileStatusEl.className = "file-status";
});

/* ============================================================
   9. INITIALISATION
   ============================================================ */

fillSettingsForm();
loadMasterData();
updateHistoryStatus();

if (colMap) {
  showMappingSummary(colMap);
}

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
