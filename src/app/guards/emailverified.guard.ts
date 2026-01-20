import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { Auth, reload } from '@angular/fire/auth'

export const EmailVerifiedGuard: CanActivateFn = async () => {
  const auth = inject(Auth)
  const router = inject(Router)

  const user = auth.currentUser

  if (!user) {
    return router.parseUrl('/login')
  }

  // 🔑 FORCE refresh Firebase auth state
  await reload(user)

  if (user.emailVerified) {
    return true
  }

  return router.parseUrl('/verify-email')
}