import { Component, EventEmitter, Input, OnInit, Output, inject, input, signal } from '@angular/core'
import { DialogModule } from 'primeng/dialog'
import { ButtonModule } from 'primeng/button'
import { ProgressSpinnerModule } from 'primeng/progressspinner'
import { SharedService } from '../../services/shared.service'
import { MenuItem } from 'primeng/api'
import { MenuModule } from 'primeng/menu'

@Component({
  selector: 'tcd-contact-list',
  standalone: true,
  imports: [
    DialogModule,
    ButtonModule,
    ProgressSpinnerModule,
    MenuModule
  ],
  templateUrl: './contact-list.component.html',
  styleUrl: './contact-list.component.scss'
})

export class ContactListDialog implements OnInit {
  @Input() showContactListDialog = false
  @Output() onClose = new EventEmitter<boolean>()
  @Output() onSubmit = new EventEmitter<any>()
  public sharedService = inject(SharedService)
  public dialogLoading = input<boolean>()
  public contactOptions: MenuItem[] | undefined

  ngOnInit(): void {
    this.contactOptions =  [
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

        }
      }
    ]
  }

  public closeDialog() {
    this.showContactListDialog = false
    this.onClose.emit(false)
  }

  public submitDialog(): void {
    this.onSubmit.emit(true)
  }
}