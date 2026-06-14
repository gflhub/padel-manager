import { prisma } from '@/lib/db/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Menu, Home, Calendar, User, LogOut, Trophy } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { LogoutMenuItem } from '@/components/logout-menu-item'
import { getCurrentUser } from '@/lib/auth/session'

export default async function ClientLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getCurrentUser()
    if (!user || !user.profileId) {
        redirect('/login')
    }

    const profile = await prisma.profile.findUnique({
        where: { id: user.profileId },
        select: { name: true, email: true }
    })

    // Check if also staff of any club (for showing admin link)
    const staff = await prisma.clubStaff.findFirst({
        where: {
            profileId: user.profileId,
            active: true
        },
        select: { id: true }
    })

    const userData = {
        name: profile?.name,
        email: profile?.email,
        isStaff: !!staff,
    }

    async function handleSignOut(): Promise<void> {
        'use server'
        await signOut()
    }

    const displayName = userData?.name || 'Usuário'
    const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

    const navItems = [
        { icon: Home, label: 'Início', href: '/home' },
        { icon: Calendar, label: 'Minhas Reservas', href: '/reservations' },
        { icon: Trophy, label: 'Torneios', href: '/tournaments' },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
                <div className="container flex h-16 items-center justify-between px-4">
                    {/* Mobile Menu */}
                    <Sheet>
                        <SheetTrigger asChild className="md:hidden">
                            <Button variant="ghost" size="icon">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-64">
                            <div className="flex flex-col gap-4 py-4">
                                <div className="px-3 py-2">
                                    <h2 className="mb-2 px-2 text-lg font-semibold">Padel Manager</h2>
                                    <div className="space-y-1">
                                        {navItems.map((item) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-100 transition-colors"
                                            >
                                                <item.icon className="h-4 w-4" />
                                                {item.label}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                                <div className="border-t pt-4 px-3">
                                    <div className="flex items-center gap-3 px-2 py-2 mb-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{displayName}</span>
                                            <span className="text-xs text-muted-foreground">{userData?.email}</span>
                                        </div>
                                    </div>
                                    <form action={handleSignOut}>
                                        <Button variant="outline" className="w-full justify-start" size="sm">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Sair
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>

                    {/* Logo */}
                    <Link href="/home" className="flex items-center gap-2 font-bold text-xl">
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-sm">PM</span>
                        </div>
                        <span className="hidden sm:inline-block">Padel Manager</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => (
                            <Link key={item.href} href={item.href}>
                                <Button variant="ghost" className="gap-2">
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </Button>
                            </Link>
                        ))}
                    </nav>

                    {/* User Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                                <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-primary text-primary-foreground">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{displayName}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{userData?.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/profile" className="cursor-pointer">
                                    <User className="mr-2 h-4 w-4" />
                                    Meu Perfil
                                </Link>
                            </DropdownMenuItem>
                            {userData?.isStaff && (
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard" className="cursor-pointer">
                                        <Home className="mr-2 h-4 w-4" />
                                        Painel Admin
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <LogoutMenuItem />
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8 max-w-7xl">
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t bg-white mt-12">
                <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
                    <p>© 2026 Padel Manager. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    )
}
