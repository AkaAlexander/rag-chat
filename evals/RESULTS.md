# Evaluación del 16 de noviembre de 2026

Ollama con `qwen3:4b`, 3 documentos de ejemplo y 15 preguntas. El corpus se indexó en SQLite en memoria. La tabla recoge la ejecución completa con la comprobación del idioma de rechazo activada.

| Métrica | Aciertos | Porcentaje |
|---|---:|---:|
| Respuestas correctas, incluidos los rechazos | 14/15 | 93,3 % |
| Preguntas con respuesta y cita correcta | 11/12 | 91,7 % |
| Rechazos correctos en el idioma esperado | 3/3 | 100 % |

La pregunta «Where do tours at Nimbo begin?» produjo un error de ejecución y contó como fallo en respuesta y cita. En una repetición aislada el chat respondió «sala Bruma» y citó `observatorio-nimbo.md`. La causa del error puntual sigue sin identificar. El script devuelve un código de salida distinto de cero cuando falla una petición.

Durante la primera ejecución se detectó un rechazo en español para la pregunta neerlandesa que empieza por «Welk». Se corrigió la detección y se fijó la frase esperada de cada rechazo en el conjunto de evaluación. Los tres rechazos de la ejecución final pasaron esa comprobación.
