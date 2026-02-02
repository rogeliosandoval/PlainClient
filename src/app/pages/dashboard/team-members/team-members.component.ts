import { Component, inject, OnInit, signal, ViewChild } from '@angular/core'
import { AuthService } from '../../../services/auth.service'
import { ButtonModule } from 'primeng/button'
import { MemberFormDialog } from '../../../dialogs/member-form/member-form.component'
import { MessageService } from 'primeng/api'
import { SharedService } from '../../../services/shared.service'
import { StandardFormData } from '../../../interfaces/other.interface'
import emailjs from 'emailjs-com'
import { NgOptimizedImage } from '@angular/common'
import { SkeletonModule } from 'primeng/skeleton'

@Component({
  selector: 'tc-team-members',
  standalone: true,
  imports: [
    ButtonModule,
    MemberFormDialog,
    NgOptimizedImage,
    SkeletonModule
  ],
  templateUrl: './team-members.component.html',
  styleUrl: './team-members.component.scss'
})

export class TeamMembers implements OnInit {
  @ViewChild('memberFormDialog') memberFormDialog!: MemberFormDialog
  public authService = inject(AuthService)
  public sharedService = inject(SharedService)
  public showMemberFormDialog = signal<boolean>(false)
  public dialogLoading = signal<boolean>(false)
  public messageService = inject(MessageService)
  public emailSent = signal<boolean>(false)
  public imageLoaded: Record<string, boolean> = {}

  ngOnInit(): void {

  }

  public async onNewSubmit(data: any): Promise<void> {
    this.dialogLoading.set(true)

    if (this.sharedService.plan() === 'free' && this.sharedService.teamMembers().length >= 3) {
      this.dialogLoading.set(false)
      alert('You have reached your limit with the FREE plan. Upgrade to continue.')
      return
    }

    await this.authService.addVerifiedEmail(data.member_email)

    try {
      const serviceId = 'service_wodgvrb'
      const templateId = 'template_fqc7tqu'
      const publicKey = 'pga-b9sXMPiAuDijd'

      const templateParams = {
        to_email: data.member_email,
        link: data.link,
        businessName: data.businessName
      }

      emailjs.send(serviceId, templateId, templateParams, publicKey).then(() => {
        this.dialogLoading.set(false)
        this.emailSent.set(true)
      }).catch((err) => {
        console.log(err)
        this.dialogLoading.set(false)
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'There was an error. Try again.',
          key: 'br',
          life: 4000,
        })
      })
    } catch(err) {
      console.log(err)
      this.dialogLoading.set(false)
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'There was an error. Try again.',
        key: 'br',
        life: 4000,
      })
    }
  }

  public async onSubmit(data: StandardFormData): Promise<void> {
    this.dialogLoading.set(true)

    try {
      await this.authService.addTeamMember(data.formData)
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Team member has been added!',
        key: 'br',
        life: 4000
      })
      this.dialogLoading.set(false)
      this.showMemberFormDialog.set(false)
    } catch (error) {
      console.log(error)
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'There was an error deleting contact. Try again.',
        key: 'br',
        life: 4000,
      })
      this.dialogLoading.set(false)
    }
  }

  public onDialogClose(newState: boolean) {
    this.emailSent.set(false)
    this.showMemberFormDialog.set(newState)
  }
}
