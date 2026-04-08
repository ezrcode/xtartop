# ADMCloud API Reference

Documentación completa de los endpoints de la API de ADMCloud, extraída del spec OpenAPI.

- **Host:** `api.admcloud.net`
- **Base URL:** `https://api.admcloud.net/api`
- **Swagger UI:** https://api.admcloud.net/swagger/ui/index
- **OpenAPI Spec (JSON):** `https://api.admcloud.net/swagger/docs/v1`
- **Total endpoints:** 465 paths, 397 definiciones de modelos

---

## Autenticación

Todas las peticiones requieren **Basic Authentication** + query parameters de contexto.

### Headers

| Header          | Valor                               |
|-----------------|-------------------------------------|
| `Authorization` | `Basic <base64(username:password)>` |
| `Content-Type`  | `application/json`                  |

### Query Parameters Globales (en todas las peticiones)

| Parámetro | Tipo   | Requerido | Descripción                 |
|-----------|--------|-----------|-----------------------------|
| `appid`   | string | No*       | ID de la aplicación         |
| `company` | string | No*       | ID de la compañía           |
| `role`    | string | No*       | Rol del usuario             |
| `token`   | string | No        | Token alternativo de sesión |

> \* Marcados como opcionales en el spec pero **requeridos en la práctica** para la autenticación.

### Formato de Respuesta

La API puede devolver dos formatos:

1. **Envuelto:** `{ success: boolean, data: T, message?: string }` — se extrae `data`.
2. **Directo:** el payload es directamente el recurso o un array de recursos.

### Autenticación Alternativa

| Endpoint            | Método | Descripción                                           |
|---------------------|--------|-------------------------------------------------------|
| `POST /api/Login`   | POST   | Login con `company` (requerido), `role`, `appid`      |
| `POST /api/Token`   | POST   | Obtener token con `Company` y `RoleID` (requeridos)   |
| `POST /api/Login/GetCompanies` | POST | Listar compañías disponibles con `appid` |

---

## Endpoints Usados en el CRM

### 1. Customers (Clientes)

#### `GET /api/Customers`

Lista de clientes. Usado para validar credenciales y buscar por RNC.

| Query Param    | Tipo    | Req | Descripción                          |
|----------------|---------|-----|--------------------------------------|
| `skip`         | integer | Sí  | Paginación (enviar `0`)              |
| `SalesRepID`   | string  | No  | Filtrar por vendedor                 |
| `FiscalID`     | string  | No  | Filtrar por RNC/Cédula (sin guiones) |

**Uso CRM:** `testConnection()`, `findCustomerByTaxId()`, `syncCompanyWithAdmCloud()`, `addCompanyAdmCloudLink()`

#### `GET /api/Customers/{ID}`

Cliente específico con direcciones y contactos.

| Query Param | Tipo   | Req | Descripción             |
|-------------|--------|-----|-------------------------|
| `ID`        | string | Sí  | GUID del cliente (path) |
| `Name`      | string | No  | Filtrar por nombre      |
| `EMail`     | string | No  | Filtrar por email       |
| `Code`      | string | No  | Filtrar por código      |
| `FiscalID`  | string | No  | Filtrar por RNC         |

**Uso CRM:** `generate-proforma` — obtiene dirección de facturación y contacto.

#### `GET /api/Customers/Extended`

Clientes con información extendida.

| Query Param      | Tipo    | Req | Descripción            |
|------------------|---------|-----|------------------------|
| `skip`           | integer | Sí  | Paginación             |
| `SalesRepID`     | string  | No  | Filtrar por vendedor   |
| `CustomerClassID`| string  | No  | Filtrar por clase      |
| `CustomerID`     | string  | No  | Filtrar por ID         |
| `search`         | string  | No  | Búsqueda general       |

#### `POST /api/Customers` — Crear cliente

**Body:** `SA_Relationships`

#### `PUT /api/Customers` — Actualizar cliente

**Body:** `SA_Relationships`

#### Otros endpoints de Customers

| Endpoint                                    | Método | Descripción                                |
|---------------------------------------------|--------|--------------------------------------------|
| `GET /api/Customers/GetAddressList`         | GET    | Lista de direcciones (`RelationshipID` req) |
| `POST /api/Customers/InsertAddress`         | POST   | Insertar dirección (body: `SA_Relationships_Addresses`) |
| `POST /api/Customers/UpdateCustomField`     | POST   | Actualizar campo personalizado (`id`, `fieldName`, `value`) |
| `POST /api/Customers/UpdateAddressLocation` | POST   | Actualizar coordenadas (`addressID`, `lat`, `lon`) |
| `DELETE /api/Customers/{id}`                | DELETE | Eliminar cliente                            |

---

### 2. Items (Artículos)

#### `GET /api/Items`

Lista de artículos/productos.

| Query Param  | Tipo    | Req | Descripción                            |
|--------------|---------|-----|----------------------------------------|
| `skip`       | integer | Sí  | Paginación                             |
| `OnlyActive` | boolean | No  | Solo artículos activos                 |

> **Nota:** El campo `Prices` puede venir vacío aunque se use `expand=Prices`. Usar `/PriceList` para precios.

#### `GET /api/Items/{id}`

Artículo específico.

