import { Component, inject, OnInit, signal, ViewChild } from '@angular/core'
import { SharedService } from '../../../services/shared.service'
import { AuthService } from '../../../services/auth.service'
import { ButtonModule } from 'primeng/button'
import { TaskFormDialog } from '../../../dialogs/task-form/task-form.component'
import { MessageService } from 'primeng/api'
import { StandardFormData } from '../../../interfaces/other.interface'
import { TabMenuModule } from 'primeng/tabmenu'
import { MenuItem } from 'primeng/api'
import { MenuModule } from 'primeng/menu'
import { InputGroupModule } from 'primeng/inputgroup'
import { InputGroupAddonModule } from 'primeng/inputgroupaddon'
import { InputTextModule } from 'primeng/inputtext'
import { ProgressSpinnerModule } from 'primeng/progressspinner'
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms'
import { ConfirmDialogModule } from 'primeng/confirmdialog'
import { ConfirmationService } from 'primeng/api'
import { DateAgoPipe } from '../../../pipes/date-ago.pipe'

@Component({
  selector: 'tc-task-manager',
  standalone: true,
  imports: [
    ButtonModule,
    TaskFormDialog,
    TabMenuModule,
    MenuModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    ProgressSpinnerModule,
    ReactiveFormsModule,
    ConfirmDialogModule,
    DateAgoPipe
  ],
  providers: [ConfirmationService],
  templateUrl: './task-manager.component.html',
  styleUrl: './task-manager.component.scss'
})

export class TaskManager implements OnInit {
  @ViewChild('taskFormDialog') taskFormDialog!: TaskFormDialog
  public confirmationService = inject(ConfirmationService)
  public messageService = inject(MessageService)
  public sharedService = inject(SharedService)
  public authService = inject(AuthService)
  public showTaskFormDialog = signal<boolean>(false)
  public dialogLoading = signal<boolean>(false)
  public items: MenuItem[] | undefined
  public activeItem: any
  public showBusinessTasks = signal<boolean>(true)
  public databaseType = signal<string>('business')
  public taskOptions: MenuItem[] | undefined
  public selectedTask: any
  public type = signal<string>('add')
  public addingTask = signal<boolean>(false)
  public taskForm = new FormGroup({
    name: new FormControl(''),
    task: new FormControl('', Validators.required)
  })

  ngOnInit(): void {
    this.items = [
      { 
        label: 'Business',
        icon: 'pi pi-briefcase',
        command: () => {
          this.showBusinessTasks.set(true)
          this.databaseType.set('business')
        }
      },
      {
        label: 'Personal',
        icon: 'pi pi-user',
        command: () => {
          this.showBusinessTasks.set(false)
          this.databaseType.set('personal')
        }
      }
    ]
    this.activeItem = this.items[0]
    this.taskOptions =[
      {
        label: 'Mark Complete',
        icon: 'pi pi-check-circle',
        command: () => {

        }
      },
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => {
          this.type.set('edit')
          this.showTaskFormDialog.set(true)
        }
      },
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        command: () => {
          this.confirmationService.confirm({
            message: 'Are you sure you want to delete this task?',
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptIcon: 'none',
            rejectIcon: 'none',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => {
              this.triggerDeleteTask()
            }
          })
        }
      }
    ]
  }

  public quickAddTask(): void {
    this.addingTask.set(true)
    this.type.set('add')
    const data = {
      formData: this.taskForm.value,
      type: this.type()
    }
    this.triggerTaskForm(data)
  }

  public onDialogClose(newState: boolean) {
    this.showTaskFormDialog.set(newState)
  }

  public async triggerTaskForm(data: StandardFormData): Promise<void> {
    this.dialogLoading.set(true)

    if (this.databaseType() === 'business') {
      // Business Logic
      if (data.type === 'edit') {
        try {
          await this.authService.editBusinessTask(this.selectedTask.id, data.formData)
          this.showTaskFormDialog.set(false)
          this.dialogLoading.set(false)
          this.taskForm.reset()
          this.messageService.add({
            severity: 'success',
            detail: 'Task updated!',
            key: 'br',
            life: 2000
          })
        } catch (err) {
          this.dialogLoading.set(false)
          console.log(err)
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'There was an error updating the task. Try again.',
            key: 'bc',
            life: 4000
          })
        }
      } else {
        try {
          await this.authService.addBusinessTask(data.formData)
          this.showTaskFormDialog.set(false)
          this.dialogLoading.set(false)
          this.addingTask.set(false)
          this.taskForm.reset()
          this.messageService.add({
            severity: 'success',
            detail: 'Task added!',
            key: 'bc',
            life: 2000
          })
        } catch (err) {
          this.dialogLoading.set(false)
          this.addingTask.set(false)
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
    } else {
      // Personal Logic
    }
  }

  public async triggerDeleteTask(): Promise<void> {
    this.dialogLoading.set(true)

    if (this.databaseType() === 'business') {
      try {
        await this.authService.deleteBusinessTask(this.selectedTask.id)
        this.dialogLoading.set(false)
        this.messageService.add({
          severity: 'success',
          detail: 'Task deleted!',
          key: 'br',
          life: 2000
        })
      } catch (err) {
        this.dialogLoading.set(false)
        console.log(err)
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'There was an error deleting the task. Try again.',
          key: 'br',
          life: 4000
        })
      }
    } else {

    }
  }
}
