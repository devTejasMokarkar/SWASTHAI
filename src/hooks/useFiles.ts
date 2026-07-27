import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../lib/api'
import type { FileRecord } from '../types'

export function useFiles() {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadFiles = useCallback(async () => {
    try {
      const data = await apiFetch('/api/files')
      if (data?.success) setFiles(data.data || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadFiles() }, [loadFiles])

  const add = useCallback(async (fileData: Partial<FileRecord>) => {
    const data = await apiFetch('/api/files', {
      method: 'POST',
      body: JSON.stringify(fileData),
    })
    if (data?.success && data?.data) {
      setFiles(prev => [data.data, ...prev])
    }
    return data?.data
  }, [])

  const upload = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession()

    const res = await window.fetch('/api/files/upload', {
      method: 'POST',
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      body: formData,
    })
    const data = await res.json()
    if (data?.success && data?.data) {
      setFiles(prev => [data.data, ...prev])
    }
    return data?.data
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      await apiFetch(`/api/files/${id}`, { method: 'DELETE' })
      setFiles(prev => prev.filter(f => f.id !== id))
    } catch { /* ignore */ }
  }, [])

  return { files, loading, add, upload, remove, refetch: fetch }
}
