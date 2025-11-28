import { Component, inject, OnInit, signal, ViewChild } from '@angular/core'
import { AuthService } from '../../../services/auth.service'
import { ButtonModule } from 'primeng/button'
import { MessageService } from 'primeng/api'
import { TabMenuModule } from 'primeng/tabmenu'
import { MenuItem } from 'primeng/api'

@Component({
  selector: 'tc-profits',
  standalone: true,
  imports: [
    ButtonModule,
    TabMenuModule
  ],
  templateUrl: './profits.component.html',
  styleUrl: './profits.component.scss'
})
export class Profits implements OnInit {
  public authService = inject(AuthService)
  public messageService = inject(MessageService)
  public items: MenuItem[] | undefined
  public activeItem: any
  public showBusinessProfits = signal<boolean>(true)
  public showPersonalProfits = signal<boolean>(false)

  ngOnInit(): void {
    this.items = [
      { 
        label: 'Business',
        icon: 'pi pi-briefcase',
        command: () => {
          
        }
      },
      {
        label: 'Personal',
        icon: 'pi pi-user',
        command: () => {

        }
      }
    ]
    this.activeItem = this.items[0]
  }
}
