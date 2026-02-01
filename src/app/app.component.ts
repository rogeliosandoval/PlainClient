import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core'
import { NavigationEnd, Router, RouterOutlet } from '@angular/router'
import { SharedService } from './services/shared.service'
import { CommonModule } from '@angular/common'
import { AuthService } from './services/auth.service'
import { filter } from 'rxjs'

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

export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLElement>

  public authService = inject(AuthService)
  public sharedService = inject(SharedService)
  private router = inject(Router)

  public loadApp = signal<boolean>(false)

  private lastScrollTop = 0
  private lastDirection: 'up' | 'down' | null = null
  private readonly SCROLL_THRESHOLD = 80

  ngOnInit(): void {
    this.authService.user$.subscribe((user: any) => {
      this.authService.currentUserSignal.set(
        user
          ? { email: user.email!, name: user.displayName! }
          : null
      )
      this.loadApp.set(true)
    })
  }

  ngAfterViewInit(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (!this.router.url.startsWith('/dashboard')) {
          this.scrollContainer?.nativeElement.scrollTo({
            top: 0,
            left: 0,
            behavior: 'auto'
          })

          // reset scroll state so your logic stays correct
          this.lastScrollTop = 0
          this.lastDirection = null
        }
      })
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement
    const currentScrollTop = el.scrollTop
    const delta = currentScrollTop - this.lastScrollTop

    if (Math.abs(delta) < this.SCROLL_THRESHOLD) return

    const direction: 'up' | 'down' = delta > 0 ? 'down' : 'up'

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
