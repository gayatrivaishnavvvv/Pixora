# PIXORA

PIXORA is a web app for removing image backgrounds and editing the resulting cutout. Choose a JPG, PNG, or WEBP image, process it, then customize the transparent result in a separate editor.

## Features

- Preview images before uploading.
- Upload originals directly to Cloudinary using a signed request.
- Remove backgrounds through the backend using remove.bg.
- Edit the processed cutout without running background removal again:
  - Choose a color, preset gradient, or custom background image.
  - Adjust the cutout’s scale and position.
  - Reset edits and export as PNG, JPG, or WebP.
- Download the edited result.

## How image storage works

- The original image is uploaded to Cloudinary.
- The background-removed image and custom background are saved in the current browser.
- Editing settings are saved in browser storage.
- Edited exports are downloaded locally and are not uploaded to Cloudinary.
- Guest upload sessions are temporary; PIXORA does not currently provide user accounts or permanent image history.

## Tech stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express
- **Storage and services:** Cloudinary, MongoDB, remove.bg

## Requirements

- Node.js and npm
- A MongoDB connection
- A Cloudinary account and signed upload preset
- A remove.bg API key for background removal

## Run locally

Open two PowerShell terminals from the project root.

### 1. Configure and start the backend

```powershell
cd .\backend
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

Fill in the values in `backend/.env`:

- MongoDB connection string
- Cloudinary cloud name, API key, API secret, and upload preset
- A random `UPLOAD_SESSION_SECRET` of at least 32 characters
- `REMOVE_BG_API_KEY` to enable background removal

In Cloudinary, configure a **signed** upload preset named `pixora_signed` for JPG, PNG, and WEBP images with a 10 MB maximum size.

Keep API secrets in `backend/.env` only. Never put them in frontend variables, commit them, or share them publicly.

Start the backend:

```powershell
npm run dev
```

The API runs at `http://localhost:5000`. You can check its health at `http://localhost:5000/api/v1/health`.

### 2. Configure and start the frontend

In a second terminal:

```powershell
cd .\frontend
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Vite prints the frontend URL when it starts. The frontend’s `VITE_API_BASE_URL` setting is an API address, not a secret.

## Checks

Run backend tests:

```powershell
cd .\backend
npm test
```

Run frontend lint and production build:

```powershell
cd .\frontend
npm run lint
npm run build
```

Run backend tests from `backend/`:

```powershell
npm test
```

The Cloudinary upload path stores the original. Background removal is handled by
remove.bg through the backend; add `REMOVE_BG_API_KEY` to `backend/.env` to
enable it. Processed PNGs are temporary in the browser and are not stored in
Cloudinary.
