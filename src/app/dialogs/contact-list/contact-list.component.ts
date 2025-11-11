import { Component, EventEmitter, Input, OnInit, Output, ViewChild, inject, input, signal } from '@angular/core'
import { DialogModule } from 'primeng/dialog'
import { ButtonModule } from 'primeng/button'
import { ProgressSpinnerModule } from 'primeng/progressspinner'
import { SharedService } from '../../services/shared.service'
import { AuthService } from '../../services/auth.service'
import { MenuItem } from 'primeng/api'
import { MenuModule } from 'primeng/menu'
import { ConfirmDialogModule } from 'primeng/confirmdialog'
import { ConfirmationService } from 'primeng/api'
import { Contact } from '../../interfaces/user.interface'
import { TruncatePipe } from '../../pipes/truncate.pipe'
import { TooltipModule } from 'primeng/tooltip'
import { UnformatPhonePipe } from '../../pipes/unformat-phone.pipe'
import { MessageService } from 'primeng/api'
import { ContactFormDialog } from '../../dialogs/contact-form/contact-form.component'
import { ClientFormData } from '../../interfaces/other.interface'

@Component({
  selector: 'tcd-contact-list',
  standalone: true,
  imports: [
    DialogModule,
    ButtonModule,
    ProgressSpinnerModule,
    MenuModule,
    ConfirmDialogModule,
    TruncatePipe,
    TooltipModule,
    UnformatPhonePipe,
    ContactFormDialog
  ],
  providers: [ConfirmationService],
  templateUrl: './contact-list.component.html',
  styleUrl: './contact-list.component.scss'
})

export class ContactListDialog implements OnInit {
  @ViewChild('contactFormDialog') contactFormDialog!: ContactFormDialog
  @Input() showContactListDialog: boolean = false
  @Input() dialogLoading: boolean = false
  @Output() onClose = new EventEmitter<boolean>()
  @Output() onSubmit = new EventEmitter<any>()
  public messageService = inject(MessageService)
  public confirmationService = inject(ConfirmationService)
  public sharedService = inject(SharedService)
  public authService = inject(AuthService)
  public contactOptions: MenuItem[] | undefined
  public selectedContact: Contact | null = null
  public showContactFormDialog = signal<boolean>(false)

  ngOnInit(): void {
    this.contactOptions = [
      {
        label: 'Edit Contact',
        icon: 'pi pi-pencil',
        command: () => {
          this.showContactFormDialog.set(true)
        }
      },
      {
        label: 'Send Email',
        icon: 'pi pi-envelope'
      },
      {
        label: 'Delete Contact',
        icon: 'pi pi-trash',
        command: () => {
          this.confirmationService.confirm({
            message: 'Are you sure that you want to delete this contact?',
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptIcon: 'none',
            rejectIcon: 'none',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => {
              this.deleteContact()
            }
          })
        }
      }
    ]
  }

  get sortedContacts() {
    const contacts = this.sharedService.dialogClient()?.contacts || []
    return [...contacts].sort((a, b) => a.name.localeCompare(b.name))
  }

  public onDialogClose(newState: boolean) {
    this.showContactFormDialog.set(newState)
    this.contactFormDialog.resetForm()
  }

  public async triggerContactForm(data: ClientFormData) {
    this.dialogLoading = true

    try {
      await this.authService.editContactForClient(this.sharedService.dialogClient().id, this.selectedContact?.id as string, data.formData)

      await this.authService.fetchClientDataById(this.sharedService.dialogClient().id)
      this.sharedService.dialogClient.set(this.authService.dialogClient())

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Contact has been updated!',
        key: 'br',
        life: 4000
      })
      
      this.contactFormDialog.resetForm()
      this.dialogLoading = false
      this.showContactFormDialog.set(false)
    } catch (err) {
      this.dialogLoading = false
      console.log(err)
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'There was an error updating the contact. Try again.',
        key: 'br',
        life: 4000,
      })
    }
  }

  public async deleteContact(): Promise<void> {
    this.dialogLoading = true

    try {
      await this.authService.deleteContactToClient(this.sharedService.dialogClient().id, this.selectedContact?.id as string)
  
      await this.authService.fetchClientDataById(this.sharedService.dialogClient().id)
      
      this.sharedService.dialogClient.set(this.authService.dialogClient())

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Contact has been deleted.',
        key: 'br',
        life: 4000
      })
      this.dialogLoading = false
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'There was an error deleting contact. Try again.',
        key: 'br',
        life: 4000,
      })
      this.dialogLoading = false
    }
  }

  public closeDialog() {
    this.showContactListDialog = false
    this.onClose.emit(false)
  }

  public submitDialog(): void {
    this.onSubmit.emit(true)
  }
}