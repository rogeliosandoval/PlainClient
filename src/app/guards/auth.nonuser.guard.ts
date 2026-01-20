import { Injectable, inject, PLATFORM_ID } from '@angular/core'
import { Router } from '@angular/router'
import { AuthService } from '../services/auth.service'
import { isPlatformBrowser } from '@angular/common'
import { Observable } from 'rxjs'
import { onAuthStateChanged } from 'firebase/auth'

@Injectable({ providedIn: 'root' })
export class AuthNonuserGuard {
  private authService = inject(AuthService)
  private router = inject(Router)
  private platformId = inject(PLATFORM_ID)

  canActivate(): Observable<boolean | ReturnType<Router['parseUrl']>> {
    if (!isPlatformBrowser(this.platformId)) {
      return new Observable(observer => {
        observer.next(true)
        observer.complete()
      })
    }

    return new Observable(observer => {
      const unsubscribe = onAuthStateChanged(
        this.authService.firebaseAuth,
        user => {
          // ✅ NOT logged in → allow access (home / login / signup)
          if (!user) {
            observer.next(true)
            observer.complete()
            unsubscribe()
            return
          }

          // ❌ Logged in but NOT verified → verify page
          if (!user.emailVerified) {
            observer.next(this.router.parseUrl('/verify-email'))
            observer.complete()
            unsubscribe()
            return
          }

          // ✅ Logged in AND verified → dashboard
          observer.next(this.router.parseUrl('/dashboard'))
          observer.complete()
          unsubscribe()
        },
        () => {
          observer.next(true)
          observer.complete()
          unsubscribe()
        }
      )
    })
  }
}