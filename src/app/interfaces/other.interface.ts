export interface ClientFormData {
  avatarTouched: boolean
  formData: any
  file: File
  type: string
}

export interface StandardFormData {
  formData: any
  type: string
  id?: string
}