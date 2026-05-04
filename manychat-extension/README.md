# CRM Maxi - Manychat Steps Extension

MVP de extension Chrome/Edge para trabajar dentro de Manychat con los pasos de estructura del CRM.

## Que hace ahora

- Inyecta un panel compacto en `https://app.manychat.com/*`.
- Usa URL automatica: `localhost` cuando esta cargada en desarrollo y URL de produccion cuando se publique.
- Permite elegir pasos por numero, buscar, editar el texto localmente y copiar paso/bloque/renglon.
- Tiene selector de proveedor IA y llama a `/api/extension/adapt-message` para adaptar mensajes.
- Detecta el proximo paso recomendado desde el contexto visible del chat y selecciona la guia automáticamente.
- Incluye el apartado `Ingresar al CRM` para tomar nombre/Instagram visible de Manychat y crear el lead.

## Instalacion en desarrollo

1. En la raiz del CRM, ejecutar `npm run dev`.
2. Abrir Chrome o Edge e ir a `chrome://extensions`.
3. Activar `Developer mode`.
4. Elegir `Load unpacked` y seleccionar la carpeta `manychat-extension`.
5. Abrir o recargar `https://app.manychat.com/`.

El icono de la extension abre/cierra el panel. Tambien se puede colapsar desde el boton del panel.

## Configuracion

El panel usa `URL del CRM: Auto` por defecto. En desarrollo apunta a `http://localhost:3000`; al publicar la extension usa `DEFAULT_PRODUCTION_CRM_BASE_URL` definido en `content.js`.

La URL manual y el token tecnico estan dentro de `Ajustes` para no ocupar el flujo principal.

Si se usa una URL distinta de `localhost` o `*.vercel.app`, hay que sumarla a `host_permissions` en `manifest.json` y recargar la extension.

El campo `Token tecnico` debe coincidir con `EXTENSION_API_TOKEN` cuando el backend lo tenga configurado.

## IA

El endpoint de adaptacion queda preparado para estas variables de entorno:

- `DEEPSEEK_API_URL`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL`
- `EDIPSIC_API_URL` o `EDITH_API_URL`
- `EDIPSIC_API_KEY` o `EDITH_API_KEY`
- `EXTENSION_API_TOKEN` opcional para proteger la adaptacion con un token extra

El endpoint `/api/extension/detect-step` usa el mismo proveedor IA para elegir el proximo paso de la estructura. Antes de clasificar, limpia texto tecnico de Manychat como fechas, `PROPro indicator`, `Tú741`, automatizaciones, movimientos de conversacion y asignaciones. Si la IA no esta disponible, responde con una deteccion por reglas como fallback.

## Crear leads desde Manychat

El endpoint `/api/extension/leads` permite crear un lead con nombre, Instagram y contexto visible.

Variables necesarias para que funcione en local/produccion:

- `SUPABASE_SERVICE_ROLE_KEY` con rol `service_role` desde Supabase Project Settings > API; no sirve la `anon public`.
- `EXTENSION_API_TOKEN`
- `EXTENSION_DEFAULT_SETTER_ID` opcional; si no esta, usa el primer usuario con role `setter`.

Sin `SUPABASE_SERVICE_ROLE_KEY`, el panel muestra un error claro y no intenta saltarse RLS.

## Limites conocidos

- La lectura del chat depende del DOM visible de Manychat; si Manychat cambia su UI, puede requerir ajustar selectores. Tambien se puede pegar el chat completo en el contexto: el CRM filtra la basura de interfaz antes de usar IA.
- No envia mensajes automaticamente. El panel esta pensado para revisar, copiar y pegar manualmente.
- Los ajustes de texto dentro de la extension se guardan en `chrome.storage.local`, no en el CRM.