| Query Param | Tipo   | Req | Descripción      |
|-------------|--------|-----|------------------|
| `id`        | string | Sí  | GUID (path)      |
| `sku`       | string | No  | Buscar por SKU   |
| `name`      | string | No  | Buscar por nombre|

#### `POST /api/Items` — Crear artículo

**Body:** `IC_Items`

#### `PUT /api/Items` — Actualizar artículo

**Body:** `IC_Items`

#### `POST /api/Items/UpdateCustomField`

Actualizar campo personalizado de un artículo.

---

### 3. Services (Servicios)

Los servicios comparten el modelo `IC_Items` pero se gestionan por separado.

| Endpoint              | Método | Parámetros extra        |
|-----------------------|--------|-------------------------|
| `GET /api/Services`   | GET    | `skip`, `OnlyActive`    |
| `GET /api/Services/{id}` | GET | `sku`, `name`           |
| `POST /api/Services`  | POST   | Body: `IC_Items`        |
| `PUT /api/Services`   | PUT    | Body: `IC_Items`        |
| `DELETE /api/Services/{id}` | DELETE |                    |

---

### 4. PriceList (Listas de Precios)

#### `GET /api/PriceList`

Artículos con precios por lista. **Endpoint principal para consultar precios.**

| Query Param    | Tipo    | Req | Descripción                  |
|----------------|---------|-----|------------------------------|
| `skip`         | integer | Sí  | Paginación                   |
| `PriceLevelID` | string  | No  | Filtrar por nivel de precio  |
| `ItemClassID`  | string  | No  | Filtrar por clase de artículo|
| `search`       | string  | No  | Búsqueda general             |

**Respuesta incluye:** `ItemID`, `ItemSKU`, `ItemName`, `SalesDescription`, `ItemType`, `Price`, `PriceLevelID`, `PriceLevelName`, `CurrencyID`

**Uso CRM:** `/api/admcloud/items`, `/api/admcloud/price-lists`, filtro de reportes

#### `GET /api/PriceLevels`

Niveles de precios configurados.

| Query Param | Tipo    | Req | Descripción |
|-------------|---------|-----|-------------|
| `skip`      | integer | Sí  | Paginación  |

---

### 5. Quotes (Cotizaciones / Proformas)

#### `POST /api/Quotes` — Crear cotización

**Body:** `SA_Transactions` (campos clave abajo)

| Campo body          | Tipo   | Descripción                           |
|---------------------|--------|---------------------------------------|
| `RelationshipID`    | string | ID del cliente (requerido)            |
| `DocDate`           | string | Fecha del documento (ISO 8601)        |
| `CurrencyID`        | string | Moneda (`USD`, `DOP`)                 |
| `Notes`             | string | Notas/observaciones                   |
| `Reference`         | string | Referencia (tasa de cambio)           |
| `PaymentTermID`     | string | ID del término de pago                |
| `SalesStageID`      | string | ID de la etapa de ventas              |
| `ContactID`         | string | ID del contacto                       |
| `BillToAddressID`   | string | ID de la dirección de facturación     |
| `BillToName`        | string | Nombre facturación                    |
| `BillToAddress1/2`  | string | Dirección facturación                 |
| `BillToCity/State`  | string | Ciudad/Estado facturación             |
| `BillToPostalCode`  | string | Código postal facturación             |
| `BillToPhone`       | string | Teléfono facturación                  |
| `BillToContact`     | string | Contacto facturación                  |
| `BillToCountryID`   | string | País facturación                      |
| `Items[]`           | array  | Líneas (ver `SA_Transaction_Items`)   |

> **Nota:** Usar `PaymentTermID` (no `PaymentTermsID`) al crear.

**Uso CRM:** `generate-proforma` (manual), `cron/billing` (automático)

#### `GET /api/Quotes`

Lista de cotizaciones.

| Query Param      | Tipo    | Req | Descripción            |
|------------------|---------|-----|------------------------|
| `skip`           | integer | Sí  | Paginación             |
| `RelationshipID` | string  | No  | Filtrar por cliente    |
| `DateFrom`       | string  | No  | Fecha desde            |
| `DateTo`         | string  | No  | Fecha hasta            |
| `SubsidiaryID`   | string  | No  | Filtrar por sucursal   |
| `SalesRepID`     | string  | No  | Filtrar por vendedor   |
| `LocationID`     | string  | No  | Filtrar por ubicación  |
| `search`         | string  | No  | Búsqueda general       |

**Uso CRM:** Reporte de facturación, listar proformas de un cliente

#### `GET /api/Quotes/{ID}`

Cotización específica con detalle de líneas.

| Query Param | Tipo   | Req | Descripción           |
|-------------|--------|-----|-----------------------|
| `ID`        | string | Sí  | GUID (path)           |
| `DocID`     | string | No  | Buscar por # documento|
| `Reference` | string | No  | Buscar por referencia |

**Respuesta clave:** `DocID`, `CalculatedSubTotalAmount`, `CalculatedDiscountAmount`, `CalculatedNetAmount`, `CalculatedTaxAmount`, `CalculatedTotalAmount`, `Items[]`

**Uso CRM:** Después de `POST /Quotes` para obtener DocID y totales

#### Otros endpoints de Quotes

