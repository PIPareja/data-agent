# Guía de Aprendizaje: Agente de Análisis de Datos con IA

> Escrita en español · orientada a quienes están aprendiendo · ejemplos reales del código

---

## Tabla de contenidos

1. [Qué es el proyecto y qué problema resuelve](#1-qué-es-el-proyecto-y-qué-problema-resuelve)
2. [Arquitectura completa](#2-arquitectura-completa)
3. [Por qué se eligió cada tecnología](#3-por-qué-se-eligió-cada-tecnología)
4. [Cómo funciona el Tool Use de Claude paso a paso](#4-cómo-funciona-el-tool-use-de-claude-paso-a-paso)
5. [Las cuatro herramientas del agente](#5-las-cuatro-herramientas-del-agente)
6. [El backend en detalle](#6-el-backend-en-detalle)
7. [El frontend en detalle](#7-el-frontend-en-detalle)
8. [Conceptos clave que aprendiste](#8-conceptos-clave-que-aprendiste)
9. [Diferencia con un RAG tradicional](#9-diferencia-con-un-rag-tradicional)
10. [Mejoras futuras](#10-mejoras-futuras)

---

## 1. Qué es el proyecto y qué problema resuelve

### El problema

Imagina que tienes un archivo CSV con miles de filas de ventas de una tienda. Quieres saber cosas como:

- ¿Cuál es la región con más ventas?
- ¿Cuánto ganamos en promedio por pedido?
- ¿Podés mostrarme un gráfico de barras con las ganancias por categoría?

Antes, para responder esas preguntas, necesitabas saber Python, Pandas, Matplotlib... o pagar por herramientas como Tableau o Power BI. **La mayoría de la gente no puede hacer eso sola.**

### La solución

Este proyecto permite que cualquier persona suba un CSV y le haga preguntas **en lenguaje natural** (como si le hablara a una persona). La inteligencia artificial entiende la pregunta, decide qué análisis hacer, ejecuta el código necesario, y devuelve una respuesta clara con gráficos si hace falta.

```
Usuario: "¿Cuál es la suma total de ventas por región?"
  ↓
Agente IA: Analiza la pregunta → llama la herramienta correcta → calcula → responde
  ↓
Respuesta: "La región Oeste tiene $725,458 en ventas, seguida por el Este con $678,781..."
```

### En una frase

> Un analista de datos con inteligencia artificial que vive en tu navegador, entiende tu archivo CSV, y responde preguntas en español.

---

## 2. Arquitectura completa

### Diagrama de flujo de una pregunta

```
┌─────────────────────────────────────────────────────────────────┐
│                        USUARIO                                  │
│                                                                 │
│   1. Sube archivo CSV          2. Escribe pregunta              │
│      "ventas.csv"                 "¿Cuál es el promedio         │
│                                    de ventas?"                  │
└──────────────┬─────────────────────────┬───────────────────────┘
               │                         │
               ▼                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                       │
│                    http://localhost:5173                         │
│                                                                 │
│  • Muestra la interfaz visual (panel lateral + chat)           │
│  • Envía el CSV al backend con axios.post("/upload")           │
│  • Envía la pregunta al backend con axios.post("/chat")        │
│  • Muestra la respuesta y los gráficos recibidos               │
└──────────────┬─────────────────────────────────────────────────┘
               │  HTTP (JSON)
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI + Python)                    │
│                    http://localhost:8000                         │
│                                                                 │
│  Endpoint POST /upload:                                         │
│    • Recibe el CSV                                              │
│    • Lo convierte a DataFrame de Pandas                         │
│    • Lo guarda en memoria (df_global)                           │
│                                                                 │
│  Endpoint POST /chat:                                           │
│    • Recibe la pregunta del usuario                             │
│    • Inicia el loop de conversación con Claude                  │
│    • Ejecuta herramientas cuando Claude lo pide                 │
│    • Devuelve la respuesta final + gráficos en base64           │
└──────────────┬─────────────────────────────────────────────────┘
               │  HTTPS (API de Anthropic)
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CLAUDE (claude-sonnet-4-6)                      │
│                  api.anthropic.com                               │
│                                                                 │
│  1. Recibe la pregunta + lista de herramientas disponibles     │
│  2. Decide qué herramienta(s) usar                             │
│  3. Devuelve: "Usá calcular_metrica con columna=Sales,         │
│               operacion=promedio"                               │
│  4. Recibe el resultado de la herramienta                      │
│  5. Formula una respuesta en lenguaje natural                  │
└──────────────┬─────────────────────────────────────────────────┘
               │  Resultado de la herramienta
               ▼
┌─────────────────────────────────────────────────────────────────┐
│              HERRAMIENTAS (Python puro, en el backend)          │
│                                                                 │
│  analizar_datos    → df.describe(), df.dtypes, df.head()       │
│  calcular_metrica  → df["Sales"].mean() / .sum() / etc.        │
│  filtrar_datos     → df[df["Region"] == "West"]                │
│  generar_grafico   → matplotlib → PNG → base64                 │
└─────────────────────────────────────────────────────────────────┘
```

### El ciclo completo en palabras simples

1. **Subís el CSV** → el backend lo convierte en una tabla de datos en memoria.
2. **Escribís una pregunta** → el frontend la manda al backend.
3. **El backend le pregunta a Claude** enviando tu pregunta + la lista de herramientas disponibles.
4. **Claude decide** si necesita una herramienta o puede responder directamente.
5. **Si necesita una herramienta**, el backend la ejecuta (con Python/Pandas/Matplotlib) y manda el resultado de vuelta a Claude.
6. **Claude formula la respuesta final** en lenguaje natural.
7. **El backend manda la respuesta** al frontend.
8. **El frontend muestra** el texto y los gráficos.

---

## 3. Por qué se eligió cada tecnología

### Backend

| Tecnología | Para qué sirve | Por qué ésta y no otra |
|------------|---------------|------------------------|
| **Python** | Lenguaje del backend | Es el estándar para ciencia de datos. Las mejores librerías (Pandas, Matplotlib, NumPy) son todas Python. |
| **FastAPI** | Servidor web / API REST | Es moderno, muy rápido y tiene validación automática con tipos de Python. Alternativas como Flask son más simples pero menos potentes; Django es mucho más grande de lo necesario para una API pequeña. |
| **Pandas** | Manipular el CSV | Es la librería más usada para análisis de datos en Python. Permite leer CSV en una línea y hacer operaciones complejas con pocas líneas de código. |
| **Matplotlib** | Generar gráficos | Es la librería base para gráficos en Python. Se integra perfectamente con Pandas. Alternativa: Plotly (gráficos interactivos), pero Matplotlib genera imágenes PNG más fácilmente. |
| **Anthropic SDK** | Conectarse a Claude | Es el SDK oficial de Anthropic para usar Claude desde Python. Maneja autenticación, reintentos y el protocolo de Tool Use. |
| **python-dotenv** | Manejar la API key | Permite cargar la `ANTHROPIC_API_KEY` desde un archivo `.env` sin escribirla directo en el código (lo cual sería un problema de seguridad). |

### Frontend

| Tecnología | Para qué sirve | Por qué ésta y no otra |
|------------|---------------|------------------------|
| **React** | Construir la interfaz | Es la librería de UI más popular del mundo. Permite construir componentes reutilizables. Alternativa: Vue.js (más simple), pero React tiene más comunidad y empleo. |
| **Vite** | Herramienta de desarrollo | Es extremadamente rápido (recarga el navegador en milisegundos). Reemplaza a Create React App, que era lento. |
| **Tailwind CSS** | Dar estilos | Permite escribir el diseño directamente en el HTML con clases utilitarias. No necesitás crear archivos CSS separados. Alternativa: CSS puro, pero Tailwind es mucho más rápido para hacer interfaces modernas. |
| **Axios** | Hacer llamadas HTTP | Es la librería estándar para hacer peticiones a APIs desde el frontend. Más fácil de usar que el `fetch` nativo porque maneja errores automáticamente. |
| **react-markdown** | Renderizar Markdown | Claude responde con texto enriquecido (negritas, listas, tablas). Esta librería lo convierte en HTML bonito. |

---

## 4. Cómo funciona el Tool Use de Claude paso a paso

El **Tool Use** (o "uso de herramientas") es la capacidad que tiene Claude de decir "para responder esto, necesito ejecutar una función". No ejecuta el código él mismo — **le avisa al backend qué función llamar y con qué parámetros**.

### Ejemplo real: "¿Cuál es el promedio de ventas?"

#### Paso 1 — El backend le manda a Claude la pregunta + las herramientas disponibles

```python
# Esto es lo que enviamos a Claude (simplificado)
client.messages.create(
    model="claude-sonnet-4-6",
    tools=TOOLS,          # Lista de 4 herramientas disponibles
    messages=[{
        "role": "user",
        "content": "¿Cuál es el promedio de ventas?"
    }]
)
```

Claude recibe la descripción de cada herramienta, con su nombre, para qué sirve, y qué parámetros acepta.

#### Paso 2 — Claude responde pidiendo usar una herramienta

Claude NO responde con texto. Responde con:

```json
{
  "stop_reason": "tool_use",
  "content": [
    {
      "type": "tool_use",
      "id": "toolu_01XYZ",
      "name": "calcular_metrica",
      "input": {
        "columna": "Sales",
        "operacion": "promedio"
      }
    }
  ]
}
```

Esto significa: *"Quiero que ejecutes `calcular_metrica` con `columna=Sales` y `operacion=promedio`"*.

#### Paso 3 — El backend ejecuta la herramienta

```python
# El backend detecta stop_reason == "tool_use" y ejecuta:
resultado_json, imagen = ejecutar_herramienta("calcular_metrica", {
    "columna": "Sales",
    "operacion": "promedio"
})
# resultado_json = '{"columna": "Sales", "operacion": "promedio", "resultado": 229.86}'
```

#### Paso 4 — El backend le manda el resultado de vuelta a Claude

```python
messages.append({
    "role": "user",
    "content": [{
        "type": "tool_result",
        "tool_use_id": "toulu_01XYZ",    # mismo ID de antes
        "content": resultado_json
    }]
})
```

#### Paso 5 — Claude formula la respuesta final en lenguaje natural

Ahora Claude responde con `stop_reason == "end_turn"` y texto:

```
"El promedio de ventas en tu dataset es de **$229.86 por pedido**.

Esto se calculó sobre la columna 'Sales' que contiene 9,994 registros."
```

#### El loop que hace posible esto

En `main.py`, el ciclo `while True` repite los pasos 2-4 tantas veces como Claude necesite. Una pregunta compleja podría requerir **múltiples herramientas en secuencia**:

```
Pregunta: "¿Cuántos pedidos hay en la región West y cuánto vendieron en total?"
  → Claude llama filtrar_datos(columna="Region", valor="West")
  → Recibe 3,203 filas
  → Claude llama calcular_metrica(columna="Sales", operacion="suma")
  → Recibe $725,457.82
  → Claude formula la respuesta final con ambos datos
```

---

## 5. Las cuatro herramientas del agente

### `analizar_datos`

**Qué hace:** Devuelve un resumen general del dataset: cantidad de filas y columnas, nombres de columnas, tipos de datos, cuántos valores nulos hay, estadísticas descriptivas (media, mínimo, máximo) y las primeras 5 filas.

**Cuándo el agente la usa:**
- "¿Qué columnas tiene mi archivo?"
- "¿Cuántas filas tiene el dataset?"
- "Dame un resumen de los datos"
- "¿Hay valores nulos?"

**Ejemplo de respuesta que genera:**
```json
{
  "filas": 9994,
  "columnas": 21,
  "nombres_columnas": ["Row ID", "Order ID", "Order Date", "Ship Date", "Region", "Sales", ...],
  "tipos_datos": {"Sales": "float64", "Region": "object", ...},
  "valores_nulos": {"Sales": 0, "Profit": 0, "Region": 0}
}
```

---

### `calcular_metrica`

**Qué hace:** Calcula una operación matemática sobre una columna numérica: `suma`, `promedio`, `max` (máximo) o `min` (mínimo).

**Cuándo el agente la usa:**
- "¿Cuánto vendimos en total?" → suma de `Sales`
- "¿Cuál es la ganancia promedio?" → promedio de `Profit`
- "¿Cuál fue el pedido más caro?" → max de `Sales`
- "¿Cuál fue la menor ganancia?" → min de `Profit`

**Ejemplo de uso real:**
```python
# Claude pide esto:
calcular_metrica(columna="Profit", operacion="promedio")

# El backend ejecuta:
df["Profit"].mean()  # → 28.66

# Resultado:
{"columna": "Profit", "operacion": "promedio", "resultado": 28.6590576...}
```

---

### `filtrar_datos`

**Qué hace:** Filtra las filas del dataset donde una columna tiene un valor específico. Devuelve hasta 50 filas que coincidan.

**Cuándo el agente la usa:**
- "Mostrame los pedidos de la región West"
- "¿Qué productos son de la categoría Furniture?"
- "Dame los pedidos del cliente Aaron Hawkins"

**Ejemplo de uso real:**
```python
# Claude pide esto:
filtrar_datos(columna="Region", valor="West")

# El backend ejecuta:
df[df["Region"] == "West"]

# Resultado:
{
  "filas_encontradas": 3203,
  "datos": [{"Row ID": 1, "Region": "West", "Sales": 261.96, ...}, ...]
}
```

**Detalle inteligente:** El código detecta automáticamente si la columna es numérica o texto para hacer la comparación correcta. Si buscás `valor="100"` en una columna de números, lo convierte a `100` (int o float) antes de comparar.

---

### `generar_grafico`

**Qué hace:** Crea un gráfico con Matplotlib y lo devuelve como imagen PNG codificada en base64 (un texto largo que el navegador puede convertir directamente en imagen).

**Tipos de gráfico disponibles:**
- `barras` — Comparar categorías (ej: ventas por región)
- `linea` — Evolución en el tiempo (ej: ventas por mes)
- `histograma` — Distribución de valores (ej: ¿cómo se distribuyen los precios?)
- `dispersion` — Relación entre dos variables numéricas (ej: ventas vs ganancia)
- `caja` — Ver outliers y distribución (ej: variación de precios por categoría)

**Cuándo el agente la usa:**
- "Hacé un gráfico de barras de ventas por categoría"
- "Mostrá la evolución de las ganancias por mes"
- "Quiero ver la distribución de precios"

**El truco del base64:**
```python
# En vez de guardar la imagen en disco, la convertimos a texto:
buf = io.BytesIO()
fig.savefig(buf, format="png")
img_base64 = base64.b64encode(buf.read()).decode("utf-8")

# El frontend recibe ese texto y lo muestra así:
# <img src="data:image/png;base64,iVBORw0KGgo..." />
```

Esto evita tener que manejar archivos temporales en el servidor.

---

## 6. El backend en detalle

### FastAPI: el servidor web

FastAPI es el framework que hace que Python pueda recibir y responder peticiones HTTP. Pensalo como un recepcionista que escucha en la puerta y sabe a quién derivar cada pedido.

```python
app = FastAPI()

# Este decorador le dice a FastAPI:
# "cuando alguien haga POST a /upload, ejecutá esta función"
@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    ...
```

**CORS:** La línea `app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"])` le dice al backend que acepte peticiones del frontend. Sin esto, el navegador bloquearía la comunicación por razones de seguridad (son dos "orígenes" distintos: puerto 8000 vs 5173).

---

### Endpoint `POST /upload`

```
Frontend → POST http://localhost:8000/upload
           Body: archivo CSV (multipart/form-data)

Backend  → Convierte el CSV a DataFrame de Pandas
           Lo guarda en df_global (variable global en memoria)
           Devuelve: {"mensaje": "...", "filas": 9994, "columnas": [...]}
```

**Detección de encodings:** El código intenta leer el CSV con tres encodings distintos (`utf-8`, `latin-1`, `cp1252`) porque los archivos de Excel suelen venir en `latin-1` mientras que los archivos modernos usan `utf-8`. Si falla uno, prueba el siguiente.

```python
encodings = ["utf-8", "latin-1", "cp1252"]
for enc in encodings:
    try:
        df_global = pd.read_csv(io.BytesIO(contenido), encoding=enc)
        break  # salir del loop si funcionó
    except:
        pass
```

---

### Endpoint `POST /chat`

Este es el corazón del proyecto. Recibe la pregunta y maneja el ciclo completo de conversación con Claude.

```
Frontend → POST http://localhost:8000/chat
           Body: {"pregunta": "¿Cuál es el total de ventas?"}

Backend  → Loop con Claude hasta obtener respuesta final
           Devuelve: {"respuesta": "El total es $2,297,200...", "graficos": [...]}
```

**El loop `while True`:** Este ciclo sigue corriendo hasta que Claude diga que terminó (`stop_reason == "end_turn"`). En cada iteración:

1. Manda el estado actual de la conversación a Claude.
2. Si Claude pide una herramienta (`stop_reason == "tool_use"`), la ejecuta y agrega el resultado a los mensajes.
3. Si Claude terminó, extrae el texto y lo devuelve.

---

### Pandas: el motor de análisis

Pandas representa el CSV como un **DataFrame**: una tabla de datos en memoria, como una hoja de Excel que podés manipular con código.

```python
# Leer el CSV
df = pd.read_csv("ventas.csv")

# Operaciones básicas que usa este proyecto:
df.describe()          # estadísticas descriptivas
df["Sales"].mean()     # promedio de una columna
df[df["Region"] == "West"]  # filtrar filas
df.groupby("Category")["Sales"].sum()  # agrupar y sumar
```

Lo poderoso de Pandas es que estas operaciones funcionan igual para 100 filas o para 10 millones de filas.

---

## 7. El frontend en detalle

### React: la interfaz como componentes

React organiza la interfaz en **componentes**: piezas independientes y reutilizables. En `App.jsx` hay varios:

| Componente | Qué hace |
|-----------|---------|
| `App` | Componente principal, maneja todo el estado |
| `UserMessage` | Burbuja de mensaje del usuario (azul, derecha) |
| `AgentMessage` | Burbuja de respuesta del agente (gris, izquierda) con soporte para Markdown e imágenes |
| `Spinner` | Animación de "escribiendo..." mientras Claude procesa |
| `WelcomeHint` | Pantalla inicial con ejemplos de preguntas |
| `UploadIcon`, `FileIcon`, `SendIcon`, `BotIcon` | Íconos SVG |

**El estado de la app (useState):**

```javascript
const [file, setFile] = useState(null)        // archivo CSV subido
const [columns, setColumns] = useState([])    // columnas del CSV
const [messages, setMessages] = useState([]) // historial de chat
const [input, setInput] = useState('')        // texto que está escribiendo
const [loading, setLoading] = useState(false) // esperando respuesta de Claude
```

Cuando cualquiera de estos valores cambia, React actualiza automáticamente la pantalla. No necesitás manipular el DOM manualmente.

---

### Vite: el servidor de desarrollo

Vite hace dos cosas:

1. **En desarrollo:** Sirve los archivos del frontend con recarga instantánea. Cuando guardás `App.jsx`, el navegador se actualiza en milisegundos sin recargar la página completa.

2. **En producción:** Empaqueta todos los archivos en unos pocos JS/CSS optimizados (proceso llamado "build") que se pueden subir a cualquier servidor.

```bash
npm run dev    # inicia el servidor de desarrollo en localhost:5173
npm run build  # crea la carpeta dist/ lista para producción
```

---

### Tailwind CSS: estilos sin salir del HTML

En vez de escribir CSS en un archivo separado, Tailwind usa clases que describen el estilo directamente:

```jsx
// Sin Tailwind (CSS tradicional):
// .boton { background: #4f46e5; color: white; border-radius: 8px; padding: 8px 16px; }
// <button className="boton">Enviar</button>

// Con Tailwind:
<button className="bg-indigo-600 text-white rounded-lg px-4 py-2">
  Enviar
</button>
```

Esto hace que el diseño sea más rápido y fácil de leer porque el estilo y la estructura están juntos.

**Algunas clases usadas en este proyecto:**
- `bg-slate-950` → fondo muy oscuro (casi negro)
- `text-indigo-400` → texto azul-morado suave
- `rounded-2xl` → bordes muy redondeados
- `flex items-center gap-3` → flexbox con elementos centrados y separados
- `border border-slate-700` → borde gris oscuro
- `animate-spin` → animación de rotación (el spinner de carga)

---

### Axios: comunicación con el backend

```javascript
// Subir el archivo CSV
const formData = new FormData()
formData.append('file', archivo)
const res = await axios.post('http://localhost:8000/upload', formData)

// Enviar una pregunta
const res = await axios.post('http://localhost:8000/chat', {
  pregunta: "¿Cuántas filas tiene el dataset?"
})
const { respuesta, graficos } = res.data
```

La palabra `await` significa "esperá que esto termine antes de continuar". Sin ella, el código seguiría ejecutándose mientras el servidor todavía está procesando, lo que causaría errores.

---

## 8. Conceptos clave que aprendiste

### IA Generativa

Una IA que **genera** texto, imágenes, código u otras cosas. No solo clasifica o predice un número — produce contenido nuevo. Claude es un modelo de lenguaje grande (LLM) entrenado para entender y generar texto de alta calidad.

La diferencia clave: un sistema de clasificación tradicional dice "esta imagen es un gato con 92% de probabilidad". Un modelo generativo como Claude puede decir "Esta imagen muestra un gato naranja durmiendo en un sillón azul, probablemente en un ambiente doméstico...".

---

### Agentes de IA

Un **agente** es una IA que puede tomar acciones para lograr un objetivo, no solo responder preguntas. La diferencia:

```
Chatbot simple:
  Usuario: "¿Cuánto vendimos en West?"
  IA: "No tengo esa información." (no puede buscarla)

Agente (este proyecto):
  Usuario: "¿Cuánto vendimos en West?"
  IA: *filtra los datos* → *suma las ventas* → "Las ventas en West fueron $725,457.82"
```

El agente puede **planear**, **usar herramientas**, **interpretar resultados** y **responder** — todo en un ciclo autónomo.

---

### Tool Use (Uso de herramientas)

Es el mecanismo que permite a un LLM interactuar con el mundo real. Claude no puede ejecutar Python por sí mismo, pero puede decirle al backend exactamente qué ejecutar.

El flujo es siempre:
1. Claude → "quiero llamar a `X` con parámetros `Y`"
2. Backend → ejecuta `X(Y)` → devuelve resultado
3. Claude → usa el resultado para formular su respuesta

Esto separa la **inteligencia** (Claude decide qué hacer) de la **ejecución** (Python hace el cómputo real).

---

### API REST

Una **API REST** es una forma estandarizada de comunicar sistemas por HTTP. En este proyecto:

- `POST /upload` → mandar datos al servidor (subir archivo)
- `POST /chat` → mandar pregunta y recibir respuesta

Cada endpoint es una "puerta" con una dirección clara. El frontend y el backend son completamente independientes — podrías reemplazar el frontend por una app móvil o un script de Python sin cambiar nada del backend.

---

### Base64

Una forma de convertir datos binarios (como una imagen PNG) en texto puro. Útil porque JSON solo puede contener texto. En lugar de guardar la imagen en disco y mandar una URL, mandamos la imagen directamente dentro del JSON como un string muy largo.

```
PNG binario → base64 → "iVBORw0KGgoAAAANSUhEUgAA..."
                        ↓
                Frontend: <img src="data:image/png;base64,iVBOR..." />
```

---

## 9. Diferencia con un RAG tradicional

### ¿Qué es RAG?

RAG (Retrieval-Augmented Generation) es una técnica donde:
1. Se indexan documentos en una base de datos vectorial
2. Cuando el usuario pregunta algo, se buscan los fragmentos más relevantes
3. Se mandan esos fragmentos como contexto al LLM para que responda

Es ideal para **buscar información en texto** (documentos, PDFs, artículos).

### Por qué este proyecto NO usa RAG

| Característica | RAG | Este proyecto (Tool Use) |
|---------------|-----|--------------------------|
| Tipo de datos | Texto no estructurado (PDFs, artículos) | Datos estructurados (CSV, tablas) |
| Cómo accede a los datos | Búsqueda semántica vectorial | Pandas (cálculos exactos) |
| Tipo de respuestas | Resúmenes, citas, búsqueda de info | Cálculos, estadísticas, gráficos |
| Precisión numérica | Puede alucinar números | Exacta (ejecuta el cálculo real) |
| Ejemplo de pregunta | "¿Qué dice el contrato sobre las penalidades?" | "¿Cuál es la suma total de ventas?" |

### Cuándo usar cada uno

- **RAG:** Preguntas sobre documentos de texto, búsqueda de información, resumir contratos o artículos.
- **Tool Use (agente):** Análisis de datos, cálculos, operaciones sobre bases de datos, tareas que requieren ejecutar código.

En muchos sistemas reales se usan **ambos juntos**: RAG para buscar contexto en documentos + Tool Use para ejecutar operaciones sobre los datos encontrados.

---

## 10. Mejoras futuras

### 1. LangChain / LlamaIndex — Frameworks de agentes

En vez de escribir el loop `while True` a mano, frameworks como LangChain lo manejan automáticamente y agregan:
- Memoria de conversación más sofisticada
- Cadenas de herramientas (pipelines)
- Soporte para múltiples modelos de IA
- Manejo de errores y reintentos

```python
# Hoy (manual):
while True:
    response = client.messages.create(...)
    if response.stop_reason == "tool_use":
        # ejecutar herramienta manualmente
        ...

# Con LangChain:
agent = create_react_agent(llm=claude, tools=tools)
agent.invoke({"input": "¿Cuál es el promedio de ventas?"})
```

---

### 2. Autenticación y sesiones por usuario

Actualmente hay un solo `df_global` compartido para todos. Si dos personas usan la app al mismo tiempo, pueden pisarse los datos. La solución:

- **JWT tokens** para identificar a cada usuario
- **Sesiones** para mantener el CSV de cada usuario separado
- **Base de datos** (PostgreSQL) para persistir los datos entre sesiones

---

### 3. Más tipos de gráficos

- Mapas geográficos (`geopandas`, `plotly`)
- Gráficos interactivos (Plotly en vez de Matplotlib)
- Tablas dinámicas renderizadas en el frontend
- Heatmaps de correlación entre variables

---

### 4. Soporte para más formatos de archivo

- Excel (`.xlsx`) — ya está `openpyxl` en requirements, solo hay que agregar el endpoint
- JSON estructurado
- Conexión directa a bases de datos (PostgreSQL, MySQL)
- Google Sheets via API

---

### 5. Historial de conversación real

Actualmente cada pregunta es independiente. Con historial, podría funcionar así:

```
Usuario: "¿Cuántas ventas hay en la región West?"
Agente: "3,203 ventas."

Usuario: "¿Y cuánto fue el total?"  ← referencia a la pregunta anterior
Agente: "$725,457.82"  ← entiende que habla de West porque tiene contexto
```

---

### 6. Caché de resultados

Si alguien hace la misma pregunta dos veces sobre el mismo archivo, recalcular es innecesario. Se puede guardar el resultado con `Redis` o un diccionario en memoria indexado por (hash_del_csv, pregunta).

---

### 7. Exportar resultados

- Botón para descargar el gráfico como PNG
- Exportar la conversación como PDF
- Guardar el análisis con un nombre para consultarlo después

---

*Esta guía fue escrita junto con el código del proyecto. Para explorar el código directamente, arrancá por `backend/main.py` (el servidor) y `frontend/src/App.jsx` (la interfaz).*
