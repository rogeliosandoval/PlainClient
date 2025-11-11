import { Component, EventEmitter, inject, input, Input, Output, signal } from '@angular/core'
import { DialogModule } from 'primeng/dialog'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { InputTextModule } from 'primeng/inputtext'
import { SharedService } from '../../services/shared.service'
import { ButtonModule } from 'primeng/button'
import { PhoneNumberDirective } from '../../directives/phone-number.directive'
import { ProgressSpinnerModule } from 'primeng/progressspinner'
import { Contact } from '../../interfaces/user.interface'

@Component({
  selector: 'tcd-contact-form',
  standalone: true,
  imports: [
    DialogModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    PhoneNumberDirective,
    ProgressSpinnerModule
  ],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.scss'
})

export class ContactFormDialog {
  @Input() type: string = ''
  @Input() showContactFormDialog: boolean = false
  @Input() dialogLoading: boolean = false
  @Input() selectedContact: Contact | null = null
  @Output() onClose = new EventEmitter<boolean>()
  @Output() onSubmit = new EventEmitter<any>()
  public sharedService = inject(SharedService)
  public fillingForm = signal<boolean>(true)
  public contactForm = new FormGroup({
    contact_name: new FormControl('', Validators.required),
    contact_email: new FormControl('', Validators.email),
    contact_position: new FormControl(''),
    contact_phone: new FormControl('')
  })

  public resetForm(): void {
    this.contactForm.reset()
  }

  public editCheck(): void {
    if (this.type === 'edit') {
      this.contactForm.get('contact_name')?.setValue(this.selectedContact?.name || null)
      this.contactForm.get('contact_email')?.setValue(this.selectedContact?.email || null)
      this.contactForm.get('contact_position')?.setValue(this.selectedContact?.position || null)
      this.contactForm.get('contact_phone')?.setValue(this.selectedContact?.phone || null)
    }
  }

  public closeDialog() {
    this.showContactFormDialog = false
    this.onClose.emit(false)
  }

  public submitDialog(type: string): void {
    const data = {
      formData: this.contactForm.value,
      type
    }
    this.onSubmit.emit(data)
  }
}