import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LayoutDashboard, Calendar, Users, Settings, Trophy, Receipt, ShoppingBag, Home, User, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/app/actions/auth'
import { LogoutMenuItem } from '@/components/logout-menu-item'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const service = createServiceClient()

    // Buscar vínculo de staff no clube
    const { data: staffData } = await service
        .from('club_staff')
        .select('role, club_id, club:clubs(name)')
        .eq('profile_id', user.id)
        .eq('active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

    if (!staffData) {
        redirect('/')
    }

    // Buscar dados do perfil
    const { data: profileData } = await service
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .single()

    const userData = {
        role: staffData.role,
        name: profileData?.name,
        email: profileData?.email ?? user.email,
    }

    const displayName = userData?.name || user.email?.split('@')[0] || 'Admin'
    const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

    const sidebarItems = [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
        { icon: Calendar, label: 'Reservas', href: '/admin/reservations' },
        { icon: Receipt, label: 'Comandas', href: '/admin/comandas' },
        { icon: Trophy, label: 'Quadras', href: '/admin/courts' },
        { icon: ShoppingBag, label: 'Produtos', href: '/admin/products' },
        { icon: UserRound, label: 'Clientes', href: '/admin/customers' },
        { icon: Settings, label: 'Configurações', href: '/admin/settings' },
    ]

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="hidden md:flex md:w-64 md:flex-col fixed inset-y-0 z-50 border-r bg-white">
                <div className="flex h-full flex-col">
                    {/* Logo */}
                    <div className="flex h-16 items-center border-b px-6">
                        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
                            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                                <span className="text-primary-foreground font-bold text-sm">PM</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm">Padel Manager</span>
                                <span className="text-xs text-muted-foreground font-normal">Admin</span>
                            </div>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
                        {sidebarItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-slate-100 hover:text-primary",
                                    "text-slate-700"
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    {/* User Section */}
                    <div className="border-t p-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-2 px-3">
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col items-start flex-1 min-w-0">
                                        <span className="text-sm font-medium truncate w-full">{displayName}</span>
                                        <span className="text-xs text-muted-foreground truncate w-full">{userData?.email}</span>
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{displayName}</p>
                                        <p className="text-xs leading-none text-muted-foreground">{userData?.email}</p>
                                        <p className="text-xs leading-none text-muted-foreground capitalize mt-1">
                                            {userData?.role === 'owner' ? 'Proprietário' : userData?.role === 'admin' ? 'Administrador' : 'Equipe'}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/home" className="cursor-pointer">
                                        <Home className="mr-2 h-4 w-4" />
                                        Área do Cliente
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/profile" className="cursor-pointer">
                                        <User className="mr-2 h-4 w-4" />
                                        Meu Perfil
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <LogoutMenuItem />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex flex-col flex-1 md:pl-64">
                {/* Mobile Header */}
                <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-white px-4 md:hidden">
                    <Link href="/" className="flex items-center gap-2 font-bold">
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-sm">PM</span>
                        </div>
                        <span className="text-sm">Admin</span>
                    </Link>
                    <div className="flex-1" />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {sidebarItems.map((item) => (
                                <DropdownMenuItem key={item.href} asChild>
                                    <Link href={item.href} className="cursor-pointer">
                                        <item.icon className="mr-2 h-4 w-4" />
                                        {item.label}
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <LogoutMenuItem />
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
