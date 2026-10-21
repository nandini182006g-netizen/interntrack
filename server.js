
const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const db = require("./database");

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;

// --------------------------------------------------
// 1. MIDDLEWARE
// --------------------------------------------------

app.use(express.json({ limit: "100kb" }));

app.use(
  session({
    name: "interntrack.sid",
    secret:
      process.env.SESSION_SECRET ||
      "interntrack-local-development-secret-change-before-deployment",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

// --------------------------------------------------
// 2. DATABASE MIGRATIONS
// --------------------------------------------------

// Add userId to older applications tables if needed.
const applicationColumns = db
  .prepare("PRAGMA table_info(applications)")
  .all();

if (!applicationColumns.some(column => column.name === "userId")) {
  db.exec(`
    ALTER TABLE applications
    ADD COLUMN userId INTEGER REFERENCES users(id)
  `);
}

// Add profile columns to existing users tables if needed.
const profileColumns = [
  { name: "college", type: "TEXT" },
  { name: "degree", type: "TEXT" },
  { name: "graduationYear", type: "INTEGER" },
  { name: "skills", type: "TEXT" },
  { name: "careerGoal", type: "TEXT" }
];

const existingUserColumns = db
  .prepare("PRAGMA table_info(users)")
  .all()
  .map(column => column.name);

for (const column of profileColumns) {
  if (!existingUserColumns.includes(column.name)) {
    db.exec(
      `ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`
    );
  }
}

// --------------------------------------------------
// 3. AUTHENTICATION MIDDLEWARE
// --------------------------------------------------

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({
      error: "Please log in to continue."
    });
  }

  next();
}

// --------------------------------------------------
// 4. PAGE ROUTING
// --------------------------------------------------

// Root route and protected pages are registered before static files.
app.get("/", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/index.html");
  }

  res.redirect("/login.html");
});

const protectedPages = [
  "/index.html",
  "/applications.html",
  "/calendar.html",
  "/analytics.html",
  "/profile.html",
  "/settings.html"
];

app.get(protectedPages, (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/login.html");
  }

  next();
});

app.get(protectedPages, (req, res) => {
  const page = path.basename(req.path);
  res.sendFile(path.join(__dirname, "public", page));
});

app.get("/login.html", (req, res, next) => {
  if (req.session.userId) {
    return res.redirect("/index.html");
  }

  next();
});

// Serve CSS, JS, images and other public assets.
app.use(
  express.static(path.join(__dirname, "public"), {
    index: false
  })
);

// --------------------------------------------------
// 5. HEALTH CHECK
// --------------------------------------------------

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "InternTrack server is running!"
  });
});

// --------------------------------------------------
// 6. SIGNUP
// --------------------------------------------------

app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 80 ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      error: "Please provide a valid name, email, and password."
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (
    normalizedEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    return res.status(400).json({
      error: "Please enter a valid email address."
    });
  }

  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({
      error: "Your password must be between 8 and 72 characters."
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const result = db.prepare(`
      INSERT INTO users (name, email, passwordHash)
      VALUES (?, ?, ?)
    `).run(name.trim(), normalizedEmail, passwordHash);

    req.session.regenerate(error => {
      if (error) {
        console.error("Session creation failed:", error);

        return res.status(500).json({
          error: "Account created, but login failed. Please log in."
        });
      }

      req.session.userId = Number(result.lastInsertRowid);

      req.session.save(saveError => {
        if (saveError) {
          console.error("Session save failed:", saveError);

          return res.status(500).json({
            error: "Account created, but login failed. Please log in."
          });
        }

        res.status(201).json({
          success: true,
          message: "Account created successfully.",
          user: {
            id: Number(result.lastInsertRowid),
            name: name.trim(),
            email: normalizedEmail
          }
        });
      });
    });
  } catch (error) {
    if (
      error.code === "SQLITE_CONSTRAINT_UNIQUE" ||
      error.code === "SQLITE_CONSTRAINT_PRIMARYKEY"
    ) {
      return res.status(409).json({
        error: "An account with this email already exists."
      });
    }

    console.error("Signup failed:", error);

    res.status(500).json({
      error: "Could not create your account."
    });
  }
});

