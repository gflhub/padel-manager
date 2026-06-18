import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sign } from 'jsonwebtoken'
import { ensureTestEnv } from '../_guard'
import { signIn } from '@/app/actions/auth'
import { verifyAccessToken } from '@/lib/auth/jwt'

/**
 * Test-only login shortcut used by e2e/global.setup.ts to build storageState
 * per role without driving the real login form for every account. Calls the
 * same `signIn` Server Action as the UI, so it sets the same JWT cookies.
 *
 * `?expired=1` re-signs the access token cookie with a negative expiry
 * (same sub/sessionId/tokenVersion) while leaving the refresh token valid —
 * used by AUTH-03 to verify the middleware's silent-refresh path.
 */
export async function POST(request: NextRequest) {
  const guarded = ensureTestEnv()
  if (guarded) return guarded

  const { email, password } = await request.json()

  if (typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 })
  }

  const result = await signIn(email, password)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 401 })
  }

  const expired = new URL(request.url).searchParams.get('expired') === '1'
  if (expired) {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')?.value
    const payload = accessToken ? await verifyAccessToken(accessToken) : null

    if (payload) {
      const expiredToken = sign(
        { sub: payload.sub, sessionId: payload.sessionId, tokenVersion: payload.tokenVersion },
        process.env.JWT_SECRET!,
        { expiresIn: '-10s' }
      )
      cookieStore.set('accessToken', expiredToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60,
      })
    }
  }

  return NextResponse.json({ data: result.data })
}
