import { Component, OnInit, inject, signal } from '@angular/core'
import { InputTextModule } from 'primeng/inputtext'
import { ButtonModule } from 'primeng/button'
import { PrimeNGConfig } from 'primeng/api'
import { ActivatedRoute, RouterLink, Router } from '@angular/router'
import { PasswordModule } from 'primeng/password'
import { ProgressSpinnerModule } from 'primeng/progressspinner'
import { SharedService } from '../../services/shared.service'
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms'
import { AuthService } from '../../services/auth.service'
import { Footer } from '../../components/footer/footer.component'
import { lastValueFrom } from 'rxjs'
import { Firestore, collection, doc, setDoc } from '@angular/fire/firestore'
import { UserCredential } from '@angular/fire/auth'
import { NgOptimizedImage } from '@angular/common'

@Component({
    selector: 'tc-business-signup',
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
    templateUrl: './business-signup.component.html',
    styleUrl: './business-signup.component.scss'
})

export class BusinessSignup implements OnInit {
  private activatedRoute = inject(ActivatedRoute)
  private firestore = inject(Firestore)
  private authService = inject(AuthService)
  private router = inject(Router)
  public sharedService = inject(SharedService)
  public primengConfig = inject(PrimeNGConfig)
  public errorMessage = signal<string>('')
  private businessId: string = ''
  public registerForm = new FormGroup({
    name: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.email, Validators.required]),
    password: new FormControl('', Validators.required)
  })

  ngOnInit(): void {
    this.primengConfig.ripple = true
    this.authService.clearAllAppCaches()
    this.activatedRoute.params.subscribe({
      next: response => {
        this.businessId = response['businessId']
      }
    })
  }

  public register(): void {
    this.sharedService.loading.set(true)
    const formData = this.registerForm.value

    setTimeout(() => {
      this.sharedService.newMemberJoining.set(true)
      this.sharedService.newMemberJoiningBusinessId = this.businessId
      lastValueFrom(this.authService.register(formData.email!, formData.name!, formData.password!))
      .then(async (userInfo: UserCredential) => {
        const uid = userInfo.user.uid
        const userRef = doc(this.firestore, `users/${uid}`)
        await setDoc(userRef, {
          uid: uid,
          name: formData.name,
          email: formData.email,
          joiningBusiness: true,
          provider: 'password',
          businessIdRef: this.businessId,
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
}