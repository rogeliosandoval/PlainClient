import { Component, EventEmitter, Input, OnInit, Output, inject, input, signal } from '@angular/core'
import { DialogModule } from 'primeng/dialog'
import { ButtonModule } from 'primeng/button'
import { ProgressSpinnerModule } from 'primeng/progressspinner'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { IconFieldModule } from 'primeng/iconfield'
import { InputTextModule } from 'primeng/inputtext'
import { InputTextareaModule } from 'primeng/inputtextarea'
import { SharedService } from '../../services/shared.service'
import { DropdownModule } from 'primeng/dropdown'
import { PhoneNumberDirective } from '../../directives/phone-number.directive'
import { AuthService } from '../../services/auth.service'
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper'
import { NgOptimizedImage } from '@angular/common'

@Component({
  selector: 'tcd-client-form',
  standalone: true,
  imports: [
    DialogModule,
    ButtonModule,
    ProgressSpinnerModule,
    FormsModule,
    ReactiveFormsModule,
    IconFieldModule,
    InputTextModule,
    InputTextareaModule,
    DropdownModule,
    PhoneNumberDirective,
    ImageCropperComponent,
    NgOptimizedImage
  ],
  templateUrl: './client-form.component.html',
  styleUrl: './client-form.component.scss'
})

export class ClientFormDialog {
  @Input() type: string = ''
  @Input() showClientFormDialog: boolean = false
  @Output() onClose = new EventEmitter<boolean>()
  @Output() onSubmit = new EventEmitter<any>()
  private authService = inject(AuthService)
  public sharedService = inject(SharedService)
  public dialogLoading = input<boolean>()
  public fillingForm = signal<boolean>(true)
  public showUploadAvatarButton = signal<boolean>(false)
  public imageChangedEvent: Event | null = null
  public croppedImage: File | any = null
  public connections = signal<string[]>([
    'Facebook',
    'Instagram',
    'Twitter',
    'Nextdoor',
    'TikTok',
    'Craigslist Ad',
    'Referral',
    'Friend',
    'Friend of a Friend',
    'Family Friend',
    'Flyer Ad',
    'Organic SEO',
    'Business Card',
    'Cold Call',
    'Cold Email',
    'Networking Event',
    'Other'
  ])
  public clientForm = new FormGroup({
    client_name: new FormControl('', Validators.required),
    connected_by: new FormControl(''),
    client_email: new FormControl('', Validators.email),
    client_phone: new FormControl(''),
    client_location: new FormControl(''),
    note: new FormControl('')
  })

  public editCheck(): void {
    if (this.type === 'edit') {
      const formData = this.sharedService.dialogClient()
      this.clientForm.get('client_name')?.setValue(formData.name)
      this.clientForm.get('connected_by')?.setValue(formData.connectedBy)
      this.clientForm.get('client_email')?.setValue(formData.email)
      this.clientForm.get('client_phone')?.setValue(formData.phone)
      this.clientForm.get('client_location')?.setValue(formData.location)
      this.clientForm.get('note')?.setValue(formData.note)
      setTimeout(() => {
        this.fillingForm.set(false)
      }, 500)
    } else {
      this.fillingForm.set(false)
    }
  }

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

  public resetForm(): void {
    this.clientForm.reset()
    this.imageChangedEvent = null
    this.croppedImage = null
    this.showUploadAvatarButton.set(false)
  }

  public closeDialog() {
    this.fillingForm.set(true)
    this.showClientFormDialog = false
    this.onClose.emit(false)
  }

  public submitDialog(type: string): void {
    const data = {
      avatarTouched: this.showUploadAvatarButton(),
      formData: this.clientForm.value,
      file: this.croppedImage,
      type
    }
    this.onSubmit.emit(data)
  }
}