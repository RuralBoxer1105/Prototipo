# Ficha compartida del arreglo · prototipo de prueba

Prototipo web para las pruebas con usuarios de la materia Desarrollo de Productos de Base
Tecnológica (Universidad ORT Uruguay). **No es un producto final**: sirve para probar un
concepto con técnicos y hogares.

El concepto es la **ficha compartida del arreglo**: un caso digital donde el técnico carga el
acuerdo (precio, alcance, exclusiones, respaldo), los cambios quedan *pendientes* hasta que el
hogar responde, y al final queda un cierre que se puede volver a consultar si la falla vuelve.
Se compara contra la alternativa habitual: **mensajes guiados**, una conversación tipo chat con
la misma información.

Es un sitio 100 % estático (HTML, CSS y JavaScript con módulos ES). No tiene backend, base de
datos, analytics ni cookies, y no pide datos personales: cada participante se identifica con un
código. Todo se guarda en el `localStorage` del navegador donde se hace la sesión.

---

## 1. Qué parte sirve para cada hipótesis

| Parte | Ruta | Experimento | Hipótesis | Qué mide |
|---|---|---|---|---|
| Sesión técnico | `#/tecnico/T1` … | E1 | HP1 y HP6 | Tiempo por tarea (propuesta, cambio, cierre) y campos que el técnico deja vacíos. |
| Sesión hogar | `#/hogar/H1` … | E2 y E3 | HP2, HP3 y HP4 | Qué entiende el hogar en cada etapa, cuánto tarda, qué botones toca, qué escribe y qué formato prefiere. |
| Prueba técnica | `#/prueba-tecnica` | E5 | HP5 | Que las versiones del acuerdo se guardan bien y que un cambio pendiente nunca aparece como aceptado. |

### Asignación de los hogares

| Código | Caso en la ficha | Caso en mensajes | Ve primero |
|---|---|---|---|
| H1 | Caso 1 | Caso 2 | Ficha |
| H2 | Caso 2 | Caso 1 | Ficha |
| H3 | Caso 1 | Caso 2 | Mensajes |
| H4 | Caso 2 | Caso 1 | Mensajes |
| H5 | Caso 1 | Caso 2 | Ficha |
| PH (piloto) | Caso 1 | Caso 2 | Ficha |

Cada parte tiene 4 etapas: **Acuerdo → Cambio → Cierre → Volvió la falla**. El botón
“Siguiente” avanza de etapa (el facilitador le dice al participante cuándo tocarlo).
Al final se pregunta la preferencia (“Como la ficha” / “Como los mensajes”, sin opción
preseleccionada) y por qué.

Los técnicos usan el caso 1 por defecto. Para el caso 2, agregar `?caso=2` al link.

---

## 2. Qué funciona de verdad y qué se simula

**Funciona de verdad**

- **Versiones y estados del acuerdo** (`js/versiones.js`): propuesta, pendiente, aceptada,
  rechazada y reemplazada; una sola versión pendiente a la vez; la vigente es siempre la última
  aceptada; las versiones reemplazadas no se borran ni se pueden modificar; cada respuesta guarda
  el id de la versión a la que responde; historial completo y en orden. La ficha del hogar, la
  vista previa del técnico y la prueba técnica usan este mismo módulo.
- **Registro de tiempos y acciones** (`js/registro.js`): hora de entrada y salida de cada etapa o
  tarea, duración en segundos, botones tocados, textos escritos y campos vacíos. Se guarda a
  medida que avanza, así que si se recarga la página la sesión sigue donde estaba.
- **Formularios del técnico**: el total se calcula solo con los montos, se puede escribir un
  rango, y ningún campo es obligatorio. Arriba de la hoja de datos se le indica que use los
  montos y el cambio de la hoja, y que ponga el respaldo que ofrecería de verdad.

**Se simula**

- **El técnico de la ficha y del chat**: los mensajes y versiones del técnico salen de los datos
  fijos de cada caso (`js/casos.js`).
- **Las respuestas del hogar en la sesión del técnico**: después de enviar el cambio aparece
  “El hogar aceptó el cambio” (simulado). En la vista previa final, las aceptaciones también son
  simuladas.
- **Las fotos**: son una imagen genérica de ejemplo. En la sesión del técnico, “Adjuntar foto”
  no sube nada.
- **El envío de avisos**: “Avisar al técnico que volvió la falla” y los mensajes del chat solo se
  registran; no le llegan a nadie.
- **Notas de voz**: se muestra la transcripción. Si se agregan archivos de audio en `audio/`
  (ver `audio/LEEME.md`), se pueden reproducir.