| Endpoint                          | Método | Parámetros             | Descripción           |
|-----------------------------------|--------|------------------------|-----------------------|
| `PUT /api/Quotes`                 | PUT    | Body: `SA_Transactions`| Actualizar cotización |
| `DELETE /api/Quotes/{id}`         | DELETE | `id` (path)            | Eliminar cotización   |
| `PUT /api/Quotes/Authorize`       | PUT    | `id` (query, req)      | Autorizar cotización  |
| `PUT /api/Quotes/Reject`          | PUT    | `id` (query, req)      | Rechazar cotización   |
| `PUT /api/Quotes/ChangeSalesStage`| PUT    | `ID`, `SalesStageID` (query, ambos req) | Cambiar etapa |

---

### 6. CreditInvoices (Facturas a Crédito)

#### `GET /api/CreditInvoices`

Lista de facturas a crédito.

| Query Param      | Tipo    | Req | Descripción              |
|------------------|---------|-----|--------------------------|
| `skip`           | integer | Sí  | Paginación               |
| `RelationshipID` | string  | No  | Filtrar por cliente      |
| `DateFrom`       | string  | No  | Fecha desde              |
| `DateTo`         | string  | No  | Fecha hasta              |
| `SubsidiaryID`   | string  | No  | Filtrar por sucursal     |
| `LocationID`     | string  | No  | Filtrar por ubicación    |
| `SalesRepID`     | string  | No  | Filtrar por vendedor     |
| `CurrencyID`     | string  | No  | Filtrar por moneda       |
| `search`         | string  | No  | Búsqueda general         |
| `DocID`          | string  | No  | Buscar por # documento   |
| `NCF`            | string  | No  | Buscar por NCF           |

**Uso CRM:** `getCompanyInvoices()`, reporte de facturación

#### `GET /api/CreditInvoices/{ID}`

Factura específica con detalle de líneas.

| Query Param | Tipo   | Req | Descripción           |
|-------------|--------|-----|-----------------------|
| `ID`        | string | Sí  | GUID (path)           |
| `DocID`     | string | No  | Buscar por # documento|
| `Reference` | string | No  | Buscar por referencia |

**Uso CRM:** Detalle de facturas en reporte

#### Otros endpoints de CreditInvoices

| Endpoint                                     | Método | Parámetros                        | Descripción               |
|----------------------------------------------|--------|-----------------------------------|---------------------------|
| `POST /api/CreditInvoices`                   | POST   | Body: `SA_Transactions`, `checkCreditLimit`, `checkOverdueInvoices` | Crear factura |
| `PUT /api/CreditInvoices`                    | PUT    | Body: `SA_Transactions`           | Actualizar factura        |
| `DELETE /api/CreditInvoices/{id}`            | DELETE | `id` (path)                       | Eliminar factura          |
| `POST /api/CreditInvoices/Void`              | POST   | `id`, `cancellationTypeID` (req)  | Anular factura            |
| `POST /api/CreditInvoices/SetNIF`            | POST   | `id`, `nif` (req)                 | Asignar NIF               |
| `POST /api/CreditInvoices/MarkPrinted`       | POST   | Body (IDs array)                  | Marcar como impresa       |
| `POST /api/CreditInvoices/UpdateCustomField` | POST   |                                   | Actualizar campo custom   |
| `GET /api/CreditInvoices/Unprinted`          | GET    |                                   | Listar no impresas        |
| `GET /api/CreditInvoices/Printed`            | GET    |                                   | Listar impresas           |

---

### 7. CashInvoices (Facturas de Contado)

Misma estructura que CreditInvoices.

| Endpoint                                  | Método | Descripción                 |
|-------------------------------------------|--------|-----------------------------|
| `GET /api/CashInvoices`                   | GET    | Listar (mismos filtros que CreditInvoices) |
| `GET /api/CashInvoices/{ID}`              | GET    | Detalle por ID              |
| `POST /api/CashInvoices`                  | POST   | Crear factura de contado    |
| `PUT /api/CashInvoices`                   | PUT    | Actualizar                  |
| `DELETE /api/CashInvoices/{id}`           | DELETE | Eliminar                    |
| `POST /api/CashInvoices/Void`             | POST   | Anular (`id`, `cancellationTypeID`) |
| `POST /api/CashInvoices/SetNIF`           | POST   | Asignar NIF (`id`, `nif`)  |
| `GET /api/CashInvoices/Unprinted`         | GET    | No impresas                 |
| `GET /api/CashInvoices/Printed`           | GET    | Impresas                    |
| `POST /api/CashInvoices/MarkPrinted`      | POST   | Marcar impresa              |
| `POST /api/CashInvoices/UpdateCustomField`| POST   | Campo custom                |

---

### 8. PaymentTerms (Términos de Pago)

| Endpoint                      | Método | Descripción        |
|-------------------------------|--------|--------------------|
| `GET /api/PaymentTerms`       | GET    | Listar (`skip` req)|
| `GET /api/PaymentTerms/{ID}`  | GET    | Detalle por ID     |
| `POST /api/PaymentTerms`      | POST   | Crear (body: `SA_Payment_Terms`) |
| `PUT /api/PaymentTerms`       | PUT    | Actualizar         |
| `DELETE /api/PaymentTerms/{id}`| DELETE | Eliminar          |

**Uso CRM:** Selección de término de pago en proformas manuales y automáticas

---

### 9. SalesStages (Etapas de Ventas)

