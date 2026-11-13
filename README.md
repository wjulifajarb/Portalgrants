# Portal de Grants · Educamás

Proyecto completo **sin usuarios, sin registro y sin pantalla de inicio de sesión**. Los datos vienen del **Google Sheets nuevo**, pestaña **`Consolidado`**, y la web permite consultar y editar datos mediante un puente de servidor que no publica la clave de Apps Script.

> **ADVERTENCIA DE PRIVACIDAD:** un sitio web sin autenticación no es privado. **Quien tenga su dirección podrá leer y modificar todos los registros a través de la web.** Una clave guardada en Vercel protege la conexión con Apps Script frente a su extracción desde el navegador, pero **no restringe quién utiliza la web**. Antes de usar contactos, presupuestos y expedientes reales, evalúa publicar el portal solo con datos no sensibles o añadir control de acceso perimetral (que podría pedir autenticación). No publiques datos internos en una web abierta sin una decisión institucional.

## 1. Archivos del proyecto

```text
portal-grants-educamas/
├── google-apps-script/
│   └── Code.gs          ← PEGAR en Google Sheets > Extensiones > Apps Script
├── api/
│   └── grants.js        ← Función de Vercel: oculta EDU_API_TOKEN
├── assets/
│   ├── app.js           ← Dashboard, buscador, formularios, análisis y pasos
│   ├── styles.css       ← Diseño amarillo / azul oscuro Educamás
│   └── favicon.svg
├── tests/
│   ├── api.test.js
│   └── gas.test.js
├── index.html
├── server.mjs           ← Servidor local sin paquetes externos
├── package.json
├── vercel.json
├── .env.example
├── .gitignore
└── README.md
```

## 2. PRIMERO: configura Google Sheets

1. Abre el **nuevo Google Sheets** que creaste a partir de la última versión del pipeline. Confirma que hay una hoja llamada **`Consolidado`** y que la fila 1 contiene, entre otros, `ID maestro`, `Año oportunidad`, `Empresa/aliado/Grant/cliente`, `Convocatoria / proyecto` y `Status`.
2. Haz una **copia de seguridad** del documento. Se recomienda probar la primera implementación con un duplicado sin datos sensibles.
3. En Google Sheets, selecciona **Extensiones > Apps Script**. Elimina el contenido de `Código.gs` y **pega el archivo entero** `google-apps-script/Code.gs`. No tienes que crear ningún archivo HTML en Apps Script.
4. Guarda y ejecuta `instalarPortal`. Autoriza el acceso a tu hoja. La instalación agrega únicamente las columnas que faltan y crea las hojas auxiliares `_PASOS_GRANTS`, `_REVISIONES_GRANTS`, `_HISTORIAL_GRANTS`. No borra las oportunidades.
5. Ejecuta `probarConexion` y mira el **Registro de ejecución**. Debe mostrar el nombre del libro y el número aproximado de oportunidades (124 en la base inicial).
6. En el editor de Apps Script, entra en **Configuración del proyecto > Propiedades de secuencia de comandos** y copia el valor de `EDU_API_TOKEN`. `EDU_SHEET_ID` se crea automáticamente. **Trata el token como una contraseña de sistema; nunca lo subas a GitHub.**
7. Pulsa **Implementar > Nueva implementación > Aplicación web**. Elige **Ejecutar como: Yo** y, para que Vercel pueda llamar al servicio sin cuentas de Google, **Acceso: Cualquier persona**. Si tu organización no permite ese acceso, el método sin login no funcionará tal como está; NO cambies la privacidad institucional sin autorización.
8. Pulsa Implementar y copia la URL terminada en **`/exec`**. Puedes abrirla; solo mostrará un texto indicando que el servicio espera solicitudes POST. Esta URL no es la página web visible, es la API.

**Cuando cambies `Code.gs`:** publica una **nueva versión de la implementación existente** para que los cambios lleguen a `/exec`.

## 3. SEGUNDO: abre el proyecto en Visual Studio Code

1. Descomprime el ZIP completo o copia todos los archivos respetando las carpetas.
2. En VS Code, selecciona **File > Open Folder** y abre `Portal_Grants_Educamas_GitHub_FINAL`.
3. Duplica `.env.example` con el nombre **`.env.local`**. Sustituye:

```dotenv
GAS_WEB_APP_URL=https://script.google.com/macros/s/TU_IMPLEMENTACION/exec
GAS_API_TOKEN=TU_TOKEN_GENERADO_POR_INSTALARPORTAL
PORT=3000
```

4. Instala **Node.js 20.12 o superior**. Abre la terminal de VS Code y ejecuta:

```bash
npm run dev
```

5. Abre **http://localhost:3000**. La web debe leer `Consolidado` desde la API. No necesitas `npm install`: el proyecto no tiene dependencias externas.
6. Opcional: ejecuta `npm test` para verificar sintaxis funcional del puente, clasificación de estados y fechas.

