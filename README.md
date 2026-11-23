# VELTRIX Builder

AI-assisted website builder prototype by VELTRIX.

## Current features
- Website builder UI and category-based price estimates
- Provider selection UI (Gemini, OpenAI, Claude, Grok, Perplexity)
- Local/demo generation workflow and progress UI
- Website preview and HTML export

## Important
This is a prototype. Provider integrations require API keys and configuration. Never put API keys in `index.html`, commit `.env`, or share keys in public repositories. Before public launch, add user authentication, rate limits, provider cost controls, abuse protection, and secure payment verification. GitHub Pages can host static frontend files only; it cannot run `server.js`.


## Run locally
1. Install Node.js 18+.
2. Copy `.env.example` to `.env` and add only your own provider API keys (do not commit `.env`).
3. Install dependencies: `npm install`
4. Start: `npm start`
5. Open the local address printed by the server.

## Deploy frontend with GitHub Pages (static prototype only)
1. Create a public repository named `veltrix-builder`.
2. Upload `index.html` to the repository root.
3. In the repository, open **Settings → Pages**.
4. Under Build and deployment, choose **Deploy from a branch**.
5. Choose `main` and `/ (root)`, then Save.
6. Wait for the deployment and open the Pages URL shown there.

The static GitHub Pages deployment will not provide the Node backend or live API endpoints. Host `server.js` on a backend-capable service separately when ready.
