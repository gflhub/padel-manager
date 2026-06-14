import { getSubscriptions } from "@/app/actions/subscriptions"
import { getCustomers } from "@/app/actions/customers"
import { getIsTrialReadOnly } from "@/lib/get-trial-readonly"
import MembersClient from "./members-client"

export default async function AdminMembersPage() {
    const [subscriptionsResult, customersResult, isReadOnly] = await Promise.all([
        getSubscriptions(),
        getCustomers(),
        getIsTrialReadOnly(),
    ])

    return (
        <MembersClient
            subscriptions={subscriptionsResult.data || []}
            members={(customersResult.data || []).filter((m) => m.active)}
            isReadOnly={isReadOnly}
        />
    )
}
