import io
import json
import base64

from dotenv import load_dotenv
load_dotenv()

import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import anthropic

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic()
df_global: pd.DataFrame | None = None

MODEL = "claude-sonnet-4-6"

TOOLS = [
    {
        "name": "analizar_datos",
        "description": (
            "Obtiene información general del DataFrame cargado: "
            "columnas, tipos de datos, estadísticas descriptivas, "
            "valores nulos y una muestra de las primeras filas."
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "calcular_metrica",
        "description": (
            "Calcula una métrica sobre una columna numérica del DataFrame: "
            "suma, promedio, máximo o mínimo."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "columna": {
                    "type": "string",
                    "description": "Nombre de la columna sobre la que calcular la métrica.",
                },
                "operacion": {
                    "type": "string",
                    "enum": ["suma", "promedio", "max", "min"],
                    "description": "Operación a realizar.",
                },
            },
            "required": ["columna", "operacion"],
        },
    },
    {
        "name": "filtrar_datos",
        "description": (
            "Filtra las filas del DataFrame donde una columna coincide "
            "con un valor específico. Retorna las filas encontradas."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "columna": {
                    "type": "string",
                    "description": "Nombre de la columna por la que filtrar.",
                },
                "valor": {
                    "type": "string",
                    "description": "Valor a buscar (se convierte al tipo de la columna automáticamente).",
                },
            },
            "required": ["columna", "valor"],
        },
    },
    {
        "name": "generar_grafico",
        "description": (
            "Genera un gráfico con matplotlib a partir del DataFrame "
            "y lo retorna como imagen PNG codificada en base64."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "tipo": {
                    "type": "string",
                    "enum": ["barras", "linea", "histograma", "dispersion", "caja"],
                    "description": "Tipo de gráfico a generar.",
                },
                "columna_x": {
                    "type": "string",
                    "description": "Columna para el eje X (o columna principal en histograma).",
                },
                "columna_y": {
                    "type": "string",
                    "description": "Columna para el eje Y (opcional según el tipo de gráfico).",
                },
                "titulo": {
                    "type": "string",
                    "description": "Título del gráfico.",
                },
            },
            "required": ["tipo", "columna_x"],
        },
    },
]


