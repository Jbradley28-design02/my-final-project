// Real-Time National Weather Service (NWS) API Feed for Tampa International Airport (KTPA)
async function fetchLiveKTPAWeather() {
  const refreshBtn = document.getElementById("live-refresh-btn");
  if (refreshBtn) refreshBtn.textContent = "Updating...";

  try {
    const response = await fetch("https://api.weather.gov/stations/KTPA/observations/latest", {
      headers: { "Accept": "application/geo+json" }
    });
    
    if (!response.ok) throw new Error("HTTP error " + response.status);
    const data = await response.json();
    const p = data.properties;

    // 1. Temperature (°C -> °F)
    if (p.temperature && p.temperature.value !== null) {
      const tempF = (p.temperature.value * 9/5 + 32).toFixed(1);
      const el = document.getElementById("live-temp-val");
      if (el) el.textContent = tempF + "°F";
    }

    // 2. Dew Point (°C -> °F)
    if (p.dewpoint && p.dewpoint.value !== null) {
      const dewF = (p.dewpoint.value * 9/5 + 32).toFixed(1);
      const el = document.getElementById("live-dew-val");
      if (el) el.textContent = dewF + "°F";
    }

    // 3. Barometric Station Pressure (Pa -> inHg)
    if (p.barometricPressure && p.barometricPressure.value !== null) {
      const pressInHg = (p.barometricPressure.value / 3386.39).toFixed(2);
      const el = document.getElementById("live-press-val");
      if (el) el.textContent = pressInHg + " inHg";
    }

    // 4. Wind Speed (km/h -> mph)
    if (p.windSpeed && p.windSpeed.value !== null) {
      const windMph = (p.windSpeed.value * 0.621371).toFixed(1);
      const el = document.getElementById("live-wind-val");
      if (el) el.textContent = (parseFloat(windMph) === 0 ? "Calm" : windMph + " mph");
    }

    // 5. Precipitation (m -> inches)
    const precipMeters = p.precipitationLastHour ? p.precipitationLastHour.value : null;
    const precipIn = precipMeters !== null && !isNaN(precipMeters) ? (precipMeters * 39.3701).toFixed(2) : "0.00";
    const precipEl = document.getElementById("live-precip-val");
    if (precipEl) precipEl.textContent = precipIn + " in";

    // Condition text & timestamp
    const condition = p.textDescription || "Observed";
    const condEl = document.getElementById("live-condition-badge");
    if (condEl) condEl.textContent = condition;

    const obsDate = new Date(p.timestamp);
    const timeFormatted = obsDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const timeEl = document.getElementById("live-time-str");
    if (timeEl) timeEl.textContent = "Observed at " + timeFormatted;

    // Also trigger syncing the 2025-present chart with newest telemetry
    syncChartWithLatestTelemetry();

  } catch (error) {
    console.warn("Could not retrieve live NWS telemetry:", error);
  } finally {
    if (refreshBtn) refreshBtn.textContent = "🔄 Refresh";
  }
}