| Endpoint                       | Método | Descripción        |
|--------------------------------|--------|--------------------|
| `GET /api/SalesStages`         | GET    | Listar (`skip` req)|
| `GET /api/SalesStages/{id}`    | GET    | Detalle por ID     |
| `POST /api/SalesStages`        | POST   | Crear (body: `CRM_Sales_Stages`) |
| `PUT /api/SalesStages`         | PUT    | Actualizar         |
| `DELETE /api/SalesStages/{id}` | DELETE | Eliminar           |

**Uso CRM:** Configuración de ADMCloud

---

### 10. Contacts (Contactos)

| Endpoint                     | Método | Parámetros extra            |
|------------------------------|--------|-----------------------------|
| `GET /api/Contacts`          | GET    | `skip`, `CustomerID`, `search` |
| `GET /api/Contacts/{ID}`    | GET    | `ID` (path)                 |
| `POST /api/Contacts`        | POST   | Body: `SA_Contacts`         |
| `PUT /api/Contacts`         | PUT    | Body: `SA_Contacts`         |
| `DELETE /api/Contacts/{id}` | DELETE | `id` (path)                 |

---

## Endpoints Adicionales (No usados aún en CRM)

### Promotions (Promociones)

| Endpoint                       | Método | Parámetros                   | Descripción                    |
|--------------------------------|--------|------------------------------|--------------------------------|
| `GET /api/Promotions`          | GET    | `skip`                       | Listar promociones             |
| `GET /api/Promotions/{ID}`     | GET    | `ID` (path)                  | Detalle de promoción           |
| `GET /api/Promotions/GetActive`| GET    | `TransactionDate`, `ItemID`, `CustomerID`, `CurrencyID`, `Quantity` (todos req), `SubsidiaryID` (opt) | Obtener promociones activas para un artículo/cliente |
| `POST /api/Promotions`        | POST   | Body: `AR_Promotions`        | Crear promoción                |
| `PUT /api/Promotions`         | PUT    | Body: `AR_Promotions`        | Actualizar promoción           |
| `DELETE /api/Promotions/{id}` | DELETE |                              | Eliminar promoción             |

### Sales (Reportes de Ventas)

| Endpoint                           | Método | Parámetros clave                                    |
|------------------------------------|--------|-----------------------------------------------------|
| `GET /api/Sales`                   | GET    | `Year`, `SubsidiaryID`, `LocationID`, `RelationshipID`, `EmployeeID` |
| `GET /api/Sales/Detailed`          | GET    | `year`, `month`, `dateFrom`, `dateTo`, `subsidiaryID`, `customerID`, `salesRepID`, `customerClassID`, `currencyID`, `projectID`, `onlyInvoices` |
| `GET /api/Sales/SalesByItem`       | GET    | `year`, `dateFrom`, `dateTo`, `subsidiaryID`, `customerID`, `itemClassID`, `brandID`, `divisionID` |
| `GET /api/Sales/SalesByItemDetailed`| GET   | Similares a SalesByItem                              |

### AR / AP (Cuentas por Cobrar / Pagar)

| Endpoint      | Método | Parámetros                                         |
|---------------|--------|---------------------------------------------------|
| `GET /api/AR` | GET    | `skip`, `take`, `CustomerID`, `SalesRepID`, `SubsidiaryID`, `CustomerClassID`, `CurrencyID`, `DateTo`, `TransactionID`, `IncludePrepayments` |
| `GET /api/AP` | GET    | `skip`, `take`, `SubsidiaryID`, `RelationshipID`, `DivisionID`, `TransactionID`, `VendorClassID`, `CurrencyID`, `DateTo` |

### Currencies (Monedas)

| Endpoint                              | Método | Parámetros                              |
|---------------------------------------|--------|-----------------------------------------|
| `GET /api/Currencies`                 | GET    | Listar monedas                          |
| `GET /api/Currencies/{ID}`            | GET    | Detalle de moneda                       |
| `PUT /api/Currencies/SaveExchangeRate`| PUT    | `currencyID`, `date`, `exchangeRate` (todos req) |
| `POST /api/Currencies`               | POST   | Body: `SA_Currencies`                   |
| `PUT /api/Currencies`                | PUT    | Body: `SA_Currencies`                   |

### Collections (Cobros)

| Endpoint               | Método | Parámetros                  |
|------------------------|--------|-----------------------------|
| `GET /api/Collections` | GET    | `Year`, `SubsidiaryID`      |

### Opportunities (Oportunidades CRM)

| Endpoint                                | Método | Parámetros                           |
|-----------------------------------------|--------|--------------------------------------|
| `GET /api/Opportunities`                | GET    | `skip`, `EmployeeID`, `RelationshipID`, `SubsidiaryID`, `search` |
| `GET /api/Opportunities/{ID}`           | GET    | `ID` (path)                          |
| `GET /api/Opportunities/Open`           | GET    | Oportunidades abiertas               |
| `PUT /api/Opportunities/ChangeSalesStage`| PUT   | Cambiar etapa                        |
| `POST /api/Opportunities`              | POST   | Body: `CRM_Opportunities`            |
| `PUT /api/Opportunities`               | PUT    | Body: `CRM_Opportunities`            |

### SalesOrders (Órdenes de Venta)

