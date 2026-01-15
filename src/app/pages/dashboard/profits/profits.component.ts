import { Component, computed, ElementRef, inject, Input, OnInit, signal, ViewChild } from '@angular/core'
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
import { CheckboxModule } from 'primeng/checkbox'
import { FormsModule } from '@angular/forms'

@Component({
  selector: 'tc-profits',
  standalone: true,
  imports: [
    ButtonModule,
    TabMenuModule,
    ProfitFormDialog,
    MenuModule,
    ConfirmDialogModule,
    CurrencyPipe,
    CheckboxModule,
    FormsModule
  ],
  providers: [ConfirmationService],
  templateUrl: './profits.component.html',
  styleUrl: './profits.component.scss'
})

export class Profits implements OnInit {
  @ViewChild('profitsScroll') profitsScroll!: ElementRef<HTMLElement>
  @ViewChild('profitSummary') profitSummary!: ElementRef<HTMLElement>
  @ViewChild('profitFormDialog') profitFormDialog!: ProfitFormDialog
  @Input() dialogLoading: boolean = true
  public sharedService = inject(SharedService)
  public authService = inject(AuthService)
  public messageService = inject(MessageService)
  public items: MenuItem[] | undefined
  public activeItem: any
  public showBusinessProfits = signal<boolean>(true)
  public showProfitFormDialog = signal<boolean>(false)
  public logicType = signal<string>('')
  public databaseType = signal<string>('business')
  public profitOptions: MenuItem[] | undefined
  public filterOptions: MenuItem[] | undefined
  public profitItemData: any
  public confirmationService = inject(ConfirmationService)
  public filteredPersonalProfits = signal<any[]>([])
  public filteredBusinessProfits = signal<any[]>([])
  public filterPersonalLabel = signal<string>('Oldest/Newest')
  public filterBusinessLabel = signal<string>('Oldest/Newest')
  public selectingProfits = signal<boolean>(false)
  public selectedProfitIds: string[] = []
  private summaryTriggered = false

  // onScroll(): void {
  //   if (!this.profitsScroll || !this.profitSummary) return

  //   const container = this.profitsScroll.nativeElement
  //   const target = this.profitSummary.nativeElement

  //   const containerRect = container.getBoundingClientRect()
  //   const targetRect = target.getBoundingClientRect()

  //   // check if target is visible within container viewport
  //   const isInView =
  //     targetRect.top < containerRect.bottom &&
  //     targetRect.bottom > containerRect.top

  //   if (isInView && !this.summaryTriggered) {
  //     this.summaryTriggered = true
  //     console.log('profitSummary is in view ✅')
  //     // do your thing here (animate, load, etc)
  //   }

  //   // optional: reset when it leaves view so it can trigger again
  //   if (!isInView) this.summaryTriggered = false
  // }
  
