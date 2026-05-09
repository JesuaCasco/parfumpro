# ParfumPro

Sistema de gestión de ventas de perfumes y decants con React, Vite, Vercel y Supabase.

## Qué incluye

- Interfaz de gestión de productos (perfumes y decants)
- Registro de ventas y cálculo de totales
- Persistencia en Supabase
- Configuración lista para desplegar en Vercel

## Instalación

1. Copia el proyecto a tu carpeta.
2. Crea un proyecto en Supabase e importa las tablas necesarias.
3. Configura las variables de entorno en `Vercel` o en un archivo `.env` local.

## Variables de entorno

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Tablas recomendadas en Supabase

### productos

- id: integer (primary key, auto increment)
- name: text
- brand: text
- type: text
- volume: text
- price: numeric
- stock: integer

### ventas

- id: integer (primary key, auto increment)
- product_id: integer
- product_name: text
- quantity: integer
- total: numeric
- sold_at: timestamp

## Autenticación en Supabase

1. En tu proyecto de Supabase, ve al panel de `Authentication` > `Settings`.
2. Activa `Enable email sign-ups` o habilita el proveedor de correo.
3. Usa el formulario de la app para crear cuenta e iniciar sesión.

## Comandos

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`

## Despliegue en Vercel

1. Crea un nuevo proyecto en Vercel y conecta el repositorio.
2. Agrega las variables de entorno en Vercel.
3. Usa el comando de build: `npm run build`.

## Notas

Este proyecto está pensado para uso personal y se puede extender con autenticación, inventario avanzado y reportes.
