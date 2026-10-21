
const API_URL = "/api/applications";

document.addEventListener("DOMContentLoaded", loadDashboard);


// Load applications from the backend.
async function loadDashboard() {
  const deadlineContainer =
    document.getElementById("upcomingDeadlines");

  try {
    if (deadlineContainer) {
      deadlineContainer.textContent = "Loading deadlines...";
    }

    const response = await fetch(API_URL, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "Accept": "application/json"
      }
    });

    // Redirect to login if the session has expired.
    if (response.status === 401) {
      window.location.href = "/login.html";
      return;
    }

    if (!response.ok) {
      throw new Error("Could not load dashboard applications.");
    }

    const applications = await response.json();

    if (!Array.isArray(applications)) {
      throw new Error("Unexpected applications data received.");
    }

    updateDashboardStats(applications);
    displayUpcomingDeadlines(applications);

  } catch (error) {
    console.error("Dashboard loading failed:", error);

    if (deadlineContainer) {
      deadlineContainer.textContent =
        "Unable to load applications. Please check your connection and try again.";
    }
  }
}


// Update dashboard counts.
function updateDashboardStats(applications) {
  const countByStatus = status =>
    applications.filter(
      application => application.status === status
    ).length;

  const countElements = {
    totalCount: applications.length,
    appliedCount: countByStatus("Applied"),
    assessmentCount: countByStatus("Assessment"),
    interviewCount: countByStatus("Interview"),
    selectedCount: countByStatus("Selected"),
    rejectedCount: countByStatus("Rejected")
  };

  Object.entries(countElements).forEach(([id, count]) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = count;
    }
  });
}


// Convert YYYY-MM-DD into a readable date.
function formatDeadline(dateString) {
  const parts = dateString.split("-").map(Number);

  if (
    parts.length !== 3 ||
    !parts.every(Number.isFinite)
  ) {
    return dateString;
  }

  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);

  // Reject invalid calendar dates.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}


// Display upcoming deadlines.
function displayUpcomingDeadlines(applications) {
  const container =
    document.getElementById("upcomingDeadlines");

  if (!container) return;

  container.replaceChildren();

  // Compare dates without including the current time.
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const upcomingApplications = applications
    .filter(application => {
      if (!application.deadline) return false;

      // Expect the date format YYYY-MM-DD.
      const parts = application.deadline.split("-").map(Number);

      if (parts.length !== 3 || !parts.every(Number.isFinite)) {
        return false;
      }

      const [year, month, day] = parts;
      const deadline = new Date(year, month - 1, day);

      const isValidDate =
        deadline.getFullYear() === year &&
        deadline.getMonth() === month - 1 &&
        deadline.getDate() === day;

      return (
        isValidDate &&
        deadline >= today &&
        application.status !== "Selected" &&
        application.status !== "Rejected"
      );
    })
    .sort((a, b) =>
      a.deadline.localeCompare(b.deadline)
    )
    .slice(0, 5);

  if (upcomingApplications.length === 0) {
    const message = document.createElement("p");
    message.className = "empty-state";
    message.textContent = "No upcoming deadlines.";
    container.appendChild(message);
    return;
  }

  upcomingApplications.forEach(application => {
    const card = document.createElement("div");
    card.className = "deadline-item";

    const company = document.createElement("h3");
    company.textContent = application.company || "Unnamed company";

    const role = document.createElement("p");
    role.textContent = application.role || "Role not specified";

    const deadline = document.createElement("p");
    deadline.textContent =
      "Deadline: " + formatDeadline(application.deadline);

    const status = document.createElement("span");
    status.className =
      "status status-" +
      String(application.status || "applied").toLowerCase();
    status.textContent = application.status || "Applied";

    card.append(company, role, deadline, status);
    container.appendChild(card);
  });
}
