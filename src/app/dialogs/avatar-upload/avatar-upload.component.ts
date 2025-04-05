import { Component, EventEmitter, Input, Output, inject, input, signal } from '@angular/core'
import { DialogModule } from 'primeng/dialog'
import { SharedService } from '../../services/shared.service'
import { AuthService } from '../../services/auth.service'
import { ButtonModule } from 'primeng/button'
import { ProgressSpinnerModule } from 'primeng/progressspinner'
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper'
import { NgOptimizedImage } from '@angular/common'

@Component({
  selector: 'tcd-avatar-upload',
  standalone: true,
  imports: [
    DialogModule,
    ButtonModule,
    ProgressSpinnerModule,
    ImageCropperComponent,
    NgOptimizedImage
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
        .then(res => res.blob())
        .then(blob => this.resizeImageBlob(blob, 300, 300)) // Resize to 300x300
        .then(resizedBlob => {
          this.croppedImage = new File([resizedBlob], 'resized-avatar.png', { type: resizedBlob.type })
        })
        .catch(error => console.error('Error resizing image:', error))
    }
  }

  private resizeImageBlob(blob: Blob, maxWidth: number, maxHeight: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(blob)
  
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = maxWidth
        canvas.height = maxHeight
  
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject('Canvas context is null')
  
        // Draw the image scaled to the canvas
        ctx.drawImage(img, 0, 0, maxWidth, maxHeight)
  
        canvas.toBlob(
          (resizedBlob) => {
            if (resizedBlob) {
              resolve(resizedBlob)
            } else {
              reject('Canvas toBlob failed')
            }
            URL.revokeObjectURL(url) // Clean up
          },
          blob.type,
          0.9 // quality
        )
      }
  
      img.onerror = reject
      img.src = url
    })
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