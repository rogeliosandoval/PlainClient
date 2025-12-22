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

@Component({
  selector: 'tc-task-manager',
  standalone: true,
  imports: [
    ButtonModule,
    TaskFormDialog,
    TabMenuModule,
    MenuModule
  ],
  templateUrl: './task-manager.component.html',
  styleUrl: './task-manager.component.scss'
})

export class TaskManager implements OnInit {
  @ViewChild('taskFormDialog') taskFormDialog!: TaskFormDialog
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

        }
      },
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        command: () => {

        }
      }
    ]
  }

  public onDialogClose(newState: boolean) {
    this.showTaskFormDialog.set(newState)
  }

  public test(): void {
    console.log(this.sharedService.businessTasks())
  }

  public async triggerTaskForm(data: StandardFormData): Promise<void> {
    this.dialogLoading.set(true)

    if (this.databaseType() === 'business') {
      // Business Logic
      if (data.type === 'edit') {
        console.log('test')
      } else {
        try {
          await this.authService.addBusinessTask(data.formData)
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
    } else {
      // Personal Logic
    }
  }
}
