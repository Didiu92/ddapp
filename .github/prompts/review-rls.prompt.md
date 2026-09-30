---
description: "Revisor de seguridad/RLS antes de dar por cerrada una tabla nueva o modificada"
---

# Revisión de RLS antes de cerrar una tabla

Recorre esta checklist sobre la(s) tabla(s) tocadas en el cambio actual. No la
des por aprobada hasta responder explícitamente cada punto.

1. **RLS activado**: ¿`ENABLE ROW LEVEL SECURITY` está en la misma migración
   que crea la tabla? ¿Hay al menos una política para `SELECT`, y para
   `INSERT`/`UPDATE`/`DELETE` si aplica?
2. **Nombre en la tabla contenedora**: si esta tabla envuelve una `entry` (o
   cualquier concepto con nombre/identidad que pueda estar bloqueado), ¿el
   nombre/descripción vive en una tabla hija sujeta a su propia RLS por nivel
   de desbloqueo (`entry_fragments` u homóloga), y NO en una columna siempre
   visible de la tabla contenedora? Este es el fallo más fácil de cometer:
   revisa en concreto cualquier `SELECT` de la tabla contenedora y confirma
   que no devuelve texto identificativo sin pasar por el filtro de fragmento.
3. **Versión real vs conocida**: si la tabla tiene una versión "real" oculta
   hasta revelación (fragmentos, contenido sellado...), ¿está garantizado que
   ningún `SELECT` normal de un jugador puede devolver esa columna antes de
   que exista el registro de revelación/apertura correspondiente? Compruébalo
   con una política que exija explícitamente el `EXISTS` de la revelación, no
   solo con "el frontend no la pide".
4. **Contenido sellado**: si la tabla es de contenido sellado (cartas,
   esquirlas u homólogo), ¿el contenido real es inalcanzable por `SELECT`
   directo bajo cualquier rol de jugador, y solo accesible vía una función
   `SECURITY DEFINER` que compruebe estado `disponible` y registre la
   apertura?
5. **Búsqueda global**: si el contenido de esta tabla debe ser buscable
   (`unaccent`), ¿la función de búsqueda es `SECURITY INVOKER` (hereda RLS del
   llamante) y no `SECURITY DEFINER`?
6. **Máster vs jugador**: ¿la máster tiene acceso total explícito (no por
   accidente de una política mal acotada), y el jugador solo ve lo suyo o lo
   desbloqueado/global?
7. **Auditoría**: si la acción es sensible (desbloqueo, revelación, apertura
   de sellado, cambio de secreto), ¿queda rastro de quién y cuándo? Puede ser
   una columna propia (`unlocked_by`, `revealed_by`, `opened_by`...) o, si no
   existe historial propio, una fila en `audit_log`.
8. **Prueba manual**: simula al menos una consulta como jugador sin ningún
   unlock/reveal y confirma que el resultado es el esperado ("???", vacío, o
   sin la columna sensible) antes de mergear.

Si algún punto falla, corrígelo en la misma migración/PR antes de continuar
con la siguiente historia de usuario del backlog.
