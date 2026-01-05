import { Component, EventEmitter, Input, OnInit, Output, inject, input } from '@angular/core'
import { DialogModule } from 'primeng/dialog'
import { ButtonModule } from 'primeng/button'
import { ProgressSpinnerModule } from 'primeng/progressspinner'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { IconFieldModule } from 'primeng/iconfield'
import { InputTextModule } from 'primeng/inputtext'
import { SharedService } from '../../services/shared.service'

@Component({
  selector: 'tcd-startup-form',
  standalone: true,
  imports: [
    DialogModule,
    ButtonModule,
    ProgressSpinnerModule,
    FormsModule,
    ReactiveFormsModule,
    IconFieldModule,
    InputTextModule
  ],
  templateUrl: './startup-form.component.html',
  styleUrl: './startup-form.component.scss'
})

export class StartupFormDialog {
  @Input() showStartupFormDialog = false
  @Output() onClose = new EventEmitter<boolean>()
  @Output() onSubmit = new EventEmitter<any | null>()
  public sharedService = inject(SharedService)
  public dialogLoading = input<boolean>()
  public startupForm = new FormGroup({
    business_name: new FormControl('', Validators.required)
  })

  public resetForm(): void {
    this.startupForm.reset()
  }

  public closeDialog() {
    this.showStartupFormDialog = false
    this.onClose.emit(false)
  }

  public submitDialog(type: string): void {
    const businessName = this.startupForm.get('business_name')?.value
    const data = {
      businessName,
      type
    }
    this.onSubmit.emit(data)
  }
}