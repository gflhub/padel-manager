import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy } from "lucide-react"

export default function TournamentsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Torneios</h1>
                <p className="text-muted-foreground mt-1">Participe de torneios e competições</p>
            </div>

            <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-16">
                    <Trophy className="h-16 w-16 text-muted-foreground mb-4" />
                    <CardTitle className="text-xl mb-2">Em Breve</CardTitle>
                    <p className="text-muted-foreground text-center max-w-md">
                        A funcionalidade de torneios estará disponível em breve. Fique atento!
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
