"""Login de operario contra la API de GTask."""
import requests

from config import GTASK_API_URL


def login(username: str, password: str) -> dict:
    url = f"{GTASK_API_URL}/user/login"
    try:
        response = requests.post(
            url,
            json={"username": username, "password": password},
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            timeout=30,
        )
    except requests.RequestException as exc:
        return {"success": False, "error": f"Error de conexión con GTask: {exc}"}

    if response.status_code == 401:
        return {"success": False, "error": "Credenciales inválidas"}
    if response.status_code != 200:
        return {"success": False, "error": f"GTask ha respondido {response.status_code}"}

    data = response.json() if response.content else {}
    if not isinstance(data, dict):
        return {"success": False, "error": "Respuesta de GTask no válida"}

    token = data.get("token") or data.get("access_token") or data.get("auth_token")
    user = data.get("user") or data.get("user_data")
    if not isinstance(user, dict):
        user = {
            k: v
            for k, v in data.items()
            if k not in ("token", "access_token", "auth_token", "password")
        }
    user_id = user.get("_id") or user.get("id") or data.get("_id") or ""
    if not user_id:
        return {"success": False, "error": "GTask no ha devuelto el identificador de usuario"}

    nombre = user.get("name") or user.get("nombre") or user.get("username") or username
    return {
        "success": True,
        "token": token,
        "user_data": {
            "id": str(user_id),
            "username": user.get("username") or username,
            "name": nombre,
        },
    }
