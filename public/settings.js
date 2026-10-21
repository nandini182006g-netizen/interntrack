
const API_URL = "/api/applications";

const exportButton = document.getElementById("exportData");
const clearButton = document.getElementById("clearApplications");
const countElement = document.getElementById("savedApplicationCount");
const exportMessage = document.getElementById("exportMessage");
const deleteMessage = document.getElementById("deleteMessage");

// Load applications from the backend
async function readApplications() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Server error: ${response.status}`
    );
  }

  return await response.json();
}

// Update saved application count
async function updateStorageCount() {
  try {
    const applications = await readApplications();
    countElement.textContent = applications.length;
  } catch (error) {
    console.error("Unable to load application count:", error);
    countElement.textContent = "Unavailable";
  }
}

// Export applications as a JSON backup
exportButton.addEventListener("click", async () => {
  exportButton.disabled = true;
  exportMessage.textContent = "Preparing backup...";

  try {
    const applications = await readApplications();

    const backup = {
      exportedAt: new Date().toISOString(),
      applications
    };

    const file = new Blob(
      [JSON.stringify(backup, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = "interntrack-backup.json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    exportMessage.textContent =
      `Backup exported with ${applications.length} application(s).`;
  } catch (error) {
    console.error("Unable to export applications:", error);
    exportMessage.textContent = "Export failed: " + error.message;
  } finally {
    exportButton.disabled = false;
  }
});

// Delete all applications from the backend
clearButton.addEventListener("click", async () => {
  const confirmed = window.confirm(
    "Are you sure you want to delete ALL internship applications? " +
    "This cannot be undone. Export a backup first if you need one."
  );

  if (!confirmed) {
    deleteMessage.textContent = "Deletion cancelled.";
    return;
  }

  clearButton.disabled = true;
  deleteMessage.textContent = "Deleting applications...";

  try {
    const response = await fetch(`${API_URL}/all`, {
      method: "DELETE"
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.error || `Server error: ${response.status}`
      );
    }

    await updateStorageCount();

    deleteMessage.textContent =
      `All applications deleted. Records removed: ${result.deletedCount ?? "unknown"}.`;
  } catch (error) {
    console.error("Unable to delete applications:", error);
    deleteMessage.textContent =
      "Deletion failed: " + error.message;
  } finally {
    clearButton.disabled = false;
  }
});

// Initialize the count
updateStorageCount();
