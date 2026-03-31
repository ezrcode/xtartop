# DECIMA Portal API

Base URL de produccion:

`https://portal.decima.us/api/v1`

## Autenticacion

Cada reseller usa una API key propia. La key se genera desde el panel admin de resellers y se muestra una sola vez al momento de crearla.

Enviala en cualquiera de estos headers:

```http
Authorization: Bearer decima_live_xxxxx
```

o

```http
X-API-Key: decima_live_xxxxx
```

## Endpoints

### `GET /products`

Devuelve los productos activos disponibles para crear ordenes.

### `GET /orders`

Lista las ordenes del reseller autenticado.

Query params soportados:

- `limit` de `1` a `100`
- `status`
- `period` con formato `YYYY-MM`

### `GET /orders/{id}`

Devuelve el detalle de una orden del reseller autenticado.

### `POST /orders`

Crea una orden para el reseller autenticado.

Body JSON:

```json
{
  "period": "2026-03",
  "intent": "SUBMITTED",
  "promoCode": "MARCH25",
  "externalReference": "erp-order-20391",
  "notes": "Imported from ERP",
  "items": [
    { "productCode": "CRM-PROJECT", "quantity": 8 },
    { "productCode": "CRM-SALES", "quantity": 3 }
  ]
}
```

Notas:

- `intent` acepta `DRAFT` o `SUBMITTED`
- cada item puede usar `productId` o `productCode`
- el pricing siempre se calcula en servidor usando el `cost` del producto
- si la promo no aplica o un producto no existe, la API devuelve error

## Ejemplos

Listar productos:

```bash
curl --request GET \
  --url https://portal.decima.us/api/v1/products \
  --header "Authorization: Bearer decima_live_xxxxx"
```

Crear orden:

```bash
curl --request POST \
  --url https://portal.decima.us/api/v1/orders \
  --header "Authorization: Bearer decima_live_xxxxx" \
  --header "Content-Type: application/json" \
  --data '{
    "period": "2026-03",
    "intent": "SUBMITTED",
    "externalReference": "erp-order-20391",
    "items": [
      { "productCode": "CRM-PROJECT", "quantity": 8 },
      { "productCode": "CRM-SALES", "quantity": 3 }
    ]
  }'
```

Consultar orden:

```bash
curl --request GET \
  --url https://portal.decima.us/api/v1/orders/ord_xxxxx \
  --header "Authorization: Bearer decima_live_xxxxx"
```

### `GET /promotions`

Lista las promociones activas disponibles para el reseller autenticado.

Query params soportados:

- `productCode` — filtra promociones que aplican a un producto específico

Ejemplo de respuesta:

```json
{
  "data": [
    {
      "id": "cmndra9cp0000l504b5j7qn7j",
      "name": "Semana Santa 2026",
      "code": "SS2026",
      "type": "PERCENTAGE",
      "value": 15,
      "validFrom": "2026-03-01T00:00:00.000Z",
      "validTo": "2026-05-31T00:00:00.000Z",
      "isActive": true,
      "products": [
        {
          "id": "cmndbev1t0001lh04khi3ze2e",
          "code": "S-NBY-LIC-02",
          "name": "Sale of CRM Software Licenses - User (Property Transfer)",
          "cost": 48,
          "salePrice": 55,
          "currency": "USD"
        }
      ]
    }
  ],
  "meta": { "count": 1 }
}
```

Campos de la promoción:

- `code` — código que se envía en `promoCode` al crear la orden
- `type` — `PERCENTAGE` o `FIXED`
- `value` — porcentaje o monto fijo del descuento
- `products` — productos a los que aplica (con `cost` y `salePrice`)

### `GET /orders/{id}/invoice`

Descarga la factura PDF de una orden aprobada/confirmada. Devuelve el archivo binario (`application/pdf`).

```bash
curl --request GET \
  --url https://portal.decima.us/api/v1/orders/ord_xxxxx/invoice \
  --header "Authorization: Bearer decima_live_xxxxx" \
  --output factura.pdf
```

- Devuelve `200` con el PDF cuando la factura está disponible
- Devuelve `404` si la orden no tiene factura aún (no ha sido aprobada)

## Respuestas

Exito:

```json
{
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "A valid API key is required",
    "details": null
  }
}
```
