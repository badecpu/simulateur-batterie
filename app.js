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
  puissanceKwc: 2,
  capaciteKwh: 5,
  prixBatterie: 4000,
  socMinPct: 10,
  socInitialPct: 50,
  rendementPct: 90,
  puissanceMaxKw: 3,
  dureeVieCycles: 6000,
  poolActive: true,
  poolPowerKw: 0.75,
  poolStartHour: 10,
  poolEndHour: 16,
  poolMonthStart: 6,
  poolMonthEnd: 9,
  ballonVolumeL: 200,
  ballonPuissanceKw: 2.4,
  ballonTempInitiale: 50,
  ballonTempConsigne: 55,
  ballonTempLimite: 65,
  ballonTempFroide: 13,
  ballonPertesDegresJour: 1.5,
  ballonBesoinKwhJour: 4,
  ballonTarifGazKwh: 0.10,
  ballonRendementChaudiere: 90,
  ballonPrix: 600,
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
  document.getElementById("puissanceKwc").value = settings.puissanceKwc;
  document.getElementById("capaciteKwh").value = settings.capaciteKwh;
  document.getElementById("prixBatterie").value = settings.prixBatterie;
  document.getElementById("socMinPct").value = settings.socMinPct;
  document.getElementById("socInitialPct").value = settings.socInitialPct;
  document.getElementById("rendementPct").value = settings.rendementPct;
  document.getElementById("puissanceMaxKw").value = settings.puissanceMaxKw;
  document.getElementById("dureeVieCycles").value = settings.dureeVieCycles;
  document.getElementById("poolActive").checked = settings.poolActive;
  document.getElementById("poolPowerKw").value = settings.poolPowerKw;
  document.getElementById("poolStartHour").value = settings.poolStartHour;
  document.getElementById("poolEndHour").value = settings.poolEndHour;
  document.getElementById("poolMonthStart").value = settings.poolMonthStart;
  document.getElementById("poolMonthEnd").value = settings.poolMonthEnd;
  document.getElementById("ballonVolumeL").value = settings.ballonVolumeL;
  document.getElementById("ballonPuissanceKw").value = settings.ballonPuissanceKw;
  document.getElementById("ballonTempInitiale").value = settings.ballonTempInitiale;
  document.getElementById("ballonTempConsigne").value = settings.ballonTempConsigne;
  document.getElementById("ballonTempLimite").value = settings.ballonTempLimite;
  document.getElementById("ballonTempFroide").value = settings.ballonTempFroide;
  document.getElementById("ballonPertesDegresJour").value = settings.ballonPertesDegresJour;
  document.getElementById("ballonBesoinKwhJour").value = settings.ballonBesoinKwhJour;
  document.getElementById("ballonTarifGazKwh").value = settings.ballonTarifGazKwh;
  document.getElementById("ballonRendementChaudiere").value = settings.ballonRendementChaudiere;
  document.getElementById("ballonPrix").value = settings.ballonPrix;
}

function readSettingsForm() {
  return {
    tarifJour: parseFloat(document.getElementById("tarifJour").value) || 0,
    tarifNuit: parseFloat(document.getElementById("tarifNuit").value) || 0,
    hcStart: clampInt(document.getElementById("hcStart").value, 0, 23, 22),
    hcEnd: clampInt(document.getElementById("hcEnd").value, 0, 23, 6),
    prixPanneaux: parseFloat(document.getElementById("prixPanneaux").value) || 0,
    puissanceKwc: parseFloat(document.getElementById("puissanceKwc").value) || 0.1,
    capaciteKwh: parseFloat(document.getElementById("capaciteKwh").value) || 0.1,
    prixBatterie: parseFloat(document.getElementById("prixBatterie").value) || 0,
    socMinPct: clampInt(document.getElementById("socMinPct").value, 0, 90, 10),
    socInitialPct: clampInt(document.getElementById("socInitialPct").value, 0, 100, 50),
    rendementPct: clampInt(document.getElementById("rendementPct").value, 1, 100, 90),
    puissanceMaxKw: parseFloat(document.getElementById("puissanceMaxKw").value) || 0,
    dureeVieCycles: parseInt(document.getElementById("dureeVieCycles").value, 10) || 6000,
    poolActive: document.getElementById("poolActive").checked,
    poolPowerKw: parseFloat(document.getElementById("poolPowerKw").value) || 0,
    poolStartHour: clampInt(document.getElementById("poolStartHour").value, 0, 23, 10),
    poolEndHour: clampInt(document.getElementById("poolEndHour").value, 0, 23, 16),
    poolMonthStart: clampInt(document.getElementById("poolMonthStart").value, 1, 12, 6),
    poolMonthEnd: clampInt(document.getElementById("poolMonthEnd").value, 1, 12, 9),
    ballonVolumeL: parseFloat(document.getElementById("ballonVolumeL").value) || 0,
    ballonPuissanceKw: parseFloat(document.getElementById("ballonPuissanceKw").value) || 0,
    ballonTempInitiale: parseFloat(document.getElementById("ballonTempInitiale").value) || 0,
    ballonTempConsigne: parseFloat(document.getElementById("ballonTempConsigne").value) || 0,
    ballonTempLimite: parseFloat(document.getElementById("ballonTempLimite").value) || 0,
    ballonTempFroide: parseFloat(document.getElementById("ballonTempFroide").value) || 0,
    ballonPertesDegresJour: parseFloat(document.getElementById("ballonPertesDegresJour").value) || 0,
    ballonBesoinKwhJour: parseFloat(document.getElementById("ballonBesoinKwhJour").value) || 0,
    ballonTarifGazKwh: parseFloat(document.getElementById("ballonTarifGazKwh").value) || 0,
    ballonRendementChaudiere: clampInt(document.getElementById("ballonRendementChaudiere").value, 1, 100, 90),
    ballonPrix: parseFloat(document.getElementById("ballonPrix").value) || 0,
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
   4b. SÉLECTEUR DE SCÉNARIO — Mon scénario (sans / batterie / ballon)
   ============================================================ */

const SCENARIO_KEY = "battSim.scenario.v1";

function loadScenarioChoice() {
  const v = localStorage.getItem(SCENARIO_KEY);
  return v === "batterie" || v === "ballon" || v === "sans" ? v : "sans";
}

function showScenarioBlock(choice) {
  document.getElementById("scenarioSansBlock").style.display = choice === "sans" ? "block" : "none";
  document.getElementById("scenarioBattBlock").style.display = choice === "batterie" ? "block" : "none";
  document.getElementById("scenarioBallonBlock").style.display = choice === "ballon" ? "block" : "none";
  document.querySelectorAll(".scenario-switch-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.scenario === choice);
  });
}

document.querySelectorAll(".scenario-switch-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    localStorage.setItem(SCENARIO_KEY, btn.dataset.scenario);
    showScenarioBlock(btn.dataset.scenario);
  });
});

showScenarioBlock(loadScenarioChoice());

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
  updateMissingDaysDisplay();
}

