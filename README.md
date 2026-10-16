# Donation Management System

## Run locally

Install Node.js, then open a terminal in this folder and run:

```powershell
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). Use this address instead of opening the pages with Live Server; the Express server handles form submissions and database requests.

The app creates a SQLite database named `.donations.sqlite` on first launch and inserts the sample records. New donors, campaigns, beneficiaries, and donations are saved there and remain available after restarting the server.

## Login accounts

| Role | Username | Default password |
| --- | --- | --- |
| Administrator | `admin` | `Admin123!` |
| Regular user | `donation_user` | `GiveWithCare2026!` |

Regular users can view records and create donors or donations. Only administrators can create campaigns or beneficiaries. Passwords are stored as salted hashes and sessions expire after eight hours. Set `USER_USERNAME` and `USER_PASSWORD` to the same values on every server that should share these credentials. On its first startup after this update, a server changes the legacy regular account named `user` to these credentials and revokes its old sessions. Later restarts do not overwrite password resets. The default credentials are intended for this demo; change them before exposing a deployment publicly.

## User password recovery

The **Forgot user password?** link resets only the regular `user` account. Since this local project has no email service, the server generates a strong recovery key on first launch and saves it in the ignored `.user-recovery-key` file. Keep that file private. You can instead provide your own key before starting the server. In PowerShell:

```powershell
$env:USER_RESET_CODE = "your-private-recovery-key-at-least-16-chars"
npm start
```

The recovery form requires the key and a new password of at least 10 characters. A successful reset revokes existing sessions for the regular user. This recovery link cannot reset the administrator password.

## Publish online

The app supports hosted PostgreSQL through the `DATABASE_URL` environment variable; local runs without it continue to use SQLite. `render.yaml` prepares the web service for Render, while PostgreSQL is supplied by a separate hosted SQL provider such as Neon.

1. Create a private GitHub repository and push this project. Do not include `.donations.sqlite`, `.user-recovery-key`, or `node_modules`.
2. Create a PostgreSQL database with a provider and copy its connection string. Keep it private.
3. In Render, create a Blueprint from the GitHub repository. When prompted, set `DATABASE_URL` to the PostgreSQL connection string; the blueprint generates separate admin, user, and recovery secrets.
4. After deployment, open the URL shown by Render. The first database startup creates the schema and sample rows. The deployed app starts with new accounts and does not automatically copy records from your local SQLite file.

The Render free web service can sleep while idle, and free-tier quotas/provider terms can change. Keep the GitHub repository private and rotate the generated account secrets before sharing the site.