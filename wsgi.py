"""
WSGI entry point para IIS.
HttpPlatformHandler ejecuta este script y waitress escucha en HTTP_PLATFORM_PORT.
"""
import os
import sys
import traceback

if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if sys.stderr.encoding != "utf-8":
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

project_dir = os.path.dirname(os.path.abspath(__file__))
if project_dir not in sys.path:
    sys.path.insert(0, project_dir)

os.chdir(project_dir)

log_file = None
try:
    log_file = os.path.join(project_dir, "logs", "wsgi.log")
    os.makedirs(os.path.dirname(log_file), exist_ok=True)
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(f"\n=== Iniciando WSGI Ordenes - {os.getenv('HTTP_PLATFORM_PORT', 'N/A')} ===\n")
        f.write(f"Project dir: {project_dir}\n")
        f.write(f"Python: {sys.executable}\n")
        f.write(f"Python version: {sys.version}\n")
        f.write(f"Working directory: {os.getcwd()}\n")
except Exception:
    pass

try:
    from app import app

    application = app
    if log_file:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write("Aplicacion Flask importada correctamente\n")
except Exception:
    if log_file:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write("Error importando aplicacion\n")
            f.write(traceback.format_exc())
    raise

if os.environ.get("HTTP_PLATFORM_PORT"):
    port = int(os.environ.get("HTTP_PLATFORM_PORT", "5022"))
    if log_file:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"Iniciando waitress en puerto {port}\n")
    from waitress import serve

    print(f"Iniciando servidor en puerto {port} (IIS)", flush=True)
    serve(application, host="127.0.0.1", port=port, threads=4, channel_timeout=120)

if __name__ == "__main__" and not os.environ.get("HTTP_PLATFORM_PORT"):
    from config import HOST, PORT

    application.run(debug=True, host=HOST, port=PORT)