function fmtDateFr(d) {
  return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
}

/**
 * Repère les jours calendaires sans aucune donnée entre le premier et le
 * dernier import, et regroupe les jours consécutifs manquants en plages.
 */
function computeMissingDayRanges() {
  if (masterData.size === 0) return [];
  const times = Array.from(masterData.keys()).sort((a, b) => a - b);
  const presentDays = new Set(times.map((t) => dayKeyOf(new Date(t))));
  const first = new Date(times[0]);
  const last = new Date(times[times.length - 1]);
  const cursor = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  const end = new Date(last.getFullYear(), last.getMonth(), last.getDate());

  const missingDays = [];
  while (cursor <= end) {
    if (!presentDays.has(dayKeyOf(cursor))) missingDays.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const ranges = [];
  let rangeStart = null, prev = null;
  for (const d of missingDays) {
    if (rangeStart === null) { rangeStart = d; prev = d; continue; }
    const diffDays = Math.round((d - prev) / 86400000);
    if (diffDays === 1) { prev = d; continue; }
    ranges.push([rangeStart, prev]);
    rangeStart = d; prev = d;
  }
  if (rangeStart !== null) ranges.push([rangeStart, prev]);
  return ranges;
}

function updateMissingDaysDisplay() {
  const el = document.getElementById("missingDaysStatus");
  const ranges = computeMissingDayRanges();
  if (ranges.length === 0) {
    el.style.display = "none";
    el.textContent = "";
    return;
  }
  const parts = ranges.map(([a, b]) => (a.getTime() === b.getTime() ? fmtDateFr(a) : fmtDateFr(a) + " → " + fmtDateFr(b)));
  el.textContent = "Jours manquants : " + parts.join(", ");
  el.style.display = "block";
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
      conso: p.conso,
      retour: p.retour,
      stocke,
      dech: dechargeable,
      consoTotale: p.conso + Math.max(0, p.prod - p.retour),
      soc,
      socPct: capaciteKwh > 0 ? (soc / capaciteKwh) * 100 : 0,
    });
  }

  const uniqueDays = new Set(points.map((p) => dayKeyOf(new Date(p.t))));
  const nbJours = Math.max(uniqueDays.size, 1); // jours réellement couverts, pas l'écart calendaire (robuste aux jours manquants)
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
   5b. SCÉNARIO PARTAGÉ — batterie + ballon d'eau chaude (ECS)
   ============================================================ */

/**
 * Simule le scénario batterie seule sur l'historique importé (le projet est
 * soit une batterie, soit un ballon piloté — jamais les deux à la fois ;
 * voir simulateBallonThermal pour l'alternative ballon).
 */
function simulateScenario(points, cfg, opts) {
  const battery = !!opts.battery;

  const capaciteKwh = battery ? cfg.capaciteKwh : 0;
  const socMinKwh = capaciteKwh * (cfg.socMinPct / 100);
  let soc = capaciteKwh * (cfg.socInitialPct / 100);
  const efficacite = cfg.rendementPct / 100;
  const puissanceMaxKw = cfg.puissanceMaxKw > 0 ? cfg.puissanceMaxKw : Infinity;

  let totalProduction = 0, totalConsoGrid = 0, totalRetourBrut = 0;
  let totalGainPanneaux = 0, totalCouvertBatt = 0, totalEconomieBatt = 0;

  for (const p of points) {
    totalProduction += p.prod;
    totalConsoGrid += p.conso;
    totalRetourBrut += p.retour;

    const tarif = isNightHour(p.hour, cfg.hcStart, cfg.hcEnd) ? cfg.tarifNuit : cfg.tarifJour;
    const autoconsoDirecteLigne = Math.max(0, p.prod - p.retour);
    totalGainPanneaux += autoconsoDirecteLigne * tarif;

    const maxE = puissanceMaxKw * (p.durH || 1);
    const energiePrelevee = Math.min(p.retour, maxE);
    const place = Math.max(0, capaciteKwh - soc);
    const stocke = battery ? Math.min(energiePrelevee * efficacite, place) : 0;
    soc += stocke;

    const dispo = Math.max(0, soc - socMinKwh);
    const dechargeable = battery ? Math.min(p.conso, dispo, maxE) : 0;
    soc -= dechargeable;
    totalCouvertBatt += dechargeable;
    totalEconomieBatt += dechargeable * tarif;
  }

  const uniqueDays = new Set(points.map((p) => dayKeyOf(new Date(p.t))));
  const nbJours = Math.max(uniqueDays.size, 1);
  const facteurAnnuel = 365 / nbJours;

  return {
    totalProduction, totalConsoGrid, totalRetourBrut, nbJours,
    totalGainPanneaux, gainPanneauxAnnuel: totalGainPanneaux * facteurAnnuel,
    totalCouvertBatt, totalEconomieBatt, economieBattAnnuel: totalEconomieBatt * facteurAnnuel,
  };
}

/**
 * Modèle thermique du ballon d'eau chaude piloté par le surplus PV (alternative
 * à la batterie, jamais combinée avec elle). Suit la température heure par heure :
 * pertes thermiques, gros soutirage du soir (19h, grosses douches), puis charge
 * solaire plafonnée à la température limite.
 */
