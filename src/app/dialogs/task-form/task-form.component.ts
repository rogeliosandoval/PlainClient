import { Component, EventEmitter, Input, Output } from '@angular/core'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { DialogModule } from 'primeng/dialog'
import { ProgressSpinnerModule } from 'primeng/progressspinner'
import { ButtonModule } from 'primeng/button'
import { InputTextModule } from 'primeng/inputtext'

@Component({
  selector: 'tcd-task-form',
  standalone: true,
  imports: [
    DialogModule,
    FormsModule,
    ReactiveFormsModule,
    ProgressSpinnerModule,
    ButtonModule,
    InputTextModule
  ],
  templateUrl: './task-form.component.html',
  styleUrl: './task-form.component.scss'
})

export class TaskFormDialog {
  @Input() type: string = ''
  @Input() showTaskFormDialog: boolean = false
  @Input() dialogLoading: boolean = false
  @Output() onClose = new EventEmitter<boolean>()
  @Output() onSubmit = new EventEmitter<any>()
  public taskForm = new FormGroup({
    name: new FormControl('', Validators.required)
  })

  public resetForm(): void {
    // this.contactForm.reset()
  }

  public editCheck(): void {
    // if (this.type === 'edit') {
    //   this.contactForm.get('contact_name')?.setValue(this.selectedContact?.name || null)
    //   this.contactForm.get('contact_email')?.setValue(this.selectedContact?.email || null)
    //   this.contactForm.get('contact_position')?.setValue(this.selectedContact?.position || null)
    //   this.contactForm.get('contact_phone')?.setValue(this.selectedContact?.phone || null)
    // }
  }

  public closeDialog() {
    this.showTaskFormDialog = false
    this.onClose.emit(false)
  }

  public submitDialog(type: string): void {
    // const data = {
    //   formData: this.contactForm.value,
    //   type
    // }
    // this.onSubmit.emit(data)
  }
}