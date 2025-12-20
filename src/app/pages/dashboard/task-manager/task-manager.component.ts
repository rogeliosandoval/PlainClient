import { Component, inject, signal, ViewChild } from '@angular/core'
import { SharedService } from '../../../services/shared.service'
import { AuthService } from '../../../services/auth.service'
import { ButtonModule } from 'primeng/button'
import { TaskFormDialog } from '../../../dialogs/task-form/task-form.component'
import { MessageService } from 'primeng/api'
import { StandardFormData } from '../../../interfaces/other.interface'

@Component({
  selector: 'tc-task-manager',
  standalone: true,
  imports: [
    ButtonModule,
    TaskFormDialog
  ],
  templateUrl: './task-manager.component.html',
  styleUrl: './task-manager.component.scss'
})

export class TaskManager {
  @ViewChild('taskFormDialog') taskFormDialog!: TaskFormDialog
  public messageService = inject(MessageService)
  public sharedService = inject(SharedService)
  public authService = inject(AuthService)
  public showTaskFormDialog = signal<boolean>(false)
  public dialogLoading = signal<boolean>(false)

  public onDialogClose(newState: boolean) {
    this.showTaskFormDialog.set(newState)
  }

  public async triggerTaskForm(data: StandardFormData): Promise<void> {
    this.dialogLoading.set(true)

    if (data.type === 'edit') {
      console.log('test')
    } else {
      try {
        await this.authService.addTask(data.formData)
        this.showTaskFormDialog.set(false)
        this.dialogLoading.set(false)
        this.messageService.add({
          severity: 'success',
          detail: 'Task added!',
          key: 'bc',
          life: 2000
        })
      } catch (err) {
        this.dialogLoading.set(false)
        console.log(err)
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'There was an error adding the task. Try again.',
          key: 'bc',
          life: 4000
        })
      }
    }
  }
}