function simulateBallonThermal(points, cfg) {
  const kwhPerDegC = cfg.ballonVolumeL * 0.001163; // capacité thermique de l'eau : 1,163 Wh / (L·°C)
  let T = cfg.ballonTempInitiale;
  const lossPerHour = cfg.ballonPertesDegresJour / 24;

  // Répartition du besoin ECS quotidien : gros pic le soir (19h, l'équivalent de
  // plusieurs grosses douches), complété par un peu le matin et à midi.
  const drawShape = new Array(24).fill(0);
  drawShape[7] = 0.10;
  drawShape[12] = 0.15;
  drawShape[19] = 0.75;

  const series = [];
  let totalProduction = 0, totalRetourBrut = 0, totalGainPanneaux = 0, totalDiverti = 0;

  for (const p of points) {
    totalProduction += p.prod;
    totalRetourBrut += p.retour;
    const tarif = isNightHour(p.hour, cfg.hcStart, cfg.hcEnd) ? cfg.tarifNuit : cfg.tarifJour;
    totalGainPanneaux += Math.max(0, p.prod - p.retour) * tarif;

    // Pertes thermiques (vers la température ambiante/eau froide, simplifiée)
    T = Math.max(cfg.ballonTempFroide, T - lossPerHour);

    // Soutirage ECS de l'heure
    const drawKwh = drawShape[p.hour] * cfg.ballonBesoinKwhJour;
    if (drawKwh > 0 && kwhPerDegC > 0) {
      T = Math.max(cfg.ballonTempFroide, T - drawKwh / kwhPerDegC);
    }

    // Charge solaire, plafonnée par la puissance et la température limite.
    // La puissance (kW) doit être convertie en énergie pour CET intervalle
    // (kW × durée) AVANT d'être comparée au surplus disponible (déjà en kWh) —
    // sinon, sur un intervalle ≠ 1h, le résultat est faux.
    const energieDispo = Math.min(p.retour, cfg.ballonPuissanceKw * (p.durH || 1));
    let diverti = 0;
    if (energieDispo > 0 && kwhPerDegC > 0 && T < cfg.ballonTempLimite) {
      const placeKwh = (cfg.ballonTempLimite - T) * kwhPerDegC;
      diverti = Math.min(energieDispo, placeKwh);
      T += diverti / kwhPerDegC;
    }
    totalDiverti += diverti;

    series.push({ t: new Date(p.t), prod: p.prod, retour: p.retour, diverti, temp: T });
  }

  const uniqueDays = new Set(points.map((p) => dayKeyOf(new Date(p.t))));
  const nbJours = Math.max(uniqueDays.size, 1);
  const facteurAnnuel = 365 / nbJours;
  // Économie = coût du gaz qu'il aurait fallu brûler pour produire la même eau chaude,
  // compte tenu du rendement de la chaudière (moins performante qu'une résistance électrique).
  const rendementChaudiere = Math.max(0.01, cfg.ballonRendementChaudiere / 100);
  const totalEconomieBallon = (totalDiverti / rendementChaudiere) * cfg.ballonTarifGazKwh;
  const autoconsoDirecteKwh = Math.max(0, totalProduction - totalRetourBrut);
  const autoconsoPct = totalProduction > 0 ? Math.min(100, ((autoconsoDirecteKwh + totalDiverti) / totalProduction) * 100) : 0;

  return {
    series, nbJours, totalProduction,
    totalGainPanneaux, gainPanneauxAnnuel: totalGainPanneaux * facteurAnnuel,
    totalDiverti, totalEconomieBallon, economieBallonAnnuel: totalEconomieBallon * facteurAnnuel,
    autoconsoPct,
  };
}

/* ============================================================
   5c. SÉLECTION PARTAGÉE (semaine / jour) ET GRAPHIQUES HEBDOMADAIRES
   ============================================================ */

// Les graphiques sont liés entre eux : changer la semaine (ou le jour) sur l'un
// change aussi tous les autres.
//  - 3 graphiques hebdomadaires : Vue d'ensemble, Mon scénario → Batterie, Mon scénario → Ballon
//  - 2 graphiques journaliers   : Mon scénario → Batterie, Mon scénario → Ballon
let allDayKeys = [];          // tous les jours disponibles ("YYYY-MM-DD"), triés
let sharedWeekEndKey = null;  // dernier jour de la semaine affichée (fenêtre de 7 jours)
let sharedDayKey = null;      // jour affiché sur les graphiques journaliers

let battDayMap = new Map();   // jour -> {key, prod, autoDirecte, stocke, maxSoc}
let ballonDayMap = new Map(); // jour -> {key, prod, autoDirecte, diverti, maxTemp}

function fmtJourMois(key) {
  const [, m, d] = key.split("-");
  return d + "/" + m;
}

/**
 * Agrège la série horaire de la batterie par jour : production, autoconsommation
 * directe, énergie stockée et niveau maximal de la batterie (kWh).
 */
function computeBattDailyBilan(series) {
  const byDay = new Map();
  for (const p of series) {
    const key = dayKeyOf(p.t);
    if (!byDay.has(key)) byDay.set(key, { key, prod: 0, autoDirecte: 0, stocke: 0, maxSoc: 0 });
    const e = byDay.get(key);
    e.prod += p.prod;
    e.autoDirecte += Math.max(0, p.prod - p.retour);
    e.stocke += p.stocke;
    if (p.soc > e.maxSoc) e.maxSoc = p.soc;
  }
  return Array.from(byDay.values()).sort((a, b) => (a.key < b.key ? -1 : 1));
}

/**
 * Agrège la série horaire du ballon par jour : production, autoconsommation
 * directe, énergie déviée vers le ballon (kWh) et température maximale (°C).
 */
function computeBallonDailyBilan(series) {
  const byDay = new Map();
  for (const p of series) {
    const key = dayKeyOf(p.t);
    if (!byDay.has(key)) byDay.set(key, { key, prod: 0, autoDirecte: 0, diverti: 0, maxTemp: -Infinity });
    const e = byDay.get(key);
    e.prod += p.prod;
    e.autoDirecte += Math.max(0, p.prod - p.retour);
    e.diverti += p.diverti;
    if (p.temp > e.maxTemp) e.maxTemp = p.temp;
  }
  return Array.from(byDay.values()).sort((a, b) => (a.key < b.key ? -1 : 1));
}

/**
 * Met à jour la liste des jours disponibles. Conserve la semaine / le jour déjà
 * affichés s'ils existent encore ; s'ils étaient sur le tout dernier jour,
 * ils suivent le nouveau dernier jour (ex. après un nouvel import).
 */
function syncSharedSelection(keys) {
  const prevLast = allDayKeys.length ? allDayKeys[allDayKeys.length - 1] : null;
  allDayKeys = keys.slice().sort();
  const last = allDayKeys.length ? allDayKeys[allDayKeys.length - 1] : null;
  const follow = (cur) => (cur === null || cur === prevLast || !allDayKeys.includes(cur) ? last : cur);
  sharedWeekEndKey = follow(sharedWeekEndKey);
  sharedDayKey = follow(sharedDayKey);
}

/** Les 7 jours (ou moins) de la semaine affichée. */
function weekWindowKeys() {
  const end = allDayKeys.indexOf(sharedWeekEndKey);
  if (end < 0) return [];
  return allDayKeys.slice(Math.max(0, end - 6), end + 1);
}

/** Libellé de la semaine et état des flèches pour un graphique hebdomadaire (préfixe : "ov", "batt" ou "ballon"). */
function applyWeekNav(prefix, keys) {
  const end = allDayKeys.indexOf(sharedWeekEndKey);
  const start = Math.max(0, end - 6);
  const lastKey = keys[keys.length - 1];
  document.getElementById(prefix + "WeekLabel").textContent =
    fmtJourMois(keys[0]) + " → " + fmtJourMois(lastKey) + "/" + lastKey.slice(0, 4);
  document.getElementById(prefix + "WeekPrevBtn").disabled = start <= 0;
  document.getElementById(prefix + "WeekNextBtn").disabled = end >= allDayKeys.length - 1;
}

/** Décale la semaine de 7 jours, sans jamais descendre sous une fenêtre complète (si l'historique le permet). */
function shiftWeek(direction) {
  if (allDayKeys.length === 0) return;
  const end = allDayKeys.indexOf(sharedWeekEndKey);
  const minEnd = Math.min(6, allDayKeys.length - 1);
  const newEnd = direction < 0 ? Math.max(minEnd, end - 7) : Math.min(allDayKeys.length - 1, end + 7);
  sharedWeekEndKey = allDayKeys[newEnd];
  renderAllWeeklyViews();
}

