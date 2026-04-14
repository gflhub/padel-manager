import { getCourts } from "@/app/actions/courts"
import AdminCourtsPage from "./courts-client"

export default async function CourtsPage() {
    const { data: courts } = await getCourts()
    return <AdminCourtsPage courts={courts || []} />
}
