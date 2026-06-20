# Agente de Análisis de Datos

Agente de IA que permite analizar datasets CSV mediante preguntas en lenguaje natural. Construido con FastAPI, Claude API (tool use) y React.

## Demo
[Agregar link al video demo]

## ¿Qué hace?
- Sube cualquier CSV y hazle preguntas en español
- El agente razona y decide qué herramientas usar
- Genera gráficos automáticamente
- Responde con análisis en lenguaje natural

## Stack
- Backend: Python, FastAPI, Pandas, Anthropic API
- Frontend: React, Vite, Tailwind CSS
- IA: Claude claude-sonnet-4-6 con tool use

## Herramientas del agente
- analizar_datos: estadísticas generales del dataset
- calcular_metrica: suma, promedio, máximo, mínimo
- filtrar_datos: filtra por columna y valor
- generar_grafico: genera gráficos con matplotlib

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

## Autor
Pablo Pareja — [LinkedIn](https://linkedin.com/in/ppareja) · [GitHub](https://github.com/pipareja)