/** Passe au jour précédent (-1) ou suivant (+1) sur les deux graphiques journaliers. */
function shiftDay(direction) {
  const j = allDayKeys.indexOf(sharedDayKey) + direction;
  if (j < 0 || j >= allDayKeys.length) return;
  sharedDayKey = allDayKeys[j];
  renderAllDailyViews();
}

function renderAllWeeklyViews() {
  renderOverviewWeeklyView();
  renderBattWeeklyView();
  renderBallonWeeklyView();
}

function renderAllDailyViews() {
  renderDailyView();
  renderBallonDailyView();
}

/**
 * Cadre commun des graphiques à bâtons hebdomadaires (3 barres par jour, axe kWh à gauche).
 * opts : { maxVal, padR?, drawDay(d, cx, g) → SVG des barres d'un jour, extra?(g) → SVG ajouté par-dessus }.
 * g fournit : yAt(v), baseY, padT, plotH, W, H, padL, padR, bar(cx, yHaut, yBas, couleur), label(cx, y, texte), slot(cx, k).
 */
function buildWeeklyBarsSVG(days, opts) {
  const W = 700, H = 290;
  const padL = 40, padR = opts.padR || 10, padT = 22, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const nBars = 3;
  const n = Math.max(days.length, 1);

  const slotW = plotW / n;
  const barW = Math.min(slotW / (nBars + 1.2), 30);
  const step = barW * 1.25; // écart entre centres de barres voisines
  const baseY = padT + plotH;
  const yAt = (v) => padT + plotH * (1 - v / opts.maxVal);

  const g = {
    W, H, padL, padR, padT, plotH, baseY, yAt,
    bar: (cx, yTop, yBottom, color) =>
      '<rect x="' + (cx - barW / 2).toFixed(1) + '" y="' + yTop.toFixed(1) + '" width="' + barW.toFixed(1) +
      '" height="' + Math.max(0, yBottom - yTop).toFixed(1) + '" fill="' + color + '" rx="2" />',
    label: (cx, y, text) =>
      '<text x="' + cx.toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" fill="#eef2f6" font-size="10" font-weight="600" text-anchor="middle">' + text + "</text>",
    slot: (cx, k) => cx + (k - 1) * step, // centre de la k-ième barre (0, 1 ou 2) d'un jour
  };

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const yy = (padT + plotH * (1 - f)).toFixed(1);
    return '<line x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy + '" stroke="#2a333f" stroke-width="1" />';
  }).join("");
  const yLabels = [0, opts.maxVal / 2, opts.maxVal].map((v) =>
    '<text x="' + (padL - 6) + '" y="' + (yAt(v) + 3).toFixed(1) + '" fill="#93a1b0" font-size="10" text-anchor="end">' + v.toFixed(1) + "</text>"
  ).join("");

  let bars = "";
  days.forEach((d, i) => {
    const cx = padL + i * slotW + slotW / 2;
    bars += opts.drawDay(d, cx, g);
    bars += '<text x="' + cx.toFixed(1) + '" y="' + (H - 8) + '" fill="#93a1b0" font-size="10" text-anchor="middle">' + fmtJourMois(d.key) + "</text>";
  });

  const extra = opts.extra ? opts.extra(g) : "";
  return '<svg viewBox="0 0 ' + W + " " + H + '" xmlns="http://www.w3.org/2000/svg">' + gridLines + yLabels + bars + extra + "</svg>";
}

/* ---------- Mon scénario → Batterie ---------- */

function renderBattWeeklyView() {
  const keys = weekWindowKeys();
  if (keys.length === 0) {
    document.getElementById("battWeekLabel").textContent = "Aucune donnée";
    document.getElementById("battWeeklyChart").innerHTML = "";
    return;
  }
  applyWeekNav("batt", keys);
  const days = keys.map((k) => battDayMap.get(k) || { key: k, prod: 0, autoDirecte: 0, stocke: 0, maxSoc: 0 });
  document.getElementById("battWeeklyChart").innerHTML = buildBattWeeklyBarsSVG(days);
}

/**
 * 3 barres par jour (kWh) : production PV ; barre empilée autoconsommation
 * directe (bleu) + énergie stockée en batterie (vert) ; niveau max de la batterie.
 */
function buildBattWeeklyBarsSVG(days) {
  const maxVal = Math.max(0.1, ...days.map((d) => Math.max(d.prod, d.autoDirecte + d.stocke, d.maxSoc))) * 1.15;
  return buildWeeklyBarsSVG(days, {
    maxVal,
    drawDay: (d, cx, g) => {
      const total = d.autoDirecte + d.stocke;
      return (
        g.bar(g.slot(cx, 0), g.yAt(d.prod), g.baseY, "#f0a94e") + g.label(g.slot(cx, 0), g.yAt(d.prod), d.prod.toFixed(1)) +
        g.bar(g.slot(cx, 1), g.yAt(d.autoDirecte), g.baseY, "#7c93c9") +
        g.bar(g.slot(cx, 1), g.yAt(total), g.yAt(d.autoDirecte), "#4fc9a0") + g.label(g.slot(cx, 1), g.yAt(total), total.toFixed(1)) +
        g.bar(g.slot(cx, 2), g.yAt(d.maxSoc), g.baseY, "#c97bda") + g.label(g.slot(cx, 2), g.yAt(d.maxSoc), d.maxSoc.toFixed(1))
      );
    },
  });
}

/* ---------- Mon scénario → Ballon ECS ---------- */

function renderBallonWeeklyView() {
  const keys = weekWindowKeys();
  if (keys.length === 0) {
    document.getElementById("ballonWeekLabel").textContent = "Aucune donnée";
    document.getElementById("ballonWeeklyChart").innerHTML = "";
    return;
  }
  applyWeekNav("ballon", keys);
  const days = keys.map((k) => ballonDayMap.get(k) || { key: k, prod: 0, autoDirecte: 0, diverti: 0, maxTemp: settings.ballonTempFroide });
  document.getElementById("ballonWeeklyChart").innerHTML = buildBallonWeeklyBarsSVG(days);
}

/**
 * 3 barres par jour : production PV (kWh) ; barre empilée autoconsommation directe
 * (bleu) + énergie déviée vers le ballon (vert), en kWh ; température maximale du
 * ballon (°C, échelle de droite), avec un repère pointillé sur la consigne.
 */
