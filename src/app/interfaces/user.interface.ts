export interface UserData {
  avatarUrl?: string
  businessId: string
  email: string
  location?: string
  message?: string
  name: string
  phone?: string
  position?: string
  uid: string,
  joiningBusiness?: boolean,
  businessIdRef?: string
}

export interface BusinessData {
  avatarUrl?: string
  clients?: ClientData[]
  numberOfClients: number
  id: string
  members: number
  name: string
  ownerID: string
}

export interface ClientData {
  avatarUrl?: string
  connectedBy?: string
  contacts?: Contact[]
  createdAt?: string
  email?: string
  id: string
  location?: string
  name: string
  note?: string
  phone?: string
}

export interface Contact {
  createdAt?: string
  email?: string
  id: string
  name: string
  phone?: string
  position?: string
}