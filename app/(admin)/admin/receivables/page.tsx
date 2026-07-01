import { getReceivables } from '@/app/actions/receivables'
import { ReceivablesClient } from './receivables-client'

export default async function ReceivablesPage() {
    const result = await getReceivables()
    return <ReceivablesClient customers={result.data ?? []} />
}
