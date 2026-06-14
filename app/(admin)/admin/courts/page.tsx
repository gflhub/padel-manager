import { getCourts } from "@/app/actions/courts"
import { getIsTrialReadOnly } from "@/lib/get-trial-readonly"
import AdminCourtsPage from "./courts-client"

export default async function CourtsPage() {
    const [{ data: courts }, isReadOnly] = await Promise.all([
        getCourts(),
        getIsTrialReadOnly(),
    ])
    return <AdminCourtsPage courts={courts || []} isReadOnly={isReadOnly} />
}
