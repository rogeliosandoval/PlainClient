import { Component, inject, OnInit, signal, ViewChild } from '@angular/core'
import { AuthService } from '../../../services/auth.service'
import { ButtonModule } from 'primeng/button'
import { MemberFormDialog } from '../../../dialogs/member-form/member-form.component'
import { TeamMemberData, TeamMemberFormData } from '../../../interfaces/other.interface'

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
  public showMemberFormDialog = signal<boolean>(false)

  ngOnInit(): void {

  }

  public onSubmit(data: TeamMemberFormData): void {
    console.log(data)
    this.showMemberFormDialog.set(false)
  }

  public onDialogClose(newState: boolean) {
    this.showMemberFormDialog.set(newState)
  }
}
