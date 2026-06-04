import { NextRequest, NextResponse } from 'next/server'

const GITHUB_API_URL = 'https://api.github.com'
const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'

// Mapeamento de categoria → labels do GitHub
const LABEL_MAP: Record<string, string[]> = {
  bug: ['bug'],
  suggestion: ['enhancement'],
  question: ['question'],
  other: ['feedback'],
}

// Mapeamento de categoria → prefixo do título
const TITLE_PREFIX_MAP: Record<string, string> = {
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

function buildIssueBody(data: {
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

  lines.push('## 👤 Informações do Usuário')
  lines.push(`- **Nome:** ${data.userName || '_não informado_'}`)
  lines.push(`- **Email:** ${data.userEmail || '_não informado_'}`)
  lines.push('')

  lines.push('## 📍 Contexto')
  lines.push(`- **Página:** \`${data.currentPage || 'desconhecida'}\``)
  lines.push(`- **Funcionalidade:** ${data.serviceFeature ? (FEATURE_MAP[data.serviceFeature] ?? data.serviceFeature) : '_não informada_'}`)
  lines.push('')

  if (data.description) {
    lines.push('## 📝 Descrição')
    lines.push(data.description)
    lines.push('')
  }

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
        const type =
          evt.type === 'navigation' ? '🧭 Navegação'
          : evt.type === 'error' ? '🔴 Erro'
          : evt.type === 'action' ? '⚡ Ação'
          : evt.type
        const detail = evt.path ?? evt.message ?? evt.details ?? ''
        lines.push(`| ${time} | ${type} | ${detail.slice(0, 120)} |`)
      })
      lines.push('')
    }

    const bi = log.browserInfo
    if (bi) {
      lines.push('## 🖥️ Ambiente')
      lines.push(`- **Navegador:** ${bi.userAgent || '—'}`)
      lines.push(`- **Viewport:** ${bi.viewport || '—'}`)
      lines.push(`- **Plataforma:** ${bi.platform || '—'}`)
      lines.push(`- **Idioma:** ${bi.language || '—'}`)
      lines.push(`- **Online:** ${bi.online ? 'Sim' : 'Não'}`)
      lines.push('')
    }
  }

  lines.push('---')
  lines.push(`*Enviado via Padel Manager App — ${new Date().toLocaleString('pt-BR')}*`)

  return lines.join('\n')
}

/**
 * Cria uma issue no repositório do GitHub e retorna { id, nodeId, url }.
 */
async function createGitHubIssue(payload: {
  token: string
  org: string
  repo: string
  title: string
  body: string
  labels: string[]
}): Promise<{ id: number; nodeId: string; url: string } | null> {
  const res = await fetch(`${GITHUB_API_URL}/repos/${payload.org}/${payload.repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${payload.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: payload.title,
      body: payload.body,
      labels: payload.labels,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[feedback] GitHub Issues API error:', res.status, err)
    return null
  }

  const json = await res.json()
  return { id: json.number, nodeId: json.node_id, url: json.html_url }
}

/**
 * Obtém o node_id de um GitHub Project v2 a partir do número do projeto
 * na organização. Necessário para adicionar items ao projeto.
 */
async function getProjectNodeId(payload: {
  token: string
  org: string
  projectNumber: number
}): Promise<string | null> {
  const query = `
    query GetProject($org: String!, $number: Int!) {
      organization(login: $org) {
        projectV2(number: $number) {
          id
        }
      }
    }
  `
  const res = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${payload.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: { org: payload.org, number: payload.projectNumber } }),
  })

  if (!res.ok) return null
  const json = await res.json()
  return json?.data?.organization?.projectV2?.id ?? null
}

/**
 * Adiciona uma issue (pelo node_id) a um GitHub Project v2.
 */
async function addIssueToProject(payload: {
  token: string
  projectNodeId: string
  issueNodeId: string
}): Promise<boolean> {
  const mutation = `
    mutation AddItem($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item { id }
      }
    }
  `
  const res = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${payload.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: { projectId: payload.projectNodeId, contentId: payload.issueNodeId },
    }),
  })

  if (!res.ok) {
    console.error('[feedback] addProjectV2ItemById failed:', res.status)
    return false
  }

  const json = await res.json()
  return !!json?.data?.addProjectV2ItemById?.item?.id
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

    // TODO: Feedback feature needs to be migrated to Prisma with a Feedback model
    // For now, skip DB storage and only create Linear issue if configured
    let resolvedName = user_name
    let resolvedEmail = user_email

    // Título final da issue
    const prefix = category ? (TITLE_PREFIX_MAP[category] ?? '📝 [Feedback]') : '📝 [Feedback]'
    const issueTitle = title
      ? `${prefix} ${title}`
      : service_feature
        ? `${prefix} Problema em ${FEATURE_MAP[service_feature] ?? service_feature}`
        : `${prefix} Feedback do usuário — ${current_page ?? 'página desconhecida'}`

    // Corpo da issue em Markdown
    const issueBody = buildIssueBody({
      userName: resolvedName,
      userEmail: resolvedEmail,
      currentPage: current_page,
      serviceFeature: service_feature,
      description,
      sessionLog: session_log,
      browserInfo: browser_info,
    })

    // Cria issue no Linear se configurado
    const apiKey = process.env.LINEAR_API_KEY
    const teamId = process.env.LINEAR_TEAM_ID
    const projectId = process.env.LINEAR_PROJECT_ID ?? null
    let linearIssueUrl: string | null = null

    let githubIssueId: string | null = null
    let githubIssueUrl: string | null = null

    if (ghToken && ghOrg && ghRepo) {
      const labels = LABEL_MAP[category ?? 'other'] ?? ['feedback']

      const issue = await createGitHubIssue({
        token: ghToken,
        org: ghOrg,
        repo: ghRepo,
        title: issueTitle,
        body: issueBody,
        labels,
      })

      if (issue) {
        linearIssueUrl = issue.url
      }
    } else {
      console.warn('[feedback] LINEAR_API_KEY ou LINEAR_TEAM_ID não configurados.')
    }

    return NextResponse.json({
      success: true,
      reportId: null,
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