| Endpoint                                          | Método | Descripción             |
|---------------------------------------------------|--------|-------------------------|
| `GET /api/SalesOrders`                            | GET    | Listar (mismos filtros que Quotes) |
| `GET /api/SalesOrders/{ID}`                       | GET    | Detalle                 |
| `POST /api/SalesOrders`                           | POST   | Crear (body: `SA_Transactions`) |
| `PUT /api/SalesOrders`                            | PUT    | Actualizar              |
| `DELETE /api/SalesOrders/{id}`                    | DELETE | Eliminar                |
| `PUT /api/SalesOrders/Authorize`                  | PUT    | Autorizar               |
| `PUT /api/SalesOrders/Reject`                     | PUT    | Rechazar                |
| `PUT /api/SalesOrders/MarkPendingAuthorization`   | PUT    | Marcar pendiente        |

### Notas de Crédito/Débito del Cliente

| Endpoint                         | Método | Descripción                 |
|----------------------------------|--------|-----------------------------|
| `GET /api/CustomerCreditNotes`   | GET    | Listar notas de crédito (filtros: `RelationshipID`, `DateFrom`, `DateTo`, `DocID`, `NCF`) |
| `POST /api/CustomerCreditNotes`  | POST   | Crear nota de crédito       |
| `GET /api/CustomerDebitNotes`    | GET    | Listar notas de débito      |
| `POST /api/CustomerDebitNotes`   | POST   | Crear nota de débito        |

### Company (Información de la Empresa)

| Endpoint           | Método | Descripción                 |
|--------------------|--------|-----------------------------|
| `GET /api/Company` | GET    | Datos de la empresa actual  |

### Storage (Almacenamiento de Archivos)

| Endpoint                             | Método | Parámetros                            |
|--------------------------------------|--------|---------------------------------------|
| `GET /api/Storage`                   | GET    | `skip`, `search`, `LinkedToItems`, `LinkedToRelationships`, `LinkedToTransactions`, `reference` |
| `GET /api/Storage/{ID}`             | GET    | Descargar archivo                     |
| `POST /api/Storage`                 | POST   | Subir archivo (`relationshipID`, `itemID`, `transactionID`, `folder`, `reference`) |
| `POST /api/Storage/UploadReceipt`   | POST   | Subir recibo                          |
| `DELETE /api/Storage/{ID}`          | DELETE | Eliminar archivo                      |

### FiscalSequences (Secuencias Fiscales / NCF)

| Endpoint                          | Método | Descripción            |
|-----------------------------------|--------|------------------------|
| `GET /api/FiscalSequences`        | GET    | Listar secuencias      |
| `GET /api/FiscalSequences/{ID}`   | GET    | Detalle                |
| `POST /api/FiscalSequences`       | POST   | Crear secuencia        |
| `PUT /api/FiscalSequences`        | PUT    | Actualizar             |

### Otros Endpoints Relevantes

| Categoría                     | Endpoints | Descripción                           |
|-------------------------------|-----------|---------------------------------------|
| `AccountPayments`             | 9         | Pagos de cuentas (autorizar, rechazar, anular) |
| `BillPayments`                | 8         | Pagos de facturas                     |
| `CashReceipts`                | 5         | Recibos de caja                       |
| `CustomerPrepayments`         | 5         | Anticipos de clientes                 |
| `CustomerCreditApplications`  | 5         | Aplicación de créditos                |
| `PurchaseOrders`              | 11        | Órdenes de compra (autorizar, rechazar, recibir) |
| `Vendors`                     | 6         | Proveedores                           |
| `VendorBills`                 | 6         | Facturas de proveedores               |
| `PromotionInvoices`           | 9         | Facturas de promoción                 |
| `QuoteRequests`               | 7         | Solicitudes de cotización             |
| `Journals`                    | 7         | Asientos contables                    |
| `Accounts`                    | 5         | Cuentas contables                     |
| `Projects`                    | 7         | Proyectos                             |
| `Activities`                  | 5         | Actividades CRM                       |
| `Employee`                    | 7         | Empleados                             |
| `Payrolls`                    | 3         | Nóminas                               |
| `CustomReports`               | 2         | Reportes personalizados (Execute, ExecuteScalar) |
| `ElectronicInvoicingTransactions` | 9     | Facturación electrónica               |
| `Stock`                       | 3         | Inventario (Summary, Detailed)        |

---

## Modelos de Datos Principales

### SA_Relationships (Cliente/Proveedor/Empleado)

Modelo unificado para clientes, proveedores y empleados. **169 propiedades.**

**Campos principales:**

