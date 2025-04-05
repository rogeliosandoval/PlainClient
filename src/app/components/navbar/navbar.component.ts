import { Component, signal, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { SharedService } from '../../services/shared.service'
import { RouterLink } from '@angular/router'
import { NgOptimizedImage } from '@angular/common'

@Component({
  selector: 'tc-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NgOptimizedImage
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class Navbar {
  public sharedService = inject(SharedService)
}
