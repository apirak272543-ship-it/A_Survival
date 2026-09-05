from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os

root = Path(__file__).resolve().parents[1] / "build-web"
os.chdir(root)


class IsolatedArtifactHandler(SimpleHTTPRequestHandler):
    """Serve the Web artifact with headers required by Emscripten pthreads."""

    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        super().end_headers()


server = ThreadingHTTPServer(("0.0.0.0", 4173), IsolatedArtifactHandler)
print(f"serving {root} on http://0.0.0.0:4173", flush=True)
server.serve_forever()
