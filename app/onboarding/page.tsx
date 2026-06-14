'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOwnClub } from '@/app/actions/user-management'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function OnboardingPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        
        try {
            const result = await createOwnClub(formData)

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Clube criado com sucesso!')
                router.push('/dashboard')
                router.refresh()
            }
        } catch (error) {
            toast.error('Erro ao criar clube')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Crie seu clube</CardTitle>
                    <CardDescription>
                        Configure seu complexo esportivo para começar a usar o Padel Manager.
                        Você terá 14 dias de teste gratuito.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome do clube</Label>
                            <Input 
                                id="name" 
                                name="name" 
                                placeholder="Ex: Arena Padel Center" 
                                required 
                                minLength={2} 
                                disabled={loading}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? 'Criando...' : 'Criar clube'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
