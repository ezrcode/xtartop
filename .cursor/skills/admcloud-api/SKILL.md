---
name: admcloud-api
description: Documenta y guía el uso del API de ADMCloud (Adm Cloud) con OpenAPI/Swagger. Usar cuando el usuario mencione ADMCloud, Adm Cloud, swagger/docs/v1, endpoints como Items o PriceList, o integración de facturas, artículos o precios.
---

# ADMCloud API

## Quick start
- Usa el OpenAPI en `reference.md` para endpoints y modelos.
- Base URL: `https://api.admcloud.net`

## Flujo recomendado
1. Obtener el spec: `https://api.admcloud.net/swagger/docs/v1`
2. Identificar el endpoint y verbos necesarios.
3. Ver parámetros comunes (`company`, `appid`, `role`, `token`, `skip`).
4. Mapear campos usando `definitions` del spec.

## Notas de integración frecuentes
- `GET /api/PriceList` devuelve precios con `ItemID`, `ItemSKU`, `ItemName`, `Price`.
- `GET /api/Items` puede no incluir precios (campo `Prices` vacío).

## Recursos
- Detalles completos del spec en `reference.md`.
