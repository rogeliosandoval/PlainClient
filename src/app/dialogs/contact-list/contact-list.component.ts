import { Component, EventEmitter, Input, OnInit, Output, inject, input, signal } from '@angular/core'
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
    // MessageService
  ],
  providers: [ConfirmationService],
  templateUrl: './contact-list.component.html',
  styleUrl: './contact-list.component.scss'
})

export class ContactListDialog implements OnInit {
  @Input() showContactListDialog = false
  @Output() onClose = new EventEmitter<boolean>()
  @Output() onSubmit = new EventEmitter<any>()
  public messageService = inject(MessageService)
  public confirmationService = inject(ConfirmationService)
  public sharedService = inject(SharedService)
  public authService = inject(AuthService)
  public dialogLoading = input<boolean>()
  public contactOptions: MenuItem[] | undefined
  public deletingContact = signal<boolean>(false)
  public selectedContact: Contact | null = null

  ngOnInit(): void {
    this.contactOptions = [
      {
        label: 'Edit Contact',
        icon: 'pi pi-pencil',
        command: () => {

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
            },
            reject: () => {
              // this.messageService.add({ severity: 'error', summary: 'Rejected', detail: 'You have rejected', life: 3000 });
            }
          })
        }
      }
    ]
  }

  public async deleteContact(): Promise<void> {
    this.deletingContact.set(true)
    try {
      await this.authService.deleteContactToClient(this.sharedService.dialogClient().id, this.selectedContact?.id as string)
  
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Contact has been deleted.',
        key: 'br',
        life: 4000
      })
      this.deletingContact.set(false)
      this.showContactListDialog = false
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'There was an error deleting contact. Try again.',
        key: 'br',
        life: 4000,
      })
      this.deletingContact.set(false)
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