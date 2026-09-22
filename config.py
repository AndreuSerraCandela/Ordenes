"""Configuración de la app Órdenes de trabajo."""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).parent

BUSINESS_CENTRAL_BASE_URL = os.getenv("BUSINESS_CENTRAL_BASE_URL", "https://bc220.malla.es")
BUSINESS_CENTRAL_API_KEY = os.getenv("BUSINESS_CENTRAL_API_KEY", "")
BUSINESS_CENTRAL_COMPANY = os.getenv("BUSINESS_CENTRAL_COMPANY", "Malla Publicidad")
BUSINESS_CENTRAL_USERNAME = os.getenv("BUSINESS_CENTRAL_USERNAME", "")
BUSINESS_CENTRAL_PASSWORD = os.getenv("BUSINESS_CENTRAL_PASSWORD", "")

GTASK_API_URL = os.getenv("GTASK_API_URL", "https://gtasks-api.deploy.malla.es").rstrip("/")

APP_PUBLIC_URL = os.getenv("APP_PUBLIC_URL", "https://ordenes.malla.es").strip().rstrip("/")
SECRET_KEY = os.getenv("SECRET_KEY", "ordenes-dev-cambiar")

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "5022"))

BC_CONFIG = {
    "base_url": BUSINESS_CENTRAL_BASE_URL,
    "company": BUSINESS_CENTRAL_COMPANY,
    "credentials": {
        "username": BUSINESS_CENTRAL_USERNAME,
        "password": BUSINESS_CENTRAL_PASSWORD,
    },
    "timeout": int(os.getenv("BUSINESS_CENTRAL_TIMEOUT", "120")),
}


def get_bc_url() -> str:
    return BC_CONFIG.get("base_url", BUSINESS_CENTRAL_BASE_URL).rstrip("/")


def get_bc_auth_header() -> str:
    if BUSINESS_CENTRAL_API_KEY:
        return f"Bearer {BUSINESS_CENTRAL_API_KEY}"
    return ""


def get_bc_auth_credentials() -> tuple:
    credentials = BC_CONFIG.get("credentials", {})
    return (
        credentials.get("username", BUSINESS_CENTRAL_USERNAME),
        credentials.get("password", BUSINESS_CENTRAL_PASSWORD),
    )


def get_bc_procedure_url(procedure: str) -> str:
    """URL OData GtaskMalla_{procedimiento}."""
    base = get_bc_url()
    name = procedure.strip()
    return f"{base}/powerbi/ODataV4/GtaskMalla_{name}"


def get_bc_procedure_listar() -> str:
    return os.getenv("BUSINESS_CENTRAL_PROCEDURE_LISTAR_ORDENES", "ListarOrdenesUsuario")


def get_bc_procedure_detalle() -> str:
    return os.getenv("BUSINESS_CENTRAL_PROCEDURE_DETALLE_ORDEN", "DetalleOrdenTrabajo")


def get_bc_procedure_valorar() -> str:
    return os.getenv("BUSINESS_CENTRAL_PROCEDURE_VALORAR_ORDEN", "CerrarParteTrabajo")
