import { Component, inject, OnInit, signal, ViewChild } from '@angular/core'
import { AuthService } from '../../../services/auth.service'
import { ButtonModule } from 'primeng/button'
import { MessageService } from 'primeng/api'

@Component({
  selector: 'tc-profits',
  standalone: true,
  imports: [
    ButtonModule
  ],
  templateUrl: './profits.component.html',
  styleUrl: './profits.component.scss'
})
export class Profits implements OnInit {
  public authService = inject(AuthService)
  public messageService = inject(MessageService)

  ngOnInit(): void {

  }
}
