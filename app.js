"use strict";

/* ============================================================
   1. PARAMÈTRES — chargement / sauvegarde localStorage
   ============================================================ */

const SETTINGS_KEY = "battSim.settings.v1";

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

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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
   2. NAVIGATION PAR ONGLETS
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
   3. IMPORT CSV + DÉTECTION DES COLONNES
   ============================================================ */

let parsedRows = null;
let csvHeaders = [];

const fileStatusEl = document.getElementById("fileStatus");
const mappingCard = document.getElementById("mappingCard");

document.getElementById("csvInput").addEventListener("change", (evt) => {
  const file = evt.target.files[0];
  if (!file) return;

  fileStatusEl.textContent = "Lecture du fichier « " + file.name + " »…";
  fileStatusEl.className = "file-status";

  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result;
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (result) => {
        if (!result.data.length || !result.meta.fields || !result.meta.fields.length) {
          fileStatusEl.textContent = "Le fichier semble vide ou illisible.";
          fileStatusEl.className = "file-status err";
          return;
        }
        parsedRows = result.data;
        csvHeaders = result.meta.fields;
        fileStatusEl.textContent = parsedRows.length + " lignes importées depuis « " + file.name + " ». Vérifiez la correspondance des colonnes ci-dessous.";
        fileStatusEl.className = "file-status ok";
        populateMapping();
        mappingCard.style.display = "block";
      },
      error: (err) => {
        fileStatusEl.textContent = "Erreur de lecture CSV : " + err.message;
        fileStatusEl.className = "file-status err";
      },
    });
  };
  reader.onerror = () => {
    fileStatusEl.textContent = "Impossible de lire ce fichier localement.";
    fileStatusEl.className = "file-status err";
  };
  reader.readAsText(file, "UTF-8");
});

function populateMapping() {
  const selects = {
    mapTime: document.getElementById("mapTime"),
    mapConso: document.getElementById("mapConso"),
    mapProd: document.getElementById("mapProd"),
    mapRetour: document.getElementById("mapRetour"),
  };

  Object.values(selects).forEach((sel) => {
    sel.innerHTML = "";
    csvHeaders.forEach((h) => {
      const opt = document.createElement("option");
      opt.value = h;
      opt.textContent = h;
      sel.appendChild(opt);
    });
  });

  // Détection heuristique par mots-clés dans le nom de colonne
  autoSelect(selects.mapTime, ["time", "date", "horodatage", "timestamp"]);
  autoSelect(selects.mapConso, ["a ", "phase a", "a_", "linky"], ["retour", "return", "export"]);
  autoSelect(selects.mapProd, ["b ", "phase b", "b_", "solar", "prod"], ["retour", "return"]);
  autoSelect(selects.mapRetour, ["retour", "return", "export", "surplus", "injec"]);
}

function autoSelect(selectEl, includeKeywords, excludeKeywords) {
  const match = csvHeaders.find((h) => {
    const low = h.toLowerCase();
    const included = includeKeywords.some((k) => low.includes(k));
    const excluded = (excludeKeywords || []).some((k) => low.includes(k));
    return included && !excluded;
  });
  if (match) selectEl.value = match;
}

/* ============================================================
   4. MOTEUR DE SIMULATION
   ============================================================ */

function parseTimestamp(raw) {
  if (raw == null || raw === "") return null;
  // Tentative directe (ISO, RFC, etc.)
  let d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d;

  // Format européen DD/MM/YYYY[ HH:mm[:ss]]
  const m = String(raw).match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})[ T]?(\d{1,2})?:?(\d{2})?:?(\d{2})?/
  );
  if (m) {
    let [, dd, mm, yyyy, hh, min, ss] = m;
    if (yyyy.length === 2) yyyy = "20" + yyyy;
    d = new Date(
      Number(yyyy), Number(mm) - 1, Number(dd),
      Number(hh || 0), Number(min || 0), Number(ss || 0)
    );
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
  return hour >= hcStart || hour < hcEnd; // plage à cheval sur minuit
}

