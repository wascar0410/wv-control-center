# 🧭 BACKFILL GEOCODING - INSTRUCCIONES

## Objetivo
Enriquecer TODOS los loads existentes en la DB con coordenadas geocodificadas.

## Requisitos
- ✅ Google Maps API Key (en `GOOGLE_MAPS_API_KEY`)
- ✅ Acceso a la base de datos
- ✅ Node.js 18+

## Ejecución

### Opción 1: Local (Desarrollo)
```bash
cd /home/ubuntu/wv-control-center

# Asegurarse de que las variables de entorno estén configuradas
export DB_HOST=localhost
export DB_USER=root
export DB_PASSWORD=your_password
export DB_NAME=wv_control_center
export GOOGLE_MAPS_API_KEY=your_api_key

# Ejecutar el script
node server/backfill-geocoding.mjs
```

### Opción 2: Production (Railway)
```bash
# En la consola de Railway o SSH
cd /app

# El script usará las variables de entorno de Railway automáticamente
node server/backfill-geocoding.mjs
```

## Qué hace el script

1. **Conecta a la DB**
   - Busca todos los loads con `pickupLat IS NULL OR deliveryLat IS NULL`

2. **Geocodifica automáticamente**
   - Por cada load:
     - Si `pickupLat` es null → geocodifica `pickupAddress`
     - Si `deliveryLat` es null → geocodifica `deliveryAddress`

3. **Rate limiting**
   - Máximo 5 requests/segundo (respeta límites de Google Maps API)
   - 200ms de delay entre requests

4. **Guarda en DB**
   - Actualiza `pickupLat`, `pickupLng`, `deliveryLat`, `deliveryLng`

5. **Logs de tracking**
   - `[GEOCODE_BACKFILL]` para cada operación
   - Resumen final con % de éxito

## Salida esperada

```
[GEOCODE_BACKFILL] Connecting to database...
[GEOCODE_BACKFILL] Connected!
[GEOCODE_BACKFILL] Querying loads with missing coordinates...
[GEOCODE_BACKFILL] Found 1250 loads to process
[GEOCODE_BACKFILL] Pickup geocoded for load 600021 { address: '123 Main St', lat: 40.7128, lng: -74.0060 }
[GEOCODE_BACKFILL] Load 600021 updated { pickupLat: 40.7128, pickupLng: -74.0060 }
...
[GEOCODE_BACKFILL] BACKFILL COMPLETE { processed: 1250, updated: 1200, failed: 50, success_rate: '96.00%' }
```

## Validación post-backfill

Después de ejecutar, verificar:

1. **En logs de production:**
   - Buscar `[GEOCODE_BACKFILL]` para confirmar éxito
   - Buscar `[COORD CHECK]` para ver hasValidCoords: true
   - Buscar `[HAVERSINE CALC]` para ver miles > 120

2. **En Dispatch Board:**
   - Nuevos loads deben mostrar miles reales (NO siempre 120)
   - ratePerMile debe ser > 0

3. **En DB:**
   ```sql
   SELECT COUNT(*) as total, 
          SUM(CASE WHEN pickupLat IS NOT NULL THEN 1 ELSE 0 END) as with_coords
   FROM loads;
   ```

## Tolerancia a errores

- ✅ Si un load falla → script continúa (NO rompe)
- ✅ Si Google Maps API falla → fallback a Nominatim
- ✅ Si ambos fallan → skip load (pero registra en logs)

## Seguridad

- ❌ NO modifica Wallet, Ledger, Plaid, Auth
- ✅ Solo actualiza coordenadas en tabla `loads`
- ✅ Transacciones seguras por load

## Duración estimada

- 1000 loads: ~3-5 minutos (con rate limiting)
- 5000 loads: ~15-25 minutos
- 10000 loads: ~30-50 minutos

## Troubleshooting

### Error: "Database connection failed"
- Verificar credenciales en variables de entorno
- Verificar que la DB está accesible

### Error: "GOOGLE_MAPS_API_KEY not found"
- Configurar `GOOGLE_MAPS_API_KEY` en variables de entorno
- El script usará Nominatim como fallback (más lento)

### Script se detiene
- Revisar logs para ver qué load causó el error
- Ejecutar nuevamente (retoma desde donde se detuvo)

## Próximos pasos

1. Ejecutar backfill
2. Verificar logs
3. Deploy a Railway
4. Validar en production que miles y ratePerMile son reales
