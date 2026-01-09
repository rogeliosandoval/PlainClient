import { Component, computed, inject, OnInit, signal, AfterViewInit, effect, DestroyRef } from '@angular/core'
import { SharedService } from '../../../services/shared.service'
import { AuthService } from '../../../services/auth.service'
import { CurrencyPipe } from '@angular/common'
import { MenuItem } from 'primeng/api'
import { MenuModule } from 'primeng/menu'
import { TruncatePipe } from '../../../pipes/truncate.pipe'
import { Chart } from 'chart.js/auto'

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
        labels: ['Jan', 'Feb', 'Mar', 'Apr'],
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

  ngOnInit(): void {
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

  private getChartOptions(isDark: boolean) {
    const textColor = isDark ? '#ffffff' : '#000000'
    const gridColor = isDark ? '#454545ff' : '#e5e5e5'

    return {
      plugins: {
        title: {
          display: true,
          text: 'Income/Expense Chart Per Month',
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
        data: [2000, 1500, 1700, 1800],
        backgroundColor: isDark ? '#35a640ff' : '#22c55e'
      },
      {
        label: 'Expenses',
        data: [1000, 1200, 1600, 400],
        backgroundColor: isDark ? '#c74c4cff' : '#d73d3dff'
      }
    ]
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
