import { Component, computed, inject, OnInit, signal } from '@angular/core'
import { SharedService } from '../../../services/shared.service'
import { AuthService } from '../../../services/auth.service'
import { CurrencyPipe } from '@angular/common'
import { MenuItem } from 'primeng/api'
import { MenuModule } from 'primeng/menu'
import { TruncatePipe } from '../../../pipes/truncate.pipe'

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

export class Overview implements OnInit {
  public sharedService = inject(SharedService)
  public authService = inject(AuthService)
  public showBusinessProfit = signal<boolean>(true)
  public profitOptions: MenuItem[] | undefined

  ngOnInit(): void {
    this.profitOptions = [
      {
        label: 'Toggle Type',
        icon: 'pi pi-money',
        command: () => {
          this.showBusinessProfit.set(!this.showBusinessProfit())
        }
      }
    ]
  }

  public ness(): void {
    console.log(this.sharedService.personalTasks())
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
