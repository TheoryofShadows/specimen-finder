/**
 * Specimen Finder — Pl@ntNet API proxy (Cloudflare Worker)
 *
 * Why this exists
 * ---------------
 * Specimen Finder is a static site, so calling Pl@ntNet directly from the
 * browser means (a) the API key is exposed in the page, and (b) you have to
 * win Pl@ntNet's "expose my API key" + "Authorized domains" CORS fight.
 *
 * This Worker holds the Pl@ntNet key as a *server-side secret* and forwards
 * identification requests on the browser's behalf. The browser never sees the
 * key, and there is no domain whitelist to configure — the proxy answers CORS
 * itself. Visitors don't need a key at all.
 *
 * Setup (full walkthrough in PLANTNET-PROXY-SETUP.md)
 * ---------------------------------------------------
 *   1. Create a Cloudflare Worker and paste this file in.
 *   2. Add a secret variable named PLANTNET_API_KEY = your Pl@ntNet key.
 *   3. (Recommended) Add a plain variable ALLOWED_ORIGIN =
 *        https://theoryofshadows.github.io   to lock the proxy to your site.
 *   4. Deploy, copy the Worker URL, and put it in PLANTNET_PROXY_URL near the
 *      top of index.html's script (or paste it in the app's setup modal).
 */

const PLANTNET_ENDPOINT = 'https://my-api.plantnet.org/v2/identify/all';

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Health check — visit the Worker URL in a browser to confirm it's live
    // and that the key secret is set (without revealing the key).
    if (request.method === 'GET') {
      const keyConfigured = Boolean(env.PLANTNET_API_KEY);
      return json(
        { ok: keyConfigured, service: 'specimen-finder plantnet-proxy', keyConfigured },
        keyConfigured ? 200 : 500,
        cors
      );
    }

    if (request.method !== 'POST') {
      return json({ message: 'Method not allowed. Send a POST with the photo.' }, 405, cors);
    }

    if (!env.PLANTNET_API_KEY) {
      return json(
        { message: 'Proxy misconfigured: the PLANTNET_API_KEY secret is not set on this Worker.' },
        500,
        cors
      );
    }

    // Build the upstream URL. The key is injected here, server-side; everything
    // else (organs, image) rides along in the multipart body untouched. We let
    // a few harmless display params pass through from the caller.
    const incoming = new URL(request.url);
    const target = new URL(PLANTNET_ENDPOINT);
    target.searchParams.set('api-key', env.PLANTNET_API_KEY);
    target.searchParams.set(
      'include-related-images',
      incoming.searchParams.get('include-related-images') || 'false'
    );
    target.searchParams.set('no-reject', incoming.searchParams.get('no-reject') || 'false');
    target.searchParams.set('lang', incoming.searchParams.get('lang') || 'en');

    const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
    const body = await request.arrayBuffer();

    let upstream;
    try {
      upstream = await fetch(target.toString(), {
        method: 'POST',
        headers: { 'Content-Type': contentType },
        body,
      });
    } catch (e) {
      return json({ message: 'Proxy could not reach Pl@ntNet: ' + e.message }, 502, cors);
    }

    // Pass Pl@ntNet's response straight back (status included), but with our
    // CORS headers so the browser is allowed to read it.
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...cors,
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
      },
    });
  },
};

function corsHeaders(request, env) {
  // If ALLOWED_ORIGIN is set we echo it back only when the caller matches;
  // otherwise we fall back to '*'. Echoing the exact origin (rather than '*')
  // is what some browsers require, so we compare and reflect.
  const allowed = (env.ALLOWED_ORIGIN || '').trim();
  const origin = request.headers.get('Origin') || '';
  let allowOrigin = '*';
  if (allowed) {
    allowOrigin = origin && origin === allowed ? origin : allowed;
  }
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
