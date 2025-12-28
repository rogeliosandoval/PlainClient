import { Component, inject, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { SharedService } from '../../services/shared.service'
import { Navbar } from '../../components/navbar/navbar.component'
import { RouterLink } from '@angular/router'
import { Footer } from '../../components/footer/footer.component'
import { NgOptimizedImage } from '@angular/common'
import { AuthService } from '../../services/auth.service'

@Component({
  selector: 'tc-home',
  standalone: true,
  imports: [
    CommonModule,
    Navbar,
    Footer,
    RouterLink,
    NgOptimizedImage
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class Home implements OnInit {
  public sharedService = inject(SharedService)
  public authService = inject(AuthService)

  ngOnInit(): void {
    this.authService.clearAllAppCaches()
  }
}
