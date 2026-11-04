"""Koora Clash server — standard library only.

Run:  python server.py   (optional: --port 8000)
Open the host screen on a laptop/TV, players join from their phones on the same Wi-Fi.
"""
import argparse
import json
import mimetypes
import os
import socket
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import game
from game import LOCK, ROOMS, Room

STATIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
PAGES = {"/": "index.html", "/host": "host.html", "/play": "play.html"}


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "KooraClash"

    def log_message(self, *args):
        pass

    def send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, path):
        full = os.path.normpath(os.path.join(STATIC, path))
        if not full.startswith(STATIC) or not os.path.isfile(full):
            self.send_error(404)
            return
        with open(full, "rb") as f:
            body = f.read()
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype.endswith("javascript"):
            ctype += "; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        url = urlparse(self.path)
        if url.path in PAGES:
            return self.send_file(PAGES[url.path])
        if url.path.startswith("/static/"):
            return self.send_file(url.path[len("/static/"):])
        if url.path == "/api/info":
            return self.send_json({"lan": f"http://{lan_ip()}:{self.server.server_port}"})
        if url.path == "/api/alive":
            q = parse_qs(url.query)
            with LOCK:
                room = ROOMS.get((q.get("room") or [""])[0].upper())
                cid = (q.get("cid") or [""])[0]
                ok = bool(room) and (cid == room.host_token or cid in room.players)
            return self.send_json({"ok": ok}, 200 if ok else 404)
        if url.path == "/events":
            return self.events(parse_qs(url.query))
        self.send_error(404)

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except ValueError:
            return self.send_json({"error": "bad_json"}, 400)
        path = urlparse(self.path).path
        with LOCK:
            if path == "/api/create":
                room = Room()
                ROOMS[room.code] = room
                return self.send_json({"room": room.code, "cid": room.host_token})
            room = ROOMS.get(str(body.get("room", "")).upper().strip())
            if not room:
                return self.send_json({"error": "no_room"}, 404)
            room.touched = game.now()
            if path == "/api/join":
                name = str(body.get("name", "")).strip()[:16]
                if not name:
                    return self.send_json({"error": "no_name"}, 400)
                same = [pid for pid, p in room.players.items() if p["name"].lower() == name.lower()]
                if same:
                    # Same name on a dropped connection = the same person rejoining (phone slept, tab closed).
                    if not room.players[same[0]]["connected"]:
                        return self.send_json({"room": room.code, "cid": same[0]})
                    return self.send_json({"error": "name_taken"}, 409)
                pid = room.join(name, body.get("team"))
                room.broadcast()
                return self.send_json({"room": room.code, "cid": pid})
            if path == "/api/action":
                cid, act = body.get("cid"), str(body.get("act", ""))
                payload = body.get("p") or {}
                if cid == room.host_token:
                    ok = room.host_action(act, payload)
                elif cid in room.players:
                    ok = room.player_action(cid, act, payload)
                else:
                    return self.send_json({"error": "unknown_client"}, 403)
                if ok:
                    room.broadcast()
                return self.send_json({"ok": bool(ok)})
        self.send_error(404)

    def events(self, q):
        code = (q.get("room") or [""])[0].upper()
        cid = (q.get("cid") or [""])[0]
        with LOCK:
            room = ROOMS.get(code)
            ch = room.channels.get(cid) if room else None
            if not ch or (cid != room.host_token and cid not in room.players):
                return self.send_json({"error": "gone"}, 404)
            ch.listeners += 1
            if cid in room.players:
                room.players[cid]["connected"] = True
            room.broadcast()
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()
        last = -1
        try:
            while True:
                with ch.cond:
                    if ch.version == last:
                        ch.cond.wait(15)
                    data, ver = ch.data, ch.version
                if ver != last:
                    self.wfile.write(f"data: {data}\n\n".encode("utf-8"))
                    last = ver
                else:
                    self.wfile.write(b": ping\n\n")
                self.wfile.flush()
                if '"kicked": true' in data:
                    break
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, OSError):
            pass
        finally:
            with LOCK:
                ch.listeners -= 1
                if room.code in ROOMS and cid in room.players and ch.listeners <= 0:
                    room.players[cid]["connected"] = False
                    room.broadcast()


class Server(ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):
        # Phones sleeping or tabs closing drop sockets all the time; that's not an error worth a traceback.
        import sys
        if isinstance(sys.exc_info()[1], ConnectionError):
            return
        super().handle_error(request, client_address)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=int(os.environ.get("PORT", 8000)))
    args = ap.parse_args()
    threading.Thread(target=game.ticker, daemon=True).start()
    srv = Server(("0.0.0.0", args.port), Handler)
    print(f"Koora Clash running.\n  Host screen:  http://localhost:{args.port}/host\n"
          f"  Phones join:  http://{lan_ip()}:{args.port}/play  (same Wi-Fi)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
