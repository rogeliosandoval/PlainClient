import { Component, inject, OnInit } from '@angular/core'
import { ButtonModule } from 'primeng/button'
import { PrimeNGConfig } from 'primeng/api'
import { RouterLink, Router } from '@angular/router'
import { Auth, sendEmailVerification, reload } from '@angular/fire/auth'

@Component({
  selector: 'tc-verify-email',
  standalone: true,
  imports: [
    ButtonModule,
    RouterLink
  ],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss'
})

export class VerifyEmail implements OnInit {
  public primengConfig = inject(PrimeNGConfig)
  private auth = inject(Auth)
  private router = inject(Router)

  ngOnInit(): void {
    this.primengConfig.ripple = true
  }

  public async resendEmail(): Promise<void> {
    await sendEmailVerification(this.auth.currentUser!)
  }

  public async continue(): Promise<void> {
    await reload(this.auth.currentUser!)
    if (this.auth.currentUser?.emailVerified) this.router.navigateByUrl('/dashboard')
  }
}