| Campo                | Tipo            | Descripción                          |
|----------------------|-----------------|--------------------------------------|
| `ID`                 | string (uuid)   | Identificador único                  |
| `Name`               | string          | Nombre / Razón social                |
| `FirstName`          | string          | Nombre (persona)                     |
| `LastName`           | string          | Apellido                             |
| `FiscalID`           | string          | RNC / Cédula                         |
| `FiscalIDType`       | integer         | Tipo: 0=RNC, 1=Cédula, 2=Pasaporte, 3=Otro |
| `Code`               | string          | Código de cliente                    |
| `EMail`              | string          | Email principal                      |
| `Phone1` / `Phone2`  | string          | Teléfonos                            |
| `MobilePhone`        | string          | Celular                              |
| `IsCustomer`         | boolean         | Es cliente                           |
| `IsVendor`           | boolean         | Es proveedor                         |
| `IsEmployee`         | boolean         | Es empleado                          |
| `Inactive`           | boolean         | Inactivo                             |
| `PaymentTermID`      | string (uuid)   | Término de pago por defecto          |
| `CurrencyID`         | string          | Moneda preferida                     |
| `CreditLimit`        | number          | Límite de crédito                    |
| `PriceLevelID`       | string (uuid)   | Nivel de precio                      |
| `TaxScheduleID`      | string (uuid)   | Grupo de impuestos                   |
| `TaxExempt`          | boolean         | Exento de impuestos                  |
| `SalesRepID`         | string (uuid)   | Vendedor asignado                    |
| `CustomerClassID`    | string (uuid)   | Clase de cliente                     |
| `ParentRelationshipID`| string (uuid)  | Empresa padre                        |
| `CountryID`          | string          | País                                 |
| `DiscountPercent`    | number          | Descuento por defecto                |
| `CreationDate`       | string (datetime)| Fecha de creación                   |
| `Contacts`           | array           | Contactos del cliente                |
| `Addresses`          | array           | Direcciones del cliente              |

### SA_Relationships_Addresses (Dirección)

**22 propiedades.**

| Campo                    | Tipo          | Descripción              |
|--------------------------|---------------|--------------------------|
| `ID`                     | string (uuid) | Identificador            |
| `RelationshipID`         | string (uuid) | ID del cliente           |
| `Name`                   | string        | Nombre de la dirección   |
| `Address1` / `Address2`  | string        | Líneas de dirección      |
| `City`                   | string        | Ciudad                   |
| `State`                  | string        | Estado/Provincia         |
| `PostalCode`             | string        | Código postal            |
| `CountryID`              | string        | ID del país              |
| `CountryName`            | string        | Nombre del país          |
| `Phone1` / `Phone2`      | string        | Teléfonos                |
| `Contact`                | string        | Persona de contacto      |
| `DefaultBillingAddress`  | boolean       | Dirección de facturación |
| `DefaultShipppingAddress`| boolean       | Dirección de envío       |
| `Lat` / `Lon`            | number        | Coordenadas              |

### SA_Contacts (Contacto)

**67 propiedades.**

| Campo                     | Tipo          | Descripción                 |
|---------------------------|---------------|-----------------------------|
| `ID`                      | string (uuid) | Identificador               |
| `RelationshipID`          | string (uuid) | ID del cliente              |
| `FirstName` / `LastName`  | string        | Nombre y apellido           |
| `FullName`                | string        | Nombre completo             |
| `EMail`                   | string        | Email                       |
| `Phone1` / `Phone2`       | string        | Teléfonos                   |
| `Mobile`                  | string        | Celular                     |
| `Position`                | string        | Cargo                       |
| `FiscalID`                | string        | RNC/Cédula del contacto     |
| `Inactive`                | boolean       | Inactivo                    |
| `AllowAccess`             | boolean       | Acceso al portal            |
| `IncludeInQuoteEMails`    | boolean       | Incluir en emails de cotización |
| `IncludeInInvoiceEMails`  | boolean       | Incluir en emails de factura|
| `IncludeInStatementEMails`| boolean       | Incluir en estados de cuenta|

### SA_Transactions (Transacción/Documento)

Modelo unificado para cotizaciones, facturas, órdenes, etc. **194 propiedades.**

**Campos principales (para crear/leer):**

| Campo                        | Tipo          | Descripción                          |
|------------------------------|---------------|--------------------------------------|
| `ID`                         | string (uuid) | Identificador                        |
| `DocID`                      | string        | Número de documento (PRO-00123)      |
| `DocDate`                    | string (datetime) | Fecha del documento              |
| `DocType`                    | string        | Tipo de documento                    |
| `RelationshipID`             | string (uuid) | ID del cliente                       |
| `RelationshipName`           | string        | Nombre del cliente                   |
| `CurrencyID`                 | string        | Moneda                               |
| `ExchangeRate`               | number        | Tasa de cambio                       |
| `Reference`                  | string        | Referencia libre                     |
| `Notes`                      | string        | Notas/observaciones                  |
| `Description`                | string        | Descripción                          |
| `PaymentTermID`              | string (uuid) | ID del término de pago               |
| `PaymentTermName`            | string        | Nombre del término                   |
| `SalesStageID`               | string (uuid) | ID de etapa de ventas                |
| `ContactID`                  | string (uuid) | ID del contacto                      |
| `ContactName`                | string        | Nombre del contacto                  |
| `TaxScheduleID`              | string (uuid) | Grupo de impuestos del documento     |
| `TaxExempt`                  | boolean       | Exento de impuestos                  |
| `NCF`                        | string        | Comprobante fiscal (RD)              |
| `Void`                       | boolean       | Anulada                              |
| `Printed`                    | boolean       | Impresa                              |
| `Mailed`                     | boolean       | Enviada por email                    |
| **Dirección de facturación** |               |                                      |
| `BillToAddressID`            | string (uuid) | ID de la dirección                   |
| `BillToName`                 | string        | Nombre                               |
| `BillToAddress1/2`           | string        | Dirección                            |
| `BillToCity/State`           | string        | Ciudad/Estado                        |
| `BillToPostalCode`           | string        | Código postal                        |
| `BillToPhone`                | string        | Teléfono                             |
| `BillToContact`              | string        | Contacto                             |
| `BillToCountryID`            | string        | País                                 |
| **Dirección de envío**       |               |                                      |
| `ShipToAddressID`            | string (uuid) | ID de la dirección                   |
| `ShipToName`                 | string        | Nombre                               |
| `ShipToAddress1/2`           | string        | Dirección                            |
| **Totales calculados**       |               |                                      |
| `CalculatedSubTotalAmount`   | number        | Subtotal                             |
| `CalculatedDiscountAmount`   | number        | Descuento                            |
| `EffectiveDiscountPercent`   | number        | % de descuento efectivo              |
| `CalculatedNetAmount`        | number        | Neto                                 |
| `CalculatedTaxAmount`        | number        | Impuestos                            |
| `CalculatedTotalAmount`      | number        | Total                                |
| `TaxAmount`                  | number        | Impuestos (manual)                   |
| `TotalAmount`                | number        | Total (manual)                       |
| **Relaciones**               |               |                                      |
| `Items`                      | array         | Líneas del documento                 |
| `CustomFields`               | array         | Campos personalizados                |
| `Files`                      | array         | Archivos adjuntos                    |
| `Fiscals`                    | array         | Datos fiscales                       |

