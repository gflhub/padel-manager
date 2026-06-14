'use client'

import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { LogOut } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export function LogoutMenuItem() {
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleLogout = () => {
        startTransition(async () => {
            await signOut()
            router.push('/login')
            router.refresh()
        })
    }

    return (
        <DropdownMenuItem
            onClick={handleLogout}
            disabled={isPending}
            className="cursor-pointer text-destructive focus:text-destructive"
        >
            <LogOut className="mr-2 h-4 w-4" />
            {isPending ? 'Saindo...' : 'Sair'}
        </DropdownMenuItem>
    )
}
