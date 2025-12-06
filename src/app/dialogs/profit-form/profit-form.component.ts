import { Component, EventEmitter, inject, input, Input, Output, signal } from '@angular/core'
import { DialogModule } from 'primeng/dialog'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { InputTextModule } from 'primeng/inputtext'
import { SharedService } from '../../services/shared.service'
import { ButtonModule } from 'primeng/button'
import { ProgressSpinnerModule } from 'primeng/progressspinner'
import { NumbersOnlyDirective } from '../../directives/numbers-only.directive'

@Component({
  selector: 'tcd-profit-form',
  standalone: true,
  imports: [
    DialogModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    ProgressSpinnerModule,
    NumbersOnlyDirective
  ],
  templateUrl: './profit-form.component.html',
  styleUrl: './profit-form.component.scss'
})

export class ProfitFormDialog {
  @Input() databaseType: string = ''
  @Input() logicType: string = ''
  @Input() profitType: string = 'Income'
  @Input() showProfitFormDialog: boolean = false
  @Input() dialogLoading: boolean = true
  @Input() profitItemData: any
  @Output() onClose = new EventEmitter<boolean>()
  @Output() onSubmit = new EventEmitter<any>()
  public sharedService = inject(SharedService)
  public fillingForm = signal<boolean>(true)
  public profitForm = new FormGroup({
    profitType: new FormControl(''),
    name: new FormControl('', Validators.required),
    amount: new FormControl('', Validators.required),
    note: new FormControl('')
  })

  public resetForm(): void {
    this.profitForm.reset()
  }

  public editCheck(): void {
    if (this.logicType === 'edit') {
      this.dialogLoading = true
      this.profitForm.get('profitType')?.setValue(this.profitItemData?.profitType || null)
      this.profitForm.get('name')?.setValue(this.profitItemData?.name || null)
      this.profitForm.get('amount')?.setValue(this.profitItemData?.amount || null)
      this.profitForm.get('note')?.setValue(this.profitItemData?.note || null)
      setTimeout(() => {
        this.dialogLoading = false
      }, 500)
    } else {
      this.dialogLoading = false
    }
  }

  public closeDialog() {
    this.showProfitFormDialog = false
    this.onClose.emit(false)
  }

  public handleControlNumberValue(): void {
    const amountControl = this.profitForm.get('amount')
    if (amountControl) {
      let amountValue = amountControl.value
  
      // Remove commas before checking for a decimal point
      const amountWithoutCommas = amountValue!.replace(/,/g, '')
  
      // Check if value does not contain a decimal point
      if (amountWithoutCommas && amountWithoutCommas.indexOf('.') === -1) {
        // Format the value to add commas for thousands
        amountValue = amountWithoutCommas.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
        
        // Append .00 if there is no decimal point
        amountValue += '.00'
  
        // Update the form control value
        amountControl.setValue(amountValue)
      } else {
        // If a decimal point is present, format the value with commas for thousands
        amountValue = amountWithoutCommas.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
        // Update the form control value
        amountControl.setValue(amountValue)
      }
    }
  }

  public submitDialog(type: string): void {
    this.profitForm.get('profitType')?.setValue(this.profitType)
    this.handleControlNumberValue()
    const data = {
      formData: this.profitForm.value,
      type
    }
    this.onSubmit.emit(data)
  }
}