function buildBallonWeeklyBarsSVG(days) {
  const consigne = settings.ballonTempConsigne;
  const maxVal = Math.max(0.1, ...days.map((d) => Math.max(d.prod, d.autoDirecte + d.diverti))) * 1.15;
  const maxTemp = Math.max(settings.ballonTempLimite, consigne, ...days.map((d) => d.maxTemp)) + 5;
  const yTempOf = (g, v) => g.padT + g.plotH * (1 - v / maxTemp);

  return buildWeeklyBarsSVG(days, {
    maxVal,
    padR: 38,
    drawDay: (d, cx, g) => {
      const total = d.autoDirecte + d.diverti;
      const tempColor = d.maxTemp >= consigne ? "#e07a5f" : "#8c5a4e"; // vif : consigne atteinte, terne : non atteinte
      const yT = yTempOf(g, d.maxTemp);
      return (
        g.bar(g.slot(cx, 0), g.yAt(d.prod), g.baseY, "#f0a94e") + g.label(g.slot(cx, 0), g.yAt(d.prod), d.prod.toFixed(1)) +
        g.bar(g.slot(cx, 1), g.yAt(d.autoDirecte), g.baseY, "#7c93c9") +
        g.bar(g.slot(cx, 1), g.yAt(total), g.yAt(d.autoDirecte), "#4fc9a0") + g.label(g.slot(cx, 1), g.yAt(total), total.toFixed(1)) +
        g.bar(g.slot(cx, 2), yT, g.baseY, tempColor) + g.label(g.slot(cx, 2), yT, Math.round(d.maxTemp) + "°")
      );
    },
    extra: (g) => {
      const ticks = [0, 20, 40, 60, 80].filter((v) => v <= maxTemp).map((v) =>
        '<text x="' + (g.W - g.padR + 6) + '" y="' + (yTempOf(g, v) + 3).toFixed(1) + '" fill="#c98a7a" font-size="10" text-anchor="start">' + v + "°</text>"
      ).join("");
      const yC = yTempOf(g, consigne).toFixed(1);
      const consigneLine =
        '<line x1="' + g.padL + '" y1="' + yC + '" x2="' + (g.W - g.padR) + '" y2="' + yC + '" stroke="#eef2f6" stroke-opacity="0.45" stroke-width="1" stroke-dasharray="4 3" />' +
        '<text x="' + (g.W - g.padR - 2) + '" y="' + (yTempOf(g, consigne) - 4).toFixed(1) + '" fill="#93a1b0" font-size="10" text-anchor="end">consigne ' + consigne + "°</text>";
      return ticks + consigneLine;
    },
  });
}

/* ---------- Vue d'ensemble : batterie et ballon côte à côte ---------- */

function renderOverviewWeeklyView() {
  const keys = weekWindowKeys();
  if (keys.length === 0) {
    document.getElementById("ovWeekLabel").textContent = "Aucune donnée";
    document.getElementById("ovWeeklyChart").innerHTML = "";
    return;
  }
  applyWeekNav("ov", keys);
  const days = keys.map((k) => {
    const b = battDayMap.get(k);
    const a = ballonDayMap.get(k);
    return {
      key: k,
      prod: b ? b.prod : 0,
      autoDirecte: b ? b.autoDirecte : 0,
      stockeBatt: b ? b.stocke : 0,
      divertiBallon: a ? a.diverti : 0,
    };
  });
  document.getElementById("ovWeeklyChart").innerHTML = buildOverviewWeeklyBarsSVG(days);
}

/**
 * 3 barres par jour (kWh) : production PV ; barre empilée du scénario batterie
 * (autoconsommation directe + stocké) ; barre empilée du scénario ballon
 * (autoconsommation directe + énergie déviée vers le ballon).
 */
function buildOverviewWeeklyBarsSVG(days) {
  const maxVal = Math.max(0.1, ...days.map((d) => Math.max(d.prod, d.autoDirecte + d.stockeBatt, d.autoDirecte + d.divertiBallon))) * 1.15;
  return buildWeeklyBarsSVG(days, {
    maxVal,
    drawDay: (d, cx, g) => {
      const totBatt = d.autoDirecte + d.stockeBatt;
      const totBallon = d.autoDirecte + d.divertiBallon;
      return (
        g.bar(g.slot(cx, 0), g.yAt(d.prod), g.baseY, "#f0a94e") + g.label(g.slot(cx, 0), g.yAt(d.prod), d.prod.toFixed(1)) +
        g.bar(g.slot(cx, 1), g.yAt(d.autoDirecte), g.baseY, "#7c93c9") +
        g.bar(g.slot(cx, 1), g.yAt(totBatt), g.yAt(d.autoDirecte), "#4fc9a0") + g.label(g.slot(cx, 1), g.yAt(totBatt), totBatt.toFixed(1)) +
        g.bar(g.slot(cx, 2), g.yAt(d.autoDirecte), g.baseY, "#7c93c9") +
        g.bar(g.slot(cx, 2), g.yAt(totBallon), g.yAt(d.autoDirecte), "#c97bda") + g.label(g.slot(cx, 2), g.yAt(totBallon), totBallon.toFixed(1))
      );
    },
  });
}

// Flèches de navigation : les 3 graphiques hebdomadaires partagent la même semaine.
document.getElementById("ovWeekPrevBtn").addEventListener("click", () => shiftWeek(-1));
document.getElementById("ovWeekNextBtn").addEventListener("click", () => shiftWeek(1));
document.getElementById("battWeekPrevBtn").addEventListener("click", () => shiftWeek(-1));
document.getElementById("battWeekNextBtn").addEventListener("click", () => shiftWeek(1));
document.getElementById("ballonWeekPrevBtn").addEventListener("click", () => shiftWeek(-1));
document.getElementById("ballonWeekNextBtn").addEventListener("click", () => shiftWeek(1));

/* ============================================================
   6b. VUE JOURNALIÈRE — navigation < / > entre les jours
   ============================================================ */

let dailySeries = [];   // série horaire complète de la dernière simulation (batterie)

