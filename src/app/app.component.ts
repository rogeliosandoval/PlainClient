import { Component, OnInit, inject, signal } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { SharedService } from './services/shared.service'
import { CommonModule } from '@angular/common'
import { AuthService } from './services/auth.service'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})

export class AppComponent implements OnInit {
  public authService = inject(AuthService)
  public sharedService = inject(SharedService)
  public loadApp = signal<boolean>(false)
  private lastScrollTop = 0
  private lastDirection: 'up' | 'down' | null = null
  private readonly SCROLL_THRESHOLD = 80 // px
  
  ngOnInit(): void {
    this.authService.user$.subscribe((user: any) => {
      if (user) {
        this.authService.currentUserSignal.set({
          email: user.email!,
          name: user.displayName!,
        })
        this.loadApp.set(true)
      } else {
        this.authService.currentUserSignal.set(null)
        this.loadApp.set(true)
      }
    })
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement
    const currentScrollTop = el.scrollTop
    const delta = currentScrollTop - this.lastScrollTop

    // ignore tiny scroll movements (mobile jitter)
    if (Math.abs(delta) < this.SCROLL_THRESHOLD) {
      return
    }

    const direction: 'up' | 'down' =
      delta > 0 ? 'down' : 'up'

    // fire only when direction changes
    if (direction !== this.lastDirection) {
      direction === 'down'
        ? this.onScrollDown()
        : this.onScrollUp()

      this.lastDirection = direction
    }

    this.lastScrollTop = currentScrollTop
  }

  private onScrollDown(): void {
    this.sharedService.showOverlay.set(false)
  }

  private onScrollUp(): void {
    this.sharedService.showOverlay.set(true)
  }
}
