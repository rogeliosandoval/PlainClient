import { Component, computed, inject, OnInit } from '@angular/core'
import { SharedService } from '../../../services/shared.service'
import { AuthService } from '../../../services/auth.service'
import { CurrencyPipe } from '@angular/common'

@Component({
  selector: 'tc-overview',
  standalone: true,
  imports: [
    CurrencyPipe
  ],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss'
})

export class Overview implements OnInit {
  public sharedService = inject(SharedService)
  public authService = inject(AuthService)

  ngOnInit(): void {
    
  }

  public ness(): void {
    console.log(this.authService.coreBusinessData())
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
}