function dayKeyOf(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

function renderDailyView() {
  if (!sharedDayKey) {
    document.getElementById("dayLabel").textContent = "Aucune donnée";
    return;
  }
  const key = sharedDayKey; // jour partagé avec le graphique journalier du ballon
  const dayIndex = allDayKeys.indexOf(key);
  const points = dailySeries.filter((p) => dayKeyOf(p.t) === key);

  const [y, m, d] = key.split("-");
  document.getElementById("dayLabel").textContent = d + "/" + m + "/" + y;
  document.getElementById("dayPrevBtn").disabled = dayIndex <= 0;
  document.getElementById("dayNextBtn").disabled = dayIndex >= allDayKeys.length - 1;

  document.getElementById("dailyChart").innerHTML = buildLineChartSVG(points);
  document.getElementById("chartSettingsNote").textContent =
    "Simulé avec : capacité " + settings.capaciteKwh.toLocaleString("fr-FR") + " kWh · SOC min " +
    settings.socMinPct + "% · puissance max " + settings.puissanceMaxKw.toLocaleString("fr-FR") + " kW";

  // --- Stats du jour affiché ---
  const prodJour = points.reduce((s, p) => s + p.prod, 0);
  const consoJour = points.reduce((s, p) => s + p.consoTotale, 0);
  const autoconsoDirecteJour = points.reduce((s, p) => s + Math.max(0, p.prod - p.retour), 0);
  const autoconsoPctJour = prodJour > 0 ? (autoconsoDirecteJour / prodJour) * 100 : 0;
  const dechJour = points.reduce((s, p) => s + p.dech, 0);
  const stockeJour = points.reduce((s, p) => s + p.stocke, 0);
  const consoPVJour = autoconsoDirecteJour + dechJour;
  const autoconsoAvecBatteriePctJour = prodJour > 0 ? Math.min(100, (consoPVJour / prodJour) * 100) : 0;
  const nbCyclesJour = settings.capaciteKwh > 0 ? stockeJour / settings.capaciteKwh : 0;

  document.getElementById("dayKpiProd").textContent = fmtKwh(prodJour);
  document.getElementById("dayKpiConso").textContent = fmtKwh(consoJour);
  document.getElementById("dayKpiAutoconso").textContent = fmtPct(autoconsoPctJour);
  document.getElementById("dayKpiAutoconsoBatt").textContent = fmtPct(autoconsoAvecBatteriePctJour);
  document.getElementById("dayKpiConsoPV").textContent = fmtKwh(consoPVJour);
  document.getElementById("dayKpiCycles").textContent = nbCyclesJour.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

/**
 * Construit un graphique linéaire en SVG pur (sans dépendance externe) pour
 * un jour de données : consommation totale, production PV et niveau de
 * batterie, tous exprimés en kWh sur un même axe.
 */
function buildLineChartSVG(points) {
  const W = 700, H = 280;
  const padL = 42, padR = 16, padT = 14, padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = points.length;

  const maxEnergy = Math.max(0.1, ...points.map((p) => Math.max(p.consoTotale, p.prod, p.soc))) * 1.15;

  const xAt = (i) => padL + (n > 1 ? (i * plotW) / (n - 1) : plotW / 2);
  const yAt = (v) => padT + plotH * (1 - v / maxEnergy);

  const pathOf = (values) =>
    values.map((v, i) => (i === 0 ? "M" : "L") + xAt(i).toFixed(1) + " " + yAt(v).toFixed(1)).join(" ");

  const consoPath = pathOf(points.map((p) => p.consoTotale));
  const prodPath = pathOf(points.map((p) => p.prod));
  const socPath = pathOf(points.map((p) => p.soc));

  // Grille horizontale (repères kWh)
  const gridValues = [0, maxEnergy / 4, maxEnergy / 2, (3 * maxEnergy) / 4, maxEnergy];
  const gridLines = gridValues.map((v) => {
    const yy = yAt(v).toFixed(1);
    return '<line x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy + '" stroke="#2a333f" stroke-width="1" />';
  }).join("");

  // Étiquettes d'heures (une sur plusieurs pour ne pas surcharger)
  const step = Math.max(1, Math.ceil(n / 8));
  const xLabels = points.map((p, i) => {
    if (i % step !== 0 && i !== n - 1) return "";
    const hh = String(p.t.getHours()).padStart(2, "0") + "h";
    return '<text x="' + xAt(i).toFixed(1) + '" y="' + (H - 8) + '" fill="#93a1b0" font-size="10" text-anchor="middle">' + hh + "</text>";
  }).join("");

  const yLabels = gridValues.map((v) =>
    '<text x="' + (padL - 6) + '" y="' + (yAt(v) + 3).toFixed(1) + '" fill="#93a1b0" font-size="10" text-anchor="end">' + v.toFixed(1) + "</text>"
  ).join("");

  return (
    '<svg viewBox="0 0 ' + W + " " + H + '" xmlns="http://www.w3.org/2000/svg">' +
    gridLines +
    xLabels +
    yLabels +
    '<path d="' + consoPath + '" fill="none" stroke="#7c93c9" stroke-width="2" />' +
    '<path d="' + prodPath + '" fill="none" stroke="#f0a94e" stroke-width="2" />' +
    '<path d="' + socPath + '" fill="none" stroke="#4fc9a0" stroke-width="2.5" />' +
    "</svg>"
  );
}

// Flèches du jour : les deux graphiques journaliers (batterie et ballon) partagent le même jour.
document.getElementById("dayPrevBtn").addEventListener("click", () => shiftDay(-1));
document.getElementById("dayNextBtn").addEventListener("click", () => shiftDay(1));

/* ============================================================
   6. RENDU DES RÉSULTATS (KPIs)
   ============================================================ */

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
  document.getElementById("scenarioNoData").style.display = "none";

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

  // Coût par kWh cyclé = prix d'achat ÷ (capacité × nombre de cycles nominal)
  const energieCycleeVie = settings.capaciteKwh * settings.dureeVieCycles;
  document.getElementById("kpiCoutKwhCycle").textContent =
    energieCycleeVie > 0
      ? (settings.prixBatterie / energieCycleeVie).toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + " €/kWh"
      : "N/A";

  // Données des graphiques (batterie, puis ballon), puis sélection semaine/jour partagée
  dailySeries = result.series;
  const battBilan = computeBattDailyBilan(result.series);
  battDayMap = new Map(battBilan.map((d) => [d.key, d]));
  renderBallonPage(); // KPIs du ballon + données par jour (ballonDayMap)
  syncSharedSelection(battBilan.map((d) => d.key));
  renderAllWeeklyViews();
  renderAllDailyViews();
  renderSynthesePage();
}

/* ============================================================
   9b. PAGE BALLON D'EAU CHAUDE (ECS)
   ============================================================ */

function fmtAnnees2(v) { return fmtAnnees(v); }

let ballonDailySeries = []; // série horaire complète de la dernière simulation (ballon)

function renderBallonPage() {
  if (masterData.size === 0) return;
  const points = Array.from(masterData.values()).sort((a, b) => a.t - b.t);
  const r = simulateBallonThermal(points, settings);

  const pctCouvert = settings.ballonBesoinKwhJour > 0
    ? Math.min(100, (r.totalDiverti / (settings.ballonBesoinKwhJour * r.nbJours)) * 100)
    : 0;
  const roiBallon = r.economieBallonAnnuel > 0 ? settings.ballonPrix / r.economieBallonAnnuel : null;

  document.getElementById("ballonKpiDiverti").textContent = fmtKwh(r.totalDiverti);
  document.getElementById("ballonKpiPctCouvert").textContent = fmtPct(pctCouvert);
  document.getElementById("ballonKpiAutoconso").textContent = fmtPct(r.autoconsoPct);
  document.getElementById("ballonKpiEconomie").textContent = fmtEuro(r.totalEconomieBallon);
  document.getElementById("ballonKpiEconomieAnnuelle").textContent = fmtEuro(r.economieBallonAnnuel);
  document.getElementById("ballonKpiRoi").textContent = fmtAnnees2(roiBallon);

  ballonDailySeries = r.series;
  ballonDayMap = new Map(computeBallonDailyBilan(r.series).map((d) => [d.key, d]));
}

function renderBallonDailyView() {
  if (!sharedDayKey) {
    document.getElementById("ballonDayLabel").textContent = "Aucune donnée";
    return;
  }
  const key = sharedDayKey; // jour partagé avec le graphique journalier de la batterie
  const dayIndex = allDayKeys.indexOf(key);
  const points = ballonDailySeries.filter((p) => dayKeyOf(p.t) === key);

  const [y, m, d] = key.split("-");
  document.getElementById("ballonDayLabel").textContent = d + "/" + m + "/" + y;
  document.getElementById("ballonDayPrevBtn").disabled = dayIndex <= 0;
  document.getElementById("ballonDayNextBtn").disabled = dayIndex >= allDayKeys.length - 1;

  document.getElementById("ballonDailyChart").innerHTML = buildBallonTempChartSVG(points);
}

/** Graphique SVG natif : production PV (kWh, axe gauche) et température ballon (°C, axe droit). */
function buildBallonTempChartSVG(points) {
  const W = 700, H = 280;
  const padL = 40, padR = 40, padT = 14, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = points.length;

  const maxProd = Math.max(0.1, ...points.map((p) => Math.max(p.prod, p.retour))) * 1.15;
  const minTemp = Math.min(settings.ballonTempFroide, ...points.map((p) => p.temp)) - 2;
  const maxTemp = Math.max(settings.ballonTempLimite, ...points.map((p) => p.temp)) + 2;

  const xAt = (i) => padL + (n > 1 ? (i * plotW) / (n - 1) : plotW / 2);
  const yProdAt = (v) => padT + plotH * (1 - v / maxProd);
  const yTempAt = (v) => padT + plotH * (1 - (v - minTemp) / (maxTemp - minTemp));
  const pathOf = (values, yFn) => values.map((v, i) => (i === 0 ? "M" : "L") + xAt(i).toFixed(1) + " " + yFn(v).toFixed(1)).join(" ");

  const prodPath = pathOf(points.map((p) => p.prod), yProdAt);
  const surplusPath = pathOf(points.map((p) => p.retour), yProdAt);
  const tempPath = pathOf(points.map((p) => p.temp), yTempAt);

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const yy = (padT + plotH * (1 - f)).toFixed(1);
    return '<line x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy + '" stroke="#2a333f" stroke-width="1" />';
  }).join("");

  const step = Math.max(1, Math.ceil(n / 8));
  const xLabels = points.map((p, i) => {
    if (i % step !== 0 && i !== n - 1) return "";
    const hh = String(p.t.getHours()).padStart(2, "0") + "h";
    return '<text x="' + xAt(i).toFixed(1) + '" y="' + (H - 8) + '" fill="#93a1b0" font-size="10" text-anchor="middle">' + hh + "</text>";
  }).join("");

  const yProdLabels = [0, maxProd / 2, maxProd].map((v) =>
    '<text x="' + (padL - 6) + '" y="' + (yProdAt(v) + 3).toFixed(1) + '" fill="#93a1b0" font-size="10" text-anchor="end">' + v.toFixed(1) + "</text>"
  ).join("");
  const yTempLabels = [minTemp, (minTemp + maxTemp) / 2, maxTemp].map((v) =>
    '<text x="' + (W - padR + 6) + '" y="' + (yTempAt(v) + 3).toFixed(1) + '" fill="#93a1b0" font-size="10" text-anchor="start">' + v.toFixed(0) + "°</text>"
  ).join("");

  // Ligne de consigne, en repère
  const consigneY = yTempAt(settings.ballonTempConsigne).toFixed(1);
  const consigneLine = '<line x1="' + padL + '" y1="' + consigneY + '" x2="' + (W - padR) + '" y2="' + consigneY + '" stroke="#4fc9a055" stroke-width="1" stroke-dasharray="3 3" />';

  return (
    '<svg viewBox="0 0 ' + W + " " + H + '" xmlns="http://www.w3.org/2000/svg">' +
    gridLines + consigneLine + xLabels + yProdLabels + yTempLabels +
    '<path d="' + prodPath + '" fill="none" stroke="#f0a94e" stroke-width="2" />' +
    '<path d="' + surplusPath + '" fill="none" stroke="#f0a94e" stroke-width="1.5" stroke-dasharray="4 3" />' +
    '<path d="' + tempPath + '" fill="none" stroke="#4fc9a0" stroke-width="2.5" />' +
    "</svg>"
  );
}

