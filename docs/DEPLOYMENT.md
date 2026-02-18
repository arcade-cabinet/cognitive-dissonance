# Deployment — Cognitive Dissonance v2

## Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Production Build

```bash
npm run build
npm start
```

## Hosting

Next.js 15 App Router can be deployed to:

- **Vercel** (recommended): Zero-config, push to GitHub
- **Static export**: `output: 'export'` in next.config.mjs, host on any static CDN
- **Docker**: Standard Next.js Dockerfile

## Environment Requirements

- Node.js 22+ (see `.nvmrc` if present)
- npm (not pnpm, not yarn)
- WebGL-capable browser (Chrome, Firefox, Edge, Safari 17+)
- WebXR-capable device for hand tracking (Quest, Vision Pro)

## CSP Notes

The game is 100% CSP-safe:
- No eval or dynamic code generation
- All shaders are static string literals in `BABYLON.Effect.ShadersStore`
- No external font loading (system monospace only)
- No external image/texture loading (all procedural)

## PWA / Mobile

- PWA support via Next.js metadata + manifest
- Mobile responsive (Tailwind breakpoints on overlays)
- Touch controls for keycap interaction
- XR hand tracking for WebXR headsets
