import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { revalidatePath } from 'next/cache'

export default async function AdminSettingsPage() {
    const supabase = await createClient()
    const { data: settings } = await supabase.from('settings').select('*').single()

    const complexInfo = settings?.complex_info || { name: '', address: '', phone: '', email: '' }
    const reservationSettings = settings?.reservation_settings || { max_advance_days: 30, default_slot_duration: 90 }
    const paymentSettings = settings?.payment_settings || { allow_pay_later: true, allow_credits: true, pix_key: '' }

    async function updateSettings(formData: FormData) {
        'use server'
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const complex_info = {
            name: formData.get('complex_name') as string,
            address: formData.get('address') as string,
            phone: formData.get('phone') as string,
            email: formData.get('email') as string,
        }

        await supabase
            .from('settings')
            .update({ complex_info, updated_by: user.id })
            .not('id', 'is', null) // updates all rows (only one)

        revalidatePath('/admin/settings')
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
                <p className="text-muted-foreground">Personalize seu complexo esportivo.</p>
            </div>

            <Tabs defaultValue="general">
                <TabsList>
                    <TabsTrigger value="general">Geral</TabsTrigger>
                    <TabsTrigger value="reservations">Reservas</TabsTrigger>
                    <TabsTrigger value="payments">Pagamentos</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informações do Complexo</CardTitle>
                            <CardDescription>Dados exibidos para os clientes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form action={updateSettings} className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2"><Label>Nome</Label><Input name="complex_name" defaultValue={complexInfo.name} /></div>
                                    <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" defaultValue={complexInfo.email} /></div>
                                    <div className="space-y-2"><Label>Telefone</Label><Input name="phone" defaultValue={complexInfo.phone} /></div>
                                    <div className="space-y-2"><Label>Endereço</Label><Input name="address" defaultValue={complexInfo.address} /></div>
                                </div>
                                <Button type="submit">Salvar</Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reservations">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configurações de Reserva</CardTitle>
                            <CardDescription>Regras e políticas de agendamento.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2"><Label>Antecedência máxima (dias)</Label><Input value={reservationSettings.max_advance_days} readOnly /></div>
                                <div className="space-y-2"><Label>Duração padrão (min)</Label><Input value={reservationSettings.default_slot_duration} readOnly /></div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-4">Edição avançada em breve.</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payments">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pagamentos</CardTitle>
                            <CardDescription>Configurações de pagamento.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2"><Label>Chave PIX</Label><Input value={paymentSettings.pix_key || ''} readOnly /></div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-4">Configuração de pagamentos em breve.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
