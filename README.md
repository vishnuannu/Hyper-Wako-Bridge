# Hyper Hindi → Wako Bridge (experimental)

This is a small Vercel serverless wrapper around the public Hyper Hindi Stremio add-on.
It forwards manifest/stream requests and adds Wako `behaviorHints.proxyHeaders.request`
to returned URL streams using the Referer/Origin observed in the user's Stremio request.

## Deploy
1. Create a new GitHub repository (do not overwrite your existing Flux-Stream repository).
2. Upload these files keeping the folder structure.
3. In Vercel, import that repository and deploy with the default settings.
4. The Wako manifest URL will be:
   `https://YOUR-VERCEL-PROJECT.vercel.app/manifest.json`
5. Add that URL in Wako → Add-ons → Add Add-on / Install by URL.

## Important limitations
- This is an experimental compatibility wrapper, not a guarantee that Hyper playback will work in Wako.
- It forwards source URLs; it does not download, decrypt, bypass DRM, or remove provider restrictions.
- Hyper may change its endpoint or source headers. Signed stream URLs can expire.
- If Wako ignores `proxyHeaders`, or the provider requires additional per-source headers/cookies, playback may still fail.
- This bridge only targets the user's existing Hyper Hindi configuration (`local:hi`, compact/list display).