/**
 * Simule le comportement d'une batterie virtuelle heure par heure.
 * @returns {{series: Array, kpis: Object}}
 */
function runSimulation(rows, colMap, unit, cfg) {
  // 1. Construire les lignes normalisées {date, prod, conso, retour} en kWh
  const items = [];
  for (const row of rows) {
    const date = parseTimestamp(row[colMap.time]);
    if (!date) continue;
    items.push({
      date,
      prodRaw: toNumber(row[colMap.prod]),
      consoRaw: toNumber(row[colMap.conso]),
      retourRaw: toNumber(row[colMap.retour]),
    });
  }
  items.sort((a, b) => a.date - b.date);
  if (items.length === 0) {
    throw new Error("Aucune ligne exploitable après lecture des horodatages.");
  }

  // 2. Déterminer la durée moyenne d'un intervalle (pour convertir W -> kWh)
  let intervalHours = 1;
  if (items.length > 1) {
    const diffs = [];
    for (let i = 1; i < Math.min(items.length, 200); i++) {
      diffs.push((items[i].date - items[i - 1].date) / 3600000);
    }
    diffs.sort((a, b) => a - b);
    const median = diffs[Math.floor(diffs.length / 2)];
    if (median > 0 && Number.isFinite(median)) intervalHours = median;
  }

  const toKwh = (val) => {
    if (unit === "kWh") return val;
    if (unit === "W") return (val * intervalHours) / 1000;
    return val / 1000; // Wh -> kWh
  };

  // 3. Boucle de simulation
  const capaciteKwh = cfg.capaciteKwh;
  const socMinKwh = capaciteKwh * (cfg.socMinPct / 100);
  let soc = capaciteKwh * (cfg.socInitialPct / 100);

  const series = [];
  let totalProduction = 0;
  let totalRetourBrut = 0;
  let totalCouvertParBatterie = 0;
  let totalEconomie = 0;
  let totalConsommation = 0;

  for (const item of items) {
    const prod = toKwh(item.prodRaw);
    const conso = toKwh(item.consoRaw);
    const surplus = Math.max(0, toKwh(item.retourRaw));

    totalProduction += prod;
    totalConsommation += conso;
    totalRetourBrut += surplus;

    // Recharge avec le surplus injecté
    const chargeable = Math.min(surplus, Math.max(0, capaciteKwh - soc));
    soc += chargeable;

    // Décharge pour couvrir la consommation réseau (Phase A)
    const disponible = Math.max(0, soc - socMinKwh);
    const dechargeable = Math.min(Math.max(0, conso), disponible);
    soc -= dechargeable;

    totalCouvertParBatterie += dechargeable;

    const tarif = isNightHour(item.date.getHours(), cfg.hcStart, cfg.hcEnd)
      ? cfg.tarifNuit
      : cfg.tarifJour;
    totalEconomie += dechargeable * tarif;

    series.push({
      t: item.date,
      prod,
      conso,
      socPct: capaciteKwh > 0 ? (soc / capaciteKwh) * 100 : 0,
    });
  }

  // 4. KPIs de synthèse
  const autoconsoDirecte = Math.max(0, totalProduction - totalRetourBrut);
  const autoconsoAvecBatterie = Math.min(
    totalProduction,
    autoconsoDirecte + totalCouvertParBatterie
  );
  const autoconsoPct = totalProduction > 0 ? (autoconsoAvecBatterie / totalProduction) * 100 : 0;

  const spanMs = items[items.length - 1].date - items[0].date;
  const nbJours = Math.max(spanMs / 86400000, 1);
  const economieAnnuelle = totalEconomie * (365 / nbJours);
  const amortissementAnnees =
    economieAnnuelle > 0 ? cfg.prixBatterie / economieAnnuelle : null;

  return {
    series,
    kpis: {
      totalProduction,
      totalConsommation,
      autoconsoPct,
      totalEconomie,
      economieAnnuelle,
      amortissementAnnees,
      nbJours,
    },
    periodStart: items[0].date,
    periodEnd: items[items.length - 1].date,
  };
}

