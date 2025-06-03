import { Injectable, signal } from '@angular/core'

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

  toggleTheme(): void {
    this.darkMode.update(value => !value)
    const themeLink = document.getElementById('theme-link') as HTMLLinkElement
    if (themeLink) {
      themeLink.href = this.darkMode()
        ? 'assets/themes/lara-dark-blue/theme.css'
        : 'assets/themes/lara-light-blue/theme.css'
    }
  }
}