**Cuando el hogar no acepta en la ficha.** El guion de la prueba sigue igual para todos, como en
el chat, donde el técnico también sigue aunque el hogar diga que no. Si en la ficha el hogar pasa
de etapa sin responder, la versión se toma como aceptada y queda anotado como respuesta “del
guion” (no del hogar). Si respondió “No acepto”, la versión queda rechazada en el historial y el
caso continúa. En la etapa siguiente aparece la misma frase que dice el facilitador en los dos
formatos (ver [PROTOCOLO.md](PROTOCOLO.md)). Los resultados incluyen “Decisiones en la ficha”:
quién resolvió cada versión (el hogar o el guion), para analizar los rechazos aparte.

**Para las sesiones**, seguir [PROTOCOLO.md](PROTOCOLO.md): celulares del equipo, frases fijas del
facilitador, preguntas de comprensión por etapa y descarga de resultados después de cada sesión.
El observador usa [PLANILLA-HOGAR.md](PLANILLA-HOGAR.md) o [PLANILLA-TECNICO.md](PLANILLA-TECNICO.md),
una impresa por participante. Las preguntas y las planillas no aparecen en la web: son material
del equipo.

**Equivalencia ficha / chat.** La ficha y el chat de un mismo caso muestran exactamente la misma
información. La única diferencia es que en el chat se acuerda antes un límite de gasto ($7.000 en
el caso 1, $12.000 en el caso 2). Los dos formatos usan la misma fuente, tamaños y paleta, para
que la prueba compare formatos y no diseños. Todos los datos salen de `js/casos.js`.

---

## 3. Cómo publicarlo gratis en GitHub Pages

1. Entrá a <https://github.com> con tu cuenta y tocá **New repository**.
2. Ponele un nombre (por ejemplo `ficha-arreglo`), elegí **Public** y tocá **Create repository**.
3. En la página del repositorio nuevo, tocá **uploading an existing file**.
4. Arrastrá **todo el contenido** de esta carpeta (no la carpeta en sí): `index.html`, `.nojekyll`,
   `README.md`, `PROTOCOLO.md`, `PLANILLA-HOGAR.md`, `PLANILLA-TECNICO.md`, `CHANGELOG.md` y las
   carpetas `css`, `js` y `audio`. Tocá **Commit changes**.
   - Si el navegador no deja arrastrar carpetas, subí primero los archivos sueltos y después
     usá **Add file → Upload files** para cada carpeta.
   - `.nojekyll` es un archivo vacío que puede quedar oculto en Windows; si no se sube no pasa nada.
5. Andá a **Settings → Pages**.
6. En **Build and deployment → Source** elegí **Deploy from a branch**.
7. En **Branch** elegí **main** y la carpeta **/ (root)**. Tocá **Save**.
8. Esperá uno o dos minutos y recargá la página de Settings → Pages. Arriba aparece el link,
   con la forma `https://<usuario>.github.io/<repositorio>/`.
9. Abrí ese link: tiene que aparecer la pantalla de inicio del equipo. Probá un link de
   participante y la prueba técnica antes de la primera sesión.

Para actualizar: subí los archivos cambiados al mismo repositorio. GitHub Pages tarda unos minutos
en mostrar la versión nueva.

El sitio tiene `<meta name="robots" content="noindex, nofollow">` para que los buscadores no lo
indexen, pero cualquiera con el link puede abrirlo: no compartan los links fuera del equipo y los
participantes.

### Probarlo en tu computadora

Los módulos de JavaScript no andan abriendo `index.html` con doble clic (`file://`). Hace falta un
servidor local. Con Python instalado, desde esta carpeta:

```
python -m http.server 8000
```

y abrí <http://localhost:8000/#/>. También sirve la extensión *Live Server* de VS Code.

---

## 4. Links por participante

Reemplazá `<usuario>` y `<repositorio>` por los de tu GitHub Pages. La pantalla de inicio
(`#/`) es solo para el equipo y tiene botones para copiar cada link.

| Quién | Link |
|---|---|
| Inicio (equipo) | `https://<usuario>.github.io/<repositorio>/#/` |
| Hogar H1 | `https://<usuario>.github.io/<repositorio>/#/hogar/H1` |
| Hogar H2 | `https://<usuario>.github.io/<repositorio>/#/hogar/H2` |
| Hogar H3 | `https://<usuario>.github.io/<repositorio>/#/hogar/H3` |
| Hogar H4 | `https://<usuario>.github.io/<repositorio>/#/hogar/H4` |
| Hogar H5 | `https://<usuario>.github.io/<repositorio>/#/hogar/H5` |
| Piloto hogar PH | `https://<usuario>.github.io/<repositorio>/#/hogar/PH` |
| Técnico T1 | `https://<usuario>.github.io/<repositorio>/#/tecnico/T1` |
| Técnico T2 | `https://<usuario>.github.io/<repositorio>/#/tecnico/T2` |
| Técnico T3 | `https://<usuario>.github.io/<repositorio>/#/tecnico/T3` |
| Piloto técnico PT | `https://<usuario>.github.io/<repositorio>/#/tecnico/PT` |
| Técnico con el caso 2 | agregar `?caso=2`, por ejemplo `…/#/tecnico/T1?caso=2` |
| Prueba técnica | `https://<usuario>.github.io/<repositorio>/#/prueba-tecnica` |
| Resultados guardados | `https://<usuario>.github.io/<repositorio>/#/resultados` |

