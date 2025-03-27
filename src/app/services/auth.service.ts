import { Injectable, inject, signal } from '@angular/core'
import { Auth, UserCredential, browserLocalPersistence, browserSessionPersistence, createUserWithEmailAndPassword, setPersistence, signInWithEmailAndPassword, signOut, updateProfile, user } from '@angular/fire/auth'
import { Observable, from } from 'rxjs'
import { collection, deleteDoc, doc, Firestore, getDoc, getDocs, setDoc } from '@angular/fire/firestore'
import { Storage, deleteObject, getDownloadURL, listAll, ref } from '@angular/fire/storage'
import { v4 as uuidv4 } from 'uuid'
import { UserData } from '../interfaces/user.interface'

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  storage = inject(Storage)
  firestore = inject(Firestore)
  firebaseAuth = inject(Auth)
  user$ = user(this.firebaseAuth)
  currentUserSignal = signal<any>(undefined)
  coreUserData = signal<UserData | null>(null)
  coreBusinessData = signal<any>(undefined)
  businessClientAvatars = signal<string[] | null>([])
  dialogClient = signal<any>(null)

  register(email: string, username: string, password: string): Observable<UserCredential> {
    const promise = this.firebaseAuth.setPersistence(browserSessionPersistence)
      .then(() => {
        return createUserWithEmailAndPassword(this.firebaseAuth, email, password)
      })
      .then(async(response: UserCredential) => {
        await updateProfile(response.user, { displayName: username })
        return response
      })

    return from(promise)
  }

  loginWithSessionPersistence(email: string, password: string): Observable<void> {
    const promise = this.firebaseAuth.setPersistence(browserSessionPersistence)
      .then(() => {
        return signInWithEmailAndPassword(this.firebaseAuth, email, password)
      })
      .then(() => {})
    
    return from(promise)
  }

  loginWithLocalPersistence(email: string, password: string): Observable<void> {
    const promise = this.firebaseAuth.setPersistence(browserLocalPersistence)
      .then(() => {
        return signInWithEmailAndPassword(this.firebaseAuth, email, password)
      })
      .then(() => {})
    
    return from(promise)
  }

  logout(): Observable<void> {
    const promise = signOut(this.firebaseAuth)
    return from(promise)
  }

  async fetchCoreUserData(): Promise<void> {
    const auth = this.firebaseAuth.currentUser

    if (auth) {
      const uid = auth.uid
      const userRef = doc(this.firestore, `users/${uid}`)
      const userDocSnap = await getDoc(userRef)

      if (userDocSnap.exists()) {
        // Type assertion to tell TypeScript that this data is of type UserData
        const userData = userDocSnap.data() as UserData
        this.coreUserData.set(userData)
      } else {
        this.coreUserData.set(null)
      }
    } else {
      this.coreUserData.set(null)
    }
  }

  async fetchCoreBusinessData(): Promise<void> {
    const auth = this.firebaseAuth.currentUser
  
    if (auth) {
      const uid = auth.uid
      const userRef = doc(this.firestore, `users/${uid}`)
      const userDocSnap = await getDoc(userRef)
  
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data()
  
        if (userData['businessId']) {
          const businessId = userData['businessId']
          const businessRef = doc(this.firestore, `businesses/${businessId}`)
          const businessDocSnap = await getDoc(businessRef)
  
          if (businessDocSnap.exists()) {
            const businessData = businessDocSnap.data()
  
            // Fetch clients subcollection
            const clientsRef = collection(this.firestore, `businesses/${businessId}/clients`)
            try {
              const clientsSnap = await getDocs(clientsRef)
              const clients = await Promise.all(
                clientsSnap.docs.map(async (clientDoc) => {
                  const clientData = {
                    id: clientDoc.id,
                    ...clientDoc.data(),
                  }
  
                  // Fetch the contacts subcollection for each client
                  const contactsRef = collection(this.firestore, `businesses/${businessId}/clients/${clientDoc.id}/contacts`)
                  const contactsSnap = await getDocs(contactsRef)
  
                  const contacts = contactsSnap.docs.map(contactDoc => ({
                    id: contactDoc.id,
                    ...contactDoc.data(),
                  }))
  
                  return {
                    ...clientData,
                    contacts, // Add the contacts to the client data
                  }
                })
              )
  
              // Add clients (with contacts) to the business data object
              this.coreBusinessData.set({
                ...businessData,
                clients, // Include clients with contacts
              })
              this.fetchBusinessClientAvatars()
            } catch (error) {
              console.error('Error fetching clients or contacts data:', error)
              this.coreBusinessData.set({
                ...businessData,
                clients: [], // Default to an empty array if error
              })
            }
          } else {
            this.coreBusinessData.set(null)
          }
        } else {
          this.coreBusinessData.set(null)
        }
      } else {
        this.coreBusinessData.set(null)
      }
    } else {
      this.coreBusinessData.set(null)
    }
  }
  
  async deleteProfileAvatar(): Promise<void> {
    const avatarPath = `users/${this.coreUserData()?.uid}/avatar`
    const avatarRef = ref(this.storage, avatarPath)

    try {
      await deleteObject(avatarRef)
      await this.fetchCoreUserData()
    } catch (error) {
      console.warn('Avatar not found or already deleted:', error)
    }
  }

  async deleteBusinessAvatar(): Promise<void> {
    const avatarPath = `businesses/${this.coreUserData()?.businessId}/avatar`
    const avatarRef = ref(this.storage, avatarPath)

    try {
      await deleteObject(avatarRef)
      await this.fetchCoreBusinessData()
    } catch (error) {
      console.warn('Avatar not found or already deleted:', error)
    }
  }

  async fetchBusinessClientAvatars(): Promise<void> {
    const businessId = this.coreUserData()?.businessId
    if (!businessId) {
      this.businessClientAvatars.set(null)
      return
    }
  
    const folderPath = `businesses/${businessId}/clients/`
    const folderRef = ref(this.storage, folderPath)
  
    try {
      // List all folders (prefixes) in the clients folder
      const listResult = await listAll(folderRef)
      const avatarUrls: string[] = []
  
      // Fetch download URLs for each folder's 'avatar' file
      for (const prefixRef of listResult.prefixes) {
        const avatarPath = `${prefixRef.fullPath}/avatar` // Append 'avatar' to the folder path
        const avatarRef = ref(this.storage, avatarPath)
  
        try {
          const url = await getDownloadURL(avatarRef)
          avatarUrls.push(url)
        } catch (error) {
          console.error(`Failed to get URL for avatar in folder ${prefixRef.fullPath}:`, error)
        }
      }
  
      // Set the signal with the retrieved URLs
      this.businessClientAvatars.set(avatarUrls)
    } catch (error) {
      console.error('Failed to fetch client avatars:', error)
      this.businessClientAvatars.set(null)
    }
  }

  public async deleteClient(clientId: string): Promise<void> {
    try {
      const businessId = this.coreUserData()?.businessId
  
      // Path to the client's Firestore document
      const clientDocRef = doc(this.firestore, `businesses/${businessId}/clients/${clientId}`)
  
      // Path to the client's avatar in Firebase Storage
      const avatarPath = `businesses/${businessId}/clients/${clientId}/avatar`
      const avatarRef = ref(this.storage, avatarPath)
  
      // Delete the avatar if it exists
      try {
        await deleteObject(avatarRef)
      } catch (error) {
        console.warn('Avatar not found or already deleted:', error)
      }
  
      // Delete the client document from Firestore
      await deleteDoc(clientDocRef)
  
      // Fetch updated business data to refresh the client list
      await this.fetchCoreBusinessData()
    } catch (error) {
      console.error('Error deleting client:', error)
    }
  }

  public async deleteClientAvatar(businessId: string, clientId: string): Promise<any> {
    const avatarPath = `businesses/${businessId}/clients/${clientId}/avatar`
    const avatarRef = ref(this.storage, avatarPath)

    try {
      await deleteObject(avatarRef)
    } catch (error) {
      console.warn('Avatar not found or already deleted:', error)
    }
  }

  public async fetchClientDataById(id: string | null): Promise<void> {
    const clientRef = doc(this.firestore, `businesses/${this.coreBusinessData().id}/clients/${id}`)
    const clientDocSnap = await getDoc(clientRef)
    const clientData = clientDocSnap.data()

    // Fetch the contacts subcollection
    const contactsRef = collection(this.firestore, `businesses/${this.coreBusinessData().id}/clients/${id}/contacts`)
    const contactsSnap = await getDocs(contactsRef)

    const contacts = contactsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    if (clientDocSnap.exists()) {
      this.dialogClient.set({
        ...clientData,
        contacts: contacts,
      })
    } else {
      this.dialogClient.set(null)
    }
  }

  public async addContactToClient(formData: any, clientId: any): Promise<void> {
    const contactId = uuidv4()
    const contactRef = doc(this.firestore, `businesses/${this.coreUserData()?.businessId}/clients/${clientId}/contacts/${contactId}`)

    await setDoc(contactRef, {
      id: contactId,
      name: formData.contact_name,
      email: formData.contact_email,
      position: formData.contact_position,
      phone: formData.contact_phone,
      createdAt: new Date().toISOString()
    })
  }
}