// --------------------------------------------------
// 7. LOGIN
// --------------------------------------------------

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.length > 254 ||
    password.length > 72
  ) {
    return res.status(400).json({
      error: "Please enter your email and password."
    });
  }

  try {
    const user = db.prepare(`
      SELECT id, name, email, passwordHash
      FROM users
      WHERE email = ? COLLATE NOCASE
    `).get(email.trim());

    const passwordMatches = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      return res.status(401).json({
        error: "Incorrect email or password."
      });
    }

    req.session.regenerate(error => {
      if (error) {
        console.error("Session regeneration failed:", error);

        return res.status(500).json({
          error: "Could not start your session."
        });
      }

      req.session.userId = user.id;

      req.session.save(saveError => {
        if (saveError) {
          console.error("Session save failed:", saveError);

          return res.status(500).json({
            error: "Could not save your session."
          });
        }

        res.json({
          success: true,
          message: "Login successful.",
          user: {
            id: user.id,
            name: user.name,
            email: user.email
          }
        });
      });
    });
  } catch (error) {
    console.error("Login failed:", error);

    res.status(500).json({
      error: "Could not log in."
    });
  }
});

// --------------------------------------------------
// 8. CURRENT USER AND PROFILE
// --------------------------------------------------

app.get("/api/auth/me", requireAuth, (req, res) => {
  const user = db.prepare(`
    SELECT
      id,
      name,
      email,
      college,
      degree,
      graduationYear,
      skills,
      careerGoal
    FROM users
    WHERE id = ?
  `).get(req.session.userId);

  if (!user) {
    return req.session.destroy(() => {
      res.status(401).json({
        error: "Please log in again."
      });
    });
  }

  res.json({ user });
});

// Save the logged-in user's profile.
app.put("/api/profile", requireAuth, (req, res) => {
  const {
    name,
    college,
    degree,
    graduationYear,
    skills,
    careerGoal
  } = req.body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 80
  ) {
    return res.status(400).json({
      error: "Name is required and must be under 80 characters."
    });
  }

  const textFields = [
    { value: college, max: 120, label: "College" },
    { value: degree, max: 100, label: "Degree" },
    { value: skills, max: 300, label: "Skills" },
    { value: careerGoal, max: 500, label: "Career goal" }
  ];

  for (const field of textFields) {
    if (
      field.value !== undefined &&
      field.value !== null &&
      (typeof field.value !== "string" ||
        field.value.length > field.max)
    ) {
      return res.status(400).json({
        error: `${field.label} is invalid or too long.`
      });
    }
  }

  let year = null;

  if (
    graduationYear !== undefined &&
    graduationYear !== null &&
    graduationYear !== ""
  ) {
    year = Number(graduationYear);

    if (
      !Number.isInteger(year) ||
      year < 2020 ||
      year > 2100
    ) {
      return res.status(400).json({
        error: "Please enter a valid graduation year."
      });
    }
  }

  try {
    const result = db.prepare(`
      UPDATE users
      SET name = ?,
          college = ?,
          degree = ?,
          graduationYear = ?,
          skills = ?,
          careerGoal = ?
      WHERE id = ?
    `).run(
      name.trim(),
      typeof college === "string" ? college.trim() : "",
      typeof degree === "string" ? degree.trim() : "",
      year,
      typeof skills === "string" ? skills.trim() : "",
      typeof careerGoal === "string" ? careerGoal.trim() : "",
      req.session.userId
    );

    if (result.changes === 0) {
      return res.status(404).json({
        error: "User account not found."
      });
    }

    const user = db.prepare(`
      SELECT
        id,
        name,
        email,
        college,
        degree,
        graduationYear,
        skills,
        careerGoal
      FROM users
      WHERE id = ?
    `).get(req.session.userId);

    res.json({
      success: true,
      message: "Profile saved successfully.",
      user
    });
  } catch (error) {
    console.error("Profile save failed:", error);

    res.status(500).json({
      error: "Could not save your profile."
    });
  }
});

// --------------------------------------------------
// 9. LOGOUT
// --------------------------------------------------