### SA_Transaction_Items (Línea de Documento)

Campos clave para ítems dentro de transacciones:

| Campo            | Tipo          | Descripción                 |
|------------------|---------------|-----------------------------|
| `ItemID`         | string (uuid) | ID del artículo             |
| `Name`           | string        | Nombre del artículo         |
| `Description`    | string        | Descripción                 |
| `Quantity`       | number        | Cantidad                    |
| `Price`          | number        | Precio unitario             |
| `Extended`       | number        | Monto extendido (Q x P)    |
| `DiscountPercent`| number        | % de descuento              |
| `DiscountAmount` | number        | Monto de descuento          |
| `TaxAmount`      | number        | Impuesto de la línea        |
| `TaxScheduleID`  | string (uuid) | Grupo de impuestos          |
| `RowOrder`       | integer       | Orden de la línea           |

### IC_Items (Artículo/Servicio)

Modelo para artículos y servicios. Campos clave:

| Campo              | Tipo          | Descripción                  |
|--------------------|---------------|------------------------------|
| `ID`               | string (uuid) | Identificador                |
| `SKU`              | string        | Código SKU                   |
| `Name`             | string        | Nombre                       |
| `SalesDescription` | string        | Descripción de venta         |
| `SalesPrice`       | number        | Precio de venta              |
| `Cost`             | number        | Costo                        |
| `ItemClassID`      | string (uuid) | Clase de artículo            |
| `ItemBrandID`      | string (uuid) | Marca                        |
| `IsService`        | boolean       | Es servicio                  |
| `Inactive`         | boolean       | Inactivo                     |
| `TaxScheduleID`    | string (uuid) | Grupo de impuestos           |
| `Prices`           | array         | Lista de precios             |
| `Vendors`          | array         | Proveedores                  |
| `CustomFields`     | array         | Campos personalizados        |

### SA_Payment_Terms (Términos de Pago)

| Campo           | Tipo    | Descripción                    |
|-----------------|---------|--------------------------------|
| `ID`            | string  | Identificador                  |
| `Name`          | string  | Nombre (ej: "Contado", "30 días") |
| `ExpirationDays`| integer | Días de vencimiento            |
| `BlockingDays`  | integer | Días de bloqueo                |
| `DiscountDays`  | integer | Días para descuento por pronto pago |
| `DiscountPercent`| number | % descuento por pronto pago    |
| `CashTerms`     | boolean | Es término de contado          |
| `ShowInSalesDocs`| boolean| Mostrar en documentos de venta |
| `ShowInPurchaseDocs`| boolean| Mostrar en documentos de compra|

### CRM_Sales_Stages (Etapas de Ventas)

| Campo   | Tipo    | Descripción              |
|---------|---------|--------------------------|
| `ID`    | string  | Identificador            |
| `Name`  | string  | Nombre de la etapa       |
| `Notes` | string  | Notas                    |
| `Closes`| boolean | Etapa que cierra negocio |
| `Lost`  | boolean | Etapa de pérdida         |

### AR_Promotions (Promociones)

| Campo            | Tipo          | Descripción                    |
|------------------|---------------|--------------------------------|
| `ID`             | string (uuid) | Identificador                  |
| `Name`           | string        | Nombre de la promoción         |
| `BeginDate`      | string (datetime) | Fecha de inicio            |
| `EndDate`        | string (datetime) | Fecha de fin               |
| `CustomerClassID`| string (uuid) | Clase de cliente aplica        |
| `ItemClassID`    | string (uuid) | Clase de artículo aplica       |
| `ItemID`         | string (uuid) | Artículo específico            |
| `Quantity`       | integer       | Cantidad mínima                |
| `MaxQuantity`    | integer       | Cantidad máxima                |
| `PromotionQuantity`| integer    | Cantidad en promoción          |
| `DiscountPercent`| number        | % de descuento                 |
| `DiscountAmount` | number        | Monto de descuento             |
| `CurrencyID`     | string        | Moneda                         |
| `UseSalesPrice`  | boolean       | Usar precio de venta           |
| `Inactive`       | boolean       | Inactiva                       |

