# Mega Drive S3 Upload/Download Demo

Simple Node.js Express server that generates presigned S3 URLs for uploads and downloads against a Mega Drive S3-compatible endpoint, plus a minimal static UI.

Setup

1. Copy `.env.example` to `.env` and fill in values (do NOT commit secrets).
2. Install dependencies: run `npm install`.
3. Start server: `npm start`.
4. Open browser to `http://localhost:3000`.

Repository layout

```
./
	server.js         # express server that creates presigned URLs
	package.json
	README.md
	.env.example
	LICENSE
	public/           # static UI
		index.html
		app.js
		styles.css
```

Publish to GitHub

1. Initialize a new git repository (if you haven't already):

```powershell
git init
git add .
git commit -m "Initial commit"
```

2. Create a new GitHub repository in the web UI and follow the instructions to push, or run:

```powershell
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

Important: make sure `.env` is listed in `.gitignore` and never commit secrets. Use GitHub Secrets / Actions or environment config in your deployment instead.

Environment variables

- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- S3_ENDPOINT (e.g. https://s3.eu-central-1.s4.mega.io)
- BUCKET (e.g. abm-pdf-system.s3.g.s4.mega.io)
- AWS_REGION (optional)

Notes

- This project uses AWS SDK v3 against an S3-compatible endpoint. It uses presigned PUT requests for uploads and presigned GET for downloads.
- For production, secure the endpoints (auth) and tighten CORS and permissions.

Troubleshooting

- If your browser console shows requests to :8000 or 404/501 errors, ensure the frontend is targeting the same port where the server runs. You can set the backend by adding `?backend=http://localhost:3000` to the UI URL or by setting `window.BACKEND` in the browser console.
- A 501 "Unsupported method ('POST')" typically means a proxy or server (e.g., a static file server) is receiving the request instead of the Express backend. Confirm the backend URL and port.
- If you get HTML returned where JSON is expected (Unexpected token '<'), the URL being fetched likely returned an HTML error page — check the network tab and the requested URL.

Auto-detection behaviour

- If the page is loaded via http:// or https:// (for example http://localhost:3000/ served by the Express server), the client will default to the page origin as the backend. No extra config is required.
- If the page is opened file:// or served by an unrelated static server, use the `?backend=` query parameter or set `window.BACKEND`.

