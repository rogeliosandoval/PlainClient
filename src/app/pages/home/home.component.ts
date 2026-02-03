import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core'
import { CommonModule } from '@angular/common'
import { SharedService } from '../../services/shared.service'
import { Navbar } from '../../components/navbar/navbar.component'
import { RouterLink } from '@angular/router'
import { Footer } from '../../components/footer/footer.component'
import { NgOptimizedImage } from '@angular/common'
import { AuthService } from '../../services/auth.service'
import { ButtonModule } from 'primeng/button'
import { PrimeNGConfig } from 'primeng/api'

@Component({
  selector: 'tc-home',
  standalone: true,
  imports: [
    CommonModule,
    Navbar,
    Footer,
    RouterLink,
    NgOptimizedImage,
    ButtonModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class Home implements OnInit {
  @ViewChild('detailsSection') detailsSection!: ElementRef<HTMLElement>
  public sharedService = inject(SharedService)
  public authService = inject(AuthService)
  public primengConfig = inject(PrimeNGConfig)

  ngOnInit(): void {
    this.authService.clearAllAppCaches()
    this.primengConfig.ripple = true
  }

  scrollToDetails(): void {
    if (!this.detailsSection) return

    const scrollContainer = document.querySelector('main') as HTMLElement | null
    if (!scrollContainer) return

    const targetOffset =
      this.detailsSection.nativeElement.offsetTop

    scrollContainer.scrollTo({
      top: targetOffset - 20, // small offset for spacing
      behavior: 'smooth'
    })
  }
}
