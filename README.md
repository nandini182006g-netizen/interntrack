# InternTrack

A full-stack web application for organizing and tracking internship applications.

## Features

- User signup, login, and logout
- Secure password hashing
- Profile management with persistent storage
- Add, edit, and delete internship applications
- Track application statuses: Applied, Assessment, Interview, Selected, and Rejected
- Dashboard statistics and upcoming deadlines
- Calendar and analytics pages
- Responsive interface

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** SQLite with better-sqlite3
- **Authentication:** Express sessions and bcryptjs

## Run Locally

1. Install [Node.js](https://nodejs.org/).
2. Clone this repository.
3. Open a terminal in the project directory.
4. Install dependencies:

   ```bash
   npm install
   ```

5. Start the application:

   ```bash
   npm start
   ```

6. Open `http://localhost:3000` in your browser.

## Security

- Passwords are hashed before storage.
- Protected routes require authentication.
- User application data is scoped to the authenticated account.
- Environment secrets and local database files should not be committed to Git.

## Future Improvements

- Production deployment
- Persistent production database
- Automated tests
- Improved analytics and reporting

---

Created as a full-stack web development portfolio project.
