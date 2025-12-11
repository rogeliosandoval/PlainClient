import { Component, inject, OnInit, signal, ViewChild } from '@angular/core'
import { AuthService } from '../../../services/auth.service'
import { ButtonModule } from 'primeng/button'
import { MemberFormDialog } from '../../../dialogs/member-form/member-form.component'
import { TeamMemberFormData } from '../../../interfaces/other.interface'
import { MessageService } from 'primeng/api'
import { SharedService } from '../../../services/shared.service'

@Component({
  selector: 'tc-team-members',
  standalone: true,
  imports: [
    ButtonModule,
    MemberFormDialog
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

  ngOnInit(): void {

  }

  public async onSubmit(data: TeamMemberFormData): Promise<void> {
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
    this.showMemberFormDialog.set(newState)
  }
}