---

## 5. Cómo sacar los resultados

Los resultados quedan **en el navegador del dispositivo donde se hizo la sesión**. Por eso se
recomienda hacer todas las sesiones en celulares del equipo y descargar los resultados al terminar
cada una (ver [PROTOCOLO.md](PROTOCOLO.md)).

- **Al terminar cada sesión**, la pantalla “¡Gracias!” muestra un resumen y dos botones:
  - **Copiar resultados**: texto plano para pegar en el informe o en una planilla.
  - **Descargar resultados**: archivo `.json` con el código y la fecha en el nombre
    (por ejemplo `resultados-H3-2026-11-03-1530.json`).
- **Desde `#/resultados`** se ven todas las sesiones guardadas en ese navegador (terminadas y en
  curso), con los mismos botones, más “Descargar todas” y “Borrar todas” (pide confirmación).
- **Prueba técnica**: después de “Ejecutar prueba”, el botón **Copiar resultado** da el texto
  “X de 9 comprobaciones correctas” con fecha, hora y el detalle de cada paso. Cada corrida
  también queda guardada en `#/resultados`.

Qué se guarda por sesión: código, rol, fecha y hora, orden de formatos y casos, y por cada
etapa o tarea: hora de entrada, hora de salida, duración en segundos, botones tocados (con el
segundo en que se tocaron), textos escritos y, en el técnico, campos vacíos y todo lo cargado.
En el hogar, además, la preferencia, el porqué y el historial de versiones de la ficha.

**Tiempo hasta responder (hogar).** La duración de cada etapa incluye las preguntas del
facilitador, así que no sirve para medir cuánto tarda el hogar en leer y decidir (HP6). Para eso,
cada etapa guarda `tiempoHastaResponderSeg`: los segundos desde que entra a la etapa hasta su
**primera** respuesta. En la ficha cuentan Acepto, No acepto, Tengo una pregunta y Avisar al
técnico; en el chat, el primer mensaje o la primera respuesta rápida. Si no respondió, queda en
`null` (“sin respuesta”). Abrir el historial, el documento o una nota de voz no cuenta. El
resumen lo muestra en la columna “Hasta responder (s)” y suma las etapas 1 y 2 de cada formato:
“Acuerdo + cambio, tiempo hasta responder: Ficha __ s · Mensajes __ s”. En la etapa 1 este
tiempo incluye la pregunta 6 del protocolo, que se hace antes de que responda.

Si se recarga la página en medio de una sesión, sigue en la misma etapa (y queda anotada la
recarga). Si se abre el link de una sesión ya terminada, se muestra su resumen y un botón para
empezar una nueva.

Si el navegador no deja guardar (por ejemplo, algunos modos privados), aparece un aviso arriba:
la sesión funciona igual, pero hay que descargar los resultados antes de cerrar.

---

## 6. Aclaración

Los dos casos son **simulados**. Los técnicos (“Martín (sanitario)” y “Diego (sanitario)”), los
problemas, los montos y las condiciones son ficticios y se usan solo para esta prueba. Las
condiciones marcadas como hipotéticas no se atribuyen a ningún prestador real.

---

## Estructura de archivos

```
index.html            Página única (router por hash)
PROTOCOLO.md          Protocolo del facilitador, con las preguntas de comprensión por etapa
PLANILLA-HOGAR.md     Planilla imprimible del observador para cada hogar, con respuestas correctas
PLANILLA-TECNICO.md   Planilla imprimible del observador para cada técnico
.nojekyll             Le dice a GitHub Pages que no procese el sitio
css/styles.css        Estilos (mobile-first, mínimo 16 px)
js/app.js             Router, inicio del equipo y resultados guardados
js/casos.js           Datos de los dos casos, mensajes del chat, hoja del técnico y asignación
js/versiones.js       Lógica de versiones y estados (pura, sin DOM)
js/registro.js        Tiempos, eventos, guardado y exportación de resultados
js/prueba-tecnica.js  Prueba técnica automática y recorrido manual
js/sesion-hogar.js    Sesión del hogar (ficha, mensajes, preferencia y fin)
js/sesion-tecnico.js  Sesión del técnico (tres formularios y vista previa)
js/ficha.js           Componentes visuales de la ficha
js/chat.js            Conversación simulada
js/resumen.js         Resumen de resultados con copiar y descargar
js/ui.js              Utilidades de interfaz
js/formato.js         Formato de montos, horas y fechas
audio/LEEME.md        Nombres de archivo para las notas de voz (opcionales)
```

Nota para quien mire la consola del navegador: si no hay archivos de audio, aparecen avisos
“404” de los `.mp3` que el chat intenta cargar. Es esperado y el participante no ve nada.