def ejecutar_herramienta(nombre: str, parametros: dict) -> tuple[str, str | None]:
    """Ejecuta la herramienta indicada y devuelve (resultado_json, imagen_base64 | None)."""
    global df_global

    if df_global is None:
        return json.dumps({"error": "No hay datos cargados. Sube un archivo CSV primero."}), None

    if nombre == "analizar_datos":
        info = {
            "filas": int(len(df_global)),
            "columnas": int(len(df_global.columns)),
            "nombres_columnas": df_global.columns.tolist(),
            "tipos_datos": df_global.dtypes.astype(str).to_dict(),
            "valores_nulos": df_global.isnull().sum().to_dict(),
            "estadisticas": df_global.describe(include="all").to_dict(),
            "primeras_filas": df_global.head(5).to_dict(orient="records"),
        }
        return json.dumps(info, ensure_ascii=False, default=str), None

    if nombre == "calcular_metrica":
        columna = parametros.get("columna", "")
        operacion = parametros.get("operacion", "")

        if columna not in df_global.columns:
            return json.dumps({
                "error": f"Columna '{columna}' no encontrada.",
                "columnas_disponibles": df_global.columns.tolist(),
            }), None

        try:
            serie = df_global[columna]
            ops = {"suma": serie.sum, "promedio": serie.mean, "max": serie.max, "min": serie.min}
            resultado = ops[operacion]()
            return json.dumps(
                {"columna": columna, "operacion": operacion, "resultado": resultado},
                default=str,
            ), None
        except Exception as exc:
            return json.dumps({"error": str(exc)}), None

    if nombre == "filtrar_datos":
        columna = parametros.get("columna", "")
        valor_str = parametros.get("valor", "")

        if columna not in df_global.columns:
            return json.dumps({
                "error": f"Columna '{columna}' no encontrada.",
                "columnas_disponibles": df_global.columns.tolist(),
            }), None

        try:
            dtype = df_global[columna].dtype
            if pd.api.types.is_numeric_dtype(dtype):
                try:
                    valor: object = int(valor_str) if pd.api.types.is_integer_dtype(dtype) else float(valor_str)
                except ValueError:
                    valor = valor_str
            else:
                valor = valor_str

            filtrado = df_global[df_global[columna] == valor]
            return json.dumps(
                {
                    "filas_encontradas": int(len(filtrado)),
                    "datos": filtrado.head(50).to_dict(orient="records"),
                },
                ensure_ascii=False,
                default=str,
            ), None
        except Exception as exc:
            return json.dumps({"error": str(exc)}), None

    if nombre == "generar_grafico":
        tipo = parametros.get("tipo", "")
        columna_x = parametros.get("columna_x", "")
        columna_y = parametros.get("columna_y")
        titulo = parametros.get("titulo") or f"Gráfico — {columna_x}"

        if columna_x not in df_global.columns:
            return json.dumps({
                "error": f"Columna '{columna_x}' no encontrada.",
                "columnas_disponibles": df_global.columns.tolist(),
            }), None

        if columna_y and columna_y not in df_global.columns:
            return json.dumps({
                "error": f"Columna Y '{columna_y}' no encontrada.",
                "columnas_disponibles": df_global.columns.tolist(),
            }), None

        try:
            fig, ax = plt.subplots(figsize=(10, 6))

            if tipo == "barras":
                if columna_y:
                    df_agrupado = (
                        df_global.groupby(columna_x)[columna_y]
                        .sum()
                        .reset_index()
                        .sort_values(columna_y, ascending=False)
                    )
                    ax.bar(df_agrupado[columna_x].astype(str), df_agrupado[columna_y])
                    ax.set_ylabel(columna_y)
                    plt.xticks(rotation=45, ha="right")
                else:
                    conteo = df_global[columna_x].value_counts().head(20)
                    ax.bar(conteo.index.astype(str), conteo.values)
                    plt.xticks(rotation=45, ha="right")

            elif tipo == "linea":
                if columna_y:
                    df_global.plot(x=columna_x, y=columna_y, kind="line", ax=ax)
                else:
                    df_global[columna_x].plot(kind="line", ax=ax)

            elif tipo == "histograma":
                df_global[columna_x].hist(ax=ax, bins=20)

            elif tipo == "dispersion":
                if not columna_y:
                    plt.close(fig)
                    return json.dumps({"error": "El gráfico de dispersión requiere columna_y."}), None
                ax.scatter(df_global[columna_x], df_global[columna_y], alpha=0.6)
                ax.set_ylabel(columna_y)

            elif tipo == "caja":
                if columna_y:
                    df_global.boxplot(column=columna_y, by=columna_x, ax=ax)
                    plt.suptitle("")
                else:
                    df_global[[columna_x]].boxplot(ax=ax)

            ax.set_title(titulo)
            ax.set_xlabel(columna_x)
            plt.tight_layout()

            buf = io.BytesIO()
            fig.savefig(buf, format="png", dpi=100, bbox_inches="tight")
            buf.seek(0)
            img_b64 = base64.b64encode(buf.read()).decode("utf-8")
            plt.close(fig)

            resultado_modelo = json.dumps(
                {"mensaje": "Gráfico generado exitosamente.", "tipo": tipo, "titulo": titulo}
            )
            return resultado_modelo, img_b64

        except Exception as exc:
            plt.close("all")
            return json.dumps({"error": str(exc)}), None

    return json.dumps({"error": f"Herramienta '{nombre}' no reconocida."}), None


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    global df_global

    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos CSV.")

    contenido = await file.read()
    encodings = ["utf-8", "latin-1", "cp1252"]
    ultimo_error: Exception | None = None
    for enc in encodings:
        try:
            df_global = pd.read_csv(io.BytesIO(contenido), encoding=enc)
            break
        except (UnicodeDecodeError, Exception) as exc:
            ultimo_error = exc
    else:
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo leer el CSV con ninguna codificación (utf-8, latin-1, cp1252): {ultimo_error}",
        )

    return {
        "mensaje": f"Archivo '{file.filename}' cargado correctamente.",
        "filas": int(len(df_global)),
        "columnas": df_global.columns.tolist(),
    }


class ChatRequest(BaseModel):
    pregunta: str


@app.post("/chat")
async def chat(request: ChatRequest):
    messages: list[dict] = [{"role": "user", "content": request.pregunta}]
    graficos: list[dict] = []

    while True:
        response = client.messages.create(
            model=MODEL,
            max_tokens=4096,
            tools=TOOLS,
            messages=messages,
        )

        if response.stop_reason == "end_turn":
            texto = next(
                (b.text for b in response.content if b.type == "text"),
                "Sin respuesta.",
            )
            return {"respuesta": texto, "graficos": graficos}

        if response.stop_reason == "tool_use":
            messages.append({"role": "assistant", "content": response.content})

            tool_results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue

                resultado_json, imagen_b64 = ejecutar_herramienta(block.name, block.input)

                if imagen_b64:
                    graficos.append({"imagen_base64": imagen_b64})

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": resultado_json,
                })

            messages.append({"role": "user", "content": tool_results})

        else:
            texto = next(
                (b.text for b in response.content if b.type == "text"),
                f"Respuesta incompleta (stop_reason: {response.stop_reason}).",
            )
            return {"respuesta": texto, "graficos": graficos}
