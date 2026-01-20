import { Injectable, inject, PLATFORM_ID } from '@angular/core'
import { Router } from '@angular/router'
import { AuthService } from '../services/auth.service'
import { isPlatformBrowser } from '@angular/common'
import { map, catchError, Observable, of } from 'rxjs'

@Injectable({
  providedIn: 'root'
})

export class AuthUserGuard {
  private authService = inject(AuthService)
  private router = inject(Router)
  private platformId = inject(PLATFORM_ID)

  canActivate(): Observable<boolean> {
    if (isPlatformBrowser(this.platformId)) {
      return this.authService.user$.pipe(
        map(user => {
          if (!user) {
            this.router.navigateByUrl('/login')
            return false
          }
          return true
        }),
        catchError(() => {
          this.router.navigateByUrl('/login')
          return of(false)
        })
      )
    }
    return of(false) // Handle SSR case
  }
}