document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  const isLogin = path.endsWith("login.html");
  const isLanding = path.endsWith("/") || path.endsWith("index.html");
  const isApp = path.endsWith("app.html");

  // Si estamos en login: solo necesitamos el handler del formulario
  if (isLogin) {
    initLoginForm();
    return;
  }

  // Si estamos en landing (index.html), no montamos SPA
  if (isLanding) return;

  // Guard: si no hay “sesión” y estamos en la app, mandamos a login
  const isLoggedIn = localStorage.getItem("bm_logged_in") === "1";
  if (!isLoggedIn && isApp) {
    window.location.href = "login.html";
    return;
  }

  // A partir de aquí: estamos en app.html
  if (!isApp) return;

  document.body.classList.add("bm-no-page-scroll");
  
  const container = document.getElementById("view-container");
  const todayLabel = document.getElementById("bmTodayLabel");
  const logoutBtn = document.getElementById("bmLogoutBtn");

  if (!container) return;

  // ---------- helpers ----------
  function formatToday() {
    const now = new Date();
    const weekday = now.toLocaleDateString("es-ES", { weekday: "long" });
    const time = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} · ${time}`;
  }

  function getViewFromHash() {
    const raw = (window.location.hash || "").replace("#", "").trim();
    if (!raw) return null;
    return raw;
  }

  function setActiveLink(view) {
    const links = document.querySelectorAll(".bm-sidebar .nav-link");
    links.forEach(l => l.classList.remove("active"));
    const current = document.querySelector(`.bm-sidebar .nav-link[data-view="${view}"]`);
    if (current) current.classList.add("active");
  }

  function scrollChatToBottom() {
    const chatBody =
      document.querySelector(".chat-scroll-container") ||
      document.querySelector('.card-body[style*="overflow-y: auto"]');

    if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
  }

  async function loadView(viewName) {
    const map = {
      "inicio": "views/dashboard.html",
      "horario": "views/calendario.html",
      "progreso": "views/progreso.html",
      "tests": "views/tests.html",
      "material": "views/material.html",
      "chat": "views/chat.html",
      "logros": "views/logros.html"
    };

    const file = map[viewName];
    if (!file) {
      container.innerHTML = `
        <div class="alert alert-warning mb-0">
          Vista no reconocida: <strong>${viewName}</strong>
        </div>
      `;
      return;
    }

    try {
      container.innerHTML = `
        <div class="bm-card card">
          <div class="card-body">
            <div class="d-flex align-items-center gap-2">
              <div class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></div>
              <span class="text-muted">Cargando…</span>
            </div>
          </div>
        </div>
      `;

      const res = await fetch(file);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const html = await res.text();
      container.innerHTML = html;

      setActiveLink(viewName);
      localStorage.setItem("bm_last_view", viewName);

      // Hooks por vista
      if (viewName === "inicio") initProgressChart();
      if (viewName === "progreso") setTimeout(initProgresoChart, 40);
      if (viewName === "chat") requestAnimationFrame(() => {
        scrollChatToBottom();
        setTimeout(scrollChatToBottom, 80);
      });

    } catch (err) {
      console.error(err);
      container.innerHTML = `
        <div class="alert alert-danger mb-0">
          No se ha podido cargar <strong>${viewName}</strong>. (Prototipo)
        </div>
      `;
    }
  }

  function bindSidebar() {
    const links = document.querySelectorAll(".bm-sidebar .nav-link");
    links.forEach(link => {
      link.addEventListener("click", (e) => {
        const view = link.dataset.view;
        if (!view) return;
        e.preventDefault();
        window.location.hash = view; // mantiene navegación “real”
      });
    });
  }

  function initLogout() {
    if (!logoutBtn) return;
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("bm_logged_in");
      localStorage.removeItem("bm_last_view");
      window.location.href = "index.html";
    });
  }

  // ---------- init ----------
  if (todayLabel) todayLabel.textContent = formatToday();
  bindSidebar();
  initLogout();

  // Cargar vista inicial:
  const fromHash = getViewFromHash();
  const last = localStorage.getItem("bm_last_view");
  const initial = fromHash || last || "inicio";
  setActiveLink(initial);
  loadView(initial);

  // Si cambia el hash (navegación del navegador), cambiamos vista
  window.addEventListener("hashchange", () => {
    const view = getViewFromHash() || "inicio";
    loadView(view);
  });

  // ---------- Gráficas ----------
  function initProgressChart() {
    const ctx = document.getElementById("progressChart");
    if (!ctx || ctx._bmChartInstance) return;

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Tema 1", "Tema 2", "Tema 3", "Tema 4", "Tema 5"],
        datasets: [{
          label: "Notas (simulado)",
          data: [7.2, 7.8, 6.9, 7.6, 7.4],
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.08)",
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: "#2563eb"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { min: 0, max: 10, ticks: { stepSize: 2 } } },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => ` Nota: ${c.parsed.y.toFixed(1)}` } }
        }
      }
    });

    ctx._bmChartInstance = chart;
  }

  function initProgresoChart() {
    const ctx = document.getElementById("progresoChart");
    if (!ctx || ctx._bmChartInstance) return;

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Semana 1", "Semana 2", "Semana 3", "Semana 4"],
        datasets: [
          {
            label: "Matemáticas II",
            data: [6.8, 7.1, 7.4, 7.8],
            borderColor: "#2563eb",
            backgroundColor: "rgba(37, 99, 235, 0.10)",
            cubicInterpolationMode: "monotone",
            borderWidth: 3,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: "Física",
            data: [6.9, 6.5, 6.8, 7.0],
            borderColor: "#f59e0b",
            backgroundColor: "rgba(245, 158, 11, 0.12)",
            cubicInterpolationMode: "monotone",
            borderWidth: 3,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: "Lengua",
            data: [6.2, 6.1, 6.4, 6.5],
            borderColor: "#dc2626",
            backgroundColor: "rgba(220, 38, 38, 0.12)",
            cubicInterpolationMode: "monotone",
            borderWidth: 3,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: "Inglés",
            data: [7.8, 8.0, 7.9, 8.1],
            borderColor: "#0d9488",
            backgroundColor: "rgba(13, 148, 136, 0.12)",
            cubicInterpolationMode: "monotone",
            borderWidth: 3,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { min: 0, max: 10, ticks: { stepSize: 2 } } },
        plugins: {
          legend: {
            display: true,
            labels: { usePointStyle: true, pointStyle: "circle", padding: 18, font: { size: 12 } }
          },
          tooltip: {
            callbacks: {
              title: c => `Semana ${c[0].dataIndex + 1}`,
              label: c => `${c.dataset.label}: ${c.parsed.y.toFixed(1)}`
            }
          }
        }
      }
    });

    ctx._bmChartInstance = chart;
  }
});

function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Validación ligera (visual)
    if (!form.checkValidity()) {
      e.stopPropagation();
      form.classList.add("was-validated");
      return;
    }

    localStorage.setItem("bm_logged_in", "1");
    localStorage.setItem("bm_last_view", "inicio");
    window.location.href = "app.html#inicio";
  });
}
