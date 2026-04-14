import { getCustomers } from '@/app/actions/customers'
import CustomersClient from './customers-client'

export default async function CustomersPage() {
    const { data: customers } = await getCustomers()
    return <CustomersClient customers={customers || []} />
}
