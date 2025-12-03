import { Component, inject, Input, OnInit, signal, ViewChild } from '@angular/core'
import { AuthService } from '../../../services/auth.service'
import { ButtonModule } from 'primeng/button'
import { MessageService } from 'primeng/api'
import { TabMenuModule } from 'primeng/tabmenu'
import { MenuItem } from 'primeng/api'
import { ProfitFormDialog } from '../../../dialogs/profit-form/profit-form.component'

@Component({
  selector: 'tc-profits',
  standalone: true,
  imports: [
    ButtonModule,
    TabMenuModule,
    ProfitFormDialog
  ],
  templateUrl: './profits.component.html',
  styleUrl: './profits.component.scss'
})
export class Profits implements OnInit {
  @ViewChild('profitFormDialog') profitFormDialog!: ProfitFormDialog
  @Input() dialogLoading: boolean = false
  public authService = inject(AuthService)
  public messageService = inject(MessageService)
  public items: MenuItem[] | undefined
  public activeItem: any
  public showBusinessProfits = signal<boolean>(true)
  // public showPersonalProfits = signal<boolean>(false)
  public showProfitFormDialog = signal<boolean>(false)
  
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
  }

  public onDialogClose(newState: boolean) {
    this.showProfitFormDialog.set(newState)
    this.profitFormDialog.resetForm()
  }
}
