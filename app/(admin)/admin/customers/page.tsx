import { getCustomers } from '@/app/actions/customers'
import { getIsTrialReadOnly } from '@/lib/get-trial-readonly'
import CustomersClient from './customers-client'

export default async function CustomersPage() {
    const [{ data: customers }, isReadOnly] = await Promise.all([
        getCustomers(),
        getIsTrialReadOnly(),
    ])
    return <CustomersClient customers={customers || []} isReadOnly={isReadOnly} />
}
