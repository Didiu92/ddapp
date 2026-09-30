---
description: "Generar una migración nueva de Supabase siguiendo la convención de nombres del proyecto"
---

# Nueva migración

Genera una migración nueva para `supabase/migrations/` siguiendo la convención
del proyecto:

```
YYYYMMDDHHMMSS_v001__nombre_descriptivo.sql
```

- `YYYYMMDDHHMMSS`: timestamp real en el momento de crear el fichero (es el
  que usa `supabase migration new`/`db push` para el orden real de aplicación
  — nunca lo cambies a mano).
- `v001`: número secuencial decorativo, solo para que un humano lea el orden
  rápido tipo Flyway. Si alguna vez queda desincronizado respecto al orden por
  timestamp (p. ej. tras un rebase), no le des más peso que al timestamp: el
  timestamp manda siempre.
- `nombre_descriptivo`: snake_case, en español, describiendo el cambio (ej.
  `create_entries_core`, `add_rls_entry_fragments`).

Pasos:
1. Ejecuta (o indica al usuario que ejecute) `npx supabase migration new
   nombre_descriptivo` para que el CLI genere el timestamp correcto.
2. Renombra anteponiendo el número `v00X` decorativo siguiente al último usado
   en `supabase/migrations/`.
3. Escribe el SQL: DDL + `ENABLE ROW LEVEL SECURITY` + políticas en el mismo
   fichero cuando la migración crea una tabla nueva (no lo dejes para una
   migración posterior).
4. Si la tabla envuelve una `entry` o cualquier concepto con nombre/identidad
   potencialmente bloqueado, revisa
   `.github/instructions/supabase-schema-rls.instructions.md` antes de
   escribir el DDL.
5. Antes de dar la migración por terminada, pasa por
   `.github/prompts/review-rls.prompt.md`.
