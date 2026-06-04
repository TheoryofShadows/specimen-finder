# Pl@ntNet proxy setup (≈15 minutes, free)

This makes photo identification work **without** putting your Pl@ntNet API key
in the browser and **without** ever touching Pl@ntNet's "Authorized domains"
screen again. A tiny Cloudflare Worker holds your key on the server and forwards
photos to Pl@ntNet on the site's behalf.

Once it's set up, **visitors don't need any key at all** — photo ID just works.

> You only do this once. The Worker code is in
> [`cloudflare-worker/plantnet-proxy.js`](cloudflare-worker/plantnet-proxy.js).

---

## What you need

- Your Pl@ntNet API key (the one you already have).
- A free Cloudflare account (no credit card required).

The free Workers plan allows 100,000 requests/day — far more than the Pl@ntNet
free tier's 500 identifications/day, so the proxy will never be the bottleneck.

---

## Step 1 — Create the Worker

1. Go to <https://dash.cloudflare.com> and sign up / log in.
2. In the left sidebar choose **Workers & Pages** → **Create** → **Create Worker**.
3. Give it a name like `plantnet-proxy`. (Your URL will be
   `https://plantnet-proxy.<your-subdomain>.workers.dev`.)
4. Click **Deploy** (it deploys a hello-world placeholder for now).
5. Click **Edit code**.
6. Delete everything in the editor, then paste the entire contents of
   [`cloudflare-worker/plantnet-proxy.js`](cloudflare-worker/plantnet-proxy.js).
7. Click **Deploy** (top right).

## Step 2 — Add your Pl@ntNet key as a secret

1. Leave the editor (top-left back arrow) → open the Worker's **Settings** tab.
2. Find **Variables and Secrets** (sometimes "Variables").
3. Add a variable:
   - **Name:** `PLANTNET_API_KEY`
   - **Value:** your Pl@ntNet key
   - Click **Encrypt** so it's stored as a **secret** (not plain text).
4. *(Recommended)* Add a second, plain (non-encrypted) variable to lock the
   proxy to your site:
   - **Name:** `ALLOWED_ORIGIN`
   - **Value:** `https://theoryofshadows.github.io`
5. **Save and deploy.**

## Step 3 — Confirm it's alive

Open your Worker URL in a browser:

```
https://plantnet-proxy.<your-subdomain>.workers.dev
```

You should see:

```json
{ "ok": true, "service": "specimen-finder plantnet-proxy", "keyConfigured": true }
```

- `keyConfigured: true` → the secret is set correctly. 🎉
- `keyConfigured: false` → go back to Step 2; the secret name must be exactly
  `PLANTNET_API_KEY`.

## Step 4 — Point the app at the proxy

Pick **one**:

**Option A — for everyone (recommended for the live site).**
In `index.html`, find this line near the top of the main `<script>`:

```js
const PLANTNET_PROXY_URL = '';
```

Put your Worker URL between the quotes:

```js
const PLANTNET_PROXY_URL = 'https://plantnet-proxy.your-subdomain.workers.dev';
```

Commit and push. Now every visitor gets working photo ID with no key.
*(If you'd rather I drop the URL in for you, just paste it to me.)*

**Option B — just for your browser (quick test).**
In the app, open **Set up photo ID** → expand **"Advanced: use a proxy"** →
paste the Worker URL → **Save**. You can leave the key box empty.

---

## How it works / security notes

- The browser sends the photo to your Worker; the Worker adds the key and calls
  Pl@ntNet. The key is never sent to the browser.
- The Worker answers CORS itself, so there is no Pl@ntNet "expose my API key" /
  "Authorized domains" configuration to get right.
- `ALLOWED_ORIGIN` means only your site can use the proxy from a browser. Leave
  it unset and the proxy answers any origin (`*`).
- The build-time constant `PLANTNET_PROXY_URL` always wins over a value pasted
  in the modal, so once you set Option A the whole site uses the proxy.

## Troubleshooting

| You see | Cause | Fix |
| --- | --- | --- |
| Health check `keyConfigured: false` | Secret missing/misnamed | Step 2 — name must be `PLANTNET_API_KEY` |
| App: "rejected through your proxy (401/403)" | Wrong key in the secret | Re-add the secret with the correct key, redeploy |
| App: "could not reach Pl@ntNet (502)" | Pl@ntNet temporarily down | Try again shortly |
| Browser CORS error | `ALLOWED_ORIGIN` doesn't match your site | Set it to exactly `https://theoryofshadows.github.io` (or remove it) |
