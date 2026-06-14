export function getInitials(name: string | null | undefined): string {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** "Hoje, 14:00" / "Ontem, 19:00" / "04/06, 14:00" */
export function formatHumanDateTime(date: Date, time?: string): string {
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)

    let day: string
    if (isSameDay(date, now)) day = 'Hoje'
    else if (isSameDay(date, yesterday)) day = 'Ontem'
    else day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

    return time ? `${day}, ${time}` : day
}

/** "há 1h 20m" / "há 35m" */
export function formatElapsedTime(date: Date): string {
    const diffMs = Date.now() - date.getTime()
    const minutes = Math.max(0, Math.floor(diffMs / 60000))
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (hours === 0) return `há ${remainingMinutes}m`
    return `há ${hours}h ${remainingMinutes}m`
}

const AVATAR_PALETTE = [
    { bg: 'bg-blue-100', text: 'text-blue-700' },
    { bg: 'bg-green-100', text: 'text-green-700' },
    { bg: 'bg-orange-100', text: 'text-orange-700' },
    { bg: 'bg-violet-100', text: 'text-violet-700' },
] as const

/** Deterministic name → avatar color pair, for consistent color-coding across lists. */
export function getAvatarColors(name: string | null | undefined): { bg: string; text: string } {
    const str = name?.trim() || '?'
    let hash = 0
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "mar 2026 · há 3 meses" */
export function formatMemberSince(date: Date): string {
    const now = new Date()
    const monthsDiff = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth())
    const label = `${MONTHS_PT[date.getMonth()]} ${date.getFullYear()}`
    if (monthsDiff <= 0) return `${label} · este mês`
    if (monthsDiff === 1) return `${label} · há 1 mês`
    return `${label} · há ${monthsDiff} meses`
}
