import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './App.css'

const API_BASE = 'http://localhost:8000'

function UploadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function BotIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M12 11V3" />
      <circle cx="12" cy="3" r="1" />
      <line x1="8" y1="16" x2="8" y2="16" strokeWidth="3" strokeLinecap="round" />
      <line x1="16" y1="16" x2="16" y2="16" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function Spinner() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 max-w-xs">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 shrink-0">
          <BotIcon />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  )
}

function UserMessage({ content }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-2xl bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
        {content}
      </div>
    </div>
  )
}

function AgentMessage({ content, images }) {
  return (
    <div className="flex justify-start gap-3">
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 shrink-0 mt-1">
        <BotIcon />
      </div>
      <div className="max-w-3xl bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-5 py-4 text-sm text-slate-200">
        <div className="md-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
        {images && images.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            {images.map((src, i) => (
              <img
                key={i}
                src={src.startsWith('data:') ? src : `data:image/png;base64,${src}`}
                alt={`Gráfico ${i + 1}`}
                className="rounded-xl border border-slate-700 max-w-full"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function WelcomeHint() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500 select-none">
      <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-slate-400 font-medium mb-1">Sube un CSV para comenzar</p>
        <p className="text-sm">Luego haz preguntas sobre tus datos en lenguaje natural</p>
      </div>
      <div className="grid grid-cols-1 gap-2 mt-2 w-full max-w-sm">
        {['¿Cuántas filas tiene el dataset?', '¿Cuál es el promedio de la columna ventas?', 'Muestra una gráfica de barras por categoría'].map(hint => (
          <div key={hint} className="text-xs bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-slate-500 text-center">
            "{hint}"
          </div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [file, setFile] = useState(null)
  const [columns, setColumns] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const chatEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const processFile = useCallback(async (f) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Solo se aceptan archivos CSV.')
      return
    }
    setUploadError('')
    setUploading(true)

    const formData = new FormData()
    formData.append('file', f)

    try {
      const res = await axios.post(`${API_BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setFile(f)
      setColumns(res.data.columnas || [])
      setMessages([])
    } catch (err) {
      setUploadError(
        err.response?.data?.detail || 'Error al subir el archivo. Verifica el backend.'
      )
    } finally {
      setUploading(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    processFile(e.dataTransfer.files[0])
  }, [processFile])

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleFileInput = (e) => {
    processFile(e.target.files[0])
    e.target.value = ''
  }

  const sendMessage = async () => {
    const question = input.trim()
    if (!question || !file || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setLoading(true)

    try {
      const res = await axios.post(`${API_BASE}/chat`, {
        pregunta: question,
        filename: file.name,
      })
      const { respuesta, graficos } = res.data
      const images = (graficos ?? []).map(g => g.imagen_base64)
      setMessages(prev => [
        ...prev,
        { role: 'agent', content: respuesta ?? '', images },
      ])
    } catch (err) {
      const detail = err.response?.data?.detail || 'Error al procesar la consulta.'
      setMessages(prev => [
        ...prev,
        { role: 'agent', content: `**Error:** ${detail}`, images: [] },
      ])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const canSend = input.trim().length > 0 && !!file && !loading

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <header className="shrink-0 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <span className="font-semibold text-white tracking-tight">Agente de Análisis de Datos · Pablo Pareja</span>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <span className={`w-1.5 h-1.5 rounded-full ${file ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          {file ? <span className="text-emerald-400">Archivo cargado</span> : 'Sin archivo'}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left panel ── */}
        <aside className="w-72 shrink-0 border-r border-slate-800 bg-slate-900 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Fuente de datos
            </p>

            {/* Drop zone */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => !uploading && fileInputRef.current?.click()}
              onKeyDown={e => e.key === 'Enter' && !uploading && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
                transition-all duration-200 select-none
                ${uploading ? 'opacity-60 cursor-wait' : ''}
                ${dragOver
                  ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                  : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileInput}
              />

              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <svg className="animate-spin text-indigo-400" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <p className="text-sm text-slate-400">Subiendo…</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className={`${dragOver ? 'text-indigo-400' : 'text-slate-500'} transition-colors`}>
                    <UploadIcon />
                  </span>
                  <p className="text-sm font-medium text-slate-300">
                    {dragOver ? 'Suelta el archivo' : 'Arrastra tu CSV aquí'}
                  </p>
                  <p className="text-xs text-slate-500">o haz clic para seleccionar</p>
                </div>
              )}
            </div>

            {uploadError && (
              <p className="mt-2 text-xs text-red-400 text-center">{uploadError}</p>
            )}
          </div>

          {/* File info */}
          {file && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-emerald-400"><FileIcon /></span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>

              {columns.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Columnas ({columns.length})
                  </p>
                  <ul className="space-y-1">
                    {columns.map(col => (
                      <li
                        key={col}
                        className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700/50"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                        <span className="truncate font-mono">{col}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 w-full text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 rounded-lg py-2 transition-colors"
              >
                Cambiar archivo
              </button>
            </div>
          )}

          {!file && (
            <div className="flex-1 flex items-center justify-center p-4">
              <p className="text-xs text-slate-600 text-center">
                Sube un CSV para ver<br />las columnas disponibles
              </p>
            </div>
          )}
        </aside>

        {/* ── Right panel: chat ── */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950">

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {messages.length === 0 && !loading ? (
              <WelcomeHint />
            ) : (
              <div className="max-w-4xl mx-auto space-y-5">
                {messages.map((msg, i) =>
                  msg.role === 'user' ? (
                    <UserMessage key={i} content={msg.content} />
                  ) : (
                    <AgentMessage key={i} content={msg.content} images={msg.images} />
                  )
                )}
                {loading && <Spinner />}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="shrink-0 border-t border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4">
            <div className="max-w-4xl mx-auto">
              <div className={`flex items-end gap-3 bg-slate-800 border rounded-2xl px-4 py-3 transition-colors ${canSend ? 'border-indigo-500/50' : 'border-slate-700'}`}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    !file
                      ? 'Primero sube un archivo CSV…'
                      : loading
                      ? 'Procesando consulta…'
                      : 'Escribe tu pregunta (Enter para enviar, Shift+Enter para nueva línea)'
                  }
                  disabled={!file || loading}
                  rows={1}
                  className="
                    flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500
                    resize-none outline-none leading-relaxed
                    max-h-36 overflow-y-auto
                    disabled:cursor-not-allowed
                  "
                  style={{ fieldSizing: 'content' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!canSend}
                  title="Enviar (Enter)"
                  className="
                    shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                    transition-all duration-150
                    bg-indigo-600 hover:bg-indigo-500 text-white
                    disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-slate-700
                  "
                >
                  {loading ? (
                    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <SendIcon />
                  )}
                </button>
              </div>
              <p className="text-center text-xs text-slate-600 mt-2">
                {file
                  ? `Consultando sobre "${file.name}" · ${columns.length} columnas`
                  : 'Sube un CSV para comenzar a analizar datos'}
              </p>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
