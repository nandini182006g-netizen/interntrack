
document.addEventListener("DOMContentLoaded", loadProfile);

async function loadProfile() {
  try {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "same-origin"
    });

    // Redirect to login if the user is not authenticated.
    if (response.status === 401) {
      window.location.href = "/login.html";
      return;
    }

    if (!response.ok) {
      throw new Error("Unable to fetch profile details.");
    }

    const data = await response.json();
    const user = data.user;

    if (!user) {
      throw new Error("User details were not returned.");
    }

    // Get existing profile information saved in this browser.
    let savedProfile = {};

    try {
      savedProfile = JSON.parse(
        localStorage.getItem("interntrackProfile") || "{}"
      );
    } catch {
      savedProfile = {};
    }

    // Update the profile header.
    const displayName = document.getElementById("profileDisplayName");
    const displayEmail = document.getElementById("profileDisplayEmail");
    const displayGoal = document.getElementById("profileDisplayGoal");
    const avatar = document.getElementById("profileAvatar");

    if (displayName) {
      displayName.textContent = user.name || "Your Name";
    }

    if (displayEmail) {
      displayEmail.textContent = user.email || "";
    }

    // Show initials in the avatar.
    if (avatar) {
      const initials = (user.name || "IT")
        .trim()
        .split(/\s+/)
        .map(part => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      avatar.textContent = initials || "IT";
    }

    // Fill the full-name input.
    const fullNameInput = document.getElementById("fullName");

    if (fullNameInput) {
      fullNameInput.value = user.name || "";
    }

    // Restore other profile fields saved in this browser.
    const fields = {
      college: document.getElementById("college"),
      degree: document.getElementById("degree"),
      graduationYear: document.getElementById("graduationYear"),
      skills: document.getElementById("skills"),
      careerGoal: document.getElementById("careerGoal")
    };

    Object.entries(fields).forEach(([key, element]) => {
      if (element) {
        element.value = savedProfile[key] ?? "";
      }
    });

    if (displayGoal && savedProfile.careerGoal) {
      displayGoal.textContent = savedProfile.careerGoal;
    }

    // Save the latest account name and email alongside existing profile data.
    localStorage.setItem(
      "interntrackProfile",
      JSON.stringify({
        ...savedProfile,
        name: user.name || "",
        email: user.email || ""
      })
    );

    // Display the saved skills.
    const skillsDisplay = document.getElementById("skillsDisplay");

    if (skillsDisplay) {
      skillsDisplay.replaceChildren();

      const skills = (savedProfile.skills || "")
        .split(",")
        .map(skill => skill.trim())
        .filter(Boolean);

      skills.forEach(skill => {
        const skillTag = document.createElement("span");
        skillTag.className = "skill-tag";
        skillTag.textContent = skill;
        skillsDisplay.appendChild(skillTag);
      });
    }

  } catch (error) {
    console.error("Profile loading error:", error);
    alert("Could not load your profile. Please refresh the page.");
  }
}
document.addEventListener("DOMContentLoaded", () => {
  loadProfile();

  const profileForm = document.getElementById("profileForm");
  const resetButton = document.getElementById("resetProfile");

  if (profileForm) {
    profileForm.addEventListener("submit", saveProfile);
  }

  if (resetButton) {
    resetButton.addEventListener("click", resetProfile);
  }
});

// Stores the last profile successfully loaded or saved by the server.
let savedProfile = {};

// Display success or error messages on the page.
function showMessage(message, type = "success") {
  const messageElement = document.getElementById("profileMessage");

  if (!messageElement) {
    console.log(message);
    return;
  }

  messageElement.textContent = message;
  messageElement.style.color =
    type === "error" ? "#dc2626" : "#16a34a";
}

// Read the current values from the form.
function getProfileFromForm() {
  return {
    name: document.getElementById("fullName")?.value.trim() || "",
    college: document.getElementById("college")?.value.trim() || "",
    degree: document.getElementById("degree")?.value.trim() || "",
    graduationYear:
      document.getElementById("graduationYear")?.value || "",
    skills: document.getElementById("skills")?.value.trim() || "",
    careerGoal:
      document.getElementById("careerGoal")?.value.trim() || ""
  };
}

