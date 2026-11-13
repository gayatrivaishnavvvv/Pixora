# PIXORA

PIXORA is split into two independently runnable applications:

```text
Pixora/
  frontend/   React + Vite user interface
  backend/    Express API, MongoDB, and Cloudinary integration
  .gitignore  Shared rules for secrets, dependencies, and build output
```

## Run the frontend

From the project root in PowerShell:

```powershell
cd .\frontend
npm install
npm run dev
```

Vite prints the local URL when it starts.

## Run the backend

Use a second terminal. In Git Bash:

```bash
cd ./backend
npm install
if [ ! -f .env ]; then cp .env.example .env; fi
notepad.exe .env
npm run dev
```

In PowerShell:

```powershell
cd .\backend
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
npm run dev
```

The backend needs MongoDB Atlas and Cloudinary values before it can start. Follow
the setup guide in [backend/README.md](./backend/README.md). Never put secret
values in frontend environment variables or commit a `.env` file.

## Useful checks

Run these commands from `frontend/`:

```powershell
npm run lint
npm run build
```

Run backend tests from `backend/`:

```powershell
npm test
```

The Cloudinary upload path stores the original. Background removal is handled by
remove.bg through the backend; add `REMOVE_BG_API_KEY` to `backend/.env` to
enable it. Guests can process two images per guest session; registration unlocks
additional processing. Email/password and Google sign-in are supported. Google
sign-in requires the same Google OAuth client ID in `backend/.env` and
`frontend/.env`. Guest image history is stored in MongoDB with original and
processed assets in Cloudinary. Guest histories expire after 30 days; see
[backend/README.md](./backend/README.md) for session and cleanup details.
