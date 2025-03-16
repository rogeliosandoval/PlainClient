import { Component, EventEmitter, Input, Output, inject, input, signal } from '@angular/core'
import { DialogModule } from 'primeng/dialog'
import { SharedService } from '../../services/shared.service'
import { AuthService } from '../../services/auth.service'
import { ButtonModule } from 'primeng/button'
import { ProgressSpinnerModule } from 'primeng/progressspinner'
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper'

@Component({
  selector: 'tcd-avatar-upload',
  standalone: true,
  imports: [
    DialogModule,
    ButtonModule,
    ProgressSpinnerModule,
    ImageCropperComponent
  ],
  templateUrl: './avatar-upload.component.html',
  styleUrl: './avatar-upload.component.scss'
})

export class AvatarUploadDialog {
  public sharedService = inject(SharedService)
  public authService = inject(AuthService)
  public dialogLoading = input<boolean>()
  @Input() showUploadAvatarDialog: boolean = false
  @Input() type: string = ''
  @Output() onClose = new EventEmitter<boolean>()
  @Output() onSubmit = new EventEmitter<any>()
  public showUploadAvatarButton = signal<boolean>(false)
  public imageChangedEvent: Event | null = null
  public croppedImage: File | any = null

  public fileChangeEvent(event: Event): void {
    this.imageChangedEvent = event
  }

  public imageCropped(event: ImageCroppedEvent) {
    if (event.objectUrl) {
      fetch(event.objectUrl)
        .then(res => res.blob()) // Convert blob URL to Blob
        .then(blob => {
          this.croppedImage = new File([blob], 'cropped-image.png', { type: blob.type }) // Convert Blob to File
        })
        .catch(error => console.error('Error converting blob URL to file:', error))
    }
  }

  public closeDialog() {
    this.showUploadAvatarButton.set(false)
    this.sharedService.showAvatarUploadDialog.set(false)
  }

  public submitDialog(type: string): void {
    const data = {
      type,
      file: this.croppedImage
    }
    this.onSubmit.emit(data)
  }
}