/* ============================================================
   5. RENDU DES RÉSULTATS (KPIs + graphique)
   ============================================================ */

let chartInstance = null;

function formatKwh(v) {
  return v.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " kWh";
}

function formatEuro(v) {
  return v.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " €";
}

function renderResults(result) {
  document.getElementById("resultsEmpty").style.display = "none";
  document.getElementById("results").style.display = "block";

  const { kpis, periodStart, periodEnd } = result;

  document.getElementById("periodLabel").textContent =
    periodStart.toLocaleDateString("fr-FR") + " → " + periodEnd.toLocaleDateString("fr-FR");

  document.getElementById("kpiProd").textContent = formatKwh(kpis.totalProduction);
  document.getElementById("kpiAutoconso").textContent =
    kpis.autoconsoPct.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " %";
  document.getElementById("kpiEconomie").innerHTML =
    formatEuro(kpis.totalEconomie) +
    " <small>sur la période</small>";

  const amortEl = document.getElementById("kpiAmortissement");
  if (kpis.amortissementAnnees == null) {
    amortEl.textContent = "N/A";
  } else if (kpis.amortissementAnnees > 99) {
    amortEl.textContent = "> 99 ans";
  } else {
    amortEl.textContent =
      kpis.amortissementAnnees.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " ans";
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
        {
          label: "Production (kWh)",
          data: points.map((p) => p.prod),
          borderColor: "#f0a94e",
          backgroundColor: "#f0a94e33",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.25,
          yAxisID: "yEnergy",
        },
        {
          label: "Consommation réseau (kWh)",
          data: points.map((p) => p.conso),
          borderColor: "#7c93c9",
          backgroundColor: "#7c93c933",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.25,
          yAxisID: "yEnergy",
        },
        {
          label: "Batterie (%)",
          data: points.map((p) => p.socPct),
          borderColor: "#4fc9a0",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.25,
          yAxisID: "ySoc",
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: "#93a1b0", maxTicksLimit: 6, font: { size: 10 } },
          grid: { color: "#2a333f" },
        },
        yEnergy: {
          position: "left",
          title: { display: true, text: "kWh", color: "#93a1b0" },
          ticks: { color: "#93a1b0" },
          grid: { color: "#2a333f" },
        },
        ySoc: {
          position: "right",
          min: 0,
          max: 100,
          title: { display: true, text: "SOC %", color: "#93a1b0" },
          ticks: { color: "#93a1b0" },
          grid: { display: false },
        },
      },
    },
  });
}

/* ============================================================
   6. ÉVÉNEMENTS
   ============================================================ */

document.getElementById("runSimBtn").addEventListener("click", () => {
  if (!parsedRows) return;
  const colMap = {
    time: document.getElementById("mapTime").value,
    conso: document.getElementById("mapConso").value,
    prod: document.getElementById("mapProd").value,
    retour: document.getElementById("mapRetour").value,
  };
  const unit = document.getElementById("mapUnit").value;

  try {
    const result = runSimulation(parsedRows, colMap, unit, settings);
    renderResults(result);
  } catch (err) {
    alert("Erreur pendant la simulation : " + err.message);
    console.error(err);
  }
});

document.getElementById("saveSettingsBtn").addEventListener("click", () => {
  settings = readSettingsForm();
  saveSettings(settings);
  const toast = document.getElementById("saveToast");
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1600);
});

document.getElementById("resetSettingsBtn").addEventListener("click", () => {
  settings = { ...DEFAULT_SETTINGS };
  saveSettings(settings);
  fillSettingsForm();
});

/* ============================================================
   7. INITIALISATION
   ============================================================ */

fillSettingsForm();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.warn("Échec d'enregistrement du service worker :", err);
    });
  });
}