app.post("/api/auth/logout", (req, res) => {
  if (!req.session) {
    return res.json({ success: true });
  }

  req.session.destroy(error => {
    if (error) {
      console.error("Logout failed:", error);

      return res.status(500).json({
        error: "Could not log out."
      });
    }

    res.clearCookie("interntrack.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });

    res.json({
      success: true,
      message: "Logged out successfully."
    });
  });
});

// --------------------------------------------------
// 10. GET THIS USER'S APPLICATIONS
// --------------------------------------------------

app.get("/api/applications", requireAuth, (req, res) => {
  try {
    const applications = db.prepare(`
      SELECT
        id,
        company,
        role,
        applicationDate,
        deadline,
        jobLink,
        status,
        createdAt
      FROM applications
      WHERE userId = ?
      ORDER BY id DESC
    `).all(req.session.userId);

    res.json(applications);
  } catch (error) {
    console.error("Failed to fetch applications:", error);

    res.status(500).json({
      error: "Could not fetch applications."
    });
  }
});

// --------------------------------------------------
// 11. ADD AN APPLICATION
// --------------------------------------------------

app.post("/api/applications", requireAuth, (req, res) => {
  const {
    company,
    role,
    applicationDate,
    deadline,
    jobLink,
    status
  } = req.body;

  const allowedStatuses = [
    "Applied",
    "Assessment",
    "Interview",
    "Selected",
    "Rejected"
  ];

  if (
    typeof company !== "string" ||
    !company.trim() ||
    typeof role !== "string" ||
    !role.trim() ||
    typeof applicationDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(applicationDate)
  ) {
    return res.status(400).json({
      error: "Company, role, and a valid application date are required."
    });
  }

  if (
    (deadline &&
      (typeof deadline !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(deadline))) ||
    (jobLink && typeof jobLink !== "string") ||
    (status && !allowedStatuses.includes(status))
  ) {
    return res.status(400).json({
      error: "Please check the deadline, job link, or application status."
    });
  }

  try {
    const result = db.prepare(`
      INSERT INTO applications (
        company,
        role,
        applicationDate,
        deadline,
        jobLink,
        status,
        userId
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      company.trim(),
      role.trim(),
      applicationDate,
      deadline || null,
      jobLink || null,
      status || "Applied",
      req.session.userId
    );

    const application = db.prepare(`
      SELECT
        id, company, role, applicationDate,
        deadline, jobLink, status, createdAt
      FROM applications
      WHERE id = ? AND userId = ?
    `).get(result.lastInsertRowid, req.session.userId);

    res.status(201).json(application);
  } catch (error) {
    console.error("Failed to save application:", error);

    res.status(500).json({
      error: "Could not save the application."
    });
  }
});

// --------------------------------------------------
// 12. UPDATE THIS USER'S APPLICATION
// --------------------------------------------------

app.put("/api/applications/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);

  const {
    company,
    role,
    applicationDate,
    deadline,
    jobLink,
    status
  } = req.body;

  const allowedStatuses = [
    "Applied",
    "Assessment",
    "Interview",
    "Selected",
    "Rejected"
  ];

  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    typeof company !== "string" ||
    !company.trim() ||
    typeof role !== "string" ||
    !role.trim() ||
    typeof applicationDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(applicationDate) ||
    (deadline &&
      (typeof deadline !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(deadline))) ||
    (jobLink && typeof jobLink !== "string") ||
    !allowedStatuses.includes(status)
  ) {
    return res.status(400).json({
      error: "Invalid application details."
    });
  }

  try {
    const result = db.prepare(`
      UPDATE applications
      SET company = ?,
          role = ?,
          applicationDate = ?,
          deadline = ?,
          jobLink = ?,
          status = ?
      WHERE id = ? AND userId = ?
    `).run(
      company.trim(),
      role.trim(),
      applicationDate,
      deadline || null,
      jobLink || null,
      status,
      id,
      req.session.userId
    );

    if (result.changes === 0) {
      return res.status(404).json({
        error: "Application not found."
      });
    }

    const updatedApplication = db.prepare(`
      SELECT
        id, company, role, applicationDate,
        deadline, jobLink, status, createdAt
      FROM applications
      WHERE id = ? AND userId = ?
    `).get(id, req.session.userId);

    res.json(updatedApplication);
  } catch (error) {
    console.error("Failed to update application:", error);

    res.status(500).json({
      error: "Could not update the application."
    });
  }
});

// --------------------------------------------------
// 13. DELETE ALL OF THIS USER'S APPLICATIONS
// --------------------------------------------------

app.delete("/api/applications/all", requireAuth, (req, res) => {
  try {
    const result = db.prepare(`
      DELETE FROM applications
      WHERE userId = ?
    `).run(req.session.userId);

    res.json({
      success: true,
      message: "Your applications were deleted successfully.",
      deletedCount: result.changes
    });
  } catch (error) {
    console.error("Delete-all failed:", error);

    res.status(500).json({
      error: "Failed to delete applications."
    });
  }
});

// --------------------------------------------------
// 14. DELETE ONE OF THIS USER'S APPLICATIONS
// --------------------------------------------------

app.delete("/api/applications/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "Invalid application ID."
    });
  }

  try {
    const result = db.prepare(`
      DELETE FROM applications
      WHERE id = ? AND userId = ?
    `).run(id, req.session.userId);

    if (result.changes === 0) {
      return res.status(404).json({
        error: "Application not found."
      });
    }

    res.json({
      success: true,
      message: "Application deleted successfully."
    });
  } catch (error) {
    console.error("Failed to delete application:", error);

    res.status(500).json({
      error: "Could not delete the application."
    });
  }
});

// --------------------------------------------------
// 15. HANDLE UNKNOWN API ROUTES
// --------------------------------------------------

app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found."
  });
});

// --------------------------------------------------
// 16. START SERVER
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(`InternTrack is running at http://localhost:${PORT}`);
});
