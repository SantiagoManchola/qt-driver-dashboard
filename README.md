# QuickTrack Driver Dashboard

Dashboard estático para visualizar el volumen diario de entregas por conductor. La base de datos solo se usa durante una extracción local manual; el dashboard y el despliegue no tienen ninguna conexión a MySQL.

## Datos incluidos

- Node.js 20+
El archivo `data/driver-report.json` contiene el corte de `carrier_id = 46` y `carrier_id = 51`, extraído desde MySQL desde el 1 de enero del año actual hasta el 10 de agosto de 2026, ya convertido a UTC-5. Incluye identificación, nombre, día y hora local de cada conductor, además del catálogo completo de conductores activos por carrier. El proyecto no contiene cliente MySQL, credenciales, extractor ni endpoint de datos.

## Ejecutar el dashboard

No requiere `.env`, MySQL ni ningún servicio externo:

```bash
npm run dev
```

Abre `http://localhost:3000`.

## Datos y zona horaria

El archivo fue generado usando `delivery_routes.created_at`, contando `DISTINCT delivery_id`, filtrando carriers 46 y 51, y relacionando `routes`, `drivers` y `users`. Como la base guarda UTC, los límites se convirtieron a UTC sumando 5 horas y el día/hora se calcularon con `DATE_SUB(created_at, INTERVAL 5 HOUR)`.

Un conductor es `APOYO` si su nombre o identificación contiene `apoyo`, sin importar mayúsculas. Los demás son `NORMAL`. El dashboard permite visualizar el mismo periodo agrupado por día o por hora local UTC-5.

La tabla inferior marca como `USO CRÍTICO` a los conductores con 1 a 3 entregas en el rango y como `SIN USO` a los que tienen 0. El conteo de conductores del resumen y el catálogo consideran todos los conductores activos del carrier, aunque no tengan entregas.

También se incluye una tabla de detalle con todos los conductores filtrados, sus entregas y días activos, ordenada de mayor a menor uso.

## Despliegue en Vercel

1. Importa este directorio como proyecto en Vercel.
2. No agregues variables de base de datos en Vercel.
3. Ejecuta el despliegue. El comando de build es `npm run build`.

Next.js usa `output: export`, por lo que Vercel recibe únicamente archivos estáticos. No hay funciones serverless ni endpoints de datos.

## Seguridad

No subas credenciales al repositorio. `data/driver-report.json` es el único origen de datos del dashboard y se incluye intencionalmente en el despliegue.