// Synchronize latest NWS observations with the KTPA 2025-present chart
async function syncChartWithLatestTelemetry() {
  const chartDiv = document.getElementById("ktpa-2025-live-chart");
  if (!chartDiv || !window.Plotly || !chartDiv.data || chartDiv.data.length < 5) return;

  try {
    const resp = await fetch("https://api.weather.gov/stations/KTPA/observations?limit=48", {
      headers: { "Accept": "application/geo+json" }
    });
    if (!resp.ok) return;
    const data = await resp.json();
    const features = data.features || [];
    if (!features.length) return;

    const sorted = features.slice().reverse();
    const existingDates = chartDiv.data[0].x || [];
    const lastDateStr = existingDates.length > 0 ? existingDates[existingDates.length - 1] : null;
    const lastTime = lastDateStr ? new Date(lastDateStr).getTime() : 0;

    const newX = [[], [], [], [], []];
    const newY = [[], [], [], [], []];
    const newText = [[], [], [], [], []];

    for (const f of sorted) {
      const p = f.properties;
      if (!p || !p.timestamp) continue;
      const obsTime = new Date(p.timestamp).getTime();
      if (obsTime <= lastTime) continue;

      const iso = p.timestamp;
      const timeFmt = new Date(iso).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
      });

      const tempF = p.temperature && p.temperature.value !== null ? parseFloat((p.temperature.value * 9/5 + 32).toFixed(1)) : null;
      const dewF = p.dewpoint && p.dewpoint.value !== null ? parseFloat((p.dewpoint.value * 9/5 + 32).toFixed(1)) : null;
      const pressInHg = p.barometricPressure && p.barometricPressure.value !== null ? parseFloat((p.barometricPressure.value / 3386.39).toFixed(2)) : null;
      const windMph = p.windSpeed && p.windSpeed.value !== null ? parseFloat((p.windSpeed.value * 0.621371).toFixed(1)) : null;
      const precipIn = p.precipitationLastHour && p.precipitationLastHour.value !== null ? parseFloat((p.precipitationLastHour.value * 39.3701).toFixed(2)) : 0.00;

      newX[0].push(iso);
      newY[0].push(tempF);
      newText[0].push(`<b style="font-size:13px; color:#c2410c;">🌡️ Temperature (Live)</b><br><b>Time:</b> ${timeFmt}<br><b>Reading:</b> ${tempF} °F`);

      newX[1].push(iso);
      newY[1].push(dewF);
      newText[1].push(`<b style="font-size:13px; color:#047857;">💧 Dew Point (Live)</b><br><b>Time:</b> ${timeFmt}<br><b>Reading:</b> ${dewF} °F`);

      newX[2].push(iso);
      newY[2].push(pressInHg);
      newText[2].push(`<b style="font-size:13px; color:#1d4ed8;">🌪️ Barometric Pressure (Live)</b><br><b>Time:</b> ${timeFmt}<br><b>Reading:</b> ${pressInHg} inHg`);

      newX[3].push(iso);
      newY[3].push(windMph);
      newText[3].push(`<b style="font-size:13px; color:#7e22ce;">💨 Sustained Wind Speed (Live)</b><br><b>Time:</b> ${timeFmt}<br><b>Reading:</b> ${windMph} mph`);

      newX[4].push(iso);
      newY[4].push(precipIn);
      newText[4].push(`<b style="font-size:13px; color:#0284c7;">🌧️ Precipitation (Live)</b><br><b>Time:</b> ${timeFmt}<br><b>Reading:</b> ${precipIn} in`);
    }

    if (newX[0].length > 0) {
      window.Plotly.extendTraces(chartDiv, {
        x: newX,
        y: newY,
        text: newText
      }, [0, 1, 2, 3, 4]);
    }
  } catch (err) {
    console.warn("Could not sync live observations with chart:", err);
  }
}

function initLiveCardScrollAnimation() {
  const cards = document.querySelectorAll(".live-card");
  if (!cards.length) return;

  function triggerCard(card, index) {
    if (card.classList.contains("popped")) return;
    card.style.animationDelay = (index * 0.08) + "s";
    card.classList.add("popped");

    card.addEventListener("animationend", function () {
      card.style.opacity = "1";
      card.style.transform = "none";
      card.style.animation = "none";
    }, { once: true });
  }

  function checkCards() {
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    cards.forEach(function (card, index) {
      if (card.classList.contains("popped")) return;
      const rect = card.getBoundingClientRect();
      // Only reveal once the entire box (including its bottom line) is within the screen
      if ((rect.bottom <= windowHeight && rect.top >= 0) || rect.bottom < 0) {
        triggerCard(card, index);
      }
    });
  }

  window.addEventListener("scroll", checkCards, { passive: true });
  window.addEventListener("resize", checkCards);

  // Initial checks
  checkCards();
  setTimeout(checkCards, 60);
  setTimeout(checkCards, 250);
  setTimeout(checkCards, 600);
}

document.addEventListener("DOMContentLoaded", function () {
  fetchLiveKTPAWeather();
  initLiveCardScrollAnimation();
  // Automatically poll every 3 minutes
  setInterval(fetchLiveKTPAWeather, 180000);
  // Initial sync attempt after 1.5s to let Plotly widget render
  setTimeout(syncChartWithLatestTelemetry, 1500);
});

