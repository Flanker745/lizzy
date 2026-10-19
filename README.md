# LISA — Local Intelligent System Assistant

A React/Vite desktop-style dashboard and Flask backend for Arch Linux. It includes a cinematic hologram dashboard, seven horizontal tabs, live `psutil` telemetry, MPRIS media controls through `playerctl`, a guarded demo terminal, and an assistant integration point.

## Requirements

- Arch Linux (or another Linux distribution with Python 3)
- Node.js 18+ and npm
- `playerctl` for media sessions
- Browser with modern CSS support
- Network access for the requested Tailwind CDN and Google Fonts during development (the app still runs without them, but styling/fonts may differ)

## 1. Install system dependencies (Arch)

```bash
sudo pacman -S --needed nodejs npm python python-pip playerctl
```

## 2. Start the Python backend

```bash
cd LISA/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python server.py
```

The backend listens only on `127.0.0.1:8765`. Do not run it as root. Check health at `http://127.0.0.1:8765/api/health`.

If your Python environment is externally managed, create and activate the virtual environment as shown; do not use `sudo pip`.

## 3. Start the frontend

Open a second terminal:

```bash
cd LISA
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Media Center setup

1. Install `playerctl`: `sudo pacman -S playerctl`.
2. Start a media stream in Brave or Chrome.
3. Keep the backend running and click **Media Center → Scan sessions**.
4. The browser must publish a media session over MPRIS/D-Bus. Browser flags, desktop session type, and media playback can affect visibility.

Test in a terminal:

```bash
playerctl -l
playerctl -l | while read player; do playerctl -p "$player" metadata; done
```

MPRIS does **not** recognize arbitrary audio playing through speakers. It discovers application media sessions that are exposed to D-Bus. Browser media session metadata can be incomplete; artwork may be absent or remote. Volume control is omitted because support varies by player.

## Hologram asset

`public/assets/lisa-hologram.png` is the generated visual asset. It is blended into the dark stage with CSS lighting, scanning, floating and holographic rings. Replace it with a transparent PNG/WebP character asset for cleaner compositing if you have one. The generated image is visually suitable but has a dark backdrop, so its edges may blend imperfectly on some screens.

## AI integration

The `/api/assistant` route currently provides deterministic, clearly labelled local helper responses. It is **not an LLM**. To use an AI provider, add the provider SDK to the backend, read the API key from an environment variable, and implement the provider call inside `assistant()`; never put the secret in React or Vite environment variables prefixed with `VITE_`.

Voice input is a prototype notice only; speech-to-text has not been configured.

## Terminal safety

The terminal tab is a safe frontend demo and only implements `help`, `status`, `date`, `uptime`, `media`, and `clear`. It does not execute shell commands. There is deliberately no arbitrary shell API endpoint.

## Known limitations

- Tailwind Play CDN (`https://cdn.tailwindcss.com`) is used as requested. It is intended for development/prototyping rather than production. For production, install Tailwind locally and build assets.
- Hardware temperatures and battery data depend on kernel drivers and hardware support; missing values are reported as unavailable.
- Network numbers are cumulative counters since boot, not live bandwidth rates.
- The system monitor polls every three seconds and media sessions every five seconds.
- Process details may be limited by normal user permissions.
- Local artwork access is restricted to `~/.cache`, `~/Music`, and `~/Downloads`.
- The backend is loopback-bound and CORS-restricted, but this is still a local development prototype, not a hardened multi-user service.

## Quick troubleshooting

- **Frontend can't connect:** make sure `python server.py` is running and open the UI at `http://127.0.0.1:5173`.
- **CORS errors:** use the exact localhost/127.0.0.1 Vite origin above.
- **No media sessions:** run `playerctl -l`, start media in a browser, and verify D-Bus/MPRIS is available in your desktop session.
- **Missing system values:** try `python -c "import psutil; print(psutil.sensors_battery())"` inside the backend venv; some values are simply unsupported.
- **Frontend dependency issues:** remove `node_modules` and `package-lock.json`, then run `npm install` again.

## QA checklist

- [ ] `npm install && npm run dev`
- [ ] `python server.py` starts on localhost
- [ ] `/api/health` returns `ok: true`
- [ ] Dashboard updates telemetry when backend is running
- [ ] All seven top tabs navigate
- [ ] Animations toggle works in Settings
- [ ] Media Center reports actual MPRIS sessions (not sample tracks)
- [ ] Play/pause/next/previous calls return a real backend result
- [ ] Terminal demo never executes arbitrary shell input
- [ ] AI page clearly states provider is not configured
- [ ] Mobile layout remains navigable and readable
# lizzy
