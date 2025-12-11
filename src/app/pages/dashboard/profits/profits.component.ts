import { Component, computed, inject, Input, OnInit, signal, ViewChild } from '@angular/core'
import { AuthService } from '../../../services/auth.service'
import { ButtonModule } from 'primeng/button'
import { MessageService } from 'primeng/api'
import { TabMenuModule } from 'primeng/tabmenu'
import { MenuItem } from 'primeng/api'
import { MenuModule } from 'primeng/menu'
import { ProfitFormDialog } from '../../../dialogs/profit-form/profit-form.component'
import { StandardFormData } from '../../../interfaces/other.interface'
import { SharedService } from '../../../services/shared.service'
import { ConfirmDialogModule } from 'primeng/confirmdialog'
import { ConfirmationService } from 'primeng/api'
import { CurrencyPipe } from '@angular/common'

@Component({
  selector: 'tc-profits',
  standalone: true,
  imports: [
    ButtonModule,
    TabMenuModule,
    ProfitFormDialog,
    MenuModule,
    ConfirmDialogModule,
    CurrencyPipe
  ],
  providers: [ConfirmationService],
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
  public showBusinessProfits = signal<boolean>(true)
  // public showPersonalProfits = signal<boolean>(false)
  public showProfitFormDialog = signal<boolean>(false)
  public logicType = signal<string>('')
  public databaseType = signal<string>('')
  public profitOptions: MenuItem[] | undefined
  public filterOptions: MenuItem[] | undefined
  public profitItemData: any
  public confirmationService = inject(ConfirmationService)
  public filteredUserProfits = signal<any[]>([])
  public filterLabel = signal<string>('Order')
  
  ngOnInit(): void {
    this.filteredUserProfits.set(this.sharedService.getSortedProfits())
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
    this.filterOptions = [
      {
        label: 'Default',
        icon: 'pi pi-sort-alt',
        command: () => {
          this.filterUserProfitItems('')
        }
      },
      {
        label: 'A-Z',
        icon: 'pi pi-sort-alpha-down',
        command: () => {
          this.filterUserProfitItems('a-z')
        }
      },
      {
        label: 'Z-A',
        icon: 'pi pi-sort-alpha-down-alt',
        command: () => {
          this.filterUserProfitItems('z-a')
        }
      },
      {
        label: 'Income/Expense',
        icon: 'pi pi-sort-amount-down',
        command: () => {
          this.filterUserProfitItems('income')
        }
      },
      {
        label: 'Expense/Income',
        icon: 'pi pi-sort-amount-down-alt',
        command: () => {
          this.filterUserProfitItems('expense')
        }
      }
    ]
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
          this.confirmationService.confirm({
            message: 'Are you sure you want to delete this item?',
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptIcon: 'none',
            rejectIcon: 'none',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => {
              this.triggerDeleteProfit(this.profitItemData.id)
            }
          })
        }
      }
    ]
  }

  public onDialogClose(newState: boolean) {
    this.showProfitFormDialog.set(newState)
    this.profitFormDialog.resetForm()
  }

  public filterUserProfitItems(value: string): void {
    const profits = this.sharedService.getSortedProfits()

    switch(value) {

      case 'a-z':
        this.filterLabel.set('A-Z')
        this.filteredUserProfits.set(
          [...profits].sort((a, b) => a.name.localeCompare(b.name))
        )
        break

      case 'z-a':
        this.filterLabel.set('Z-A')
        this.filteredUserProfits.set(
          [...profits].sort((a, b) => b.name.localeCompare(a.name))
        )
        break

      case 'income':
        this.filterLabel.set('Income/Expense')
        this.filteredUserProfits.set(
          [...profits].sort((a, b) => {
            if (a.profitType === b.profitType) return 0
            return a.profitType === 'Income' ? -1 : 1
          })
        )
        break

      case 'expense':
        this.filterLabel.set('Expense/Income')
        this.filteredUserProfits.set(
          [...profits].sort((a, b) => {
            if (a.profitType === b.profitType) return 0
            return a.profitType === 'Expense' ? -1 : 1
          })
        )
        break

      default:
        // Back to original sorted-by-date order
        this.filterLabel.set('Default')
        this.filteredUserProfits.set(profits)
        break
    }
  }

  public parseAmount(amountStr: string): number {
    const normalized = amountStr.replace(/,/g, '')
    const num = parseFloat(normalized)
    return isNaN(num) ? 0 : num
  }
  
  public totalProfit = computed(() => {
    const profits = this.sharedService.userProfits()
    return profits.reduce((acc, p) => {
      const amt = this.parseAmount(p.amount)
      return p.profitType === 'Income' ? acc + amt : acc - amt
    }, 0)
  })

  public totalIncome = computed(() => {
    const profits = this.sharedService.userProfits()
    return profits
      .filter(p => p.profitType === 'Income')
      .reduce((sum, p) => sum + this.parseAmount(p.amount), 0)
  })

  public totalExpenses = computed(() => {
    const profits = this.sharedService.userProfits()
    return profits
      .filter(p => p.profitType === 'Expense')
      .reduce((sum, p) => sum + this.parseAmount(p.amount), 0)
  })  

  async triggerProfitForm(data: StandardFormData) {
    if (this.logicType() === 'edit') {
      try {
        this.dialogLoading = true
  
        await this.authService.editProfit(data.id as string, data.formData)
  
        this.messageService.add({
          severity: 'success',
          detail: 'Profit item updated!',
          key: 'bc',
          life: 2000
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
          key: 'bc',
          life: 4000
        })
      }
    } else {
      try {
        this.dialogLoading = true
  
        await this.authService.addProfit(data.formData)
  
        this.messageService.add({
          severity: 'success',
          detail: 'Profit item added!',
          key: 'bc',
          life: 2000
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
          key: 'bc',
          life: 4000
        })
      }
    }
  }

  async triggerDeleteProfit(profitId: string) {
    this.dialogLoading = true

    try {
      await this.authService.deleteProfit(profitId)
  
      this.messageService.add({
        severity: 'error',
        detail: 'Profit removed.',
        key: 'bc',
        life: 4000
      })
  
    } catch (err) {
      console.log(err)
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'There was an error deleting the profit. Try again.',
        key: 'bc',
        life: 4000
      })
    }
  }  
}
