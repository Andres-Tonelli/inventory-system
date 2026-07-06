# ADR-0003 — Diferir la autenticación real (sistema interno)

- **Estado:** Aceptado (2026-07-02)

## Contexto

La aplicación es una herramienta **interna**, usada por **pocas personas**, y no se expone a
internet. Hoy existe un "login" que sólo pide un **legajo** (sin contraseña): el back verifica
que el legajo exista y devuelve el perfil del empleado; el front lo guarda en `localStorage` y
un guard de Angular chequea esa presencia.

Esto **no es autenticación** (no hay secreto ni token, y el backend no tiene ningún guard: la API
está abierta). Montar ahora un esquema completo (password + hashing + JWT/sesión + guard) se
consideró **sobre-ingeniería** para el contexto actual.

## Decisión

**Diferir** la autenticación real. Mantener el "soft-login" por legajo como mecanismo de
**identificación** (saber quién opera para trazabilidad), **no** de seguridad. La protección del
sistema es **a nivel de red** (no exponerlo fuera de la intranet).

Se documenta explícitamente para que sea una **decisión consciente** y no una omisión.

## Alternativas consideradas

- **Auth completa ya (password + JWT + guard)** — rechazada por ahora: costo alto para el riesgo
  actual (usuarios de confianza, red cerrada).
- **Quitar el login del todo** — rechazada: el legajo sirve para identificar al operador en
  asignaciones y auditoría futura.

## Consecuencias

**Positivas**
- Simplicidad: sin manejo de credenciales, tokens ni expiración.

**Negativas / riesgos asumidos**
- **No hay control de acceso**: cualquiera con acceso de red puede llamar a la API y operar como
  cualquier empleado conociendo un legajo. Aceptable **sólo** mientras el sistema sea interno.

## Gatillos para revisar esta decisión

Reabrir (nuevo ADR que supersede a este) si ocurre alguno:

- El sistema se expone fuera de la red interna.
- Se necesita distinguir permisos por rol (ej. quién puede dar de baja artículos).
- Aumenta la cantidad de usuarios o deja de haber confianza plena entre ellos.

## Acción mínima recomendada

Dejar constancia en el `README` de que la API no tiene autenticación y no debe exponerse a
internet.
