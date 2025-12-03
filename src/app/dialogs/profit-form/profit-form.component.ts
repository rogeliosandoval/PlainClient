import { Component, EventEmitter, inject, input, Input, Output, signal } from '@angular/core'
import { DialogModule } from 'primeng/dialog'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { InputTextModule } from 'primeng/inputtext'
import { SharedService } from '../../services/shared.service'
import { ButtonModule } from 'primeng/button'
import { ProgressSpinnerModule } from 'primeng/progressspinner'

@Component({
  selector: 'tcd-profit-form',
  standalone: true,
  imports: [
    DialogModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    ProgressSpinnerModule
  ],
  templateUrl: './profit-form.component.html',
  styleUrl: './profit-form.component.scss'
})

export class ProfitFormDialog {
  @Input() logicType: string = ''
  @Input() profitType: string = 'Income'
  @Input() showProfitFormDialog: boolean = false
  @Input() dialogLoading: boolean = false
  @Output() onClose = new EventEmitter<boolean>()
  @Output() onSubmit = new EventEmitter<any>()
  public sharedService = inject(SharedService)
  public fillingForm = signal<boolean>(true)
  public profitForm = new FormGroup({
    profitType: new FormControl(this.profitType),
    name: new FormControl('', Validators.required),
    amount: new FormControl('', Validators.required),
    note: new FormControl('')
  })

  public resetForm(): void {
    this.profitForm.reset()
  }

  public editCheck(): void {
    if (this.logicType === 'edit') {
      // this.contactForm.get('contact_name')?.setValue(this.selectedContact?.name || null)
    }
  }

  public closeDialog() {
    this.showProfitFormDialog = false
    this.onClose.emit(false)
  }

  public submitDialog(type: string): void {
    const data = {
      formData: this.profitForm.value,
      type
    }
    console.log(data)
    // this.onSubmit.emit(data)
  }
}