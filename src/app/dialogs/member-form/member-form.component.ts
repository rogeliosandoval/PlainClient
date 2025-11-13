import { Component, EventEmitter, inject, input, Input, Output, signal } from '@angular/core'
import { DialogModule } from 'primeng/dialog'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { InputTextModule } from 'primeng/inputtext'
import { SharedService } from '../../services/shared.service'
import { ButtonModule } from 'primeng/button'
import { PhoneNumberDirective } from '../../directives/phone-number.directive'
import { ProgressSpinnerModule } from 'primeng/progressspinner'

@Component({
  selector: 'tcd-member-form',
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
  templateUrl: './member-form.component.html',
  styleUrl: './member-form.component.scss'
})

export class MemberFormDialog {
  @Input() type: string = ''
  @Input() showMemberFormDialog: boolean = false
  @Output() onClose = new EventEmitter<boolean>()
  @Output() onSubmit = new EventEmitter<any>()
  public dialogLoading = input<boolean>()
  public sharedService = inject(SharedService)
  public fillingForm = signal<boolean>(true)
  public memberForm = new FormGroup({
    member_name: new FormControl('', Validators.required),
    member_position: new FormControl(''),
    member_email: new FormControl('', Validators.email),
    member_phone: new FormControl('')
  })

  public closeDialog() {
    this.showMemberFormDialog = false
    this.onClose.emit(false)
  }

  public submitDialog(type: string): void {
    const data = {
      formData: this.memberForm.value,
      type
    }
    this.onSubmit.emit(data)
  }
}