/**
 * Single source of truth for `data-testid` values. Imported by both app
 * components and e2e specs (via getByTestId) so the two cannot drift —
 * renaming an id here breaks the build everywhere it's used.
 */
export const TESTIDS = {
  // Auth / login (app/login)
  LOGO: 'logo',
  EMAIL_INPUT: 'email-input',
  PASSWORD_INPUT: 'password-input',
  LOGIN_SUBMIT: 'login-submit',
  FORGOT_PASSWORD: 'forgot-password',
  AUTH_ERROR: 'auth-error',

  // Nav / layout shells
  USER_MENU: 'user-menu',
  SIDEBAR: 'sidebar',
  MOBILE_MENU_TOGGLE: 'mobile-menu-toggle',
  NAV_DASHBOARD: 'nav-dashboard',
  NAV_SETTINGS: 'nav-settings',
  NAV_MENSALISTAS: 'nav-mensalistas',

  // Admin dashboard
  ADMIN_DASHBOARD: 'admin-dashboard',
  TODAY_REVENUE: 'today-revenue',
  RESERVAS_HOJE: 'reservas-hoje',

  // Comandas
  COMANDA_TOTAL: 'comanda-total',
  PAYMENT_METHOD: 'payment-method',
  CLOSE_COMANDA: 'close-comanda',
  COMANDA_STATUS: 'comanda-status',

  // Mensalistas (monthly members)
  MEMBER_STATUS: 'member-status',
  MEMBER_TOTAL: 'member-total',

  // Trial gate
  TRIAL_EXPIRED: 'trial-expired',

  // Error / loading states
  APP_ERROR_BOUNDARY: 'app-error-boundary',
  ERROR_RETRY: 'error-retry',
} as const
