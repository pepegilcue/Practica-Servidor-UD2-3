# Sistema de reserva de equipos informáticos (DWES UD2 y 3)

Aplicación web con Node.js, Express, EJS y JavaScript, más un núcleo en TypeScript.
Los datos están en memoria (se pierden al reiniciar el servidor).

## Instalación y ejecución

```bash
npm install
cp .env.example .env      # y edita SESSION_SECRET (mínimo 16 caracteres)
npm start                 # http://localhost:3000
```

Variables de entorno (`.env`): `PORT`, `NODE_ENV` (development | production | test) y `SESSION_SECRET`.
Al arrancar se validan y, si alguna es incorrecta, la aplicación no arranca.
En `production` la cookie de sesión es `secure` (solo funciona con HTTPS).

## TypeScript y pruebas

```bash
npm run build:ts   # compila src-ts/ a dist/ (strict: true)
npm test           # 10 pruebas con Vitest + Supertest (no necesitan servidor arrancado)
```

## Usuarios de prueba

| Correo | Contraseña | Rol |
|---|---|---|
| admin@example.com | admin1234 | admin |
| ana@example.com | ana12345 | usuario |
| luis@example.com | luis12345 | usuario |

## Estructura (un archivo por capa)

```
src/
  server.js        arranca el servidor
  app.js           configura Express, sesiones y conecta todo (separado para poder probarlo)
  config.js        variables de entorno validadas
  rutas.js         RUTAS: método HTTP + URL + middleware
  controladores.js CONTROLADORES: reciben datos y devuelven la respuesta HTTP
  servicios.js     SERVICIOS: reglas de negocio (sin req, res ni EJS)
  repositorios.js  REPOSITORIOS: acceso a los datos en memoria
  middleware.js    login, rol admin, CSRF y errores
  utilidades.js    obtenerEquiposDisponibles, estaReservado, validarReserva...
  errors.js        errores de dominio
  datos.js         datos iniciales (3 equipos, 3 reservas, 3 usuarios)
  views/           VISTAS EJS (parciales en views/partials)
src-ts/reservas.ts núcleo TypeScript
test/app.test.js   pruebas automatizadas
```

Flujo de una petición: `rutas` → `controladores` → `servicios` → `repositorios`, y el controlador pinta una vista de `views/`.

## Cómo está implementado cada punto

- **Consulta de equipos** (`GET /equipos`, `/equipos/:id`): filtros `tipo` y `operativos`. La disponibilidad por fecha y turno se calcula al reservar.
- **Cookie de preferencias** `tipoPreferido`: se guarda al filtrar por tipo y se usa como filtro inicial (`?tipo=todos` la borra). Solo se acepta `portatil` o `sobremesa` y nunca se usa para autorizar.
- **Registro y login**: contraseñas con `bcrypt`; el registro siempre crea rol `usuario`; el login regenera la sesión y guarda solo `usuarioId`; el mismo error 401 si falla el correo o la contraseña; el logout destruye la sesión y borra la cookie `sid`.
- **Sesión** (`express-session`): `httpOnly`, `secure` (en producción), `sameSite: 'lax'`, `maxAge` de 1 hora. También guarda el mensaje de confirmación de un solo uso (se lee y se borra).
- **Reservas**: el formulario se hace en dos pasos con GET (fecha y turno) y POST (equipo entre los disponibles). El servidor repite todas las comprobaciones en `ServicioReservas.crear`. El usuario sale de la sesión. Éxito: PRG (303 a `/mis-reservas`). Error: se vuelve a mostrar el formulario con los campos válidos y los errores.
- **Cancelación**: solo tus reservas activas y de fecha no pasada; cambia el estado a `cancelada` (no se borra). Una reserva cancelada no bloquea el equipo.
- **Administración** (`/admin/...`): `requiereLogin` + `requiereRol('admin')`.
- **Seguridad**: CSRF con token en sesión y campo `_csrf` en todos los POST (incluido logout); `express-rate-limit` en el login (5 fallos por 15 min); validación en servicios y utils; errores de dominio y middleware central sin trazas.
- **Códigos HTTP**: 200/303 correcto, 400 datos incorrectos, 401 credenciales, 403 sin permisos o CSRF, 404 no existe, 409 equipo ya reservado.

