"""
Llamadas a Business Central para órdenes de trabajo.

Contrato esperado (el otro hilo lo publica en la codeunit GTask):

ListarOrdenesUsuario
  Entrada: {"idGtask":"...","vista":"mias"|"supervisar"}
  Salida:  {"success":true,"esSupervisor":true,"ordenes":[
              {"no","descripcion","recurso","direccion","estado","idQr"}]}
  La vista "mias" solo devuelve partes en estado Abierto asignados al usuario.

DetalleOrdenTrabajo
  Entrada: {"idGtask":"...","no":"...","vista":"mias"|"supervisar"}
  Salida:  {"success":true,"puedeValorar":false,"orden":{...},"lineas":[
              {"codigo","descripcion","cantidad"}]}

CerrarParteTrabajo (ok del supervisor)
  Entrada: {"no_parte":"...","idGtask":"..."}
  El parte pasa a Cerrado. El operario deja de verlo.
"""
import json
from typing import Any, Optional

import requests

from config import (
    BC_CONFIG,
    get_bc_auth_credentials,
    get_bc_auth_header,
    get_bc_procedure_detalle,
    get_bc_procedure_listar,
    get_bc_procedure_url,
    get_bc_procedure_valorar,
)


def _parse_value(response: requests.Response) -> Any:
    data = response.json()
    if isinstance(data, dict) and data.get("error"):
        raise RuntimeError(str(data.get("error")))
    if isinstance(data, dict) and "value" in data:
        raw = data["value"]
        if isinstance(raw, str):
            raw = raw.replace("\r\n", " ").replace("\n", " ").strip()
            if not raw:
                return {}
            return json.loads(raw)
        return raw
    return data


def _llamar(procedure: str, payload: dict) -> Any:
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    auth_header = get_bc_auth_header()
    auth = None if auth_header else get_bc_auth_credentials()
    if auth_header:
        headers["Authorization"] = auth_header
    if auth and not auth[0]:
        raise RuntimeError("Faltan las credenciales de Business Central en el entorno")

    response = requests.post(
        get_bc_procedure_url(procedure),
        params={"company": BC_CONFIG["company"], "procedure": procedure},
        headers=headers,
        data=json.dumps({"jsonText": json.dumps(payload, ensure_ascii=False)}),
        auth=auth,
        timeout=BC_CONFIG.get("timeout", 120),
    )
    if response.status_code not in (200, 201):
        texto = (response.text or "")[:400]
        raise RuntimeError(f"Business Central ({procedure}) ha respondido {response.status_code}. {texto}")
    if not response.content:
        return {}
    return _parse_value(response)


def listar_ordenes(id_gtask: str, vista: str) -> dict:
    data = _llamar(get_bc_procedure_listar(), {"idGtask": id_gtask, "vista": vista})
    if not isinstance(data, dict):
        return {"success": False, "error": "Respuesta de listado no válida", "ordenes": []}
    ordenes = data.get("ordenes") or data.get("Ordenes") or []
    if not isinstance(ordenes, list):
        ordenes = []
    return {
        "success": data.get("success", True) is not False,
        "esSupervisor": bool(data.get("esSupervisor") or data.get("EsSupervisor")),
        "ordenes": ordenes,
        "error": data.get("error") or data.get("mensaje") or "",
    }


def detalle_orden(id_gtask: str, no: str, vista: str) -> dict:
    data = _llamar(
        get_bc_procedure_detalle(),
        {"idGtask": id_gtask, "no": no, "vista": vista},
    )
    if not isinstance(data, dict):
        return {"success": False, "error": "Respuesta de detalle no válida"}
    return data


def valorar_orden(id_gtask: str, no: str) -> dict:
    data = _llamar(
        get_bc_procedure_valorar(),
        {"no_parte": no, "idGtask": id_gtask},
    )
    if isinstance(data, dict) and data.get("success") is False:
        return {"success": False, "error": data.get("error") or data.get("mensaje") or "No se pudo cerrar la orden"}
    return {"success": True, "mensaje": "Orden valorada"}