// Flèches du jour : partagées avec le graphique journalier de la batterie.
document.getElementById("ballonDayPrevBtn").addEventListener("click", () => shiftDay(-1));
document.getElementById("ballonDayNextBtn").addEventListener("click", () => shiftDay(1));

/* ============================================================
   9c. PAGE SYNTHÈSE — comparaison des 3 scénarios
   ============================================================ */

function renderSynthesePage() {
  if (masterData.size === 0) return;
  const points = Array.from(masterData.values()).sort((a, b) => a.t - b.t);

  // Sans rien (panneaux seuls)
  const rSans = simulateScenario(points, settings, { battery: false });
  const investSans = settings.prixPanneaux;
  const roiSans = rSans.gainPanneauxAnnuel > 0 ? investSans / rSans.gainPanneauxAnnuel : null;
  const autoconsoSansKwh = Math.max(0, rSans.totalProduction - rSans.totalRetourBrut);
  const autoconsoSansPct = rSans.totalProduction > 0 ? (autoconsoSansKwh / rSans.totalProduction) * 100 : 0;
  document.getElementById("synSansInvest").textContent = investSans.toLocaleString("fr-FR") + " €";
  document.getElementById("synSansAutoconso").textContent = fmtPct(autoconsoSansPct);
  document.getElementById("synSansEconomie").textContent = fmtEuro(rSans.gainPanneauxAnnuel);
  document.getElementById("synSansRoi").textContent = fmtAnnees2(roiSans);

  // Avec batterie — investissement/économie/rentabilité de la batterie SEULE (hors panneaux,
  // déjà comptés dans le scénario "Sans stockage" ci-dessus)
  const rBatt = simulateScenario(points, settings, { battery: true });
  const economieBattTotale = rBatt.economieBattAnnuel;
  const investBatt = settings.prixBatterie;
  const roiBatt = economieBattTotale > 0 ? investBatt / economieBattTotale : null;
  const autoconsoBattKwh = Math.max(0, rBatt.totalProduction - rBatt.totalRetourBrut) + rBatt.totalCouvertBatt;
  const autoconsoBattPct = rBatt.totalProduction > 0 ? Math.min(100, (autoconsoBattKwh / rBatt.totalProduction) * 100) : 0;
  document.getElementById("synAvecInvest").textContent = investBatt.toLocaleString("fr-FR") + " €";
  document.getElementById("synAvecAutoconso").textContent = fmtPct(autoconsoBattPct);
  document.getElementById("synAvecEconomie").textContent = fmtEuro(economieBattTotale);
  document.getElementById("synAvecRoi").textContent = fmtAnnees2(roiBatt);

  // Avec ballon ECS (sans batterie) — investissement/économie/rentabilité du ballon SEUL
  const rBallon = simulateBallonThermal(points, settings);
  const economieBallonTotale = rBallon.economieBallonAnnuel;
  const investBallon = settings.ballonPrix;
  const roiBallon = economieBallonTotale > 0 ? investBallon / economieBallonTotale : null;
  document.getElementById("synBallonInvest").textContent = investBallon.toLocaleString("fr-FR") + " €";
  document.getElementById("synBallonAutoconso").textContent = fmtPct(rBallon.autoconsoPct);
  document.getElementById("synBallonEconomie").textContent = fmtEuro(economieBallonTotale);
  document.getElementById("synBallonRoi").textContent = fmtAnnees2(roiBallon);

  // --- Résumé en langage clair ---
  const candidats = [
    { nom: "la batterie", roi: roiBatt, economie: economieBattTotale, invest: investBatt },
    { nom: "le ballon ECS", roi: roiBallon, economie: economieBallonTotale, invest: investBallon },
  ].filter((c) => c.roi != null);

  let resume;
  if (candidats.length === 0) {
    resume = "Pas assez de surplus exporté sur la période pour que la batterie ou le ballon se rentabilisent — les panneaux seuls restent la meilleure option pour l'instant.";
  } else {
    const meilleur = candidats.reduce((a, b) => (a.roi < b.roi ? a : b));
    const autre = candidats.find((c) => c !== meilleur);
    resume =
      "D'après tes " + rSans.nbJours + " jour(s) de données importées, " + meilleur.nom +
      " se rentabilise le plus vite (environ " + fmtAnnees2(meilleur.roi) + " pour un investissement de " +
      meilleur.invest.toLocaleString("fr-FR") + " €).";
    if (autre && autre.roi != null) {
      resume += " " + (autre.nom === "la batterie" ? "La batterie" : "Le ballon ECS") +
        " économise " + (autre.economie > meilleur.economie ? "plus par an (" : "moins par an (") +
        fmtEuro(autre.economie) + ") mais coûte plus cher à rentabiliser (" + fmtAnnees2(autre.roi) + ").";
    }
  }
  document.getElementById("summaryText").textContent = resume;
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
  document.getElementById("scenarioNoData").style.display = "block";
  document.getElementById("periodLabel").textContent = "Aucune donnée";
  fileStatusEl.textContent = "Aucune donnée importée pour le moment.";
  fileStatusEl.className = "file-status";
});

