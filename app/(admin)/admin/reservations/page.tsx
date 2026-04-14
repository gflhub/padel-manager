import { getReservations } from "@/app/actions/reservations"
import AdminReservationsClient from "./reservations-client"

export default async function AdminReservationsPage() {
    const { data: reservations } = await getReservations()
    return <AdminReservationsClient reservations={reservations || []} />
}
