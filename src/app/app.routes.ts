import { Routes } from '@angular/router'
import { Home } from './pages/home/home.component'
import { Signup } from './pages/signup/signup.component'
import { Login } from './pages/login/login.component'
import { Dashboard } from './pages/dashboard/dashboard.component'
import { AuthUserGuard } from './guards/auth.user.guard'
import { AuthNonuserGuard } from './guards/auth.nonuser.guard'
import { Overview } from './pages/dashboard/overview/overview.component'
import { Clients } from './pages/dashboard/clients/clients.component'
import { TeamMembers } from './pages/dashboard/team-members/team-members.component'
import { Profits } from './pages/dashboard/profits/profits.component'
import { TaskManager } from './pages/dashboard/task-manager/task-manager.component'
import { Notifications } from './pages/dashboard/notifications/notifications.component'
import { Profile } from './pages/dashboard/profile/profile.component'
import { Inbox } from './pages/dashboard/inbox/inbox.component'
import { AccountSettings } from './pages/dashboard/account-settings/account-settings.component'
import { ClientDetails } from './pages/dashboard/clients/client-details/client-details.component'
import { BusinessSignup } from './pages/business-signup/business-signup.component'

export const routes: Routes = [
  {
    path: '',
    component: Home,
    canActivate: [AuthNonuserGuard],
    pathMatch: 'full'
  },
  {
    path: 'signup',
    component: Signup,
    canActivate: [AuthNonuserGuard]
  },
  {
    path: 'login',
    component: Login,
    canActivate: [AuthNonuserGuard]
  },
  {
    path: 'business-signup/:businessId',
    component: BusinessSignup,
    canActivate: [AuthNonuserGuard]
  },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [AuthUserGuard],
    children: [
      { path: 'overview', component: Overview },
      { path: 'clients', component: Clients },
      { path: 'clients/client-details/:id', component: ClientDetails },
      { path: 'team-members', component: TeamMembers },
      { path: 'profits', component: Profits },
      { path: 'task-manager', component: TaskManager },
      { path: 'notifications', component: Notifications },
      { path: 'profile', component: Profile },
      { path: 'inbox', component: Inbox },
      { path: 'account-settings', component: AccountSettings },
      { path: '**', redirectTo: 'overview', pathMatch: 'full' }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
]
