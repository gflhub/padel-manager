import { Loader2 } from "lucide-react"

export default function LoadingDashboard() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Carregando dashboard...</p>
            </div>
        </div>
    )
}
