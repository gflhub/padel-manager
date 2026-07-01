'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { searchClubCustomers } from '@/app/actions/comandas'

interface CustomerComboboxProps {
  value: string | null
  onChange: (id: string | null, name: string) => void
  disabled?: boolean
}

export function CustomerCombobox({ value, onChange, disabled }: CustomerComboboxProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: string; name: string }[]>([])
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      if (query.length < 2) { setResults([]); return }
      const res = await searchClubCustomers(query)
      setResults(res.data ?? [])
    }, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function select(id: string | null, name: string) {
    onChange(id, name)
    setQuery(name)
    setOpen(false)
    setResults([])
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder="Buscar cliente... (mín. 2 letras)"
        value={value ? query || 'Cliente selecionado' : query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value)
          if (!e.target.value) onChange(null, '')
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
      />
      {open && (query.length >= 2 || results.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-52 overflow-y-auto">
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
            onMouseDown={() => select(null, '')}
          >
            Walk-in (sem cadastro)
          </button>
          {results.map(r => (
            <button
              key={r.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
              onMouseDown={() => select(r.id, r.name)}
            >
              {r.name}
            </button>
          ))}
          {query.length >= 2 && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado.</div>
          )}
        </div>
      )}
    </div>
  )
}