/* ============================================================
   7b. EXPORT — logiciel (code source) et résultats
   ============================================================ */

/**
 * Déclenche le téléchargement d'un texte. Sur iOS Safari, il n'existe pas
 * d'API web pour choisir un dossier directement — le navigateur ouvre son
 * flux de téléchargement habituel (menu de partage), où l'utilisateur choisit
 * « Enregistrer dans Fichiers » puis le dossier de destination lui-même.
 */
function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const exportStatusEl = document.getElementById("exportStatus");

async function exportSoftware() {
  exportStatusEl.textContent = "Préparation de l'export…";
  exportStatusEl.className = "file-status";
  const files = ["index.html", "app.js", "meteo.js", "style.css", "sw.js", "manifest.json"];
  let combined =
    "Export du code source — Simulateur Batterie Solaire\n" +
    "Généré le " + new Date().toLocaleString("fr-FR") + "\n" +
    "Fichiers concaténés, séparés par des bannières ===== FICHIER: ... =====\n\n";
  let failures = 0;
  for (const f of files) {
    try {
      const res = await fetch(f, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      combined += "===== FICHIER: " + f + " =====\n\n" + text + "\n\n";
    } catch (err) {
      combined += "===== FICHIER: " + f + " (échec de lecture : " + err.message + ") =====\n\n";
      failures++;
    }
  }
  downloadTextFile(combined, "simulateur-batterie-code-source.txt");
  exportStatusEl.textContent = failures === 0
    ? "Export du code source lancé — " + files.length + " fichier(s)."
    : "Export lancé, mais " + failures + " fichier(s) n'ont pas pu être lus.";
  exportStatusEl.className = failures === 0 ? "file-status ok" : "file-status err";
}

function exportResults() {
  if (masterData.size === 0) {
    exportStatusEl.textContent = "Aucune donnée importée à exporter.";
    exportStatusEl.className = "file-status err";
    return;
  }

  const points = Array.from(masterData.values()).sort((a, b) => a.t - b.t);
  const rSans = simulateScenario(points, settings, { battery: false });
  const rBatt = simulateScenario(points, settings, { battery: true });
  const rBallon = simulateBallonThermal(points, settings);

  const donneesHoraires = points.map((p) => ({
    horodatage: new Date(p.t).toISOString(),
    production_kWh: Number(p.prod.toFixed(4)),
    consommation_reseau_kWh: Number(p.conso.toFixed(4)),
    surplus_exporte_kWh: Number(p.retour.toFixed(4)),
  }));

  const exportObj = {
    genere_le: new Date().toISOString(),
    periode: {
      debut: new Date(points[0].t).toISOString(),
      fin: new Date(points[points.length - 1].t).toISOString(),
      nb_jours_couverts: rSans.nbJours,
    },
    parametres_actuels: settings,
    scenario_sans_stockage: {
      production_totale_kWh: rSans.totalProduction,
      consommation_reseau_totale_kWh: rSans.totalConsoGrid,
      export_reseau_total_kWh: rSans.totalRetourBrut,
      gain_panneaux_periode_euros: rSans.totalGainPanneaux,
      gain_panneaux_annuel_euros: rSans.gainPanneauxAnnuel,
    },
    scenario_avec_batterie: {
      quantite_couverte_par_batterie_kWh: rBatt.totalCouvertBatt,
      economie_batterie_periode_euros: rBatt.totalEconomieBatt,
      economie_batterie_annuelle_euros: rBatt.economieBattAnnuel,
      investissement_batterie_euros: settings.prixBatterie,
    },
    scenario_avec_ballon_ecs: {
      energie_deviee_vers_ballon_kWh: rBallon.totalDiverti,
      autoconsommation_pv_pct: rBallon.autoconsoPct,
      economie_ballon_periode_euros: rBallon.totalEconomieBallon,
      economie_ballon_annuelle_euros: rBallon.economieBallonAnnuel,
      investissement_ballon_euros: settings.ballonPrix,
      hypothese_valorisation: "Coût du gaz évité (tarif gaz ÷ rendement chaudière), pas le tarif électrique.",
    },
    donnees_horaires_importees: donneesHoraires,
  };

  downloadTextFile(JSON.stringify(exportObj, null, 2), "simulateur-batterie-resultats.txt");
  exportStatusEl.textContent = "Export des résultats lancé — " + donneesHoraires.length.toLocaleString("fr-FR") + " points horaires inclus.";
  exportStatusEl.className = "file-status ok";
}

document.getElementById("exportSoftwareBtn").addEventListener("click", exportSoftware);
document.getElementById("exportResultsBtn").addEventListener("click", exportResults);

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
