"""WSGI para IIS."""
import os
import sys

project_dir = os.path.dirname(os.path.abspath(__file__))
if project_dir not in sys.path:
    sys.path.insert(0, project_dir)
os.chdir(project_dir)

from app import app

application = app

if os.environ.get("HTTP_PLATFORM_PORT"):
    from waitress import serve
    port = int(os.environ.get("HTTP_PLATFORM_PORT", 5022))
    serve(application, host="127.0.0.1", port=port, threads=4, channel_timeout=120)
