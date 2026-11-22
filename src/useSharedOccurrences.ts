import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, fetchOccurrences, saveOccurrenceStatus } from './api'
import type { Activity, Status } from './data'

export function useSharedOccurrences(token: string | null, onExpired: () => void) {
  const [snapshot, setSnapshot] = useState<{ token: string; items: Activity[] } | null>(null)
  const [message, setMessage] = useState('')
  const activeRequest = useRef<AbortController | null>(null)
  const saving = useRef(false)
  const isCurrent = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    if (!token || activeRequest.current || saving.current) return
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 12000)
    activeRequest.current = controller
    try {
      const items = await fetchOccurrences(token, controller.signal)
      if (activeRequest.current === controller) {
        setSnapshot({ token, items })
        setMessage('')
      }
    } catch (error) {
      if (activeRequest.current !== controller) return
      if (error instanceof ApiError && error.status === 401) onExpired()
      else setMessage('Falha ao sincronizar demandas. ' + (error instanceof Error ? error.message : 'Tente novamente.'))
    } finally {
      clearTimeout(timeout)
      if (activeRequest.current === controller) activeRequest.current = null
    }
  }, [token, onExpired])

  useEffect(() => {
    isCurrent.current = token
    setMessage('')
    if (!token) {
      setSnapshot(null)
      return
    }
    function refreshVisible() {
      if (!document.hidden) void refresh()
    }
    void refresh()
    const timer = window.setInterval(refreshVisible, 20000)
    document.addEventListener('visibilitychange', refreshVisible)
    return () => {
      isCurrent.current = null
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshVisible)
      activeRequest.current?.abort()
      activeRequest.current = null
    }
  }, [token, refresh])

  async function save(item: Activity, status: Status) {
    if (!token || saving.current) throw new Error('Aguarde a gravação em andamento.')
    saving.current = true
    activeRequest.current?.abort()
    activeRequest.current = null
    try {
      const saved = await saveOccurrenceStatus(token, item, status)
      if (isCurrent.current === token) {
        setSnapshot(current => current?.token === token
          ? { token, items: current.items.map(row => row.apiId === saved.apiId ? saved : row) }
          : current)
      }
      return 'Status salvo no sistema.'
    } catch (error) {
      if (isCurrent.current === token && error instanceof ApiError && error.status === 401) onExpired()
      throw error
    } finally {
      saving.current = false
      if (isCurrent.current === token) void refresh()
    }
  }

  return { items: snapshot?.token === token ? snapshot?.items : undefined, message, refresh, save }
}