  ngOnInit(): void {
    this.sharedService.showProfitOverlay.set(true)
    this.filteredPersonalProfits.set(this.sharedService.getSortedPersonalProfits())
    this.filteredBusinessProfits.set(this.sharedService.getSortedBusinessProfits())
    this.items = [
      { 
        label: 'Business',
        icon: 'pi pi-briefcase',
        command: () => {
          this.databaseType.set('business')
          this.showBusinessProfits.set(true)
          this.selectingProfits.set(false)
          this.selectedProfitIds = []
        }
      },
      {
        label: 'Personal',
        icon: 'pi pi-user',
        command: () => {
          this.databaseType.set('personal')
          this.showBusinessProfits.set(false)
          this.selectingProfits.set(false)
          this.selectedProfitIds = []
        }
      }
    ]
    this.activeItem = this.items[0]
    this.filterOptions = [
      {
        label: 'A-Z',
        icon: 'pi pi-sort-alpha-down',
        command: () => {
          if (this.databaseType() === 'business') {
            this.filterBusinessProfitItems('A-Z')
          } else {
            this.filterPersonalProfitItems('A-Z')
          }
        }
      },
      {
        label: 'Z-A',
        icon: 'pi pi-sort-alpha-down-alt',
        command: () => {
          if (this.databaseType() === 'business') {
            this.filterBusinessProfitItems('Z-A')
          } else {
            this.filterPersonalProfitItems('Z-A')
          }
        }
      },
      {
        label: 'Income/Expense',
        icon: 'pi pi-sort-amount-down',
        command: () => {
          if (this.databaseType() === 'business') {
            this.filterBusinessProfitItems('Income/Expense')
          } else {
            this.filterPersonalProfitItems('Income/Expense')
          }
        }
      },
      {
        label: 'Expense/Income',
        icon: 'pi pi-sort-amount-down-alt',
        command: () => {
          if (this.databaseType() === 'business') {
            this.filterBusinessProfitItems('Expense/Income')
          } else {
            this.filterPersonalProfitItems('Expense/Income')
          }
        }
      },
      {
        label: 'Newest/Oldest',
        icon: 'pi pi-clock',
        command: () => {
          if (this.databaseType() === 'business') {
            this.filterBusinessProfitItems('Newest/Oldest')
          } else {
            this.filterPersonalProfitItems('Newest/Oldest')
          }
        }
      },
      {
        label: 'Oldest/Newest',
        icon: 'pi pi-clock',
        command: () => {
          if (this.databaseType() === 'business') {
            this.filterBusinessProfitItems('Oldest/Newest')
          } else {
            this.filterPersonalProfitItems('Oldest/Newest')
          }
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

  public toggleProfit(id: string): void {
    if (this.selectingProfits()) {
      if (this.selectedProfitIds.includes(id)) {
        this.selectedProfitIds = this.selectedProfitIds.filter(x => x !== id)
      } else {
        this.selectedProfitIds = [...this.selectedProfitIds, id]
      }
    }
  }

  public triggerDeleteProfits(): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete these items?',
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptIcon: 'none',
      rejectIcon: 'none',
      rejectButtonStyleClass: 'p-button-text',
      accept: async () => {
        if (this.databaseType() === 'business') {
          try {
            this.sharedService.loading.set(true)
            await this.authService.deleteBusinessProfitsByIds(this.selectedProfitIds).catch(err => {
              console.log(err)
              this.sharedService.loading.set(false)
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'There was an error deleting the profits. Try again.',
                key: 'bc',
                life: 4000
              })
            })
            this.filteredBusinessProfits.set(this.sharedService.getSortedBusinessProfits())
            this.filterBusinessProfitItems(this.filterBusinessLabel())
            this.selectedProfitIds = []
            this.selectingProfits.set(false)
            this.sharedService.loading.set(false)
            this.messageService.add({
              severity: 'success',
              detail: 'Profits removed.',
              key: 'bc',
              life: 4000
            })
          } catch (err) {
            console.log(err)
            this.sharedService.loading.set(false)
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'There was an error deleting the profits. Try again.',
              key: 'bc',
              life: 4000
            })
          }
        } else {
          try {
            this.sharedService.loading.set(true)
            await this.authService.deletePersonalProfitsByIds(this.selectedProfitIds).catch(err => {
              console.log(err)
              this.sharedService.loading.set(false)
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'There was an error deleting the profits. Try again.',
                key: 'bc',
                life: 4000
              })
            })
            this.filteredPersonalProfits.set(this.sharedService.getSortedPersonalProfits())
            this.filterPersonalProfitItems(this.filterPersonalLabel())
            this.selectedProfitIds = []
            this.selectingProfits.set(false)
            this.sharedService.loading.set(false)
            this.messageService.add({
              severity: 'success',
              detail: 'Profits removed.',
              key: 'bc',
              life: 4000
            })
          } catch (err) {
            console.log(err)
            this.sharedService.loading.set(false)
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'There was an error deleting the profits. Try again.',
              key: 'bc',
              life: 4000
            })
          }
        }
      }
    })
  }

  public selectAllProfits(): void {
    if (this.databaseType() === 'business') {
      this.selectedProfitIds = [
        ...new Set(this.filteredBusinessProfits().map(item => item.id))
      ]
    } else {
      this.selectedProfitIds = [
        ...new Set(this.filteredPersonalProfits().map(item => item.id))
      ]
    }
  }

  public onDialogClose(newState: boolean) {
    this.showProfitFormDialog.set(newState)
    this.profitFormDialog.resetForm()
  }

  public filterPersonalProfitItems(value: string): void {
    const profits = this.sharedService.getSortedPersonalProfits()

    switch(value) {

      case 'A-Z':
        this.filterPersonalLabel.set('A-Z')
        this.filteredPersonalProfits.set(
          [...profits].sort((a, b) => a.name.localeCompare(b.name))
        )
        break

      case 'Z-A':
        this.filterPersonalLabel.set('Z-A')
        this.filteredPersonalProfits.set(
          [...profits].sort((a, b) => b.name.localeCompare(a.name))
        )
        break

      case 'Income/Expense':
        this.filterPersonalLabel.set('Income/Expense')
        this.filteredPersonalProfits.set(
          [...profits].sort((a, b) => {
            if (a.profitType === b.profitType) return 0
            return a.profitType === 'Income' ? -1 : 1
          })
        )
        break

      case 'Expense/Income':
        this.filterPersonalLabel.set('Expense/Income')
        this.filteredPersonalProfits.set(
          [...profits].sort((a, b) => {
            if (a.profitType === b.profitType) return 0
            return a.profitType === 'Expense' ? -1 : 1
          })
        )
        break

      case 'Newest/Oldest':
        this.filterPersonalLabel.set('Newest/Oldest')
        this.filteredPersonalProfits().sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        break

      case 'Oldest/Newest':
        this.filterPersonalLabel.set('Oldest/Newest')
        this.filteredPersonalProfits().sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        break
    }
  }

  public filterBusinessProfitItems(value: string): void {
    const profits = this.sharedService.getSortedBusinessProfits()

    switch(value) {

      case 'A-Z':
        this.filterBusinessLabel.set('A-Z')
        this.filteredBusinessProfits.set(
          [...profits].sort((a, b) => a.name.localeCompare(b.name))
        )
        break

      case 'Z-A':
        this.filterBusinessLabel.set('Z-A')
        this.filteredBusinessProfits.set(
          [...profits].sort((a, b) => b.name.localeCompare(a.name))
        )
        break

      case 'Income/Expense':
        this.filterBusinessLabel.set('Income/Expense')
        this.filteredBusinessProfits.set(
          [...profits].sort((a, b) => {
            if (a.profitType === b.profitType) return 0
            return a.profitType === 'Income' ? -1 : 1
          })
        )
        break

      case 'Expense/Income':
        this.filterBusinessLabel.set('Expense/Income')
        this.filteredBusinessProfits.set(
          [...profits].sort((a, b) => {
            if (a.profitType === b.profitType) return 0
            return a.profitType === 'Expense' ? -1 : 1
          })
        )
        break

      case 'Newest/Oldest':
        this.filterBusinessLabel.set('Newest/Oldest')
        this.filteredBusinessProfits().sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        break

      case 'Oldest/Newest':
        this.filterBusinessLabel.set('Oldest/Newest')
        this.filteredBusinessProfits().sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        break
    }
  }

  public parseAmount(amountStr: string): number {
    const normalized = amountStr.replace(/,/g, '')
    const num = parseFloat(normalized)
    return isNaN(num) ? 0 : num
  }
  
  // Personal Calc
  public totalPersonalProfit = computed(() => {
    const profits = this.sharedService.userProfits()
    return profits.reduce((acc, p) => {
      const amt = this.parseAmount(p.amount)
      return p.profitType === 'Income' ? acc + amt : acc - amt
    }, 0)
  })

  public totalPersonalIncome = computed(() => {
    const profits = this.sharedService.userProfits()
    return profits
      .filter(p => p.profitType === 'Income')
      .reduce((sum, p) => sum + this.parseAmount(p.amount), 0)
  })

  public totalPersonalExpenses = computed(() => {
    const profits = this.sharedService.userProfits()
    return profits
      .filter(p => p.profitType === 'Expense')
      .reduce((sum, p) => sum + this.parseAmount(p.amount), 0)
  })

  // Business Calc
  public totalBusinessProfit = computed(() => {
    const profits = this.sharedService.businessProfits()
    return profits.reduce((acc, p) => {
      const amt = this.parseAmount(p.amount)
      return p.profitType === 'Income' ? acc + amt : acc - amt
    }, 0)
  })

  public totalBusinessIncome = computed(() => {
    const profits = this.sharedService.businessProfits()
    return profits
      .filter(p => p.profitType === 'Income')
      .reduce((sum, p) => sum + this.parseAmount(p.amount), 0)
  })

  public totalBusinessExpenses = computed(() => {
    const profits = this.sharedService.businessProfits()
    return profits
      .filter(p => p.profitType === 'Expense')
      .reduce((sum, p) => sum + this.parseAmount(p.amount), 0)
  })

  async triggerProfitForm(data: StandardFormData) {
    if (this.databaseType() === 'business') {
      if (this.logicType() === 'edit') {
        try {
          this.dialogLoading = true
    
          await this.authService.editBusinessProfit(data.id as string, data.formData)
          this.filteredBusinessProfits.set(this.sharedService.getSortedBusinessProfits())
          this.filterBusinessProfitItems(this.filterBusinessLabel())
    
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
    
          await this.authService.addBusinessProfit(data.formData)
          this.filteredBusinessProfits.set(this.sharedService.getSortedBusinessProfits())
          this.filterBusinessProfitItems(this.filterBusinessLabel())
    
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
    } else {
      if (this.logicType() === 'edit') {
        try {
          this.dialogLoading = true
    
          await this.authService.editPersonalProfit(data.id as string, data.formData)
          this.filteredPersonalProfits.set(this.sharedService.getSortedPersonalProfits())
          this.filterPersonalProfitItems(this.filterPersonalLabel())
    
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
    
          await this.authService.addPersonalProfit(data.formData)
          this.filteredPersonalProfits.set(this.sharedService.getSortedPersonalProfits())
          this.filterPersonalProfitItems(this.filterPersonalLabel())
    
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
  }

  async triggerDeleteProfit(profitId: string) {
    this.sharedService.loading.set(true)

    if (this.databaseType() === 'business') {
      try {
        await this.authService.deleteBusinessProfit(profitId)
        this.filteredBusinessProfits.set(this.sharedService.getSortedBusinessProfits())
        this.filterBusinessProfitItems(this.filterBusinessLabel())
        this.sharedService.loading.set(false)
    
        this.messageService.add({
          severity: 'success',
          detail: 'Profit removed.',
          key: 'bc',
          life: 4000
        })
    
      } catch (err) {
        console.log(err)
        this.sharedService.loading.set(false)
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'There was an error deleting the profit. Try again.',
          key: 'bc',
          life: 4000
        })
      }
    } else {
      try {
        await this.authService.deletePersonalProfit(profitId)
        this.filteredPersonalProfits.set(this.sharedService.getSortedPersonalProfits())
        this.filterPersonalProfitItems(this.filterPersonalLabel())
        this.sharedService.loading.set(false)
    
        this.messageService.add({
          severity: 'success',
          detail: 'Profit removed.',
          key: 'bc',
          life: 4000
        })
      } catch (err) {
        console.log(err)
        this.sharedService.loading.set(false)
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
}
