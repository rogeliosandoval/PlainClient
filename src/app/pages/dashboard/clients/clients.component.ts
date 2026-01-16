import { Component, OnInit, ViewChild, inject, signal } from '@angular/core'
import { SharedService } from '../../../services/shared.service'
import { AuthService } from '../../../services/auth.service'
import { MenuItem } from 'primeng/api'
import { MenuModule } from 'primeng/menu'
import { ConfirmDialog } from '../../../dialogs/confirm/confirm.component'
import { TruncatePipe } from '../../../pipes/truncate.pipe'
import { TooltipModule } from 'primeng/tooltip'
import { ButtonModule } from 'primeng/button'
import { Storage } from '@angular/fire/storage'
import { MessageService } from 'primeng/api'
import { UnformatPhonePipe } from '../../../pipes/unformat-phone.pipe'
import { ProgressSpinnerModule } from 'primeng/progressspinner'
import { Router } from '@angular/router'
import { ContactFormDialog } from '../../../dialogs/contact-form/contact-form.component'
import { FormatPhonePipe } from '../../../pipes/format-phone.pipe'
import { ContactListDialog } from '../../../dialogs/contact-list/contact-list.component'
import { NgOptimizedImage } from '@angular/common'
import { ClientFormData } from '../../../interfaces/other.interface'
import { SkeletonModule } from 'primeng/skeleton'

@Component({
  selector: 'tc-clients',
  standalone: true,
  imports: [
    MenuModule,
    ConfirmDialog,
    TruncatePipe,
    TooltipModule,
    ButtonModule,
    UnformatPhonePipe,
    ProgressSpinnerModule,
    ContactFormDialog,
    FormatPhonePipe,
    ContactListDialog,
    NgOptimizedImage,
    SkeletonModule
  ],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss'
})

export class Clients implements OnInit {
  @ViewChild('contactFormDialog') contactFormDialog!: ContactFormDialog
  private router = inject(Router)
  private messageService = inject(MessageService)
  private storage = inject(Storage)
  public sharedService = inject(SharedService)
  public authService = inject(AuthService)
  public loadingClients = signal<boolean>(false)
  public showConfirmDialog = signal<boolean>(false)
  public clientOptions: MenuItem[] | undefined
  public dialogMessage = signal<string>('')
  public dialogType = signal<string>('')
  public dialogLoading = signal<boolean>(false)
  public showContactFormDialog = signal<boolean>(false)
  public showContactListDialog = signal<boolean>(false)
  public imageLoaded: Record<string, boolean> = {}

  ngOnInit(): void {
    this.sharedService.showOverlay.set(true)
    // setTimeout(() => {
    //   this.loadingClients.set(false)
    // }, 700)
    this.clientOptions = [
      {
        label: 'View Details',
        icon: 'pi pi-info-circle',
        command: () => {
          this.router.navigate(['/dashboard/clients/client-details', this.sharedService.dialogClient().id])
        }
      },
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => {
          this.sharedService.clientFormType.set('edit')
          this.sharedService.showClientFormDialog.set(true)
        }
      },
      {
        label: 'Add Contact',
        icon: 'pi pi-user-plus',
        command: () => {
          this.showContactFormDialog.set(true)
        }
      },
      {
        label: 'Create Note',
        icon: 'pi pi-pen-to-square'
      },
      {
        label: 'Send Email',
        icon: 'pi pi-envelope',
        command: () => {
          window.location.href = `mailto:${this.sharedService.dialogClient().email}`
        }
      },
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        command: () => {
          this.openConfirmDialog(`Are you sure you want to delete this client? (${this.sharedService.dialogClient().name})`, 'delete')
        }
      }
    ]
  }

  public editClient(): void {
    this.sharedService.clientFormType.set('edit')
    this.sharedService.showClientFormDialog.set(true)
  }

  public onDialogClose(newState: boolean) {
    this.showConfirmDialog.set(newState)
    this.showContactFormDialog.set(newState)
    this.contactFormDialog.resetForm()
    this.showContactListDialog.set(newState)
  }

  public openConfirmDialog(message: string, type: string): void {
    this.dialogMessage.set(message)
    this.dialogType.set(type)
    this.showConfirmDialog.set(true)
  }

  public async deleteClient(): Promise<void> {
    this.dialogLoading.set(true)
    try {
      await this.authService.deleteClient(this.sharedService.dialogClient().id)
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Client (${this.sharedService.dialogClient().name}) has been deleted.`,
        key: 'br',
        life: 4000,
      })
      this.dialogLoading.set(false)
      this.showConfirmDialog.set(false)
    } catch (err) {
      console.log(err)
      this.dialogLoading.set(false)
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'There was an error deleting a client.',
        key: 'br',
        life: 4000,
      })
    }
  }

  public async triggerContactForm(data: ClientFormData) {
    this.dialogLoading.set(true)

    try {
      await this.authService.addContactToClient(data.formData, this.sharedService.dialogClient().id)

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Contact has been added to the client!',
        key: 'br',
        life: 4000
      })
      
      this.contactFormDialog.resetForm()
      this.dialogLoading.set(false)
      this.showContactFormDialog.set(false)
    } catch (err) {
      this.dialogLoading.set(false)
      console.log(err)
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'There was an error adding a contact. Try again.',
        key: 'br',
        life: 4000,
      })
    }
  }
}
