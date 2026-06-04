import { createClient } from '@/lib/supabase/server'
import { getClubContext } from '@/lib/get-club-role'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { LayoutDashboard, ShoppingCart, LogOut } from 'lucide-react'
import { signOut } from '@/app/actions/auth'

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const clubContext = await getClubContext(user.id)
  if (!clubContext) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">Padel Manager</span>
              <span className="text-xs text-muted-foreground">{clubContext.clubName}</span>
            </div>
            <div className="hidden sm:flex gap-2">
              <Link href="/staff/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/staff/comandas">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Comandas
                </Button>
              </Link>
            </div>
          </div>
          <form action={signOut}>
            <Button variant="ghost" size="sm" className="gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </form>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          © 2026 Padel Manager. Espaço de trabalho de staff.
        </div>
      </footer>
    </div>
  )
}
