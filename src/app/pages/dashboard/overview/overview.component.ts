import { Component, computed, inject, OnInit, signal, AfterViewInit, effect, DestroyRef } from '@angular/core'
import { SharedService } from '../../../services/shared.service'
import { AuthService } from '../../../services/auth.service'
import { CurrencyPipe } from '@angular/common'
import { MenuItem } from 'primeng/api'
import { MenuModule } from 'primeng/menu'
import { TruncatePipe } from '../../../pipes/truncate.pipe'
import { Chart } from 'chart.js/auto'
import { doc, setDoc, Firestore } from '@angular/fire/firestore'

@Component({
  selector: 'tc-overview',
  standalone: true,
  imports: [
    CurrencyPipe,
    MenuModule,
    TruncatePipe
  ],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss'
})

export class Overview implements OnInit, AfterViewInit {
  public firestore = inject(Firestore)
  public sharedService = inject(SharedService)
  public authService = inject(AuthService)
  public showBusinessProfit = signal<boolean>(true)
  public profitOptions: MenuItem[] | undefined
  private chart: Chart | null = null
  private destroyRef = inject(DestroyRef)

  constructor() {
    // ✅ effect is created in injection context here
    effect(
      () => {
        const isDark = this.sharedService.darkMode() // ✅ signal read here

        // If chart isn't created yet, just exit (effect will run again later)
        if (!this.chart) return

        // Update theme-dependent stuff
        this.chart.options = this.getChartOptions(isDark)
        this.chart.data.datasets = this.getDatasets(isDark)
        this.chart.update()
      },
      { allowSignalWrites: true } // optional; harmless in most cases
    )
  }

  ngAfterViewInit(): void {
    // Create chart once
    this.chart = new Chart('incomeExpenseChart', {
      type: 'bar',
      data: {
        labels: this.sharedService.monthLabels,
        datasets: this.getDatasets(this.sharedService.darkMode())
      },
      options: this.getChartOptions(this.sharedService.darkMode())
    })

    // Cleanup
    this.destroyRef.onDestroy(() => {
      this.chart?.destroy()
      this.chart = null
    })
  }

  async ngOnInit(): Promise<void> {
    // await this.addIncomeExpenseToArray()
    await this.authService.loadMonthlyIncomeExpenseArrays()
    this.refreshChart()
    // this.profitOptions = [
    //   {
    //     label: 'Toggle Type',
    //     icon: 'pi pi-money',
    //     command: () => {
    //       this.showBusinessProfit.set(!this.showBusinessProfit())
    //     }
    //   }
    // ]
  }

  private refreshChart(): void {
    if (!this.chart) return

    this.chart.data.labels = this.sharedService.monthLabels
    this.chart.data.datasets = this.getDatasets(this.sharedService.darkMode())
    this.chart.update()
  }

  private getChartOptions(isDark: boolean) {
    const textColor = isDark ? '#ffffff' : '#000000'
    const gridColor = isDark ? '#454545ff' : '#e5e5e5'

    return {
      plugins: {
        title: {
          display: true,
          text: 'Personal Income/Expense Per Month',
          color: textColor
        },
        legend: {
          labels: {
            color: textColor
          }
        }
      },
      scales: {
        x: {
          ticks: { color: textColor },
          grid: { color: gridColor }
        },
        y: {
          ticks: { color: textColor },
          grid: { color: gridColor }
        }
      }
    }
  }

  private getDatasets(isDark: boolean) {
    return [
      {
        label: 'Income',
        data: this.sharedService.personalIncomeMonthArray,
        backgroundColor: isDark ? '#35a640ff' : '#22c55e'
      },
      {
        label: 'Expenses',
        data: this.sharedService.personalExpenseMonthArray,
        backgroundColor: isDark ? '#c74c4cff' : '#d73d3dff'
      }
    ]
  }

  public async addIncomeExpenseToArray(): Promise<void> {
    const uid = this.authService.coreUserData()?.uid
    if (!uid) return

    const currentMonth = new Date().toLocaleDateString('default', { month: 'long', year: 'numeric' })
    const cashRef = doc(this.firestore, `users/${uid}/monthlyProfits/${currentMonth}`)

    const newCashFlow = {
      month: currentMonth,
      income: Number(this.totalPersonalIncome().toFixed(2)),
      expense: Number(this.totalPersonalExpenses().toFixed(2)),
      updatedAt: new Date().toISOString()
    }

    await setDoc(cashRef, newCashFlow, { merge: true }).catch(err => console.error(err))
  }

  public parseAmount(amountStr: string): number {
    const normalized = amountStr.replace(/,/g, '')
    const num = parseFloat(normalized)
    return isNaN(num) ? 0 : num
  }

  public totalBusinessProfit = computed(() => {
    const profits = this.sharedService.businessProfits()
    return profits.reduce((acc, p) => {
      const amt = this.parseAmount(p.amount)
      return p.profitType === 'Income' ? acc + amt : acc - amt
    }, 0)
  })

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

  getMostRecentIncompleteBusinessTask() {
    const tasks = this.sharedService.businessTasks() || []
    if (!tasks.length) return null

    const incompleteTasks = tasks.filter(t => !t.completed)
    if (!incompleteTasks.length) return null

    return incompleteTasks.reduce((latest, current) =>
      current.createdAt > latest.createdAt ? current : latest
    )
  }

  getMostRecentIncompletePersonalTask() {
    const tasks = this.sharedService.personalTasks() || []
    if (!tasks.length) return null

    const incompleteTasks = tasks.filter(t => !t.completed)
    if (!incompleteTasks.length) return null

    return incompleteTasks.reduce((latest, current) =>
      current.createdAt > latest.createdAt ? current : latest
    )
  }
}
