"""App de órdenes de trabajo. Login GTask y partes abiertos del usuario."""
import logging
from functools import wraps

from flask import Flask, jsonify, render_template, request, session

from business_central.client import detalle_orden, listar_ordenes, valorar_orden
from config import APP_PUBLIC_URL, HOST, PORT, SECRET_KEY
import gtask_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ordenes")

app = Flask(__name__)
app.secret_key = SECRET_KEY


def _usuario():
    return session.get("user")


def _login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not _usuario():
            return jsonify({"success": False, "error": "Inicia sesión"}), 401
        return fn(*args, **kwargs)
    return wrapper


def _vista_valida(vista: str) -> str:
    if (vista or "").lower() == "supervisar":
        return "supervisar"
    return "mias"


@app.context_processor
def inject_public():
    return {"app_public_url": APP_PUBLIC_URL}


@app.route("/")
def index():
    return render_template("index.html", vista="mias", titulo="Mis órdenes")


@app.route("/supervisar")
def supervisar():
    return render_template("index.html", vista="supervisar", titulo="Por valorar")


@app.route("/OT-<no>")
def abrir_ot(no):
    if not _usuario():
        session["next"] = f"/OT-{no}"
    return render_template(
        "detalle.html",
        no=no,
        ot=f"OT-{no}",
        vista=request.args.get("vista", "mias"),
    )


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"success": False, "error": "Faltan credenciales"}), 400
    resultado = gtask_client.login(username, password)
    if not resultado.get("success"):
        return jsonify({"success": False, "error": resultado.get("error")}), 401
    session["user"] = resultado["user_data"]
    siguiente = session.pop("next", "") or ""
    return jsonify({
        "success": True,
        "user_data": resultado["user_data"],
        "next": siguiente,
    })


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True})


@app.route("/api/auth-status", methods=["GET"])
def auth_status():
    user = _usuario()
    return jsonify({
        "success": True,
        "authenticated": bool(user),
        "user_data": user,
        "es_supervisor": bool(session.get("es_supervisor")),
        "next": session.get("next") or "",
    })


@app.route("/api/ordenes", methods=["GET"])
@_login_required
def api_ordenes():
    vista = _vista_valida(request.args.get("vista", "mias"))
    try:
        data = listar_ordenes(_usuario()["id"], vista)
    except Exception as exc:
        logger.exception("api_ordenes")
        return jsonify({"success": False, "error": str(exc), "ordenes": []}), 502
    if data.get("esSupervisor"):
        session["es_supervisor"] = True
    return jsonify({
        "success": data.get("success", True),
        "esSupervisor": bool(session.get("es_supervisor")),
        "ordenes": data.get("ordenes") or [],
        "error": data.get("error") or "",
    })


@app.route("/api/ordenes/<no>", methods=["GET"])
@_login_required
def api_detalle(no):
    vista = _vista_valida(request.args.get("vista", "mias"))
    try:
        data = detalle_orden(_usuario()["id"], no, vista)
    except Exception as exc:
        logger.exception("api_detalle")
        return jsonify({"success": False, "error": str(exc)}), 502
    if isinstance(data, dict) and (data.get("esSupervisor") or data.get("puedeValorar")):
        session["es_supervisor"] = True
    return jsonify(data)


@app.route("/api/ordenes/<no>/valorar", methods=["POST"])
@_login_required
def api_valorar(no):
    if not session.get("es_supervisor"):
        return jsonify({"success": False, "error": "Solo un supervisor puede valorar la orden"}), 403
    try:
        data = valorar_orden(_usuario()["id"], no)
    except Exception as exc:
        logger.exception("api_valorar")
        return jsonify({"success": False, "error": str(exc)}), 502
    return jsonify(data), (200 if data.get("success") else 400)


if __name__ == "__main__":
    print(f"Órdenes de trabajo — {APP_PUBLIC_URL}")
    print(f"Abre: http://{HOST}:{PORT}")
    app.run(debug=True, host=HOST, port=PORT)
