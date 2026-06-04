'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from 'sonner'
import { getProfile, updateProfile } from '@/app/actions/profiles'

const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  cpf: z.string().optional().or(z.literal('')),
})

type ProfileForm = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  })

  useEffect(() => {
    async function loadProfile() {
      const { data, error } = await getProfile()
      if (error) {
        toast.error('Erro ao carregar perfil')
      } else if (data) {
        reset({
          name: data.name || '',
          phone: data.phone || '',
          cpf: data.cpf || '',
        })
      }
      setLoading(false)
    }

    loadProfile()
  }, [reset])

  async function onSubmit(formData: ProfileForm) {
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('name', formData.name || '')
      fd.append('phone', formData.phone || '')
      fd.append('cpf', formData.cpf || '')

      const { data, error } = await updateProfile(fd)
      if (error) {
        toast.error(error)
      } else {
        toast.success('Perfil atualizado com sucesso')
        if (data) {
          reset({
            name: data.name || '',
            phone: data.phone || '',
            cpf: data.cpf || '',
          })
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando perfil...
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  placeholder="Seu nome completo"
                  {...register('name')}
                  disabled={submitting}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  {...register('phone')}
                  disabled={submitting}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  {...register('cpf')}
                  disabled={submitting}
                />
                {errors.cpf && (
                  <p className="text-sm text-red-500 mt-1">{errors.cpf.message}</p>
                )}
              </div>

              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
