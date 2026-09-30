import json
import re
import subprocess
import urllib.request

BASE_URL = "http://127.0.0.1:54321"
PASSWORD = "ddapp-local-dev"


def get_service_role_key() -> str:
    # Nunca hardcodear esta clave: se lee en tiempo de ejecucion del propio
    # CLI para que no acabe commiteada (GitHub la bloquea con razon).
    result = subprocess.run(
        ["npx", "supabase", "status", "-o", "env"],
        cwd="/home/divinuales/ddapp",
        capture_output=True,
        text=True,
        check=True,
    )
    match = re.search(r'SERVICE_ROLE_KEY="([^"]+)"', result.stdout)
    if not match:
        raise RuntimeError("No se pudo leer SERVICE_ROLE_KEY de 'supabase status -o env'")
    return match.group(1)


SERVICE_KEY = get_service_role_key()

USERS = [
    ("master@ddapp.local", "Master", "master"),
    ("jugador1@ddapp.local", "Jugador 1", "player"),
    ("jugador2@ddapp.local", "Jugador 2", "player"),
    ("jugador3@ddapp.local", "Jugador 3", "player"),
    ("jugador4@ddapp.local", "Jugador 4", "player"),
]

for email, display_name, role in USERS:
    body = json.dumps({
        "email": email,
        "password": PASSWORD,
        "email_confirm": True,
    }).encode()
    req = urllib.request.Request(
        f"{BASE_URL}/auth/v1/admin/users",
        data=body,
        method="POST",
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req) as resp:
        data = json.load(resp)
    user_id = data["id"]
    print(f"{email} -> {user_id}")

    sql = (
        "insert into public.profiles (id, display_name, role) values "
        f"('{user_id}', '{display_name}', '{role}');"
    )
    subprocess.run(
        [
            "podman", "exec", "supabase_db_ddapp",
            "psql", "-U", "postgres", "-d", "postgres", "-c", sql,
        ],
        check=True,
    )

print("Listo.")
