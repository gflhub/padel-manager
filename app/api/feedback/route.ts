import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

const LINEAR_API_URL = 'https://api.linear.app/graphql'

// Mapeamento de categoria → prioridade do Linear (1=urgent, 2=high, 3=medium, 4=low)
const PRIORITY_MAP: Record<string, number> = {
  bug: 1,
  suggestion: 3,
  question: 3,
  other: 4,
}

// Mapeamento de categoria → prefixo do título
const LABEL_MAP: Record<string, string> = {
  bug: '🐛 [Bug]',
  suggestion: '💡 [Sugestão]',
  question: '❓ [Dúvida]',
  other: '📝 [Feedback]',
}

// Mapeamento de feature para label legível
const FEATURE_MAP: Record<string, string> = {
  reservations: 'Reservas de Quadras',
  tournaments: 'Torneios',
  comandas: 'Comandas / Consumo',
  payments: 'Pagamentos',
  customers: 'Gestão de Clientes',
  profile: 'Perfil / Conta',
  admin: 'Painel Administrativo',
  other: 'Geral',
}

function buildLinearDescription(data: {
  userName?: string | null
  userEmail?: string | null
  currentPage?: string | null
  serviceFeature?: string | null
  description?: string | null
  sessionLog?: {
    sessionStart?: string
    events?: Array<{ type: string; timestamp: string; path?: string; message?: string; details?: string }>
    browserInfo?: { userAgent?: string; viewport?: string; platform?: string; language?: string; online?: boolean }
  } | null
  browserInfo?: Record<string, unknown> | null
}): string {
  const lines: string[] = []

  // Cabeçalho
  lines.push('## 👤 Informações do Usuário')
  lines.push(`- **Nome:** ${data.userName || '_não informado_'}`)
  lines.push(`- **Email:** ${data.userEmail || '_não informado_'}`)
  lines.push('')

  // Contexto
  lines.push('## 📍 Contexto')
  lines.push(`- **Página:** \`${data.currentPage || 'desconhecida'}\``)
  lines.push(`- **Funcionalidade:** ${data.serviceFeature ? (FEATURE_MAP[data.serviceFeature] ?? data.serviceFeature) : '_não informada_'}`)
  lines.push('')

  // Descrição
  if (data.description) {
    lines.push('## 📝 Descrição')
    lines.push(data.description)
    lines.push('')
  }

  // Log de sessão
  const log = data.sessionLog
  if (log) {
    lines.push('## 🔍 Log de Sessão')
    if (log.sessionStart) {
      lines.push(`**Início da sessão:** ${new Date(log.sessionStart).toLocaleString('pt-BR')}`)
      lines.push('')
    }

    const events = log.events ?? []
    if (events.length > 0) {
      lines.push('| Horário | Tipo | Detalhe |')
      lines.push('|---|---|---|')
      events.forEach((evt) => {
        const time = new Date(evt.timestamp).toLocaleTimeString('pt-BR')
        const type = evt.type === 'navigation' ? '🧭 Navegação'
          : evt.type === 'error' ? '🔴 Erro'
          : evt.type === 'action' ? '⚡ Ação'
          : evt.type
        const detail = evt.path ?? evt.message ?? evt.details ?? ''
        lines.push(`| ${time} | ${type} | ${detail.slice(0, 120)} |`)
      })
      lines.push('')
    }

    // Info do browser
    const bi = log.browserInfo
    if (bi) {
      lines.push('## 🖥️ Ambiente')
      lines.push(`- **Navegador:** ${bi.userAgent || '—'}`)
      lines.push(`- **Viewport:** ${bi.viewport || '—'}`)
      lines.push(`- **Plataforma:** ${bi.platform || '—'}`)
      lines.push(`- **Idioma:** ${bi.language || '—'}`)
      lines.push(`- **Online:** ${bi.online ? 'Sim' : 'Não'}`)
    }
  }

  lines.push('')
  lines.push('---')
  lines.push(`*Enviado via Padel Manager App — ${new Date().toLocaleString('pt-BR')}*`)

  return lines.join('\n')
}

