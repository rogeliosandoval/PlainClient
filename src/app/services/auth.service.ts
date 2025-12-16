import { Injectable, inject, signal } from '@angular/core'
import { Auth, UserCredential, browserLocalPersistence, browserSessionPersistence, createUserWithEmailAndPassword, setPersistence, signInWithEmailAndPassword, signOut, updateProfile, user } from '@angular/fire/auth'
import { Observable, from } from 'rxjs'
import { collection, deleteDoc, doc, Firestore, getDoc, getDocs, setDoc, updateDoc } from '@angular/fire/firestore'
import { Storage, deleteObject, getDownloadURL, listAll, ref } from '@angular/fire/storage'
import { v4 as uuidv4 } from 'uuid'
import { UserData, BusinessData, ClientData, Contact } from '../interfaces/user.interface'
import { SharedService } from './shared.service'

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  storage = inject(Storage)
  firestore = inject(Firestore)
  firebaseAuth = inject(Auth)
  sharedService = inject(SharedService)
  user$ = user(this.firebaseAuth)
  currentUserSignal = signal<any>(undefined)
  coreUserData = signal<UserData | null>(null)
  coreBusinessData = signal<BusinessData | null>(null)
  businessClientAvatars = signal<string[] | null>([])
  dialogClient = signal<any>(null)
  clearBusinessDataCache = signal<boolean>(false)

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
    const cacheKey = 'coreBusinessDataCache'
    const auth = this.firebaseAuth.currentUser

    if (this.clearBusinessDataCache()) {
      localStorage.removeItem('coreBusinessDataCache')
      this.clearBusinessDataCache.set(false)
    }
  
    // Try cache first
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        console.log('[fetchCoreBusinessData] Loaded from cache ✅')
        this.coreBusinessData.set(parsed)
        this.fetchBusinessClientAvatars()
        return
      } catch (e) {
        console.warn('[fetchCoreBusinessData] Invalid cache format. Ignoring cache ❌', e)
      }
    }
  
    if (!auth) {
      console.warn('[fetchCoreBusinessData] No authenticated user found ❌')
      this.coreBusinessData.set(null)
      return
    }
  
    try {
      const uid = auth.uid
      const userRef = doc(this.firestore, `users/${uid}`)
      const userDocSnap = await getDoc(userRef)
  
      if (!userDocSnap.exists()) {
        console.warn('[fetchCoreBusinessData] User document not found ❌')
        this.coreBusinessData.set(null)
        return
      }
  
      const userData = userDocSnap.data() as UserData
      const businessId = userData.businessId
  
      if (!businessId) {
        console.warn('[fetchCoreBusinessData] No businessId found in user data ❌')
        this.coreBusinessData.set(null)
        return
      }
  
      const businessRef = doc(this.firestore, `businesses/${businessId}`)
      const businessDocSnap = await getDoc(businessRef)
  
      if (!businessDocSnap.exists()) {
        console.warn('[fetchCoreBusinessData] Business document not found ❌')
        this.coreBusinessData.set(null)
        return
      }
  
      const businessData = businessDocSnap.data() as BusinessData
  
      // Fetch clients
      const clientsRef = collection(this.firestore, `businesses/${businessId}/clients`)
      const clientsSnap = await getDocs(clientsRef)
  
      const clients: ClientData[] = await Promise.all(
        clientsSnap.docs.map(async (clientDoc) => {
          const clientData = clientDoc.data() as Partial<ClientData>
          const contactsRef = collection(this.firestore, `businesses/${businessId}/clients/${clientDoc.id}/contacts`)
          const contactsSnap = await getDocs(contactsRef)
  
          const contacts: Contact[] = contactsSnap.docs.map((contactDoc) => {
            const contactData = contactDoc.data() as Partial<Contact>
            return {
              id: contactDoc.id,
              name: contactData.name || 'Unknown',
              ...contactData
            }
          })
  
          return {
            id: clientDoc.id,
            name: clientData.name || 'Unknown',
            ...clientData,
            contacts: contacts || []
          }
        })
      )
  
      const compiledData = {
        avatarUrl: businessData.avatarUrl || '',
        clients,
        numberOfClients: businessData.numberOfClients || 0,
        id: businessData.id || '',
        members: businessData.members || 0,
        name: businessData.name || '',
        ownerID: businessData.ownerID || ''
      }
  
      // Set and cache
      console.log('[fetchCoreBusinessData] Fetched from Firestore ✅')
      this.coreBusinessData.set(compiledData)
      localStorage.setItem(cacheKey, JSON.stringify(compiledData))
      this.fetchBusinessClientAvatars()
  
    } catch (error) {
      console.error('[fetchCoreBusinessData] Error fetching core business data ❌', error)
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

  async deleteClient(clientId: string): Promise<void> {
    try {
      const businessId = this.coreUserData()?.businessId
  
      // Paths
      const clientDocRef = doc(this.firestore, `businesses/${businessId}/clients/${clientId}`)
      const avatarPath = `businesses/${businessId}/clients/${clientId}/avatar`
      const avatarRef = ref(this.storage, avatarPath)
  
      // Try deleting avatar
      try {
        await deleteObject(avatarRef)
      } catch (error) {
        console.warn('Avatar not found or already deleted:', error)
      }
  
      // Delete subcollections (like contacts)
      await this.deleteSubcollections(clientDocRef, ['contacts'])
  
      // Delete client document
      await deleteDoc(clientDocRef)
  
      // Manually update cache
      const cacheKey = 'coreBusinessDataCache'
      const cached = localStorage.getItem(cacheKey)
  
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
  
          parsed.clients = parsed.clients.filter((client: ClientData) => client.id !== clientId)
          parsed.numberOfClients = Math.max((parsed.numberOfClients || 1) - 1, 0)
  
          localStorage.setItem(cacheKey, JSON.stringify(parsed))
          this.coreBusinessData.set(parsed)
          this.fetchBusinessClientAvatars?.()
          console.log('Successfully deleted from the cache ✅')
        } catch (e) {
          console.warn('[deleteClient] Failed to update cache manually, refetching instead ❌', e)
          await this.fetchCoreBusinessData()
        }
      } else {
        await this.fetchCoreBusinessData()
      }
    } catch (error) {
      console.error('Error deleting client:', error)
    }
  }  

  // Recursive function to delete all subcollections
  async deleteSubcollections(parentDocRef: any, collectionsRef: string[]) {
    const subcollections = collectionsRef

    for (const subcollection of subcollections) {
      const subcollectionRef = collection(parentDocRef, subcollection)
      const snapshot = await getDocs(subcollectionRef)
      const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref))
      await Promise.all(deletePromises)
    }
  }

  async deleteClientAvatar(businessId: string, clientId: string): Promise<any> {
    const avatarPath = `businesses/${businessId}/clients/${clientId}/avatar`
    const avatarRef = ref(this.storage, avatarPath)

    try {
      await deleteObject(avatarRef)
    } catch (error) {
      console.warn('Avatar not found or already deleted:', error)
    }
  }

  async fetchClientDataById(id: string | null): Promise<void> {
    const clientRef = doc(this.firestore, `businesses/${this.coreBusinessData()!.id}/clients/${id}`)
    const clientDocSnap = await getDoc(clientRef)
    const clientData = clientDocSnap.data()

    // Fetch the contacts subcollection
    const contactsRef = collection(this.firestore, `businesses/${this.coreBusinessData()!.id}/clients/${id}/contacts`)
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

  async addContactToClient(formData: any, clientId: string): Promise<void> {
    const contactId = uuidv4()
    const businessId = this.coreUserData()?.businessId
    const contactRef = doc(this.firestore, `businesses/${businessId}/clients/${clientId}/contacts/${contactId}`)

    const newContact = {
      id: contactId,
      name: formData.contact_name,
      email: formData.contact_email,
      position: formData.contact_position,
      phone: formData.contact_phone,
      createdAt: new Date().toISOString()
    }

    // Write to Firestore first
    await setDoc(contactRef, newContact)

    // --- Update Local Cache ---
    const cacheKey = 'coreBusinessDataCache'
    const cached = localStorage.getItem(cacheKey)

    if (cached) {
      try {
        const parsed = JSON.parse(cached)

        // Find the target client inside cached data
        const clientIndex = parsed.clients.findIndex((c: any) => c.id === clientId)
        if (clientIndex !== -1) {
          // Ensure contacts array exists
          if (!Array.isArray(parsed.clients[clientIndex].contacts)) {
            parsed.clients[clientIndex].contacts = []
          }

          // Add new contact to the top of the contacts list
          parsed.clients[clientIndex].contacts = [newContact, ...parsed.clients[clientIndex].contacts]
        }

        // Save the updated cache back to localStorage
        localStorage.setItem(cacheKey, JSON.stringify(parsed))

        // Update signal/store so UI reacts immediately
        this.coreBusinessData.set(parsed)

        console.log('✅ Contact successfully added and cache updated')
      } catch (e) {
        console.warn('[addContactToClient] Failed to update cache manually, refetching instead ❌', e)
        await this.fetchCoreBusinessData()
      }
    } else {
      // Fallback if cache doesn't exist
      await this.fetchCoreBusinessData()
    }
  }

  async deleteContactToClient(clientId: string, contactId: string): Promise<void> {
    const businessId = this.coreUserData()?.businessId
    const contactRef = doc(this.firestore, `businesses/${businessId}/clients/${clientId}/contacts/${contactId}`)

    // Delete from Firestore
    await deleteDoc(contactRef)

    // Update local cache
    const cacheKey = 'coreBusinessDataCache'
    const cached = localStorage.getItem(cacheKey)

    if (cached) {
      try {
        const parsed = JSON.parse(cached)

        // Find client
        const clientIndex = parsed.clients.findIndex((c: any) => c.id === clientId)
        if (clientIndex !== -1 && Array.isArray(parsed.clients[clientIndex].contacts)) {
          // Filter out deleted contact
          parsed.clients[clientIndex].contacts = parsed.clients[clientIndex].contacts.filter(
            (contact: any) => contact.id !== contactId
          )
        }

        // Save updated cache
        localStorage.setItem(cacheKey, JSON.stringify(parsed))

        // Update store/signal
        this.coreBusinessData.set(parsed)

        console.log('✅ Contact successfully deleted and cache updated')
      } catch (e) {
        console.warn('[deleteContactToClient] Failed to update cache manually, refetching instead ❌', e)
        await this.fetchCoreBusinessData()
      }
    } else {
      // fallback if cache is missing
      await this.fetchCoreBusinessData()
    }
  }

  async editContactForClient(clientId: string, contactId: string, formData: any): Promise<void> {
    const businessId = this.coreUserData()?.businessId
    const contactRef = doc(this.firestore, `businesses/${businessId}/clients/${clientId}/contacts/${contactId}`)

    const updatedContact = {
      id: contactId,
      name: formData.contact_name,
      email: formData.contact_email,
      position: formData.contact_position,
      phone: formData.contact_phone,
      updatedAt: new Date().toISOString()
    }

    // Update Firestore document
    await setDoc(contactRef, updatedContact, { merge: true })

    // Update Local Cache
    const cacheKey = 'coreBusinessDataCache'
    const cached = localStorage.getItem(cacheKey)

    if (cached) {
      try {
        const parsed = JSON.parse(cached)

        // Find client in cache
        const clientIndex = parsed.clients.findIndex((c: any) => c.id === clientId)
        if (clientIndex !== -1) {
          const contacts = parsed.clients[clientIndex].contacts || []
          const contactIndex = contacts.findIndex((c: any) => c.id === contactId)

          if (contactIndex !== -1) {
            // Merge updated fields into existing contact
            parsed.clients[clientIndex].contacts[contactIndex] = {
              ...parsed.clients[clientIndex].contacts[contactIndex],
              ...updatedContact
            }
          }
        }

        // Save updated cache
        localStorage.setItem(cacheKey, JSON.stringify(parsed))

        // Update reactive signal/store
        this.coreBusinessData.set(parsed)

        console.log('✅ Contact successfully edited and cache updated')
      } catch (e) {
        console.warn('[editContactForClient] Failed to update cache manually, refetching instead ❌', e)
        await this.fetchCoreBusinessData()
      }
    } else {
      // Fallback if cache doesn't exist
      await this.fetchCoreBusinessData()
    }
  }

  async addTeamMember(formData: any): Promise<void> {
    const memberId = uuidv4()
    const businessId = this.coreUserData()?.businessId
    const memberRef = doc(this.firestore, `businesses/${businessId}/team/${memberId}`)

    const newMember = {
      id: memberId,
      name: formData.member_name,
      position: formData.member_position,
      email: formData.member_email,
      phone: formData.member_phone,
      createdAt: new Date().toISOString()
    }

    // Write to Firestore
    await setDoc(memberRef, newMember)

    // Attempt to update local cache
    const cacheKey = 'coreBusinessDataCache'
    const cached = localStorage.getItem(cacheKey)

    if (cached) {
      try {
        const parsed = JSON.parse(cached)

        // Ensure team array exists
        if (!Array.isArray(parsed.team)) {
          parsed.team = []
        }

        // Add new member to top of local cache list
        parsed.team = [newMember, ...parsed.team]

        // Save back to localStorage
        localStorage.setItem(cacheKey, JSON.stringify(parsed))

        // Update reactive signal (UI updates instantly)
        this.coreBusinessData.set(parsed)

        console.log('✅ Team member added and cache updated successfully')
      } catch (e) {
        console.warn('[addTeamMember] Cache update failed ❌ Falling back to refetch', e)
        await this.fetchCoreBusinessData()
      }
    } else {
      await this.fetchCoreBusinessData()
    }
  }

  async addProfit(formData: any, databaseType: 'personal' | 'business'): Promise<void> {
    const uid = this.coreUserData()?.uid
    if (!uid) return

    const profitId = uuidv4()
    const context = this.resolveProfitContext(databaseType, uid)

    const profitRef = doc(this.firestore, `${context.collectionPath}/${profitId}`)

    const newProfit = {
      id: profitId,
      profitType: formData.profitType,
      name: formData.name,
      amount: formData.amount,
      note: formData.note || '',
      createdAt: new Date().toISOString()
    }

    // 1️⃣ Firestore write
    await setDoc(profitRef, newProfit)

    // 2️⃣ Cache update
    let updatedList: any[] = []

    const cached = localStorage.getItem(context.cacheKey)

    if (cached) {
      try {
        updatedList = [newProfit, ...JSON.parse(cached)]
      } catch {
        await this.fetchProfits(databaseType)
        return
      }
    } else {
      updatedList = [newProfit]
    }

    localStorage.setItem(context.cacheKey, JSON.stringify(updatedList))

    // 3️⃣ Signal update
    context.signal.set(updatedList)
  }

  private resolveProfitContext(databaseType: 'personal' | 'business', uid: string) {
    return {
      collectionPath:
        databaseType === 'personal'
          ? `users/${uid}/profits`
          : `businesses/${uid}/profits`,

      cacheKey:
        databaseType === 'personal'
          ? 'userProfitsCache'
          : 'businessProfitsCache',

      signal:
        databaseType === 'personal'
          ? this.sharedService.userProfits
          : this.sharedService.businessProfits
    }
  }

  async fetchProfits(databaseType: 'personal' | 'business'): Promise<void> {
    const uid = this.coreUserData()?.uid
    if (!uid) return

    const context = this.resolveProfitContext(databaseType, uid)
    const ref = collection(this.firestore, context.collectionPath)

    const snapshot = await getDocs(ref)

    const list: any[] = []
    snapshot.forEach(doc => list.push(doc.data()))

    localStorage.setItem(context.cacheKey, JSON.stringify(list))
    context.signal.set(list)

    console.log(`🔥 ${databaseType} profits reloaded from Firestore`)
  }

  loadProfits(databaseType: 'personal' | 'business'): void {
    const context = this.resolveProfitContext(databaseType, this.coreUserData()?.uid as string)

    const cached = localStorage.getItem(context.cacheKey)

    if (cached) {
      try {
        context.signal.set(JSON.parse(cached))
        console.log(`📦 Loaded ${databaseType} profits from cache`)
        return
      } catch {
        console.warn('Cache parse failed, refetching...')
      }
    }

    // No cache → fetch from Firestore
    this.fetchProfits(databaseType)
  }

  async editProfit(profitId: string, formData: any, databaseType: 'personal' | 'business'):Promise<void> {
    const uid = this.coreUserData()?.uid
    if (!uid) return

    const context = this.resolveProfitContext(databaseType, uid)

    const profitRef = doc(this.firestore, `${context.collectionPath}/${profitId}`)

    const updatedProfit = {
      ...formData,
      id: profitId,
      updatedAt: new Date().toISOString()
    }

    // 1️⃣ Update Firestore
    await updateDoc(profitRef, updatedProfit)

    // 2️⃣ Update cache
    const cached = localStorage.getItem(context.cacheKey)

    if (cached) {
      try {
        const parsed = JSON.parse(cached)

        const updatedList = parsed.map((p: any) =>
          p.id === profitId ? { ...p, ...updatedProfit } : p
        )

        localStorage.setItem(context.cacheKey, JSON.stringify(updatedList))

        // 3️⃣ Update signal
        context.signal.set(updatedList)
        return
      } catch (err) {
        console.warn('Error updating cache on edit, refetching...', err)
        await this.fetchProfits(databaseType)
        return
      }
    }

    // Fallback if no cache exists
    await this.fetchProfits(databaseType)
  }

  async deleteProfit(profitId: string, databaseType: 'personal' | 'business'): Promise<void> {
    const uid = this.coreUserData()?.uid
    if (!uid) return

    const context = this.resolveProfitContext(databaseType, uid)

    const profitRef = doc(this.firestore, `${context.collectionPath}/${profitId}`)

    // 1️⃣ Delete from Firestore
    await deleteDoc(profitRef)

    // 2️⃣ Update cache
    const cached = localStorage.getItem(context.cacheKey)

    if (cached) {
      try {
        const parsed = JSON.parse(cached)

        const updatedList = parsed.filter((p: any) => p.id !== profitId)

        localStorage.setItem(context.cacheKey, JSON.stringify(updatedList))

        // 3️⃣ Update signal
        context.signal.set(updatedList)
        return
      } catch (err) {
        console.warn('Error updating cache after delete, refetching...', err)
        await this.fetchProfits(databaseType)
        return
      }
    }

    // Fallback
    await this.fetchProfits(databaseType)
  }
}