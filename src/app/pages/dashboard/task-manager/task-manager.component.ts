import { Component, inject, signal, ViewChild } from '@angular/core'
import { SharedService } from '../../../services/shared.service'
import { AuthService } from '../../../services/auth.service'
import { ButtonModule } from 'primeng/button'
import { TaskFormDialog } from '../../../dialogs/task-form/task-form.component'

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
  public sharedService = inject(SharedService)
  public authService = inject(AuthService)
  public showTaskFormDialog = signal<boolean>(false)
  public dialogLoading = signal<boolean>(false)

  public onDialogClose(newState: boolean) {
    this.showTaskFormDialog.set(newState)
  }
}
