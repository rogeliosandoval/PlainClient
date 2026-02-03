import { Component, EventEmitter, Input, Output, inject } from '@angular/core'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { DialogModule } from 'primeng/dialog'
import { ProgressSpinnerModule } from 'primeng/progressspinner'
import { ButtonModule } from 'primeng/button'
import { InputTextModule } from 'primeng/inputtext'
import { InputTextareaModule } from 'primeng/inputtextarea'
import { SharedService } from '../../services/shared.service'

@Component({
  selector: 'tcd-task-form',
  standalone: true,
  imports: [
    DialogModule,
    FormsModule,
    ReactiveFormsModule,
    ProgressSpinnerModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule
  ],
  templateUrl: './task-form.component.html',
  styleUrl: './task-form.component.scss'
})

export class TaskFormDialog {
  public sharedService = inject(SharedService)
  @Input() selectedTask: any
  @Input() type: string = ''
  @Input() showTaskFormDialog: boolean = false
  @Input() dialogLoading: boolean = false
  @Output() onClose = new EventEmitter<boolean>()
  @Output() onSubmit = new EventEmitter<any>()
  public taskForm = new FormGroup({
    name: new FormControl(''),
    task: new FormControl('', Validators.required)
  })

  public editCheck(): void {
    if (this.type === 'edit') {
      this.dialogLoading = true
      this.taskForm.get('name')?.setValue(this.selectedTask?.name || null)
      this.taskForm.get('task')?.setValue(this.selectedTask?.task || null)
      setTimeout(() => {
        this.dialogLoading = false
      }, 500)
    }
  }

  public closeDialog() {
    this.taskForm.reset()
    this.showTaskFormDialog = false
    this.onClose.emit(false)
  }

  public submitDialog(type: string): void {
    const data = {
      formData: this.taskForm.value,
      type
    }
    this.onSubmit.emit(data)
  }
}