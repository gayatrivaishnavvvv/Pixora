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
5. The transparent PNG is returned to the browser for preview/download. It is
   temporary and is not stored in Cloudinary or image history.

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

Guest upload tokens expire after one hour. In this phase, they are temporary
session identity, not user accounts or permanent image history.

## API routes

- `POST /api/v1/uploads/session` — issue a short-lived guest upload token.
- `POST /api/v1/uploads/signature` — create restricted signed upload parameters.
- `POST /api/v1/uploads/verify` — verify a Cloudinary asset belongs to that
  guest session.
- `POST /api/v1/uploads/remove-background` — verify guest ownership and request
  a transparent PNG from remove.bg.
- `DELETE /api/v1/uploads/asset` — verify ownership and delete the asset.
- `GET /api/v1/health` — report API and database connection status.

Start the backend from this folder so dotenv loads this folder's `.env` file:

```powershell
npm run dev
```

Run the backend tests with `npm test`. Background removal still requires your
own `REMOVE_BG_API_KEY` in `.env`; uploads and deletion work without it.
