
const form = document.getElementById("internshipForm");

const companyInput = document.getElementById("company");
const roleInput = document.getElementById("role");
const applicationDateInput =
  document.getElementById("applicationDate");
const deadlineInput = document.getElementById("deadline");
const jobLinkInput = document.getElementById("jobLink");
const statusInput = document.getElementById("status");

const applicationList =
  document.getElementById("applicationList");

const formTitle = document.getElementById("formTitle");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEdit");

const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const resultCount = document.getElementById("resultCount");

let applications = [];
let editingId = null;


// LOAD APPLICATIONS FROM THE DATABASE
async function loadApplications() {
  try {
    const response = await fetch("/api/applications");

    if (!response.ok) {
      throw new Error("Could not load applications.");
    }

    applications = await response.json();
    renderApplications();
  } catch (error) {
    console.error("Failed to load applications:", error);

    applicationList.textContent =
      "Could not load applications. Check that the server is running.";

    alert(
      "Unable to connect to the server. Please check your server terminal."
    );
  }
}


// ADD OR UPDATE APPLICATION
form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const company = companyInput.value.trim();
  const role = roleInput.value.trim();
  const applicationDate = applicationDateInput.value;
  const deadline = deadlineInput.value;
  const jobLink = jobLinkInput.value.trim();
  const status = statusInput.value;

  if (!company || !role || !applicationDate) {
    alert("Please enter the company, role, and application date.");
    return;
  }

  if (deadline && deadline < applicationDate) {
    alert("The deadline cannot be earlier than the application date.");
    return;
  }

  const application = {
    company,
    role,
    applicationDate,
    deadline,
    jobLink,
    status
  };

  try {
    const url = editingId === null
      ? "/api/applications"
      : `/api/applications/${editingId}`;

    const method = editingId === null ? "POST" : "PUT";

    submitBtn.disabled = true;

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(application)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Could not save the application."
      );
    }

    resetForm();
    await loadApplications();

  } catch (error) {
    console.error("Failed to save application:", error);
    alert(error.message || "Something went wrong while saving.");
  } finally {
    submitBtn.disabled = false;
  }
});


// COUNT APPLICATIONS BY STATUS
function countByStatus(status) {
  return applications.filter(function (app) {
    return app.status === status;
  }).length;
}


// UPDATE DASHBOARD COUNTS
function updateDashboard() {
  document.getElementById("totalCount").textContent =
    applications.length;

  document.getElementById("appliedCount").textContent =
    countByStatus("Applied");

  document.getElementById("assessmentCount").textContent =
    countByStatus("Assessment");

  document.getElementById("interviewCount").textContent =
    countByStatus("Interview");

  document.getElementById("selectedCount").textContent =
    countByStatus("Selected");

  document.getElementById("rejectedCount").textContent =
    countByStatus("Rejected");
}


// DISPLAY APPLICATIONS
function renderApplications() {
  applicationList.innerHTML = "";

  updateDashboard();

  const searchText = searchInput.value.toLowerCase().trim();
  const selectedStatus = filterStatus.value;

  const filteredApplications = applications.filter(function (app) {
    const matchesSearch =
      app.company.toLowerCase().includes(searchText) ||
      app.role.toLowerCase().includes(searchText);

    const matchesStatus =
      selectedStatus === "All" ||
      app.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  resultCount.textContent =
    filteredApplications.length +
    (filteredApplications.length === 1
      ? " application"
      : " applications");

  if (filteredApplications.length === 0) {
    const message = document.createElement("p");
    message.className = "empty-state";

    message.textContent = applications.length === 0
      ? "No applications yet. Add your first internship above!"
      : "No applications match your search or filter.";

    applicationList.appendChild(message);
    return;
  }

  filteredApplications.forEach(function (application) {
    const card = document.createElement("article");
    card.className = "application-card";

    const title = document.createElement("h3");
    title.textContent = application.company;

    const role = document.createElement("p");
    role.textContent = "Role: " + application.role;

    const appliedDate = document.createElement("p");
    appliedDate.textContent =
      "Applied: " +
      (application.applicationDate || "Not provided");

    const deadline = document.createElement("p");
    deadline.textContent =
      "Deadline: " +
      (application.deadline || "Not provided");

    const status = document.createElement("span");
    status.className =
      "status status-" + application.status.toLowerCase();
    status.textContent = application.status;

    card.append(title, role, appliedDate, deadline, status);

    if (application.jobLink) {
      const link = document.createElement("a");

      link.className = "job-link";
      link.href = application.jobLink;
      link.textContent = "View Job ↗";
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      card.appendChild(link);
    }

    const actions = document.createElement("div");
    actions.className = "actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "edit-btn";
    editBtn.textContent = "Edit";

    editBtn.addEventListener("click", function () {
      editApplication(application.id);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";

    deleteBtn.addEventListener("click", function () {
      deleteApplication(application.id);
    });

    actions.append(editBtn, deleteBtn);
    card.appendChild(actions);

    applicationList.appendChild(card);
  });
}


// EDIT APPLICATION
function editApplication(id) {
  const application = applications.find(function (item) {
    return item.id === id;
  });

  if (!application) return;

  editingId = id;

  companyInput.value = application.company;
  roleInput.value = application.role;
  applicationDateInput.value = application.applicationDate || "";
  deadlineInput.value = application.deadline || "";
  jobLinkInput.value = application.jobLink || "";
  statusInput.value = application.status;

  formTitle.textContent = "Edit Internship";
  submitBtn.textContent = "Update Application";
  cancelEditBtn.hidden = false;

  form.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


// DELETE APPLICATION
async function deleteApplication(id) {
  const confirmed = confirm(
    "Are you sure you want to delete this application?"
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`/api/applications/${id}`, {
      method: "DELETE"
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Could not delete the application."
      );
    }

    if (editingId === id) {
      resetForm();
    }

    await loadApplications();

  } catch (error) {
    console.error("Failed to delete application:", error);
    alert(error.message || "Something went wrong while deleting.");
  }
}


// RESET FORM
function resetForm() {
  editingId = null;
  form.reset();

  formTitle.textContent = "Add an Internship";
  submitBtn.textContent = "Add Application";
  cancelEditBtn.hidden = true;
}


// CANCEL EDIT
cancelEditBtn.addEventListener("click", function () {
  resetForm();
});


// SEARCH
searchInput.addEventListener("input", function () {
  renderApplications();
});


// STATUS FILTER
filterStatus.addEventListener("change", function () {
  renderApplications();
});


// INITIALIZE
loadApplications();
