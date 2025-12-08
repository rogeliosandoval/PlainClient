import { Component, inject, Input, OnInit, signal, ViewChild } from '@angular/core'
import { AuthService } from '../../../services/auth.service'
import { ButtonModule } from 'primeng/button'
import { MessageService } from 'primeng/api'
import { TabMenuModule } from 'primeng/tabmenu'
import { MenuItem } from 'primeng/api'
import { MenuModule } from 'primeng/menu'
import { ProfitFormDialog } from '../../../dialogs/profit-form/profit-form.component'
import { StandardFormData } from '../../../interfaces/other.interface'
import { SharedService } from '../../../services/shared.service'

@Component({
  selector: 'tc-profits',
  standalone: true,
  imports: [
    ButtonModule,
    TabMenuModule,
    ProfitFormDialog,
    MenuModule
  ],
  templateUrl: './profits.component.html',
  styleUrl: './profits.component.scss'
})
export class Profits implements OnInit {
  @ViewChild('profitFormDialog') profitFormDialog!: ProfitFormDialog
  @Input() dialogLoading: boolean = true
  public sharedService = inject(SharedService)
  public authService = inject(AuthService)
  public messageService = inject(MessageService)
  public items: MenuItem[] | undefined
  public activeItem: any
  public showBusinessProfits = signal<boolean>(false)
  // public showPersonalProfits = signal<boolean>(false)
  public showProfitFormDialog = signal<boolean>(false)
  public logicType = signal<string>('')
  public databaseType = signal<string>('')
  public profitOptions: MenuItem[] | undefined
  public profitItemData: any
  
  ngOnInit(): void {
    this.items = [
      { 
        label: 'Business',
        icon: 'pi pi-briefcase',
        command: () => {
          this.showBusinessProfits.set(true)
        }
      },
      {
        label: 'Personal',
        icon: 'pi pi-user',
        command: () => {
          this.showBusinessProfits.set(false)
        }
      }
    ]
    this.activeItem = this.items[0]
    this.profitOptions = [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => {
          this.logicType.set('edit'); this.showProfitFormDialog.set(true)
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

  public ness(): void {
    console.log(this.sharedService.userProfits())
  }

  public onDialogClose(newState: boolean) {
    this.showProfitFormDialog.set(newState)
    this.profitFormDialog.resetForm()
  }

  async triggerProfitForm(data: StandardFormData) {
    if (this.logicType() === 'edit') {
      try {
        this.dialogLoading = true
  
        await this.authService.editProfit(data.id as string, data.formData)
  
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Profit item updated!',
          key: 'br',
          life: 4000
        })
  
        this.profitFormDialog.resetForm()
        this.dialogLoading = false
        this.showProfitFormDialog.set(false)
      } catch (err) {
        this.dialogLoading = false
        console.log(err)
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'There was an error updating the profit item. Try again.',
          key: 'br',
          life: 4000
        })
      }
    } else {
      try {
        this.dialogLoading = true
  
        await this.authService.addProfit(data.formData)
  
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Profit item added!',
          key: 'br',
          life: 4000
        })
  
        this.profitFormDialog.resetForm()
        this.dialogLoading = false
        this.showProfitFormDialog.set(false)
  
      } catch (err) {
        this.dialogLoading = false
        console.log(err)
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'There was an error adding the profit item. Try again.',
          key: 'br',
          life: 4000
        })
      }
    }
  }
}
