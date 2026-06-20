# Agente de Análisis de Datos

Agente de IA que permite analizar datasets CSV mediante preguntas en lenguaje natural. Construido con FastAPI, Claude API (tool use) y React.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Claude API](https://img.shields.io/badge/Claude_API-Sonnet_4.6-D97757?style=for-the-badge&logo=anthropic&logoColor=white)

---

## Demo
[Agregar link al video demo]

---

## Qué hace

- Sube cualquier CSV y hazle preguntas en español
- El agente razona y decide qué herramientas usar
- Genera gráficos automáticamente
- Responde con análisis en lenguaje natural

---

## Arquitectura

El agente usa el patrón de **tool use** de Claude: en lugar de responder directamente, el modelo decide qué herramienta ejecutar según la pregunta del usuario. El backend corre esa herramienta con Pandas, devuelve el resultado a Claude, y el modelo formula la respuesta final en lenguaje natural.

```
┌─────────────┐        ┌─────────────┐        ┌─────────────────┐
│   Usuario   │──────▶│   React     │──────▶│   FastAPI       │
│             │        │   Frontend  │        │   Backend       │
└─────────────┘        └─────────────┘        └────────┬────────┘
                                                        │
                                              ┌─────────▼────────┐
                                              │   Claude API     │
                                              │  (Sonnet 4.6)    │
                                              └─────────┬────────┘
                                                        │ tool use
                                          ┌─────────────▼─────────────┐
                                          │        Herramientas        │
                                          │  analizar  │  calcular     │
                                          │  filtrar   │  graficar     │
                                          └─────────────┬─────────────┘
                                                        │
                                              ┌─────────▼────────┐
                                              │    Respuesta     │
                                              │ en lenguaje nat. │
                                              └──────────────────┘
```

---

## Stack

| Capa | Tecnologías |
|------|-------------|
| Backend | Python, FastAPI, Pandas, Anthropic SDK |
| Frontend | React, Vite, Tailwind CSS |
| IA | Claude claude-sonnet-4-6 con tool use |

---

## Herramientas del agente

| Herramienta | Descripción |
|-------------|-------------|
| `analizar_datos` | Estadísticas generales del dataset (filas, columnas, tipos, nulos) |
| `calcular_metrica` | Suma, promedio, máximo o mínimo de una columna numérica |
| `filtrar_datos` | Filtra filas por columna y valor, devuelve muestra |
| `generar_grafico` | Genera gráficos de barras o líneas con matplotlib |

---

## Capturas

> Agregar screenshots aquí una vez desplegado.

| Vista principal | Gráfico generado |
|-----------------|-----------------|
| `screenshot-1.png` | `screenshot-2.png` |

---

## Cómo correr el proyecto

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Agrega tu ANTHROPIC_API_KEY en .env
python -m uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Autor

Pablo Pareja — [LinkedIn](https://linkedin.com/in/ppareja) · [GitHub](https://github.com/pipareja)
