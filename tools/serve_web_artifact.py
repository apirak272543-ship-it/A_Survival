from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os

root = Path(__file__).resolve().parents[1] / "build-web"
os.chdir(root)
server = ThreadingHTTPServer(("0.0.0.0", 4173), SimpleHTTPRequestHandler)
print(f"serving {root} on http://0.0.0.0:4173", flush=True)
server.serve_forever()
