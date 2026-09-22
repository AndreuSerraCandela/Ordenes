# Despliegue en apps.malla.es

- **Catálogo:** [apps.malla.es/admin/apps](https://apps.malla.es/admin/apps) — app `ordenes`
- **URL:** https://ordenes.malla.es
- **wwwroot:** `C:\inetpub\wwwroot\Ordenes`
- **App pool:** `Ordenes`
- **Repo:** `AndreuSerraCandela/Ordenes` (webhook → `https://apps.malla.es/runner/webhook/github`)

## Primera publicación

1. El deploy copia el código con robocopy pero **no sobrescribe** `web.config` ni `.env`.
2. Si el wwwroot está vacío, `Deploy-App.ps1` hace **bootstrap** del `web.config` del repo la primera vez.
3. Crea en el servidor `C:\inetpub\wwwroot\Ordenes\.env` a partir de `.env.example` (credenciales BC, GTask, `SECRET_KEY`).

## Despliegues siguientes

Push a `main` o **Desplegar ahora** en el panel de apps.malla.es.
