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
  businessProfits = signal<any[]>([])
  businessTasks = signal<any[]>([])
  personalTasks = signal<any[]>([])
  fromLogin = signal<boolean>(false)

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

  loadCachedBusinessTasks(): void {
    const cached = localStorage.getItem('businessTasksCache')
    if (cached) {
      try {
        this.businessTasks.set(JSON.parse(cached))
      } catch {
        console.warn('Failed to parse cached business tasks')
      }
    }
  }

  getSortedBusinessTasks() {
    const tasks = this.businessTasks() || []
    return [...tasks].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    )
  }

  loadCachedPersonalTasks(): void {
    const cached = localStorage.getItem('personalTasksCache')
    if (cached) {
      try {
        this.personalTasks.set(JSON.parse(cached))
      } catch {
        console.warn('Failed to parse cached personal tasks')
      }
    }
  }

  getSortedPersonalTasks() {
    const tasks = this.personalTasks() || []
    return [...tasks].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    )
  }

  loadCachedProfits() {
    // Personal
    const userCached = localStorage.getItem('userProfitsCache')
    if (userCached) {
      try {
        this.userProfits.set(JSON.parse(userCached))
      } catch {
        console.warn('Failed to parse cached user profits')
      }
    }

    // Business
    const businessCached = localStorage.getItem('businessProfitsCache')
    if (businessCached) {
      try {
        this.businessProfits.set(JSON.parse(businessCached))
      } catch {
        console.warn('Failed to parse cached business profits')
      }
    }
  }

  getSortedPersonalProfits() {
    const profits = this.userProfits() || []
    return [...profits].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    )
  }

  getSortedBusinessProfits() {
    const profits = this.businessProfits() || []
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
