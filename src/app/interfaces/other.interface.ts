export interface ClientFormData {
  avatarTouched: boolean
  formData: any
  file: File
  type: string
}

export interface TeamMemberFormData {
  formData: TeamMemberData,
  type: string
}

export interface TeamMemberData {
  createdAt?: string
  name: string
  position?: string
  email?: string
  phone?: string
}