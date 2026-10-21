
const API_URL = "/api/applications";

// Fetch applications from the SQLite backend
async function loadAnalyticsApplications() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Could not load applications.");
    }

    return await response.json();
  } catch (error) {
    console.error("Analytics loading failed:", error);

    const insights = document.getElementById("searchInsights");

    if (insights) {
      insights.replaceChildren();

      const message = document.createElement("p");
      message.className = "insight-item";
      message.textContent =
        "Unable to load analytics. Please check that the server is running.";

      insights.appendChild(message);
    }

    return null;
  }
}

async function renderAnalytics() {
  const applications = await loadAnalyticsApplications();

  // Stop if the API request failed
  if (applications === null) {
    return;
  }

  const statuses = [
    "Applied",
    "Assessment",
    "Interview",
    "Selected",
    "Rejected"
  ];

  const countByStatus = {};

  statuses.forEach(status => {
    countByStatus[status] = applications.filter(
      app => app.status === status
    ).length;
  });

  const total = applications.length;

  const active =
    countByStatus.Applied +
    countByStatus.Assessment +
    countByStatus.Interview;

  const interviews = countByStatus.Interview;
  const selected = countByStatus.Selected;

  // Update summary cards
  document.getElementById("analyticsTotal").textContent = total;
  document.getElementById("analyticsActive").textContent = active;
  document.getElementById("analyticsInterviews").textContent = interviews;

  const selectionRate = total > 0
    ? Math.round((selected / total) * 100)
    : 0;

  document.getElementById("analyticsRate").textContent =
    `${selectionRate}%`;

  // Create the status breakdown
  const breakdown = document.getElementById("statusBreakdown");
  breakdown.replaceChildren();

  statuses.forEach(status => {
    const count = countByStatus[status];

    const percentage = total > 0
      ? Math.round((count / total) * 100)
      : 0;

    const row = document.createElement("div");
    row.className = "status-row";

    const labelRow = document.createElement("div");
    labelRow.className = "status-label-row";

    const label = document.createElement("span");
    label.textContent = status;

    const countLabel = document.createElement("span");
    countLabel.textContent = `${count} (${percentage}%)`;

    labelRow.append(label, countLabel);

    const track = document.createElement("div");
    track.className = "progress-track";

    const bar = document.createElement("div");
    bar.className = "progress-fill";
    bar.style.width = `${percentage}%`;
    bar.setAttribute("aria-label", `${status}: ${percentage}%`);

    track.appendChild(bar);
    row.append(labelRow, track);
    breakdown.appendChild(row);
  });

  // Generate useful insights
  const insights = document.getElementById("searchInsights");
  insights.replaceChildren();

  const messages = [
    `You have tracked ${total} application${total === 1 ? "" : "s"} so far.`,
    `${active} application${active === 1 ? " is" : "s are"} still in progress.`,
    `${selected} selection${selected === 1 ? "" : "s"} recorded.`
  ];

  if (total === 0) {
    messages[0] =
      "Add your first application to start seeing your progress.";
  }

  messages.forEach(message => {
    const item = document.createElement("p");
    item.className = "insight-item";
    item.textContent = message;
    insights.appendChild(item);
  });
}

// Start analytics
renderAnalytics();