## Ejemplos con curl

Todos los POST necesitan la cookie de sesión y el token CSRF (campo `_csrf`). Se usa un fichero de cookies (`-b` lee, `-c` guarda) y esta función, que descarga una página y extrae su token:

```bash
BASE=http://localhost:3000
JAR=cookies-ana.txt
token() { curl -s -b $JAR -c $JAR "$BASE$1" | grep -o 'name="_csrf" value="[^"]*"' | head -1 | sed 's/.*value="//;s/"//'; }
```

### Equipos (sin sesión)

```bash
curl -i "$BASE/equipos"
curl -i "$BASE/equipos?tipo=portatil"
curl -i "$BASE/equipos?tipo=sobremesa"
curl -i "$BASE/equipos?operativos=true"
curl -i "$BASE/equipos?tipo=portatil&operativos=true"
curl -i "$BASE/equipos/1"
```

### Registro, login, perfil y logout

```bash
# GET /registro y POST /registro
curl -i -b $JAR -c $JAR $BASE/registro
T=$(token /registro)
curl -i -b $JAR -c $JAR -d "_csrf=$T&nombre=Pepe&email=pepe@example.com&password=clave12345" $BASE/registro

# GET /login y POST /login (la sesión se regenera: -c guarda la cookie nueva)
T=$(token /login)
curl -i -b $JAR -c $JAR -d "_csrf=$T&email=ana@example.com&password=ana12345" $BASE/login

# GET /perfil
curl -i -b $JAR -c $JAR $BASE/perfil

# POST /logout
T=$(token /perfil)
curl -i -b $JAR -c $JAR -d "_csrf=$T" $BASE/logout
```

### Reservas (tras iniciar sesión como ana@example.com)

```bash
# GET /reservas/nueva (con fecha y turno muestra los equipos disponibles)
curl -i -b $JAR -c $JAR "$BASE/reservas/nueva?fecha=2027-02-01&turno=tarde"

# POST /reservas
T=$(token /perfil)
curl -i -b $JAR -c $JAR -d "_csrf=$T&equipoId=1&fecha=2027-02-01&turno=tarde" $BASE/reservas

# GET /mis-reservas
curl -i -b $JAR -c $JAR $BASE/mis-reservas

# POST /reservas/:id/cancelar
curl -i -b $JAR -c $JAR -d "_csrf=$T" $BASE/reservas/4/cancelar
```

### Administración (inicia sesión como admin@example.com con otro fichero de cookies)

```bash
JAR=cookies-admin.txt
T=$(token /login)
curl -i -b $JAR -c $JAR -d "_csrf=$T&email=admin@example.com&password=admin1234" $BASE/login
T=$(token /admin/equipos)

# GET y POST /admin/equipos
curl -i -b $JAR -c $JAR $BASE/admin/equipos
curl -i -b $JAR -c $JAR -d "_csrf=$T&codigo=PC-003&nombre=Ordenador aula 3&tipo=sobremesa" $BASE/admin/equipos

# POST /admin/equipos/:id/estado  (operativo | fuera_de_servicio)
curl -i -b $JAR -c $JAR -d "_csrf=$T&estado=fuera_de_servicio" $BASE/admin/equipos/1/estado

# GET /admin/reservas y POST /admin/reservas/:id/cancelar
curl -i -b $JAR -c $JAR $BASE/admin/reservas
curl -i -b $JAR -c $JAR -d "_csrf=$T" $BASE/admin/reservas/1/cancelar
```

Cada operación de usuario tiene su interfaz HTML: `/registro`, `/login`, `/perfil` (botón de cerrar sesión), `/equipos`, `/reservas/nueva`, `/mis-reservas` y `/admin/...`.

## Historial de conversación con la IA

[PEGA AQUÍ EL ENLACE A LA CONVERSACIÓN]
