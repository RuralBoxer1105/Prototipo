# Cambios

## v1.2 – tiempo hasta responder e instrucción al técnico (3 de noviembre de 2026)

- Sesión hogar: cada etapa guarda `tiempoHastaResponderSeg` (segundos hasta la primera respuesta
  del hogar; `null` si no respondió). Se muestra en la columna “Hasta responder (s)” del resumen,
  en `#/resultados` y en el texto copiado, junto con la suma de acuerdo + cambio por formato.
- Sesión técnico: instrucción fija arriba de la hoja de datos (usar los montos y el cambio de la
  hoja; poner el respaldo que ofrecería de verdad).
- `PROTOCOLO.md`: la misma instrucción como frase fija del facilitador al empezar la sesión técnico.
- `PLANILLA-TECNICO.md`: fila “¿Usó los montos de la hoja?”.

## v1.1 – preguntas de comprensión y planillas (3 de noviembre de 2026)

- `PROTOCOLO.md`: reglas para hacer las preguntas y preguntas de comprensión por etapa (las
  mismas para los dos casos y los dos formatos), más las dos preguntas finales en voz alta.
- `PLANILLA-HOGAR.md`: planilla imprimible del observador, con las respuestas correctas de cada
  caso, las filas que cuentan para HP2 y HP3, observaciones y resumen ficha / mensajes.
- `PLANILLA-TECNICO.md`: planilla imprimible del observador, con tiempos, campos vacíos, criterios
  de HP1 y HP6 y preguntas finales.
- Sin cambios en la lógica ni en las pantallas.

## v1 – versión para el piloto (3 de noviembre de 2026)

- Sesión del hogar (H1–H5 y piloto PH) con la asignación de casos y orden de la tabla del
  experimento: dos partes (ficha y mensajes) de 4 etapas cada una, pregunta de preferencia y fin.
- Formato ficha conectado a la lógica real de versiones: propuesta, cambio pendiente, cierre,
  historial y aviso de que volvió la falla.
- Formato mensajes: conversación que se revela por etapas, notas de voz con transcripción, foto
  de ejemplo, documento “PDF” con el resumen y respuestas del hogar por texto o respuestas rápidas.
- Sesión del técnico (T1–T3 y piloto PT, caso 1 por defecto o `?caso=2`): hoja de datos, tres
  formularios sin campos obligatorios, aceptación simulada del cambio y vista previa de la ficha.
- Prueba técnica con 9 comprobaciones automáticas y recorrido manual.
- Registro de tiempos, botones, textos y campos vacíos en `localStorage`, con copiar y descargar
  resultados, y lista de resultados guardados.
- Protocolo del facilitador (`PROTOCOLO.md`) con frases fijas para los dos formatos.
- La nota de la ficha cuando el hogar rechaza usa la misma frase que el facilitador.
- Los resultados incluyen “Decisiones en la ficha”: quién resolvió cada versión (el hogar o el
  guion) y cuántas preguntas hizo.
- Recordatorio para el equipo en la pantalla final: descargar los resultados antes de la sesión
  siguiente.
