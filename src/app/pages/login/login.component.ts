import { Component, OnInit, inject, signal } from '@angular/core'
import { InputTextModule } from 'primeng/inputtext'
import { ButtonModule } from 'primeng/button'
import { PrimeNGConfig } from 'primeng/api'
import { RouterLink, Router } from '@angular/router'
import { PasswordModule } from 'primeng/password'
import { ProgressSpinnerModule } from 'primeng/progressspinner'
import { SharedService } from '../../services/shared.service'
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms'
import { AuthService } from '../../services/auth.service'
import { Footer } from '../../components/footer/footer.component'
import { CheckboxModule } from 'primeng/checkbox'
import { NgOptimizedImage } from '@angular/common'
import { Auth, sendPasswordResetEmail, UserCredential } from '@angular/fire/auth'
import { lastValueFrom } from 'rxjs'
import { doc, setDoc, Firestore } from '@angular/fire/firestore'

@Component({
  selector: 'tc-login',
  standalone: true,
  imports: [
    InputTextModule,
    ButtonModule,
    RouterLink,
    PasswordModule,
    ProgressSpinnerModule,
    FormsModule,
    ReactiveFormsModule,
    Footer,
    CheckboxModule,
    NgOptimizedImage
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})

export class Login implements OnInit {
  private firestore = inject(Firestore)
  private auth = inject(Auth)
  private authService = inject(AuthService)
  private router = inject(Router)
  public sharedService = inject(SharedService)
  public primengConfig = inject(PrimeNGConfig)
  public forgotPassword = signal<boolean>(false)
  public resetLinkSent = signal<boolean>(false)
  public errorMessage = signal<string>('')
  public loginForm = new FormGroup({
    email: new FormControl('', [Validators.email, Validators.required]),
    password: new FormControl('', Validators.required),
    checked: new FormControl('')
  })
  public resetPasswordForm = new FormGroup({
    email: new FormControl('', [Validators.email, Validators.required])
  })

  ngOnInit(): void {
    this.primengConfig.ripple = true
    this.authService.clearAllAppCaches()
  }

  public login(): void {
    const formData = this.loginForm.value
    this.sharedService.loading.set(true)

    setTimeout(() => {
      if (formData.checked?.includes('yes')) {
        this.sharedService.fromLogin.set(true)
        this.authService.clearBusinessDataCache.set(true)
        this.authService.loginWithLocalPersistence(formData.email!, formData.password!).subscribe({
          next: () => {
            this.sharedService.loading.set(false)
          },
          error: err => {
            if (err.message == 'Firebase: Error (auth/invalid-credential).') {
              this.errorMessage.set('Wrong email or password. Please try again.')
            } else {
              this.errorMessage.set(err.message)
            }
            this.sharedService.loading.set(false)
          },
          complete: () => {
            this.router.navigateByUrl('/dashboard')
          }
        })
      } else {
        this.sharedService.fromLogin.set(true)
        this.authService.clearBusinessDataCache.set(true)
        this.authService.loginWithSessionPersistence(formData.email!, formData.password!).subscribe({
          next: () => {
            this.sharedService.loading.set(false)
          },
          error: err => {
            if (err.message == 'Firebase: Error (auth/invalid-credential).') {
              this.errorMessage.set('Wrong email or password. Please try again.')
            } else {
              this.errorMessage.set(err.message)
            }
            this.sharedService.loading.set(false)
          },
          complete: () => {
            this.router.navigateByUrl('/dashboard')
          }
        })
      }
    }, 2000)
  }

  public sendResetLink(): void {
    this.sharedService.loading.set(true)

    setTimeout(() => {
      this.resetLinkSent.set(true)
      this.sharedService.loading.set(false)
    }, 1500)
  }

  // Send Password Reset Link
  public onForgot(): void {
    let email = this.resetPasswordForm.get('email')?.value
    this.sharedService.loading.set(true)

    setTimeout(() => {
      sendPasswordResetEmail(this.auth, email!).then(() => {
        this.sharedService.loading.set(false)
        this.resetLinkSent.set(true)
      })
      .catch((error) => {
        this.sharedService.loading.set(false)
        alert('Error: ' + error.message)
      })
    }, 2000)
  }

  public loginWithGoogle(): void {
    lastValueFrom(this.authService.signInWithGoogle())
    .then(async (userInfo: UserCredential) => {
      const user = userInfo.user
      const uid = user.uid

      const userRef = doc(this.firestore, `users/${uid}`)

      // Ensure Firestore user exists (or update it)
      await setDoc(
        userRef,
        {
          uid,
          name: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          provider: 'google',
          lastLoginAt: new Date().toISOString()
        },
        { merge: true }
      )
    })
    .then(() => {
      this.authService.clearAllAppCaches()
      this.sharedService.fromLogin.set(true)
      this.sharedService.loading.set(false)
      this.router.navigateByUrl('/dashboard')
    })
    .catch(err => {
      console.error(err)
      this.errorMessage.set('Google login failed. Please try again.')
      this.sharedService.loading.set(false)
    })
  }
}
