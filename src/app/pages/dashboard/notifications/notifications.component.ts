import { Component, inject } from '@angular/core'
import { SharedService } from '../../../services/shared.service'

@Component({
  selector: 'tc-notifications',
  standalone: true,
  imports: [],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})

export class Notifications {
  public sharedService = inject(SharedService)
}