**Si ves “Google devolvió HTML” o “No autorizado”:** comprueba que la URL sea de `/exec` (no `/dev`), que la implementación tenga los permisos correctos, que `GAS_API_TOKEN` coincida con `EDU_API_TOKEN` y que hayas autorizado `instalarPortal` desde Apps Script.

## 4. TERCERO: sube el proyecto a GitHub

```bash
git init
git add .
git commit -m "Portal grants Educamás - análisis y seguimiento"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
git push -u origin main
```

**No subas `.env.local`**. El archivo `.gitignore` ya lo excluye. Comprueba que la clave no aparezca en el repositorio antes de subirlo.

## 5. CUARTO: publícalo en Vercel

1. Inicia sesión en la plataforma de **Vercel como desarrollador** (esto es independiente del portal: los usuarios finales no se registran).
2. Selecciona **Add New > Project** e importa el repositorio de GitHub.
3. Framework preset: **Other**. Root directory: la raíz del proyecto. No hace falta build: `index.html` es estático y `/api/grants.js` es una función Node.js.
4. En **Environment Variables** agrega, para Production (y Preview si los necesitas):
   - `GAS_WEB_APP_URL` = URL del despliegue Apps Script terminada en `/exec`.
   - `GAS_API_TOKEN` = secreto `EDU_API_TOKEN` de Apps Script.
5. Pulsa **Deploy**. Abre la URL resultante; no habrá login. Prueba el dashboard y una **convocatoria de prueba** (mejor sobre una copia del Sheets).
6. Si cambias variables, vuelve a desplegar. Si cambia el código de Apps Script, publica nueva versión allí.

## 6. Qué contiene

- **Dashboard** con oportunidades totales, enviadas históricas según CRM, segunda fase, adjudicadas, rechazadas, mapeadas y en preparación.
- **Cinco próximas convocatorias** pendientes con fecha de cierre; avisos desde 30 días y urgencia a 7 días.
- **Vista anual** para revisar totales, envíos registrados, segunda fase y resultados.
- **Catálogo de grants** con búsqueda y filtros por año y etapa, montos y enlaces a Drive, convocatoria, términos y postulación.
- **Nuevo grant y edición**, solo nombre de convocatoria obligatorio. Las líneas de negocio pueden marcarse de forma **múltiple** a partir de la hoja `Catálogos`.
- **Análisis individual**: solicitado COP (registrado/validado), resultado (adjudicado, no adjudicado, pendiente, etc.), monto adjudicado reportado, monto adjudicado documentado, fecha de decisión, URL soporte y aprendizajes.
- **Evaluación del grant**: elegibilidad, encaje, requisitos pendientes, veredicto, análisis y acción siguiente. Historial de revisiones.
- **Checklist de pasos**, con actividad, estado, responsable en texto libre, fecha y evidencia. Botón para sugerir una ruta según la etapa/resultado.
- **Historial** por grant y sincronización puntual de la ficha modificada con su hoja anual, sin reescribir toda la base.

## 7. Notas sobre cifras y comprobación

- **Montos de la convocatoria ≠ monto solicitado por Educamás ≠ monto adjudicado**. Se reportan por separado.
- `Status = Aceptada / Adjudicada` y `Status = No aceptada` son **etapas CRM**, no pruebas documentales de una resolución. Se muestra advertencia cuando falta el soporte.
- La cifra de “enviadas históricas” se **infiere del estado CRM**; por separado figura “envío con registro”. Revisa el acuse antes de reportar un envío como comprobado.
- Para guardar un **monto adjudicado COP DOCUMENTADO**, el script exige una URL de soporte. La existencia de un enlace no supone auditoría del documento.
- El sistema impide duplicados evidentes con la misma combinación `Año + Aliado + Convocatoria`, pero no decide automáticamente si ciclos o ediciones diferentes son la misma oportunidad.
- La web no consulta internet automáticamente: usa las fuentes ya registradas en tu base. La investigación pública y el criterio de encaje se pueden escribir en las revisiones.

## 8. Prueba recomendada

1. En una copia del Sheets, ejecuta `instalarPortal`.
2. Añade `PRUEBA PORTAL EDUCAMÁS` como nueva convocatoria desde la web.
3. Edita su estado, agrega las URLs y guarda.
4. En **Análisis y resultados**, establece `Adjudicado`, registra un monto reportado y agrega un enlace de soporte para probar un monto documentado.
5. Registra una revisión y dos pasos (uno pendiente y otro completado).
6. Confirma en Sheets las pestañas `Consolidado`, su año, `_PASOS_GRANTS`, `_REVISIONES_GRANTS` y `_HISTORIAL_GRANTS`.
7. No lo publiques de manera abierta con información real hasta decidir cómo proteger los datos.

---

**Estado de entrega:** proyecto completo y pruebas automatizadas locales. La conexión con *tu* Google Sheets requiere instalación, autorización y despliegue por el propietario. No se ha hecho una prueba de integración real con tu nuevo archivo porque no se proporcionó su URL/ID.
