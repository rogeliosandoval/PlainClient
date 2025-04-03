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
}
