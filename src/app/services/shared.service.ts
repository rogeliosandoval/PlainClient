import { Injectable, Inject, signal, PLATFORM_ID } from '@angular/core'
import { isPlatformBrowser } from '@angular/common'

@Injectable({
  providedIn: 'root'
})

export class SharedService {
  darkMode = signal<boolean>(false)
  loading = signal<boolean>(false)
  showAvatarUploadDialog = signal<boolean>(false)
  showClientFormDialog = signal<boolean>(false)
  clientFormType = signal<string>('')
  dialogClient = signal<any>(null)
  userProfits = signal<any[]>([])

  constructor(
      @Inject(PLATFORM_ID)
      private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      const storedTheme = localStorage.getItem('darkMode')
      if (storedTheme !== null) {
        this.darkMode.set(storedTheme === 'true')
      }

      this.applyTheme()
    }
  }

  loadCachedProfits() {
    const cached = localStorage.getItem('userProfitsCache')
    if (cached) {
      try {
        this.userProfits.set(JSON.parse(cached))
      } catch {
        console.warn('Failed to parse cached profits')
      }
    }
  }

  getSortedProfits() {
    const profits = this.userProfits() || []
    return [...profits].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    )
  }

  toggleTheme(): void {
    this.darkMode.update(value => !value)

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('darkMode', String(this.darkMode()))
    }

    this.applyTheme()
  }

  private applyTheme() {
    if (isPlatformBrowser(this.platformId)) {
      const themeLink = document.getElementById('theme-link') as HTMLLinkElement

      if (themeLink) {
        themeLink.href = this.darkMode()
          ? 'assets/themes/lara-dark-blue/theme.css'
          : 'assets/themes/lara-light-blue/theme.css'
      }
    }
  }
}
