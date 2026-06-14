import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { getUsers } from "@/app/actions/user-management"

export default async function AdminUsersPage() {
    const { data: users } = await getUsers()

    const roleLabels: Record<string, string> = {
        admin: 'Admin', staff: 'Staff', client: 'Cliente',
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
                <p className="text-muted-foreground">Gerenciar usuários do sistema.</p>
            </div>

            <Card>
                <CardHeader><CardTitle>Lista de Usuários</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Telefone</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Cadastro</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(!users || users.length === 0) ? (
                                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum usuário encontrado.</TableCell></TableRow>
                            ) : users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name || '-'}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.phone || '-'}</TableCell>
                                    <TableCell><Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{roleLabels[user.role] || user.role}</Badge></TableCell>
                                    <TableCell><Badge variant={user.active ? 'default' : 'outline'}>{user.active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{new Date(user.created_at).toLocaleDateString('pt-BR')}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
