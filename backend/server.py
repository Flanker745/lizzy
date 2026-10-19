import os
import urllib.parse
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from system_service import get_system_info
from media_service import list_players, control_player

from Lizzy_ai.main import ask_lizzy


app = Flask(__name__)
# Restrict browser requests to Vite dev origins on localhost.
# CORS(app, resources={r"/api/*": {"origins": [
#     "http://127.0.0.1:5173", "http://localhost:5173"
# ]}})

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://127.0.0.1:5173",
                "http://localhost:5173",
                "http://tauri.localhost",
                "https://tauri.localhost",
                "tauri://localhost",
            ]
        }
    },
)


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "service": "LISA local backend", "version": "1.0.0"})


@app.get("/api/system")
def system():
    try:
        return jsonify(get_system_info())
    except Exception as exc:
        app.logger.exception("System telemetry failed")
        return jsonify({"error": "System telemetry failed", "detail": str(exc)}), 500


@app.get("/api/media")
def media():
    return jsonify(list_players())


@app.post("/api/media/control")
def media_control():
    data = request.get_json(silent=True) or {}
    ok, message = control_player(data.get("player"), data.get("action"))
    return jsonify({"ok": ok, "message": message, **({} if ok else {"error": message})}), (200 if ok else 400)


@app.get("/api/media/art")
def media_art():
    # Only allow local file URIs under common user media/cache directories.
    uri = request.args.get("uri", "")
    parsed = urllib.parse.urlparse(uri)
    if parsed.scheme != "file":
        return jsonify({"error": "Only local file artwork is supported."}), 400
    path = urllib.parse.unquote(parsed.path)
    home = os.path.realpath(os.path.expanduser("~"))
    real = os.path.realpath(path)
    allowed_roots = [os.path.join(home, ".cache"), os.path.join(home, "Music"), os.path.join(home, "Downloads")]
    if not any(real.startswith(os.path.realpath(root) + os.sep) for root in allowed_roots):
        return jsonify({"error": "Artwork path is outside allowed media folders."}), 403
    if not os.path.isfile(real):
        return jsonify({"error": "Artwork file not found."}), 404
    return send_file(real)


@app.post("/api/assistant")

@app.post("/api/assistant")
def assistant():
    data = request.get_json(silent=True) or {}
    message = data.get("message", "")

    if (
        not isinstance(message, str)
        or not message.strip()
        or len(message) > 2000
    ):
        return jsonify({
            "error": "Message must contain 1–2000 characters."
        }), 400

    try:
        # Call the actual Gemini-powered assistant.
        reply = ask_lizzy(message.strip())

        if not isinstance(reply, str) or not reply.strip():
            raise RuntimeError("The AI provider returned an empty response.")

        return jsonify({
            "reply": reply,
            "provider": "gemini",
            "is_llm": True
        }), 200

    except Exception:
        # Keep detailed errors in the backend terminal, not the UI.
        app.logger.exception("Gemini assistant request failed")

        return jsonify({
            "error": (
                "LISA could not get a response from Gemini. "
                "Check the backend logs, API key, model name, "
                "internet connection, and API quota."
            ),
            "provider": "gemini",
            "is_llm": True
        }), 502

if __name__ == "__main__":
    # Loopback only: do not expose this service to the network.
    app.run(host="127.0.0.1", port=8765, debug=False)
