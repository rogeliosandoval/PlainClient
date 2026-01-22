import { Component, inject, OnInit, signal } from '@angular/core'
import { ButtonModule } from 'primeng/button'
import { PrimeNGConfig } from 'primeng/api'
import { RouterLink, Router } from '@angular/router'
import { SharedService } from '../../services/shared.service'
import { AuthService } from '../../services/auth.service'
import { Auth, sendEmailVerification, reload } from '@angular/fire/auth'
import { NgOptimizedImage } from '@angular/common'

@Component({
  selector: 'tc-verify-email',
  standalone: true,
  imports: [
    ButtonModule,
    RouterLink,
    NgOptimizedImage
  ],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss'
})

export class VerifyEmail implements OnInit {
  public primengConfig = inject(PrimeNGConfig)
  public checking = signal<boolean>(false)
  public sendingEmail = signal<boolean>(false)
  public message = signal<string>('')
  private auth = inject(Auth)
  private router = inject(Router)
  public sharedService = inject(SharedService)
  private authService = inject(AuthService)

  ngOnInit(): void {
    this.primengConfig.ripple = true
  }

  public async resendEmail(): Promise<void> {
    this.sendingEmail.set(true)
    await sendEmailVerification(this.auth.currentUser!).then(() => {
      this.sendingEmail.set(false)
      this.message.set('Email has been sent!')
    }).catch((err) => {
      console.log(err)
      this.sendingEmail.set(false)
      this.message.set('There was an error. Try again.')
    })
  }

  public async continue(): Promise<void> {
    this.checking.set(true)
    await this.authService.fetchCoreUserData()
    .then(() => {
      if (this.authService.coreUserData()?.joiningBusiness) {
        this.sharedService.newMemberJoining.set(true)
        this.sharedService.newMemberJoiningBusinessId = this.authService.coreUserData()?.businessIdRef as string
      }
    })
    .then(() => {
      this.authService.clearAllAppCaches()
    })
    await reload(this.auth.currentUser!)
    if (this.auth.currentUser?.emailVerified) {
      this.router.navigateByUrl('/dashboard')
    } else {
      this.checking.set(false)
      this.message.set('You are not verified yet. Try again.')
    }
  }
}