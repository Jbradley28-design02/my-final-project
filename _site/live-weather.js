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

// Interactive Plotly graphs scroll-driven line drawing and marker pop-up animations
function initPlotlyScrollAnimations() {
  const chartContainers = document.querySelectorAll(".plotly.html-widget, #ktpa-2025-live-chart");
  if (!chartContainers.length) return;

  function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    return (rect.top <= windowHeight * 0.85 && rect.bottom >= 0);
  }

  chartContainers.forEach(function (container) {
    if (container.dataset.graphObserverAttached) return;
    container.dataset.graphObserverAttached = "true";

    // If below viewport, mark pending to prevent flashing
    if (!isElementInViewport(container)) {
      container.classList.add("plotly-scroll-pending");
    }

    function animateChart() {
      if (container.dataset.graphAnimated) return;

      const linePaths = container.querySelectorAll(".scatterlayer .lines path.js-line");
      if (!linePaths.length) return;

      container.dataset.graphAnimated = "true";
      container.classList.remove("plotly-scroll-pending");

      const points = container.querySelectorAll(".scatterlayer .points path.point");
      const annotations = container.querySelectorAll(".infolayer .annotation");
      const shapes = container.querySelectorAll(".shapelayer path");

      // 1. Initially hide points, stars, annotations, and vertical guideline shapes
      points.forEach(function (p) {
        p.style.opacity = "0";
        p.style.transform = "scale(0)";
        p.style.transformBox = "fill-box";
        p.style.transformOrigin = "center";
        p.style.transition = "none";
      });

      annotations.forEach(function (a) {
        a.style.opacity = "0";
        a.style.transform = "scale(0.2)";
        a.style.transformBox = "fill-box";
        a.style.transformOrigin = "center";
        a.style.transition = "none";
      });

      shapes.forEach(function (s) {
        s.style.opacity = "0";
        s.style.transition = "none";
      });

      // 2. Animate the line drawing across the chart
      linePaths.forEach(function (path) {
        let length = 25000;
        try {
          const l = path.getTotalLength();
          if (l && l > 100) length = Math.ceil(l) + 150;
        } catch (e) {}

        path.style.opacity = "1";
        path.style.transition = "none";
        path.style.strokeDasharray = length + " " + length;
        path.style.strokeDashoffset = length;

        // Force browser layout reflow
        path.getBoundingClientRect();

        // Smooth line draw animation
        path.style.transition = "stroke-dashoffset 1.7s cubic-bezier(0.25, 1, 0.45, 1)";
        path.style.strokeDashoffset = "0";
      });

      // 3. Right as the line finishes drawing (~1.65s), pop up red disaster points & stars!
      setTimeout(function () {
        // Fade in guideline shapes
        shapes.forEach(function (s) {
          s.style.transition = "opacity 0.4s ease";
          s.style.opacity = "1";
        });

        // Pop up the red points and stars with a bouncy spring curve, staggered
        points.forEach(function (p, idx) {
          setTimeout(function () {
            p.style.transition = "opacity 0.35s ease, transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)";
            p.style.opacity = "1";
            p.style.transform = "scale(1)";
          }, idx * 40);
        });

        // Pop up information annotations right after
        annotations.forEach(function (a, idx) {
          setTimeout(function () {
            a.style.transition = "opacity 0.4s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
            a.style.opacity = "1";
            a.style.transform = "scale(1)";
          }, 100 + (idx * 50));
        });

        // 4. Clean up inline styles after the animation finishes (~3.2s)
        // This ensures native range slider, pan, zoom, hover tooltips are 100% responsive.
        setTimeout(function () {
          linePaths.forEach(function (path) {
            path.style.strokeDasharray = "";
            path.style.strokeDashoffset = "";
            path.style.transition = "";
          });
          points.forEach(function (p) {
            p.style.opacity = "";
            p.style.transform = "";
            p.style.transformBox = "";
            p.style.transformOrigin = "";
            p.style.transition = "";
          });
          annotations.forEach(function (a) {
            a.style.opacity = "";
            a.style.transform = "";
            a.style.transformBox = "";
            a.style.transformOrigin = "";
            a.style.transition = "";
          });
          shapes.forEach(function (s) {
            s.style.opacity = "";
            s.style.transition = "";
          });
        }, 1800);

      }, 1650);
    }

    // Set up observer for scrolling down to this graph
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          if (container.querySelectorAll(".scatterlayer .lines path.js-line").length) {
            animateChart();
            observer.unobserve(container);
          } else {
            // If Plotly is still rendering the widget, poll until lines exist
            const poll = setInterval(function () {
              if (container.querySelectorAll(".scatterlayer .lines path.js-line").length) {
                clearInterval(poll);
                animateChart();
                observer.unobserve(container);
              }
            }, 70);
            setTimeout(function () { clearInterval(poll); }, 6000);
          }
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: "0px 0px -40px 0px"
    });

    observer.observe(container);
  });
}

// Story page figure scroll-in animation
function initStoryFigureAnimation() {
  const figures = document.querySelectorAll("figure img, .cell-output-display img");
  if (!figures.length) return;
  figures.forEach(function (img) {
    img.style.opacity = "0";
    img.style.transform = "translateY(24px) scale(0.98)";
    img.style.transition = "opacity 0.8s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)";

    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          img.style.opacity = "1";
          img.style.transform = "translateY(0) scale(1)";
          obs.unobserve(img);
        }
      });
    }, { threshold: 0.15 });
    obs.observe(img);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  fetchLiveKTPAWeather();
  initLiveCardScrollAnimation();
  initPlotlyScrollAnimations();
  initStoryFigureAnimation();

  // Retry attaching to Plotly widgets as HTMLWidgets initializes them
  setTimeout(initPlotlyScrollAnimations, 300);
  setTimeout(initPlotlyScrollAnimations, 800);
  setTimeout(initPlotlyScrollAnimations, 1500);

  // Automatically poll every 3 minutes
  setInterval(fetchLiveKTPAWeather, 180000);
  // Initial sync attempt after 1.5s to let Plotly widget render
  setTimeout(syncChartWithLatestTelemetry, 1500);
});

