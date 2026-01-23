import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core'
import { Router, RouterOutlet } from '@angular/router'
import { AuthService } from '../../services/auth.service'
import { SharedService } from '../../services/shared.service'
import { IconFieldModule } from 'primeng/iconfield'
import { InputIconModule } from 'primeng/inputicon'
import { InputTextModule } from 'primeng/inputtext'
import { MenuModule } from 'primeng/menu'
import { MenuItem } from 'primeng/api'
import { ProgressSpinnerModule } from 'primeng/progressspinner'
import { SidebarModule } from 'primeng/sidebar'
import { ButtonModule } from 'primeng/button'
import { DialogModule } from 'primeng/dialog'
import { PrimeNGConfig } from 'primeng/api'
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms'
import { collection, doc, Firestore, getDoc, increment, setDoc, updateDoc } from '@angular/fire/firestore'
import { Auth } from '@angular/fire/auth'
import { ToastModule } from 'primeng/toast'
import { MessageService } from 'primeng/api'
import { take } from 'rxjs'
import { v4 as uuidv4 } from 'uuid'
import { StartupFormDialog } from '../../dialogs/startup-form/startup-form.component'
import { ClientFormDialog } from '../../dialogs/client-form/client-form.component'
import { Storage, getDownloadURL, ref, uploadBytesResumable } from '@angular/fire/storage'
import { NgOptimizedImage } from '@angular/common'
import { BusinessData, ClientData, UserData } from '../../interfaces/user.interface'
import { ClientFormData } from '../../interfaces/other.interface'

