import { getReservations } from "@/app/actions/reservations"
import { getIsTrialReadOnly } from "@/lib/get-trial-readonly"
import AdminReservationsClient from "./reservations-client"

export default async function AdminReservationsPage() {
    const [{ data: reservations }, isReadOnly] = await Promise.all([
        getReservations(),
        getIsTrialReadOnly(),
    ])
    return <AdminReservationsClient reservations={reservations || []} isReadOnly={isReadOnly} />
}
