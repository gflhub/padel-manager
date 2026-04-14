'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ExternalLink, Loader2, CheckCircle2 } from 'lucide-react'
import { getSessionLog } from '@/lib/session-logger'

interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORIES = [
  { value: 'bug', label: '🐛 Reportar Bug / Problema' },
  { value: 'suggestion', label: '💡 Sugestão de Melhoria' },
  { value: 'question', label: '❓ Dúvida' },
  { value: 'other', label: '📝 Outro' },
]

const FEATURES = [
  { value: 'reservations', label: 'Reservas de Quadras' },
  { value: 'tournaments', label: 'Torneios' },
  { value: 'comandas', label: 'Comandas / Consumo' },
  { value: 'payments', label: 'Pagamentos' },
  { value: 'customers', label: 'Gestão de Clientes' },
  { value: 'profile', label: 'Perfil / Conta' },
  { value: 'admin', label: 'Painel Administrativo' },
  { value: 'other', label: 'Outro / Geral' },
]

type Status = 'idle' | 'loading' | 'success'

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const pathname = usePathname()

  const [status, setStatus] = useState<Status>('idle')
  const [linearUrl, setLinearUrl] = useState<string | null>(null)

  const [category, setCategory] = useState('')
  const [feature, setFeature] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [includeLog, setIncludeLog] = useState(true)

  // Pega nome/email do contexto do usuário se disponível
  useEffect(() => {
    if (!open) return
    try {
      // Tenta ler do meta tag injetado pelo layout (opcional)
      const nameMeta = document.head.querySelector('meta[name="user-display-name"]')
      const emailMeta = document.head.querySelector('meta[name="user-email"]')
      if (nameMeta) setName(nameMeta.getAttribute('content') ?? '')
      if (emailMeta) setEmail(emailMeta.getAttribute('content') ?? '')
    } catch {/* ignore */}
  }, [open])

  function resetForm() {
    setStatus('idle')
    setLinearUrl(null)
    setCategory('')
    setFeature('')
    setTitle('')
    setDescription('')
    setIncludeLog(true)
  }

  function handleClose(val: boolean) {
    if (!val) resetForm()
    onOpenChange(val)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')

    try {
      const sessionLog = includeLog ? getSessionLog() : null

      const payload = {
        category: category || null,
        service_feature: feature || null,
        title: title || null,
        description: description || null,
        current_page: pathname,
        user_name: name || null,
        user_email: email || null,
        session_log: sessionLog,
        browser_info: sessionLog?.browserInfo ?? null,
      }

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Erro ao enviar feedback')

      setLinearUrl(data.linearIssueUrl ?? null)
      setStatus('success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado'
      toast.error(msg)
      setStatus('idle')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {status === 'success' ? (
          // ── Tela de sucesso ──────────────────────────────────────────────
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <DialogHeader>
              <DialogTitle className="text-xl">Feedback enviado!</DialogTitle>
              <DialogDescription>
                Seu reporte foi registrado e uma issue foi aberta para nossa equipe.
              </DialogDescription>
            </DialogHeader>
            {linearUrl && (
              <a
                href={linearUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Ver issue no Linear
              </a>
            )}
            <Button onClick={() => handleClose(false)} className="mt-2">
              Fechar
            </Button>
          </div>
        ) : (
          // ── Formulário ───────────────────────────────────────────────────
          <form onSubmit={handleSubmit}>
            <DialogHeader className="mb-4">
              <DialogTitle>Enviar Feedback</DialogTitle>
              <DialogDescription>
                Relate um problema, faça uma sugestão ou tire uma dúvida. Todos os campos são opcionais.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Categoria + Feature */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fb-category">Tipo</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="fb-category">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fb-feature">Funcionalidade</Label>
                  <Select value={feature} onValueChange={setFeature}>
                    <SelectTrigger id="fb-feature">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FEATURES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Título */}
              <div className="space-y-1.5">
                <Label htmlFor="fb-title">Título / Resumo</Label>
                <Input
                  id="fb-title"
                  placeholder="Descreva brevemente o problema ou sugestão..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <Label htmlFor="fb-description">Descrição detalhada</Label>
                <Textarea
                  id="fb-description"
                  placeholder="Descreva em detalhes: o que aconteceu, o que esperava, passos para reproduzir..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Página atual */}
              <div className="space-y-1.5">
                <Label>Página atual</Label>
                <div className="flex items-center gap-2">
                  <Input value={pathname} readOnly className="bg-muted text-muted-foreground text-sm" />
                  <Badge variant="secondary" className="shrink-0 text-xs">auto</Badge>
                </div>
              </div>

              {/* Nome + Email */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fb-name">Seu nome</Label>
                  <Input
                    id="fb-name"
                    placeholder="João Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fb-email">Seu email</Label>
                  <Input
                    id="fb-email"
                    type="email"
                    placeholder="joao@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Log de sessão */}
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="fb-log" className="text-sm font-medium cursor-pointer">
                    Incluir log de sessão
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Páginas visitadas, erros capturados e info do navegador
                  </p>
                </div>
                <Switch
                  id="fb-log"
                  checked={includeLog}
                  onCheckedChange={setIncludeLog}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={status === 'loading'}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={status === 'loading'}>
                {status === 'loading' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Feedback'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
