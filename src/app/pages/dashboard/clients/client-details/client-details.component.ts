import { Component, OnInit, inject, signal } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { AuthService } from '../../../../services/auth.service'
import { SharedService } from '../../../../services/shared.service'
import { ProgressSpinnerModule } from 'primeng/progressspinner'
import { NgOptimizedImage } from '@angular/common'

@Component({
  selector: 'tc-client-details',
  standalone: true,
  imports: [
    ProgressSpinnerModule,
    NgOptimizedImage
  ],
  templateUrl: './client-details.component.html',
  styleUrl: './client-details.component.scss'
})

export class ClientDetails implements OnInit {
  private activatedRoute = inject(ActivatedRoute)
  public authService = inject(AuthService)
  public sharedService = inject(SharedService)
  public loadingClient = signal<boolean>(true)

  ngOnInit() {
    this.activatedRoute.paramMap.subscribe({
      next: async (data) => {
        try {
          await this.authService.fetchClientDataById(data.get('id'))
          .then(() => {
            this.sharedService.dialogClient.set(this.authService.dialogClient())
          })
          .then(() => {
            // Not practical but it works to avoid ngSrc optimization error... :/
            setTimeout(() => {
              this.loadingClient.set(false)
            }, 500)
          })
        } catch (err) {
          console.log(err)
          this.loadingClient.set(false)
        }
      },
      error: err => {
        console.log(err)
        this.loadingClient.set(false)
      }
    })
  }

  public editClient(): void {
    this.sharedService.clientFormType.set('edit')
    this.sharedService.showClientFormDialog.set(true)
  }
}