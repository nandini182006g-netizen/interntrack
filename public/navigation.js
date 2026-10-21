
const navigationItems = [
  { label: "Dashboard", href: "index.html", icon: "⌂", page: "dashboard" },
  { label: "My Applications", href: "applications.html", icon: "▤", page: "applications" },
  { label: "Deadline Calendar", href: "calendar.html", icon: "▦", page: "calendar" },
  { label: "Analytics", href: "analytics.html", icon: "◷", page: "analytics" },
  { label: "My Profile", href: "profile.html", icon: "◎", page: "profile" },
  { label: "Settings", href: "settings.html", icon: "⚙", page: "settings" }
];

const navigationRoot = document.getElementById("appNavigation");

if (navigationRoot) {
  const currentPage = document.body.dataset.page || "dashboard";

  navigationRoot.innerHTML = `
    <aside class="sidebar">
      <a class="brand" href="index.html">
        <span class="brand-icon">✦</span>
        <span>InternTrack</span>
      </a>

      <p class="sidebar-label">WORKSPACE</p>

      <nav class="sidebar-nav" aria-label="Main navigation">
        ${navigationItems.map(item => `
          <a
            class="nav-link ${currentPage === item.page ? "active" : ""}"
            href="${item.href}"
            ${currentPage === item.page ? 'aria-current="page"' : ""}
          >
            <span class="nav-icon">${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `).join("")}
      </nav>

      <div class="sidebar-bottom">
        <div class="sidebar-tip">
          <span class="tip-icon">🌱</span>
          <strong>Keep growing!</strong>
          <p>Every application brings you closer to your next opportunity.</p>
        </div>

        <button type="button" class="nav-link logout-button" id="logoutButton">
          <span class="nav-icon">↪</span>
          <span>Logout</span>
        </button>

        <p class="sidebar-footer">InternTrack · Your career journey</p>
      </div>
    </aside>
  `;

  // Handle logout through the backend.
  const logoutButton = document.getElementById("logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      try {
        logoutButton.disabled = true;

        const label = logoutButton.querySelector("span:last-child");
        if (label) label.textContent = "Logging out...";

        const response = await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin"
        });

        if (!response.ok) {
          throw new Error("Logout failed. Please try again.");
        }

        // Navigate only after the server confirms logout.
        window.location.replace("/login.html");

      } catch (error) {
        console.error("Logout error:", error);
        alert(error.message || "Unable to log out. Please try again.");

        logoutButton.disabled = false;

        const label = logoutButton.querySelector("span:last-child");
        if (label) label.textContent = "Logout";
      }
    });
  }
}
