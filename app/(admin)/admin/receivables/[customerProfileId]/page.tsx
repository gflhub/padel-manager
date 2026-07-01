import { getCustomerReceivables } from '@/app/actions/receivables'
import { CustomerReceivablesClient } from './customer-receivables-client'

interface Props {
    params: Promise<{ customerProfileId: string }>
}

export default async function CustomerReceivablesPage({ params }: Props) {
    const { customerProfileId } = await params
    const result = await getCustomerReceivables(customerProfileId)
    return (
        <CustomerReceivablesClient
            customerProfileId={customerProfileId}
            comandas={result.data ?? []}
        />
    )
}