@Component({
  selector: 'tc-dashboard',
  standalone: true,
  imports: [
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MenuModule,
    ProgressSpinnerModule,
    RouterOutlet,
    SidebarModule,
    ButtonModule,
    DialogModule,
    FormsModule,
    ReactiveFormsModule,
    ToastModule,
    StartupFormDialog,
    ClientFormDialog,
    NgOptimizedImage
  ],
  providers: [
    MessageService
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})

export class Dashboard implements OnInit {
  private auth = inject(Auth)
  private storage = inject(Storage)
  @ViewChild('addBusinessDialog') addBusinessDialog!: StartupFormDialog
  @ViewChild('addClientDialog') addClientDialog!: ClientFormDialog
  private messageService = inject(MessageService)
  private firestore = inject(Firestore)
  private router = inject(Router)
  public primengConfig = inject(PrimeNGConfig)
  public authService = inject(AuthService)
  public sharedService = inject(SharedService)
  public items: MenuItem[] | undefined
  public currentRoute = signal<string>('')
  public sidebarVisible = signal<boolean>(false)
  public dialogLoading = signal<boolean>(false)
  public showStartupFormDialog = signal<boolean>(false)

  ngOnInit(): void {
    this.primengConfig.ripple = true
    this.initializeApp()
    this.sharedService.loadCachedProfits()
    this.items = [
      {
        label: 'Profile',
        icon: 'pi pi-user',
        command: () => {
          this.router.navigateByUrl('/dashboard/profile')
        }
      },
      {
        label: 'Inbox',
        icon: 'pi pi-inbox',
        command: () => {
          this.router.navigateByUrl('/dashboard/inbox')
        }
      },
      {
        label: 'Account Settings',
        icon: 'pi pi-cog',
        command: () => {
          this.router.navigateByUrl('/dashboard/account-settings')
        }
      },
      {
        label: 'Sign Off',
        icon: 'pi pi-sign-out',
        command: () => {
          this.signOff()
        }
      }
    ]
  }

  public async initializeApp(): Promise<void> {
    this.sharedService.loading.set(true)
    this.sharedService.hardLoading.set(true)
    await this.authService.fetchCoreUserData()
    await this.authService.fetchCoreBusinessData()
    .then(async () => {
      if (!this.authService.coreUserData()?.businessId) {
        if (this.authService.coreUserData()?.joiningBusiness) {
          this.sharedService.newMemberJoining.set(true)
          this.sharedService.newMemberJoiningBusinessId = this.authService.coreUserData()?.businessIdRef as string
        }
        this.showStartupFormDialog.set(true)
      } else {
        if (this.sharedService.fromLogin()) {
          await this.authService.fetchPersonalProfits()
          await this.authService.fetchBusinessProfits()
          await this.authService.fetchBusinessTasks()
          await this.authService.fetchPersonalTasks()
          // await this.addIncomeExpenseToArray()
          this.sharedService.fromLogin.set(false)
          this.sharedService.showOverview.set(true)
        } else {
          this.authService.loadPersonalProfits()
          this.authService.loadBusinessProfits()
          this.authService.loadBusinessTasks()
          this.authService.loadPersonalTasks()
          // await this.addIncomeExpenseToArray()
          this.sharedService.showOverview.set(true)
        }
      }
    })
    .then(() => {
      this.sharedService.loading.set(false)
      this.sharedService.hardLoading.set(false)
    })
  }

  public async addIncomeExpenseToArray(): Promise<void> {
    const uid = this.authService.coreUserData()?.uid
    if (!uid) return

    const currentMonth = new Date().toLocaleDateString('default', { month: 'long', year: 'numeric' })
    const cashRef = doc(this.firestore, `users/${uid}/monthlyProfits/${currentMonth}`)

    const newCashFlow = {
      month: currentMonth,
      income: Number(this.totalPersonalIncome().toFixed(2)),
      expense: Number(this.totalPersonalExpenses().toFixed(2)),
      updatedAt: new Date().toISOString()
    }

    await setDoc(cashRef, newCashFlow, { merge: true }).catch(err => console.error(err))
  }

  public parseAmount(amountStr: string): number {
    const normalized = amountStr.replace(/,/g, '')
    const num = parseFloat(normalized)
    return isNaN(num) ? 0 : num
  }

  public totalPersonalIncome = computed(() => {
    const profits = this.sharedService.userProfits()
    return profits
      .filter(p => p.profitType === 'Income')
      .reduce((sum, p) => sum + this.parseAmount(p.amount), 0)
  })

  public totalPersonalExpenses = computed(() => {
    const profits = this.sharedService.userProfits()
    return profits
      .filter(p => p.profitType === 'Expense')
      .reduce((sum, p) => sum + this.parseAmount(p.amount), 0)
  })

  public grabRoute() {
    return this.router.url
  }

  public onDialogClose(newState: boolean) {
    this.showStartupFormDialog.set(newState)
    this.sharedService.showClientFormDialog.set(newState)
    this.addBusinessDialog.resetForm()
    this.addClientDialog.resetForm()
  }

  public clientFormTrigger(data: any): void {
    if (data.type === 'add') {
      this.addClient(data)
    } else {
      this.editClient(data)
    }
  }
  
  public async addClient(data: ClientFormData): Promise<void> {
    this.dialogLoading.set(true)
  
    try {
      const clientId = uuidv4()
      const businessId = this.authService.coreUserData()?.businessId
      const clientRef = doc(this.firestore, `businesses/${businessId}/clients/${clientId}`)
      let avatarUrl = ''
  
      if (data.file) {
        const file = data.file
        const filePath = `businesses/${businessId}/clients/${clientId}/avatar`
        const storageRef = ref(this.storage, filePath)
        await uploadBytesResumable(storageRef, file)
        avatarUrl = await getDownloadURL(storageRef)
      }
  
      const newClient: ClientData = {
        id: clientId,
        name: data.formData.client_name,
        email: data.formData.client_email,
        phone: data.formData.client_phone,
        location: data.formData.client_location,
        connectedBy: data.formData.connected_by,
        note: data.formData.note,
        createdAt: new Date().toISOString(),
        avatarUrl
      }
  
      // Save the new client to Firestore
      await setDoc(clientRef, newClient, { merge: true })
  
      // Manually update cache
      const cacheKey = 'coreBusinessDataCache'
      const cached = localStorage.getItem(cacheKey)
  
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
  
          parsed.clients = [newClient, ...(parsed.clients || [])] // add new client to top
          parsed.numberOfClients = (parsed.numberOfClients || 0) + 1
  
          localStorage.setItem(cacheKey, JSON.stringify(parsed))
          this.authService.coreBusinessData.set(parsed) // update the signal/store directly if you're using signals
          this.authService.fetchBusinessClientAvatars?.() // update avatars in case needed
          console.log('Successfully added to the cache ✅')
        } catch (e) {
          console.warn('[addClient] Failed to update cache manually, refetching instead ❌', e)
          await this.authService.fetchCoreBusinessData()
        }
      } else {
        // fallback if cache doesn't exist
        await this.authService.fetchCoreBusinessData()
      }
  
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Client has been added!',
        key: 'br',
        life: 4000,
      })
  
      this.addClientDialog.resetForm()
      this.dialogLoading.set(false)
      this.sharedService.showClientFormDialog.set(false)
      this.router.navigateByUrl('/dashboard/clients')
  
    } catch (err) {
      setTimeout(() => {
        this.dialogLoading.set(false)
        console.log(err)
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'There was an error adding a client. Try again.',
          key: 'br',
          life: 4000,
        })
      }, 2000)
    }
  }

  public async editClient(data: ClientFormData): Promise<void> {
    this.dialogLoading.set(true)
    const clientId = this.sharedService.dialogClient().id
    const businessId = this.authService.coreBusinessData()!.id
    const clientRef = doc(this.firestore, `businesses/${businessId}/clients/${clientId}`)
    let avatarUrl = this.sharedService.dialogClient().avatarUrl
  
    try {
      // Upload new avatar if file is present
      if (data.file) {
        const file = data.file
        const filePath = `businesses/${businessId}/clients/${clientId}/avatar`
        const storageRef = ref(this.storage, filePath)
        await uploadBytesResumable(storageRef, file)
        avatarUrl = await getDownloadURL(storageRef)
      } else if (!data.file && avatarUrl && data.avatarTouched) {
        // Delete existing avatar if removed
        await this.authService.deleteClientAvatar(businessId, clientId)
        avatarUrl = ''
      }
  
      const updatedClient: Partial<ClientData> = {
        id: clientId,
        name: data.formData.client_name,
        email: data.formData.client_email,
        phone: data.formData.client_phone,
        location: data.formData.client_location,
        connectedBy: data.formData.connected_by,
        note: data.formData.note,
        avatarUrl,
        // Do not overwrite contacts or createdAt if not changed
      }
  
      await setDoc(clientRef, {
        ...updatedClient,
        createdAt: new Date().toISOString() // or keep original if you prefer
      }, { merge: true })
  
      // Update cache manually
      const cacheKey = 'coreBusinessDataCache'
      const cached = localStorage.getItem(cacheKey)
  
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
  
          parsed.clients = parsed.clients.map((client: ClientData) => {
            if (client.id === clientId) {
              return {
                ...client,
                ...updatedClient
              }
            }
            return client
          })
  
          localStorage.setItem(cacheKey, JSON.stringify(parsed))
          this.authService.coreBusinessData.set(parsed)
          this.authService.fetchBusinessClientAvatars?.()
          console.log('Successfully added to the cache ✅')
        } catch (e) {
          console.warn('[editClient] Failed to update cache manually, refetching instead ❌', e)
          await this.authService.fetchCoreBusinessData()
        }
      } else {
        await this.authService.fetchCoreBusinessData()
      }
  
      await this.authService.fetchClientDataById(clientId)
      this.sharedService.dialogClient.set(this.authService.dialogClient())
  
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Client has been updated!',
        key: 'br',
        life: 4000,
      })
  
      this.addClientDialog.resetForm()
      this.dialogLoading.set(false)
      this.sharedService.showClientFormDialog.set(false)
    } catch (err) {
      setTimeout(() => {
        this.dialogLoading.set(false)
        console.log(err)
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'There was an error updating the client. Try again.',
          key: 'br',
          life: 4000,
        })
      }, 2000)
    }
  }  

  public startupFormTrigger(data: any): void {
    this.sharedService.hardLoading.set(true)
    if (data.type === 'add') {
      this.saveBusinessName(data.businessName)
    } else {
      this.joinBusinessById(this.sharedService.newMemberJoiningBusinessId)
    }
  }

  public async saveBusinessName(businessName: string | null) {
    this.dialogLoading.set(true)
    this.authService.user$
    .pipe(take(1))
    .subscribe({
      next: async (data: any) => {
        if (data && data.uid) {
          const uid = data.uid
          const businessId = uuidv4()
          const userRef = doc(this.firestore, `users/${uid}`)
          const businessRef = doc(this.firestore, `businesses/${businessId}`)

          await setDoc(businessRef, {
            id: businessId,
            name: businessName,
            numberOfClients: 0,
            members: 1, // Initial member count
            ownerId: uid, // Reference the owner
          })

          await setDoc(userRef, { businessId: businessId }, { merge: true }).then(() => {
            this.authService.clearBusinessDataCache.set(true)
          })

          await this.authService.fetchCoreUserData()

          await this.authService.fetchCoreBusinessData()
          .then(() => {
            this.showStartupFormDialog.set(false)
            this.sharedService.hardLoading.set(false)
            this.sharedService.showOverview.set(true)
          })
          .then(() => {
            this.addBusinessDialog.resetForm()
            this.dialogLoading.set(false)
            this.messageService.add({
              severity: 'success',
              summary: 'Account Created!',
              detail: 'Welcome to TidyClient :)',
              key: 'br',
              life: 4000,
            })
          })
        }
      },
      error: (err: any) => {
        console.error(err)
        this.dialogLoading.set(false)
      },
    })
  }

  public async joinBusinessById(businessId: string) {
    this.dialogLoading.set(true)

    this.authService.user$
      .pipe(take(1))
      .subscribe({
        next: async (user: any) => {
          if (!user?.uid) return

          try {
            const uid = user.uid
            const userRef = doc(this.firestore, `users/${uid}`)
            const businessRef = doc(this.firestore, `businesses/${businessId}`)

            // 1️⃣ Assign businessId to user
            await setDoc(userRef, {
              businessId,
              joiningBusiness: false
            }, { merge: true })

            // 2️⃣ Increment business member count
            await updateDoc(businessRef, {
              members: increment(1),
            })

            // 3️⃣ Clear & refetch cached data
            this.authService.clearBusinessDataCache.set(true)

            await this.authService.fetchCoreUserData()
            await this.authService.fetchCoreBusinessData()
            await this.authService.fetchBusinessProfits()
            await this.authService.fetchBusinessTasks().then(() => {
              this.showStartupFormDialog.set(false)
              this.sharedService.hardLoading.set(false)
              this.sharedService.showOverview.set(true)
              this.sharedService.newMemberJoining.set(false)
              this.sharedService.newMemberJoiningBusinessId = ''
            })
            this.dialogLoading.set(false)
            this.messageService.add({
              severity: 'success',
              summary: 'Joined Business',
              detail: 'You have successfully joined the business!',
              key: 'br',
              life: 4000,
            })
          } catch (err) {
            console.error('Error joining business:', err)
            this.dialogLoading.set(false)

            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Unable to join business. Please check the Business ID.',
              key: 'br',
              life: 4000,
            })
          }
        },
        error: (err) => {
          console.error(err)
          this.dialogLoading.set(false)
        },
      })
  }

  public signOff(): void {
    this.sharedService.loading.set(true)

    setTimeout(() => {
      this.authService.logout().subscribe({
        next: () => {
          this.authService.clearAllAppCaches()
          this.sharedService.showOverview.set(false)
          this.router.navigateByUrl('/login')
          this.sharedService.loading.set(false)
        }
      })
    }, 2000)
  }
}
