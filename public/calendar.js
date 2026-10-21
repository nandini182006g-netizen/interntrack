
const calendarDays = document.getElementById("calendarDays");
const monthTitle = document.getElementById("monthTitle");
const selectedDateTitle = document.getElementById("selectedDateTitle");
const deadlineDetails = document.getElementById("deadlineDetails");

let displayedDate = new Date();
let selectedDate = null;
let applications = [];

// Load applications from the backend API
async function loadApplications() {
  try {
    const response = await fetch("/api/applications");

    if (!response.ok) {
      throw new Error("Could not load applications.");
    }

    applications = await response.json();
    renderCalendar();

    // Refresh deadline details if a date is selected
    if (selectedDate) {
      showDeadlines(selectedDate);
    }
  } catch (error) {
    console.error("Failed to load calendar applications:", error);

    calendarDays.replaceChildren();

    const message = document.createElement("p");
    message.textContent =
      "Unable to load applications. Please check that the server is running.";

    calendarDays.appendChild(message);
  }
}

// Format date as YYYY-MM-DD
function formatDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Show applications due on the selected date
function showDeadlines(dateString) {
  selectedDate = dateString;

  selectedDateTitle.textContent = `Deadlines for ${dateString}`;
  deadlineDetails.replaceChildren();

  const matchingApplications = applications.filter(
    app => app.deadline === dateString
  );

  if (matchingApplications.length === 0) {
    const message = document.createElement("p");
    message.textContent = "No internship deadlines on this date.";
    deadlineDetails.appendChild(message);
    return;
  }

  matchingApplications.forEach(app => {
    const card = document.createElement("article");
    card.className = "deadline-item";

    const company = document.createElement("h3");
    company.textContent = app.company || "Unknown company";

    const role = document.createElement("p");
    role.textContent = app.role || "Role not specified";

    const status = document.createElement("p");
    status.textContent = `Status: ${app.status || "Applied"}`;

    card.append(company, role, status);
    deadlineDetails.appendChild(card);
  });
}

// Render the calendar
function renderCalendar() {
  const year = displayedDate.getFullYear();
  const month = displayedDate.getMonth();

  monthTitle.textContent = displayedDate.toLocaleDateString("en", {
    month: "long",
    year: "numeric"
  });

  calendarDays.replaceChildren();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Empty cells before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-day empty";
    calendarDays.appendChild(emptyCell);
  }

  const today = new Date();
  const todayString = formatDate(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = formatDate(year, month, day);

    const dayButton = document.createElement("button");
    dayButton.type = "button";
    dayButton.className = "calendar-day";
    dayButton.textContent = day;
    dayButton.setAttribute("aria-label", dateString);

    const hasDeadline = applications.some(
      app => app.deadline === dateString
    );

    if (hasDeadline) {
      dayButton.classList.add("has-deadline");
      dayButton.title = "Internship deadline";
    }

    if (dateString === todayString) {
      dayButton.classList.add("today");
    }

    if (dateString === selectedDate) {
      dayButton.classList.add("selected");
    }

    dayButton.addEventListener("click", () => {
      showDeadlines(dateString);
      renderCalendar();
    });

    calendarDays.appendChild(dayButton);
  }
}

// Previous month
document.getElementById("prevMonth").addEventListener("click", () => {
  displayedDate.setMonth(displayedDate.getMonth() - 1);
  renderCalendar();
});

// Next month
document.getElementById("nextMonth").addEventListener("click", () => {
  displayedDate.setMonth(displayedDate.getMonth() + 1);
  renderCalendar();
});

// Start the calendar
loadApplications();
