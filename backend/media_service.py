import shutil
import subprocess
import urllib.parse


def _run(args, timeout=2):
    return subprocess.run(
        args, capture_output=True, text=True, timeout=timeout, check=False
    )


def list_players():
    if not shutil.which("playerctl"):
        return {"players": [], "error": "playerctl is not installed. Install it with: sudo pacman -S playerctl"}
    try:
        result = _run(["playerctl", "-l"])
    except (subprocess.TimeoutExpired, OSError) as exc:
        return {"players": [], "error": f"Could not query MPRIS: {exc}"}
    names = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    players = []
    for name in names:
        if not name.replace(".", "").replace("_", "").replace("-", "").isalnum():
            continue
        def prop(key):
            try:
                r = _run(["playerctl", "-p", name, "metadata", key])
                return r.stdout.strip() if r.returncode == 0 else ""
            except (subprocess.TimeoutExpired, OSError):
                return ""
        try:
            status_run = _run(["playerctl", "-p", name, "status"])
            status = status_run.stdout.strip() if status_run.returncode == 0 else "Unknown"
            pos_run = _run(["playerctl", "-p", name, "position"])
            position = float(pos_run.stdout.strip()) if pos_run.returncode == 0 and pos_run.stdout.strip() else 0
            duration_us = prop("mpris:length")
            duration = int(duration_us) / 1_000_000 if duration_us.isdigit() else 0
            art = prop("mpris:artUrl")
            if art.startswith("file://"):
                art = "/api/media/art?uri=" + urllib.parse.quote(art, safe="")
            players.append({
                "name": name,
                "title": prop("title") or "Unknown title",
                "artist": prop("artist") or "",
                "album": prop("album") or "",
                "art_url": art if art.startswith(("http://", "https://", "/api/media/art")) else "",
                "status": status,
                "position": position,
                "duration": duration,
                "position_label": _time_label(position),
                "duration_label": _time_label(duration),
                "can_control": True,
            })
        except Exception:
            continue
    return {"players": players, "error": ""}


def control_player(player, action):
    allowed = {"play", "pause", "play-pause", "next", "previous", "stop"}
    if action not in allowed:
        return False, "Unsupported media action."
    if not isinstance(player, str) or not player or len(player) > 100:
        return False, "Invalid player name."
    if not player.replace(".", "").replace("_", "").replace("-", "").isalnum():
        return False, "Invalid player name."
    if not shutil.which("playerctl"):
        return False, "playerctl is not installed."
    try:
        result = _run(["playerctl", "-p", player, action], timeout=3)
        if result.returncode != 0:
            return False, result.stderr.strip() or "Player control failed."
        return True, "OK"
    except (subprocess.TimeoutExpired, OSError) as exc:
        return False, str(exc)


def _time_label(seconds):
    seconds = max(0, int(seconds or 0))
    return f"{seconds // 60:02d}:{seconds % 60:02d}"