### SA_Currencies (Monedas)

| Campo                          | Tipo    | Descripción                   |
|--------------------------------|---------|-------------------------------|
| `ID`                           | string  | Código de moneda (USD, DOP)   |
| `Name`                         | string  | Nombre                        |
| `ExchangeRate`                 | number  | Tasa de cambio actual         |
| `GetExchangeRateAutomatically` | boolean | Obtener tasa automáticamente  |
| `Sign`                         | string  | Símbolo ($, RD$)              |
| `IsFunctionalCurrency`        | boolean | Es la moneda funcional        |
| `ExchangeRates`                | array   | Historial de tasas            |

### SA_Fiscal_Sequences (Secuencias Fiscales)

| Campo                 | Tipo          | Descripción                    |
|-----------------------|---------------|--------------------------------|
| `ID`                  | string (uuid) | Identificador                  |
| `FiscalSequenceType`  | string        | Tipo de secuencia              |
| `Prefix`              | string        | Prefijo (ej: B01)             |
| `Digits`              | integer       | Dígitos                        |
| `NextNumber`          | integer       | Próximo número                 |
| `LastNumber`          | integer       | Último número                  |
| `EmissionDate`        | string (datetime) | Fecha de emisión           |
| `Expiration`          | string (datetime) | Fecha de expiración        |
| `CompleteNextNumber`  | string        | Número completo formateado     |

---

## Rutas Proxy del CRM

El CRM expone rutas internas que actúan como proxy hacia ADMCloud.

| Ruta CRM                              | Método | Endpoint ADMCloud                        |
|----------------------------------------|--------|------------------------------------------|
| `/api/admcloud/items`                  | GET    | `GET /PriceList`                         |
| `/api/admcloud/price-lists`            | GET    | `GET /PriceList`                         |
| `/api/admcloud/payment-terms`          | GET    | `GET /PaymentTerms`                      |
| `/api/admcloud/sales-stages`           | GET    | `GET /SalesStages`                       |
| `/api/billing/generate-proforma`       | POST   | `POST /Quotes` + `GET /Quotes/{id}` + `GET /Customers/{id}` + `GET /PaymentTerms` |
| `/api/cron/billing`                    | Cron   | `POST /Quotes` + `GET /Quotes/{id}` + `GET /PaymentTerms` |
| `/api/reports/admcloud-documents`      | GET    | `GET /CreditInvoices` + `GET /CreditInvoices/{id}` + `GET /Quotes` + `GET /Quotes/{id}` |

---

## Flujo de Creación de Proformas

### Manual (`/api/billing/generate-proforma`)

```
1. GET /PaymentTerms       → Obtiene término de pago
2. GET /Customers/{id}     → Obtiene dirección y contacto
3. POST /Quotes            → Crea cotización (con BillTo* y ContactID)
4. GET /Quotes/{id}        → Lee DocID, CalculatedTaxAmount, CalculatedTotalAmount
5. Genera PDF y registra en DB
```

### Automática (`/api/cron/billing`)

```
1. GET /PaymentTerms       → Obtiene término de pago
2. POST /Quotes            → Crea cotización (sin BillTo)
3. GET /Quotes/{id}        → Lee DocID y totales
4. Genera PDF, envía email y registra en DB
```

---

## Notas de Integración

1. **`/PriceList` vs `/Items`:** Usar `/PriceList` para obtener artículos con precios. `/Items` con `expand=Prices` puede devolver `Prices` vacío.

2. **`PaymentTermID` vs `PaymentTermsID`:** Al **crear** usar `PaymentTermID`. La respuesta de `GET /Quotes/{id}` devuelve `PaymentTermsID` (con "s").

3. **Campo `Reference`:** Se usa para enviar la tasa de cambio (formateada a 2 decimales).

4. **Campo `TaxScheduleID`:** Se envía por línea en `Items[]` del `POST /Quotes` para aplicar impuestos por artículo.

5. **Normalización de respuestas:** La API puede devolver un objeto individual o un array. Normalizar siempre con `Array.isArray()`.

6. **`FiscalID`:** Normalizar removiendo guiones y espacios antes de enviar y al comparar.

7. **Paginación:** Todos los endpoints de listado aceptan `skip`. Para obtener todo usar `skip=0`.

8. **Formatos de fecha:** ISO 8601 en la mayoría. `DocDateString` viene como `MM/DD/YYYY`.

9. **Modelo unificado `SA_Transactions`:** Es usado por Quotes, CreditInvoices, CashInvoices, SalesOrders, CustomerCreditNotes, etc. Los mismos campos aplican a todos.

10. **Modelo unificado `SA_Relationships`:** Clientes, proveedores y empleados comparten el mismo modelo. Los flags `IsCustomer`, `IsVendor`, `IsEmployee` determinan el tipo.

11. **NCF:** Campo `NCF` en facturas contiene el Número de Comprobante Fiscal (República Dominicana).

12. **Anulación de facturas:** Requiere `id` + `cancellationTypeID`. Obtener tipos de cancelación con `GET /CancellationTypes`.

13. **`Promotions/GetActive`:** Endpoint útil para calcular descuentos en tiempo real. Requiere `TransactionDate`, `ItemID`, `CustomerID`, `CurrencyID` y `Quantity`.
