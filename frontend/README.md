# PIXORA frontend

The React/Vite application lives in this folder.

```powershell
npm install
npm run dev
```

The upload client reads `VITE_API_BASE_URL` from this folder's `.env` file. For
local development, copy `.env.example` to `.env`. This value is an API address,
not a secret. Do not put Cloudinary or AI API secrets in a `VITE_*` variable:
Vite exposes those variables to browser code.

Available checks:

```powershell
npm run lint
npm run build
```

## Editing processed images

After background removal, the workspace can composite the transparent cutout
over a solid color, a preset gradient, or a custom image. Scale and horizontal
and vertical position can be adjusted before exporting PNG, JPG, or WebP.
PNG/WebP preserve transparency when no background is selected; JPG uses white
for transparent areas.

The controls live on the separate `/editor` page, opened from the processed
image preview in the workspace. The editor uses the already-processed cutout,
so changing backgrounds does not call the background-removal service again.
The latest cutout and custom background are saved in this browser's IndexedDB;
editing settings are saved in `localStorage`. Edited exports are downloaded
locally and are not uploaded to Cloudinary.
