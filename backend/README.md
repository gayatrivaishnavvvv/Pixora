# PIXORA backend

The Express API, database connection, signed upload endpoints, and Cloudinary
integration live in this folder.

## Local setup

From this folder, create `.env` from the template if it does not already exist.
In Git Bash:

```bash
npm install
if [ ! -f .env ]; then cp .env.example .env; fi
notepad.exe .env
npm run dev
```

In PowerShell, use:

```powershell
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
npm run dev
```

Fill in the values in `.env` yourself. Do not paste credentials into source
files or send them in chat. `.env.example` is a placeholder template, not the
file for real credentials.

### MongoDB Atlas

1. Create an Atlas project, cluster, database user, and database.
2. Add your current development IP address to the Atlas network access list.
3. Copy the application connection string into `MONGODB_URI`.
4. Replace its username, password, cluster, and database placeholders. URL-encode
   special characters in the database user's password.

### Cloudinary

1. Create or open a Cloudinary account and copy its cloud name and API key.
2. Keep the API secret private and put it only in `CLOUDINARY_API_SECRET`.
3. In Cloudinary Console → Settings → Upload, create a **signed** upload preset
   named `pixora_signed`.
4. Restrict that preset to JPG, PNG, and WEBP, with a 10 MB maximum file size.
5. Put the exact preset name in `CLOUDINARY_UPLOAD_PRESET`.

The frontend receives an upload signature and API key, never the API secret.
The signed request assigns a server-generated ID in a controlled folder. After a
direct browser-to-Cloudinary upload, the API checks the asset's ownership and
metadata before accepting it. Deletion is also performed by the backend after
the same ownership check.

### remove.bg background removal

1. Create/sign in to a remove.bg account and create an API key in its dashboard.
2. Add the key to `REMOVE_BG_API_KEY` in `backend/.env`. Keep it out of frontend
   files and never commit or share the `.env` file.
3. Restart the backend after changing `.env`.
4. In Workspace, choose an image, select **Upload original**, then select
   **Remove background**. Processing sends the uploaded Cloudinary image URL
   from the backend to remove.bg. The API key is sent only from the backend.
5. The transparent PNG is uploaded to the session's Cloudinary folder and
   linked to its MongoDB history record. The original and processed assets are
   deleted together when the history item is deleted.

The remove.bg API documentation currently advertises 50 API calls per month at
no charge; check its current account pricing and limits before processing
images. Its documentation also announces a move to Leonardo.Ai on December 1,
2026, while stating that the API integration remains the same.

## Guest session secret

Generate a random value locally, then paste its output into
`UPLOAD_SESSION_SECRET` in `.env`:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Guest sessions use signed, HttpOnly cookies scoped to the Pixora API, with
SameSite protection and a 30-day lifetime. Guest MongoDB history records and
their Cloudinary assets are retained for that period; an hourly backend cleanup
removes expired assets and records. Account-owned history has no guest-session
expiry. History is cloud-backed, not browser-local storage. Clearing a workspace
preview does not delete a saved history item; use Delete in History to remove
both Cloudinary assets immediately.

## Accounts and authentication

Set `AUTH_SESSION_SECRET` to a separate random value (do not reuse the upload
session secret; generate a second random value with the command above). Account
passwords are hashed with bcrypt; the API issues a seven-day, HttpOnly,
SameSite cookie and never returns the session token in JSON. Production cookies
use `SameSite=None; Secure` for cross-origin deployments and require the
configured frontend origin and request-verification header.
Authenticated dashboard, profile, and image-history requests are scoped to the
verified user ID. On registration or sign-in, unexpired guest history from the
current guest session is transferred to that account and is no longer available
through the guest identity.

Google sign-in uses Google Identity Services in the frontend and verifies the
returned ID token on the backend. Create a Google OAuth client ID in Google
Cloud Console, add the development and production frontend origins as
authorized JavaScript origins, then set the same client ID in
`frontend/.env` as `VITE_GOOGLE_CLIENT_ID` and in `backend/.env` as
`GOOGLE_CLIENT_ID`. Restart both applications after changing environment
variables. Google sign-in links to an existing account only when Google returns
a verified email matching that account.

Guests can process up to two distinct original images per 30-day guest session.
The backend atomically reserves each image before calling the processing
provider, releases the reservation if processing fails, and stores the usage in
MongoDB until that guest session expires. Authenticated users are not subject to
the guest limit.

## API routes

- `POST /api/v1/uploads/session` — create or reuse the HttpOnly guest session.
- `POST /api/v1/uploads/signature` — create restricted signed upload parameters.
- `POST /api/v1/uploads/verify` — verify a Cloudinary asset belongs to that
  guest session.
- `POST /api/v1/uploads/remove-background` — verify upload ownership and request
  a transparent PNG from remove.bg; guests are limited to two distinct images.
- `DELETE /api/v1/uploads/asset` — verify ownership and delete the asset.
- `GET /api/v1/history` — search, filter, sort, and paginate this session's images.
- `POST /api/v1/history` — persist a verified original image in MongoDB.
- `GET /api/v1/history/:id` — retrieve the saved original and processed assets.
- `GET /api/v1/history/:id/assets/:kind` — retrieve this session's stored
  original or processed asset through the API.
- `PATCH /api/v1/history/:id/processed` — attach the verified transparent PNG.
- `PATCH /api/v1/history/:id/settings` — save editing settings.
- `DELETE /api/v1/history/:id` — delete the record and both associated assets.
- `POST /api/v1/auth/register` — create an account and claim current guest history.
- `POST /api/v1/auth/login` — authenticate and issue the HttpOnly session cookie.
- `POST /api/v1/auth/google` — verify a Google ID token and issue the session cookie.
- `POST /api/v1/auth/logout` — clear the authentication cookie.
- `GET /api/v1/auth/me` — retrieve the authenticated user profile.
- `GET /api/v1/auth/dashboard` — retrieve the account profile and image count.
- `PATCH /api/v1/auth/profile` — update the account display name.
- `GET /api/v1/health` — report API and database connection status.

Start the backend from this folder so dotenv loads this folder's `.env` file:

```powershell
npm run dev
```

Run the backend tests with `npm test`. Background removal still requires your
own `REMOVE_BG_API_KEY` in `.env`; uploads and deletion work without it.