async function createLinearIssue(payload: {
  title: string
  description: string
  priority: number
  teamId: string
  apiKey: string
  projectId?: string | null
}): Promise<{ id: string; url: string } | null> {
  const query = `
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          url
          identifier
        }
      }
    }
  `

  const variables = {
    input: {
      teamId: payload.teamId,
      title: payload.title,
      description: payload.description,
      priority: payload.priority,
      ...(payload.projectId ? { projectId: payload.projectId } : {}),
    },
  }

  const res = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: payload.apiKey,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) return null

  const json = await res.json()
  const issue = json?.data?.issueCreate?.issue
  if (!issue) return null

  return { id: issue.id, url: issue.url }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      category,
      service_feature,
      title,
      description,
      current_page,
      user_name,
      user_email,
      session_log,
      browser_info,
    } = body

    // Tenta pegar o usuário autenticado para enriquecer o reporte
    let userId: string | null = null
    let resolvedName = user_name
    let resolvedEmail = user_email
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
        if (!resolvedEmail) resolvedEmail = user.email ?? null
      }
    } catch {/* continua sem autenticação */}

    // Título final da issue
    const prefix = category ? (LABEL_MAP[category] ?? '📝 [Feedback]') : '📝 [Feedback]'
    const issueTitle = title
      ? `${prefix} ${title}`
      : service_feature
        ? `${prefix} Problema em ${FEATURE_MAP[service_feature] ?? service_feature}`
        : `${prefix} Feedback do usuário — ${current_page ?? 'página desconhecida'}`

    // Descrição markdown
    const markdownDescription = buildLinearDescription({
      userName: resolvedName,
      userEmail: resolvedEmail,
      currentPage: current_page,
      serviceFeature: service_feature,
      description,
      sessionLog: session_log,
      browserInfo: browser_info,
    })

    // Salva no Supabase
    const service = createServiceClient()
    const { data: savedReport, error: dbError } = await service
      .from('feedback_reports')
      .insert({
        user_id: userId,
        user_name: resolvedName,
        user_email: resolvedEmail,
        current_page,
        service_feature,
        category,
        title,
        description,
        session_log,
        browser_info: browser_info ?? session_log?.browserInfo ?? null,
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('[feedback] DB error:', dbError)
    }

    // Cria issue no Linear
    const apiKey = process.env.LINEAR_API_KEY
    const teamId = process.env.LINEAR_TEAM_ID
    const projectId = process.env.LINEAR_PROJECT_ID ?? null
    let linearIssueId: string | null = null
    let linearIssueUrl: string | null = null

    if (apiKey && teamId) {
      const issue = await createLinearIssue({
        title: issueTitle,
        description: markdownDescription,
        priority: PRIORITY_MAP[category ?? 'other'] ?? 3,
        teamId,
        apiKey,
        projectId,
      })

      if (issue) {
        linearIssueId = issue.id
        linearIssueUrl = issue.url

        // Atualiza o registro com o ID do Linear
        if (savedReport?.id) {
          await service
            .from('feedback_reports')
            .update({ linear_issue_id: linearIssueId, linear_issue_url: linearIssueUrl })
            .eq('id', savedReport.id)
        }
      }
    } else {
      console.warn('[feedback] LINEAR_API_KEY ou LINEAR_TEAM_ID não configurados.')
      if (!projectId) console.warn('[feedback] LINEAR_PROJECT_ID não configurado — issue será criada sem projeto.')
    }

    return NextResponse.json({
      success: true,
      reportId: savedReport?.id ?? null,
      linearIssueUrl,
    })
  } catch (err) {
    console.error('[feedback] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'Erro interno ao processar feedback' },
      { status: 500 }
    )
  }
}
