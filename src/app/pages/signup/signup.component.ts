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
import { lastValueFrom } from 'rxjs'
import { Firestore, collection, doc, getDoc, setDoc } from '@angular/fire/firestore'
import { UserCredential, reload } from '@angular/fire/auth'
import { NgOptimizedImage } from '@angular/common'

@Component({
  selector: 'tc-signup',
  standalone: true,
  imports: [
    InputTextModule,
    ButtonModule,
    RouterLink,
    ProgressSpinnerModule,
    PasswordModule,
    FormsModule,
    ReactiveFormsModule,
    Footer,
    NgOptimizedImage
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})

export class Signup implements OnInit {
  private firestore = inject(Firestore)
  private authService = inject(AuthService)
  private router = inject(Router)
  public sharedService = inject(SharedService)
  public primengConfig = inject(PrimeNGConfig)
  public errorMessage = signal<string>('')
  public registerForm = new FormGroup({
    name: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.email, Validators.required]),
    password: new FormControl('', Validators.required)
  })

  ngOnInit(): void {
    this.primengConfig.ripple = true
    this.authService.clearAllAppCaches()
  }

  public register(): void {
    this.sharedService.loading.set(true)
    const formData = this.registerForm.value

    setTimeout(() => {
      lastValueFrom(this.authService.register(formData.email!, formData.name!, formData.password!))
      .then(async (userInfo: UserCredential) => {
        const uid = userInfo.user.uid
        const userRef = doc(this.firestore, `users/${uid}`)
        await setDoc(userRef, {
          uid: uid,
          name: formData.name,
          email: formData.email,
          provider: 'password',
          createdAt: new Date().toISOString()
        })
      })
      .then(() => {
        this.authService.clearAllAppCaches()
      })
      .then(() => {
        this.sharedService.loading.set(false)
      })
      .then(() => {
        this.router.navigateByUrl('/verify-email')
      })
      .catch(err => {
        if (err.message == 'Firebase: Error (auth/email-already-in-use).') {
          this.errorMessage.set('This email is already in use. Use a different one.')
        } else {
          this.errorMessage.set(err.message)
        }
        this.sharedService.loading.set(false)
      })
    }, 2000)
  }

  public signUpWithGoogle(): void {
    this.sharedService.loading.set(true)

    lastValueFrom(this.authService.signInWithGoogle())
    .then(async (userInfo: UserCredential) => {
      const user = userInfo.user
      const uid = user.uid

      const userRef = doc(this.firestore, `users/${uid}`)

      // ✅ Check if this user exists in YOUR app DB
      const snap = await getDoc(userRef)
      const isReturningUser = snap.exists()

      if (!isReturningUser) {
        // 🆕 First time in your app
        await setDoc(userRef, {
          uid,
          name: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          provider: 'google',
          createdAt: new Date().toISOString()
        })
      } else {
        // 🔁 Returning user
        await setDoc(
          userRef,
          { lastLoginAt: new Date().toISOString() },
          { merge: true }
        )
        this.sharedService.fromLogin.set(true)
        this.authService.clearBusinessDataCache.set(true)
      }
    })
    .then(async () => {
      await reload(this.authService.firebaseAuth.currentUser!)
      await this.authService.fetchCoreUserData()

      if (this.authService.coreUserData()?.joiningBusiness === true) {
        this.authService.clearBusinessDataCache.set(false)
        this.sharedService.newMemberJoining.set(true)
        this.sharedService.newMemberJoiningBusinessId = this.authService.coreUserData()?.businessIdRef as string
      } else if (!this.authService.coreUserData()?.businessId) {
        this.authService.clearBusinessDataCache.set(false)
      } else {
        this.authService.clearBusinessDataCache.set(true)
      }
      this.authService.clearAllAppCaches()
      this.sharedService.loading.set(false)
      this.router.navigateByUrl('/dashboard/overview')
    })
    .catch(err => {
      console.error(err)
      this.errorMessage.set('Google sign-in failed. Please try again.')
      this.sharedService.loading.set(false)
    })
  }
}
