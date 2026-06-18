export const E2E_PASSWORD = 'Test1234!'

export interface SeededRole {
  key: 'admin-a' | 'staff-a' | 'client-a' | 'admin-b' | 'staff-b'
  email: string
}

export const ROLES: SeededRole[] = [
  { key: 'admin-a', email: 'admin.a@e2e.test' },
  { key: 'staff-a', email: 'staff.a@e2e.test' },
  { key: 'client-a', email: 'client.a@e2e.test' },
  { key: 'admin-b', email: 'admin.b@e2e.test' },
  { key: 'staff-b', email: 'staff.b@e2e.test' },
]

export function authFile(role: SeededRole['key']): string {
  return `e2e/.auth/${role}.json`
}
