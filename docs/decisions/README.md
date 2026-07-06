# Registros de decisiones de arquitectura (ADRs)

Esta carpeta documenta las **decisiones de arquitectura** del proyecto en formato
[ADR](https://adr.github.io/) (Architecture Decision Record). Cada archivo captura una
decisión: su contexto, qué se decidió y qué consecuencias tiene. Sirve como bitácora del
"por qué" del sistema.

## Índice

| ADR | Título | Estado |
|-----|--------|--------|
| [ADR-0001](./ADR-0001-arquitectura-por-capas.md) | Arquitectura por capas con indirección de persistencia | Aceptado · en progreso |
| [ADR-0002](./ADR-0002-contrato-rest-compartido.md) | Contrato REST compartido (`libs/shared/api-contract`) | Implementado |
| [ADR-0003](./ADR-0003-autenticacion-diferida.md) | Diferir la autenticación real (sistema interno) | Aceptado |
| [ADR-0004](./ADR-0004-modelo-de-datos.md) | Rediseño del modelo de datos (JSONB, contención≠asignación, estados, lotes) | Aceptado |
| [ADR-0005](./ADR-0005-acceso-a-datos-unificado.md) | Acceso a datos unificado (repos + contexto de transacción ALS) | Implementado |
| [ADR-0006](./ADR-0006-validacion-y-dtos-en-backend.md) | Validación (ValidationPipe) y DTOs del contrato en el backend | Implementado |
| [ADR-0007](./ADR-0007-workspace-del-dominio.md) | Workspace del dominio: nav por dominio, pantallas dinámicas de agrupadores y master-detail | Implementado |
| [ADR-0008](./ADR-0008-identidad-visual-de-dominios.md) | Identidad visual configurable de dominios (icono + color, listas cerradas) | Implementado |

## Documento relacionado

- [`REVISION.md`](../../REVISION.md) — diagnóstico inicial del código (los problemas que
  motivaron estas decisiones).

## Convención

- Los ADR son **inmutables** una vez aceptados. Si una decisión cambia, se crea un ADR
  nuevo que *supersede* al anterior (y se anota en el viejo), no se reescribe.
- Numeración incremental: `ADR-XXXX-titulo-en-kebab-case.md`.
