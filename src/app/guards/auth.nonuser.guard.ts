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

  canActivate(): Observable<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return new Observable(observer => observer.next(true))
    }

    return new Observable<boolean>(observer => {
      const unsubscribe = onAuthStateChanged(
        this.authService.firebaseAuth,
        user => {
          if (user) {
            this.router.navigateByUrl('dashboard')
            observer.next(false)
          } else {
            observer.next(true)
          }
          observer.complete()
          unsubscribe()
        },
        () => {
          this.router.navigateByUrl('dashboard')
          observer.next(false)
          observer.complete()
          unsubscribe()
        }
      )
    })
  }
}