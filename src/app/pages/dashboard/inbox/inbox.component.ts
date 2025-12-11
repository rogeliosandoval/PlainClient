import { Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { SharedService } from '../../../services/shared.service'

@Component({
  selector: 'tc-inbox',
  standalone: true,
  imports: [
    RouterLink
  ],
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.component.scss'
})

export class Inbox {
  public sharedService = inject(SharedService)
  
}