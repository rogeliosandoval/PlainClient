import { Component, inject } from '@angular/core'
import { SharedService } from '../../services/shared.service'
import { RouterLink } from '@angular/router'

@Component({
  selector: 'tc-footer',
  standalone: true,
  imports: [
    RouterLink
  ],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class Footer {
  public sharedService = inject(SharedService)
}
