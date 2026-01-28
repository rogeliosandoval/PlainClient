import { Component, OnInit, ViewChild, inject, signal } from '@angular/core'
import { InputTextModule } from 'primeng/inputtext'
import { ButtonModule } from 'primeng/button'
import { PrimeNGConfig } from 'primeng/api'
import { SharedService } from '../../../services/shared.service'
import { PhoneNumberDirective } from '../../../directives/phone-number.directive'
import { InputTextareaModule } from 'primeng/inputtextarea'
import { AuthService } from '../../../services/auth.service'
import { Storage, getDownloadURL, ref, uploadBytesResumable } from '@angular/fire/storage'
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms'
import { ProgressSpinnerModule } from 'primeng/progressspinner'
import { take } from 'rxjs'
import { doc, Firestore, setDoc } from '@angular/fire/firestore'
import { MessageService } from 'primeng/api'
import { DialogModule } from 'primeng/dialog'
import { AvatarUploadDialog } from '../../../dialogs/avatar-upload/avatar-upload.component'
import { NgOptimizedImage } from '@angular/common'
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth'
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';

@Component({
  selector: 'tc-account-settings',
  standalone: true,
  imports: [
    InputTextModule,
    ButtonModule,
    PhoneNumberDirective,
    InputTextareaModule,
    FormsModule,
    ReactiveFormsModule,
    ProgressSpinnerModule,
    DialogModule,
    AvatarUploadDialog,
    NgOptimizedImage,
    InputGroupModule,
    InputGroupAddonModule
  ],
  templateUrl: './account-settings.component.html',
  styleUrl: './account-settings.component.scss'
})

export class AccountSettings implements OnInit {
  @ViewChild('avatarUploadDialog') avatarUploadDialog!: AvatarUploadDialog
  private messageService = inject(MessageService)
  private firestore = inject(Firestore)
  private storage = inject(Storage)
  private auth = inject(Auth)
  public primengConfig = inject(PrimeNGConfig)
  public sharedService = inject(SharedService)
  public authService = inject(AuthService)
  public savingChanges = signal<boolean>(false)
  public savingBusinessChanges = signal<boolean>(false)
  public dialogLoading = signal<boolean>(false)
  public uploadAvatarType = signal<string>('')
  public defaultProfileForm: any
  public profileForm = new FormGroup({
    id: new FormControl(this.authService.coreUserData()?.uid),
    name: new FormControl(this.authService.coreUserData()?.name),
    email: new FormControl({ value: this.authService.coreUserData()?.email, disabled: true}),
    position: new FormControl(this.authService.coreUserData()?.position),
    phone: new FormControl(this.authService.coreUserData()?.phone),
    location: new FormControl(this.authService.coreUserData()?.location),
    message: new FormControl(this.authService.coreUserData()?.message)
  })
  public defaultBusinessForm: any
  public businessForm = new FormGroup({
    name: new FormControl(this.authService.coreBusinessData()?.name)
  })
  public sendingResetEmail = signal<boolean>(false)
  public emailInput: string = ''
  public loadingVerifiedEmails = signal<boolean>(false)
  public showVerifiedEmails = signal<boolean>(false)
  public emailToAdd: any
  public showEmailInput = signal<boolean>(false)

  ngOnInit(): void {
    this.defaultProfileForm = this.profileForm.value
    this.defaultBusinessForm = this.businessForm.value
  }

  public async addEmail(): Promise<void> {
    this.loadingVerifiedEmails.set(true)
    await this.authService.addVerifiedEmail(this.emailToAdd)
    await this.authService.fetchVerifiedEmails(this.authService.coreBusinessData()?.id as string)
    this.loadingVerifiedEmails.set(false)
    this.showEmailInput.set(false)
  }

  public async deleteEmail(email: string): Promise<void> {
    this.loadingVerifiedEmails.set(true)
    await this.authService.deleteVerifiedEmail(email)
    this.loadingVerifiedEmails.set(false)
  }

  public async showEmails(): Promise<void> {
    this.loadingVerifiedEmails.set(true)
    if (this.sharedService.verifiedEmails().length === 0) {
      await this.authService.fetchVerifiedEmails(this.authService.coreBusinessData()?.id as string)
    }
    this.loadingVerifiedEmails.set(false)
    this.showVerifiedEmails.set(true)
  }