// Fill the form using profile data received from the server.
function fillProfileForm(profile) {
  const fields = {
    fullName: profile.name,
    college: profile.college,
    degree: profile.degree,
    graduationYear: profile.graduationYear,
    skills: profile.skills,
    careerGoal: profile.careerGoal
  };

  Object.entries(fields).forEach(([id, value]) => {
    const element = document.getElementById(id);

    if (element) {
      element.value = value ?? "";
    }
  });

  updateProfileDisplay(profile);
}

// Update the profile header, avatar, and skill tags.
function updateProfileDisplay(profile) {
  const displayName = document.getElementById("profileDisplayName");
  const displayEmail = document.getElementById("profileDisplayEmail");
  const displayGoal = document.getElementById("profileDisplayGoal");
  const avatar = document.getElementById("profileAvatar");

  if (displayName) {
    displayName.textContent = profile.name || "Your Name";
  }

  if (displayEmail) {
    displayEmail.textContent = profile.email || "";
  }

  if (displayGoal) {
    displayGoal.textContent =
      profile.careerGoal || "Your next opportunity starts here.";
  }

  // Generate avatar initials from the user's name.
  if (avatar) {
    const initials = (profile.name || "IT")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(part => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    avatar.textContent = initials || "IT";
  }

  // Display skills as individual tags.
  const skillsDisplay = document.getElementById("skillsDisplay");

  if (skillsDisplay) {
    skillsDisplay.replaceChildren();

    const skills = (profile.skills || "")
      .split(",")
      .map(skill => skill.trim())
      .filter(Boolean);

    if (skills.length === 0) {
      skillsDisplay.textContent = "No skills added yet.";
    } else {
      skills.forEach(skill => {
        const skillTag = document.createElement("span");
        skillTag.className = "skill-tag";
        skillTag.textContent = skill;
        skillsDisplay.appendChild(skillTag);
      });
    }
  }
}

// Load the user's profile from the backend.
async function loadProfile() {
  try {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "same-origin"
    });

    if (response.status === 401) {
      window.location.href = "/login.html";
      return;
    }

    const data = await response.json();

    if (!response.ok || !data.user) {
      throw new Error(
        data.message || "Unable to fetch profile details."
      );
    }

    // The server is the source of truth for profile information.
    savedProfile = {
      ...data.user,
      graduationYear: data.user.graduationYear ?? ""
    };

    fillProfileForm(savedProfile);

    // Keep a browser copy for convenience, not as the main database.
    localStorage.setItem(
      "interntrackProfile",
      JSON.stringify(savedProfile)
    );

  } catch (error) {
    console.error("Profile loading error:", error);
    showMessage(
      "Could not load your profile. Please refresh the page.",
      "error"
    );
  }
}

// Save profile changes to the backend and SQLite database.
async function saveProfile(event) {
  event.preventDefault();

  const profile = getProfileFromForm();
  const profileForm = document.getElementById("profileForm");

  const saveButton = profileForm?.querySelector(
    'button[type="submit"]'
  );

  try {
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Saving...";
    }

    showMessage("Saving your profile...");

    const response = await fetch("/api/profile", {
      method: "PUT",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(profile)
    });

    if (response.status === 401) {
      window.location.href = "/login.html";
      return;
    }

    const data = await response.json();

    if (!response.ok || !data.user) {
      throw new Error(
        data.message || "Unable to save your profile."
      );
    }

    // Update saved state only after the server confirms success.
    savedProfile = {
      ...data.user,
      graduationYear: data.user.graduationYear ?? ""
    };

    fillProfileForm(savedProfile);

    localStorage.setItem(
      "interntrackProfile",
      JSON.stringify(savedProfile)
    );

    showMessage("Profile saved successfully!");

  } catch (error) {
    console.error("Profile saving error:", error);

    showMessage(
      error.message || "Failed to save your profile. Please try again.",
      "error"
    );

  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = "Save Profile";
    }
  }
}

// Restore the last profile received from the server.
function resetProfile() {
  fillProfileForm(savedProfile);
  showMessage("Form reset to your last saved details.");
}