  public sendResetLink(): void {
    this.sendingResetEmail.set(true)
    
    setTimeout(() => {
      sendPasswordResetEmail(this.auth, this.emailInput!).then(() => {
        this.sendingResetEmail.set(false)
        this.emailInput = ''
        this.messageService.add({
          severity: 'success',
          summary: 'Email Sent!',
          detail: 'Check your email and follow the instructions to reset your password.',
          key: 'br',
          life: 8000,
        })
      })
      .catch((err) => {
        this.sendingResetEmail.set(false)
        console.log(err)
        if (err == 'FirebaseError: Firebase: Error (auth/invalid-email).') {
          this.messageService.add({
            severity: 'error',
            summary: 'Invalid Email',
            detail: 'Please enter a valid email and try again.',
            key: 'br',
            life: 4000,
          })
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'There was an error. Try again',
            key: 'br',
            life: 4000,
          })
        }
      })
    }, 2000)
  }

  public triggerAvatarUpload(type: string): void {
    if (type === 'profile') {
      this.uploadAvatarType.set('profile')
      this.sharedService.showAvatarUploadDialog.set(true)
    } else {
      this.uploadAvatarType.set('business')
      this.sharedService.showAvatarUploadDialog.set(true)
    }
  }

  public async saveAvatar(data: any): Promise<void> {
    this.dialogLoading.set(true)
    let avatarUrl = ''

    if (data.file && data.type === 'profile') {
      const userRef = doc(this.firestore, `users/${this.authService.coreUserData()?.uid}`)
      const file = data.file
      const filePath = `users/${this.authService.coreUserData()?.uid}/avatar`
      const storageRef = ref(this.storage, filePath)
      await uploadBytesResumable(storageRef, file)
      avatarUrl = await getDownloadURL(storageRef)
  
      await setDoc(userRef, {
        avatarUrl: avatarUrl
      }, { merge: true })

      await this.authService.updateTeamMemberAvatar(this.authService.coreUserData()?.uid as string, avatarUrl).then(() => {
        this.authService.fetchTeamMembers()
      })

      await this.authService.fetchCoreUserData()

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Avatar has been saved!',
        key: 'br',
        life: 4000,
      })

      this.sharedService.showAvatarUploadDialog.set(false)
    } else if (!data.file && data.type === 'profile') {
      const userRef = doc(this.firestore, `users/${this.authService.coreUserData()?.uid}`)

      await this.authService.deleteProfileAvatar()

      await setDoc(userRef, {
        avatarUrl: avatarUrl
      }, { merge: true })

      await this.authService.fetchCoreUserData()

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Avatar has been deleted!',
        key: 'br',
        life: 4000,
      })

      this.sharedService.showAvatarUploadDialog.set(false)
    }

    if (data.file && data.type !== 'profile') {
      const businessId = this.authService.coreUserData()?.businessId
      const businessRef = doc(this.firestore, `businesses/${businessId}`)
      const file = data.file
      const filePath = `businesses/${businessId}/avatar`
      const storageRef = ref(this.storage, filePath)
      
      await uploadBytesResumable(storageRef, file)
      const avatarUrl = await getDownloadURL(storageRef)
      
      // Update Firestore
      await setDoc(businessRef, { avatarUrl }, { merge: true })
      
      // Update local cache
      const cacheKey = 'coreBusinessDataCache'
      const cached = localStorage.getItem(cacheKey)
      
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
      
          parsed.avatarUrl = avatarUrl
          localStorage.setItem(cacheKey, JSON.stringify(parsed))
          this.authService.coreBusinessData.set(parsed)
          console.log('Successfully updated avatar in cache ✅')
        } catch (e) {
          console.warn('[avatar upload] Failed to update cache manually, refetching instead ❌', e)
          await this.authService.fetchCoreBusinessData()
        }
      } else {
        // fallback if cache doesn't exist
        await this.authService.fetchCoreBusinessData()
      }
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Logo has been saved!',
        key: 'br',
        life: 4000,
      })
      
      this.sharedService.showAvatarUploadDialog.set(false)      
    } else if (!data.file && data.type !== 'profile') {
      const businessId = this.authService.coreUserData()?.businessId
      const businessRef = doc(this.firestore, `businesses/${businessId}`)
      
      // Delete from Firebase Storage
      await this.authService.deleteBusinessAvatar()
      
      // Remove avatarUrl from Firestore
      await setDoc(businessRef, {
        avatarUrl: ''
      }, { merge: true })
      
      // Update cache
      const cacheKey = 'coreBusinessDataCache'
      const cached = localStorage.getItem(cacheKey)
      
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
      
          parsed.avatarUrl = ''
          localStorage.setItem(cacheKey, JSON.stringify(parsed))
          this.authService.coreBusinessData.set(parsed)
          console.log('Successfully removed avatar from cache ✅')
        } catch (e) {
          console.warn('[delete avatar] Failed to update cache manually, refetching instead ❌', e)
          await this.authService.fetchCoreBusinessData()
        }
      } else {
        // fallback if cache doesn't exist
        await this.authService.fetchCoreBusinessData()
      }
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Logo has been removed.',
        key: 'br',
        life: 4000,
      })
      
      this.sharedService.showAvatarUploadDialog.set(false)      
    }

    setTimeout(() => {
      this.avatarUploadDialog.imageChangedEvent = null
      this.avatarUploadDialog.croppedImage = null
      this.avatarUploadDialog.showUploadAvatarButton.set(false)
      this.dialogLoading.set(false)
    }, 1000)
  }

  public cancelProfileChanges(): void {
    this.profileForm.get('name')?.setValue(this.defaultProfileForm?.name)
    this.profileForm.get('position')?.setValue(this.defaultProfileForm?.position)
    this.profileForm.get('phone')?.setValue(this.defaultProfileForm?.phone)
    this.profileForm.get('location')?.setValue(this.defaultProfileForm?.location)
    this.profileForm.get('message')?.setValue(this.defaultProfileForm?.message)
    this.profileForm.markAsPristine()
  }

  public cancelBusinessChanges(): void {
    this.businessForm.get('name')?.setValue(this.defaultBusinessForm?.name)
    this.businessForm.markAsPristine()
  }

  public async saveProfileChanges(): Promise<void> {
    this.savingChanges.set(true)
    const formData = this.profileForm.getRawValue()

    await this.authService.addTeamMember(formData).then(() => {
      this.authService.fetchTeamMembers()
    })

    setTimeout(() => {
      this.authService.user$
      .pipe(take(1))
      .subscribe({
        next: async (data: any) => {
          if (data && data.uid) {
            const uid = data.uid
            const userRef = doc(this.firestore, `users/${uid}`)

            await setDoc(userRef, {
              name: formData.name,
              position: formData.position,
              phone: formData.phone,
              location: formData.location,
              message: formData.message
            }, { merge: true })

            this.defaultProfileForm = formData

            await this.authService.fetchCoreUserData()
            .then(() => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Profile has been updated!',
                key: 'br',
                life: 4000,
              })
            })
            .then(() => {
              this.profileForm.markAsPristine()
              this.savingChanges.set(false)
            })
          }
        },
        error: (err: any) => {
          console.log(err)
          this.savingChanges.set(false)
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'There was an error updating your profile. Try again',
            key: 'br',
            life: 4000,
          })
        }
      })
    }, 1000)
  }

  public saveBusinessChanges(): void {
    this.savingBusinessChanges.set(true)
    const formData = this.businessForm.value

    setTimeout(() => {
      this.authService.user$
      .pipe(take(1))
      .subscribe({
        next: async (data: any) => {
          if (data && data.uid) {
            const businessRef = doc(this.firestore, `businesses/${this.authService.coreUserData()?.businessId}`)

            await setDoc(businessRef, {
              name: formData.name
            }, { merge: true })

            this.defaultBusinessForm = formData

            this.authService.clearBusinessDataCache.set(true)
            await this.authService.fetchCoreBusinessData()
            .then(() => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Business profile has been updated!',
                key: 'br',
                life: 4000,
              })
            })
            .then(() => {
              this.businessForm.markAsPristine()
              this.savingBusinessChanges.set(false)
            })
          }
        },
        error: (err: any) => {
          console.log(err)
          this.savingChanges.set(false)
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'There was an error updating your profile. Try again.',
            key: 'br',
            life: 4000,
          })
        }
      })
    }, 1000)
  }
}
