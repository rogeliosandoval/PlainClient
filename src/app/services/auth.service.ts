import { Injectable, inject, signal, PLATFORM_ID, Inject } from '@angular/core'
import { Auth, UserCredential, browserLocalPersistence, browserSessionPersistence, createUserWithEmailAndPassword, setPersistence, signInWithEmailAndPassword, signOut, updateProfile, user, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, sendEmailVerification } from '@angular/fire/auth'
import { Observable, from } from 'rxjs'
import { collection, deleteDoc, doc, Firestore, getDoc, getDocs, orderBy, query, setDoc, updateDoc, writeBatch } from '@angular/fire/firestore'
import { Storage, deleteObject, getDownloadURL, listAll, ref } from '@angular/fire/storage'
import { v4 as uuidv4 } from 'uuid'
import { UserData, BusinessData, ClientData, Contact } from '../interfaces/user.interface'
import { SharedService } from './shared.service'
import { isPlatformBrowser } from '@angular/common'

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  storage = inject(Storage)
  firestore = inject(Firestore)
  firebaseAuth = inject(Auth)
  sharedService = inject(SharedService)
  user$ = user(this.firebaseAuth)
  authReady = signal(false)
  currentUserSignal = signal<any>(undefined)
  coreUserData = signal<UserData | null>(null)
  coreBusinessData = signal<BusinessData | null>(null)
  businessClientAvatars = signal<string[] | null>([])
  dialogClient = signal<any>(null)
  clearBusinessDataCache = signal<boolean>(false)

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      onAuthStateChanged(this.firebaseAuth, () => {
        this.authReady.set(true)
      })
    }
  }

  public signInWithGoogle(): Observable<UserCredential> {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({
      prompt: 'select_account'
    })

    return from(signInWithPopup(this.firebaseAuth, provider))
  }

  register(email: string, username: string, password: string): Observable<UserCredential> {
    const promise = this.firebaseAuth.setPersistence(browserSessionPersistence)
      .then(() => {
        return createUserWithEmailAndPassword(this.firebaseAuth, email, password)
      })
      .then(async(response: UserCredential) => {
        await updateProfile(response.user, { displayName: username })

        // 🔑 Send verification email
        await sendEmailVerification(response.user)
        
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

  clearAllAppCaches(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return // 🚫 Not in browser → do nothing
    }

    const cacheKeys = [
      'businessProfitsCache',
      'businessTasksCache',
      'personalTasksCache',
      'userProfitsCache',
      'darkMode'
    ]

    cacheKeys.forEach(key => localStorage.removeItem(key))

    // Keep key but empty it
    localStorage.setItem('coreBusinessDataCache', JSON.stringify({}))

    // Reset in-memory state
    this.sharedService.businessProfits.set([])
    this.sharedService.businessTasks.set([])
    this.sharedService.userProfits.set([])
    this.sharedService.personalTasks.set([])
    this.sharedService.dialogClient.set(null)

    console.log('🧹 All application caches cleared')
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
        console.info('[fetchCoreBusinessData] User has no business yet — skipping business load')
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
      console.log('🔥 Business data reloaded from Firestore')
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

  // Team Members
  async addTeamMember(data: any): Promise<void> {
    const memberId = data.id
    const businessId = this.coreUserData()?.businessId
    const memberRef = doc(this.firestore, `businesses/${businessId}/team/${memberId}`)

    const newMember = {
      id: data.id,
      name: data.name,
      position: data.position,
      email: data.email,
      phone: data.phone,
      location: data.location,
      message: data.message,
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

  async updateTeamMemberAvatar(memberId: string, avatarUrl: string): Promise<void> {
    const businessId = this.coreUserData()?.businessId
    if (!businessId) return

    const memberRef = doc(
      this.firestore,
      `businesses/${businessId}/team/${memberId}`
    )

    // 1️⃣ Update Firestore (ONLY avatarUrl)
    await updateDoc(memberRef, { avatarUrl })

    // ----------------------------
    // 2️⃣ Update local cache
    // ----------------------------
    const cacheKey = 'coreBusinessDataCache'
    const cached = localStorage.getItem(cacheKey)

    if (cached) {
      try {
        const parsed = JSON.parse(cached)

        if (Array.isArray(parsed.team)) {
          parsed.team = parsed.team.map((member: any) =>
            member.id === memberId
              ? { ...member, avatarUrl }
              : member
          )

          localStorage.setItem(cacheKey, JSON.stringify(parsed))
          this.coreBusinessData.set(parsed)
        }
      } catch (e) {
        console.warn('[updateTeamMemberAvatar] Cache update failed, refetching', e)
        await this.fetchCoreBusinessData()
      }
    }
  }

  async fetchTeamMembers(): Promise<void> {
    const businessId = this.coreUserData()?.businessId
    if (!businessId) return

    const teamRef = collection(
      this.firestore,
      `businesses/${businessId}/team`
    )

    try {
      const snapshot = await getDocs(teamRef)

      const members = snapshot.docs
      .map(doc => doc.data())
      .sort((a: any, b: any) =>
        b.createdAt.localeCompare(a.createdAt)
      )

      // ----------------------------
      // 1️⃣ Update SharedService signal
      // ----------------------------
      this.sharedService.teamMembers.set(members)

      // ----------------------------
      // 2️⃣ Sync into coreBusinessDataCache (optional but consistent)
      // ----------------------------
      const cacheKey = 'coreBusinessDataCache'
      const cached = localStorage.getItem(cacheKey)

      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          parsed.team = members
          localStorage.setItem(cacheKey, JSON.stringify(parsed))
          this.coreBusinessData.set(parsed)
        } catch (err) {
          console.warn('[fetchTeamMembers] Failed to sync cache', err)
        }
      }

      console.log('✅ Team members fetched:', members.length)
    } catch (error) {
      console.error('[fetchTeamMembers] Failed to fetch team members ❌', error)
    }
  }

  getTeamMembers(): void {
    const cacheKey = 'coreBusinessDataCache'
    const cached = localStorage.getItem(cacheKey)

    if (!cached) {
      // ❌ No cache → fetch from Firestore
      this.fetchTeamMembers()
      return
    }

    try {
      const parsed = JSON.parse(cached)

      if (Array.isArray(parsed.team)) {
        // ✅ Use cache
        this.sharedService.teamMembers.set(parsed.team)
        console.log('📦 Team members loaded from cache')
        return
      }

      // Cache exists but team missing → fetch
      this.fetchTeamMembers()
    } catch (err) {
      console.warn('[getTeamMembers] Cache invalid, refetching', err)
      this.fetchTeamMembers()
    }
  }

  // Personal Profit Logic
  async addPersonalProfit(formData: any): Promise<void> {
    const uid = this.coreUserData()?.uid
    const profitId = uuidv4()

    const profitRef = doc(this.firestore, `users/${uid}/profits/${profitId}`)

    const newProfit = {
      id: profitId,
      profitType: formData.profitType,
      name: formData.name,
      amount: formData.amount,
      note: formData.note || '',
      createdAt: new Date().toISOString()
    }

    // 1. Write to Firestore
    await setDoc(profitRef, newProfit)

    // ----------------------------
    // 2. Update Local Cache
    // ----------------------------

    const cacheKey = 'userProfitsCache'
    const cached = localStorage.getItem(cacheKey)

    let updatedList = []

    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        updatedList = [newProfit, ...parsed]
        localStorage.setItem(cacheKey, JSON.stringify(updatedList))
      } catch (err) {
        console.warn('Error updating profit cache, refetching...', err)
        await this.fetchPersonalProfits()
        return
      }
    } else {
      updatedList = [newProfit]
      localStorage.setItem(cacheKey, JSON.stringify(updatedList))
    }

    // ----------------------------
    // 3. Update signal (UI reactivity)
    // ----------------------------
    this.sharedService.userProfits.set(updatedList)
  }

  // Fetch all profits from Firestore
  async fetchPersonalProfits(): Promise<void> {
    const uid = this.coreUserData()?.uid
    const ref = collection(this.firestore, `users/${uid}/profits`)

    const snapshot = await getDocs(ref)

    let list: any[] = []
    snapshot.forEach(doc => {
      list.push(doc.data())
    })

    localStorage.setItem('userProfitsCache', JSON.stringify(list))
    this.sharedService.userProfits.set(list)

    console.log('🔥 Profits reloaded from Firestore')
  }

  loadPersonalProfits(): void {
    const cached = localStorage.getItem('userProfitsCache')
  
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        this.sharedService.userProfits.set(parsed)
        console.log('📦 Loaded user profits from cache')
        return
      } catch {
        console.warn('Cache corrupted, refetching from Firestore')
      }
    }
  
    // No cache (or bad cache) → fetch from Firestore
    this.fetchPersonalProfits()
  }  

  async editPersonalProfit(profitId: string, formData: any): Promise<void> {
    const uid = this.coreUserData()?.uid
    const profitRef = doc(this.firestore, `users/${uid}/profits/${profitId}`)

    const updatedProfit = {
      ...formData,
      id: profitId,
      updatedAt: new Date().toISOString()
    }

    // 1. Update Firestore
    await updateDoc(profitRef, updatedProfit)

    // ----------------------------
    // 2. Update Local Cache
    // ----------------------------
    const cacheKey = 'userProfitsCache'
    const cached = localStorage.getItem(cacheKey)

    if (cached) {
      try {
        const parsed = JSON.parse(cached)

        // Replace the matching profit in the array
        const updatedList = parsed.map((p: any) =>
          p.id === profitId ? { ...p, ...updatedProfit } : p
        )

        localStorage.setItem(cacheKey, JSON.stringify(updatedList))

        // ----------------------------
        // 3. Update signal (UI reactivity)
        // ----------------------------
        this.sharedService.userProfits.set(updatedList)

        return
      } catch (err) {
        console.warn('Error updating cache on edit, refetching...', err)

        // Worst case: fallback to full reload
        await this.fetchPersonalProfits()
        return
      }
    }

    // If cache doesn't exist, force reload (rare case)
    await this.fetchPersonalProfits()
  }

  async deletePersonalProfit(profitId: string): Promise<void> {
    const uid = this.coreUserData()?.uid
    if (!uid) throw new Error('No user ID found')
  
    const profitRef = doc(this.firestore, `users/${uid}/profits/${profitId}`)
  
    // --------------------------
    // 1. Delete from Firestore
    // --------------------------
    await deleteDoc(profitRef)
  
    // --------------------------
    // 2. Update Local Cache
    // --------------------------
    const cacheKey = 'userProfitsCache'
    const cached = localStorage.getItem(cacheKey)
  
    let updatedList = []
  
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
  
        // Remove the deleted profit
        updatedList = parsed.filter((p: any) => p.id !== profitId)
  
        localStorage.setItem(cacheKey, JSON.stringify(updatedList))
      } catch (err) {
        console.warn('Error updating profit cache after delete, refetching...', err)
        await this.fetchPersonalProfits()
        return
      }
    } else {
      // No cache? Just refetch
      await this.fetchPersonalProfits()
      return
    }
  
    // --------------------------
    // 3. Update Signal
    // --------------------------
    this.sharedService.userProfits.set(updatedList)
  }

  async deletePersonalProfitsByIds(profitIds: string[]): Promise<void> {
    const uid = this.coreUserData()?.uid
    if (!uid) throw new Error('No user ID found')

    if (!profitIds.length) return

    // --------------------------
    // 1️⃣ Delete from Firestore (batch)
    // --------------------------
    const batch = writeBatch(this.firestore)

    profitIds.forEach(profitId => {
      const ref = doc(this.firestore, `users/${uid}/profits/${profitId}`)
      batch.delete(ref)
    })

    await batch.commit()

    // --------------------------
    // 2️⃣ Update Local Cache
    // --------------------------
    const cacheKey = 'userProfitsCache'
    const cached = localStorage.getItem(cacheKey)

    let updatedList: any[] = []

    if (cached) {
      try {
        const parsed = JSON.parse(cached)

        // Remove all deleted profits
        updatedList = parsed.filter(
          (p: any) => !profitIds.includes(p.id)
        )

        localStorage.setItem(cacheKey, JSON.stringify(updatedList))
      } catch (err) {
        console.warn('Error updating profit cache after bulk delete, refetching...', err)
        await this.fetchPersonalProfits()
        return
      }
    } else {
      // No cache? Just refetch
      await this.fetchPersonalProfits()
      return
    }

    // --------------------------
    // 3️⃣ Update Signal
    // --------------------------
    this.sharedService.userProfits.set(updatedList)
  }

  // Business Profit Logic
  async addBusinessProfit(formData: any): Promise<void> {
    const businessId = this.coreUserData()?.businessId
    if (!businessId) return

    const profitId = uuidv4()

    const profitRef = doc(
      this.firestore,
      `businesses/${businessId}/profits/${profitId}`
    )

    const newProfit = {
      id: profitId,
      profitType: formData.profitType,
      name: formData.name,
      amount: formData.amount,
      note: formData.note || '',
      createdAt: new Date().toISOString()
    }

    // 1️⃣ Write to Firestore
    await setDoc(profitRef, newProfit)

    // ----------------------------
    // 2️⃣ Update Local Cache
    // ----------------------------
    const cacheKey = 'businessProfitsCache'
    const cached = localStorage.getItem(cacheKey)

    let updatedList: any[] = []

    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        updatedList = [newProfit, ...parsed]
        localStorage.setItem(cacheKey, JSON.stringify(updatedList))
      } catch (err) {
        console.warn('Error updating business profit cache, refetching...', err)
        await this.fetchBusinessProfits()
        return
      }
    } else {
      updatedList = [newProfit]
      localStorage.setItem(cacheKey, JSON.stringify(updatedList))
    }

    // ----------------------------
    // 3️⃣ Update signal (UI reactivity)
    // ----------------------------
    this.sharedService.businessProfits.set(updatedList)
  }

  async fetchBusinessProfits(): Promise<void> {
    const businessId = this.coreUserData()?.businessId
    if (!businessId) return

    const ref = collection(this.firestore, `businesses/${businessId}/profits`)
    const snapshot = await getDocs(ref)

    const list: any[] = []
    snapshot.forEach(doc => list.push(doc.data()))

    localStorage.setItem('businessProfitsCache', JSON.stringify(list))
    this.sharedService.businessProfits.set(list)
  }

  loadBusinessProfits(): void {
    const cached = localStorage.getItem('businessProfitsCache')
  
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        this.sharedService.businessProfits.set(parsed)
        console.log('📦 Loaded business profits from cache')
        return
      } catch {
        console.warn('Business profit cache corrupted, refetching...')
      }
    }
  
    // No cache or bad cache → fallback to Firestore
    this.fetchBusinessProfits()
  }

  async editBusinessProfit(profitId: string, formData: any): Promise<void> {
    const businessId = this.coreUserData()?.businessId
    if (!businessId) return
  
    const profitRef = doc(
      this.firestore,
      `businesses/${businessId}/profits/${profitId}`
    )
  
    const updatedProfit = {
      ...formData,
      id: profitId,
      updatedAt: new Date().toISOString()
    }
  
    // 1️⃣ Update Firestore
    await updateDoc(profitRef, updatedProfit)
  
    // ----------------------------
    // 2️⃣ Update Local Cache
    // ----------------------------
    const cacheKey = 'businessProfitsCache'
    const cached = localStorage.getItem(cacheKey)
  
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
  
        // Replace the matching profit in the array
        const updatedList = parsed.map((p: any) =>
          p.id === profitId ? { ...p, ...updatedProfit } : p
        )
  
        localStorage.setItem(cacheKey, JSON.stringify(updatedList))
  
        // ----------------------------
        // 3️⃣ Update signal (UI reactivity)
        // ----------------------------
        this.sharedService.businessProfits.set(updatedList)
  
        return
      } catch (err) {
        console.warn('Error updating business profit cache on edit, refetching...', err)
  
        // Worst case: fallback to full reload
        await this.fetchBusinessProfits()
        return
      }
    }
  
    // If cache doesn't exist, force reload (rare case)
    await this.fetchBusinessProfits()
  }

  async deleteBusinessProfit(profitId: string): Promise<void> {
    const businessId = this.coreUserData()?.businessId
    if (!businessId) throw new Error('No business ID found')
  
    const profitRef = doc(
      this.firestore,
      `businesses/${businessId}/profits/${profitId}`
    )
  
    // --------------------------
    // 1️⃣ Delete from Firestore
    // --------------------------
    await deleteDoc(profitRef)
  
    // --------------------------
    // 2️⃣ Update Local Cache
    // --------------------------
    const cacheKey = 'businessProfitsCache'
    const cached = localStorage.getItem(cacheKey)
  
    let updatedList: any[] = []
  
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
  
        // Remove the deleted profit
        updatedList = parsed.filter((p: any) => p.id !== profitId)
  
        localStorage.setItem(cacheKey, JSON.stringify(updatedList))
      } catch (err) {
        console.warn('Error updating business profit cache after delete, refetching...', err)
        await this.fetchBusinessProfits()
        return
      }
    } else {
      // No cache? Just refetch
      await this.fetchBusinessProfits()
      return
    }
  
    // --------------------------
    // 3️⃣ Update Signal
    // --------------------------
    this.sharedService.businessProfits.set(updatedList)
  }

  async deleteBusinessProfitsByIds(profitIds: string[]): Promise<void> {
    const businessId = this.coreUserData()?.businessId
    if (!businessId) throw new Error('No business ID found')

    if (!profitIds.length) return

    // --------------------------
    // 1️⃣ Delete from Firestore (batch)
    // --------------------------
    const batch = writeBatch(this.firestore)

    profitIds.forEach(profitId => {
      const ref = doc(
        this.firestore,
        `businesses/${businessId}/profits/${profitId}`
      )
      batch.delete(ref)
    })

    await batch.commit()

    // --------------------------
    // 2️⃣ Update Local Cache
    // --------------------------
    const cacheKey = 'businessProfitsCache'
    const cached = localStorage.getItem(cacheKey)

    let updatedList: any[] = []

    if (cached) {
      try {
        const parsed = JSON.parse(cached)

        // Remove all deleted profits
        updatedList = parsed.filter(
          (p: any) => !profitIds.includes(p.id)
        )

        localStorage.setItem(cacheKey, JSON.stringify(updatedList))
      } catch (err) {
        console.warn('Error updating business profit cache after bulk delete, refetching...', err)
        await this.fetchBusinessProfits()
        return
      }
    } else {
      // No cache? Just refetch
      await this.fetchBusinessProfits()
      return
    }

    // --------------------------
    // 3️⃣ Update Signal
    // --------------------------
    this.sharedService.businessProfits.set(updatedList)
  }
  //

  async addBusinessTask(formData: any): Promise<void> {
    const businessId = this.coreUserData()?.businessId
    if (!businessId) return

    const taskId = uuidv4()

    const taskRef = doc(
      this.firestore,
      `businesses/${businessId}/tasks/${taskId}`
    )

    const newTask = {
      id: taskId,
      name: formData.name,
      task: formData.task,
      completed: false,
      createdAt: new Date().toISOString()
    }

    // 1️⃣ Write to Firestore
    await setDoc(taskRef, newTask)

    // ----------------------------
    // 2️⃣ Update Local Cache
    // ----------------------------
    const cacheKey = 'businessTasksCache'
    const cached = localStorage.getItem(cacheKey)

    let updatedList: any[] = []

    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        updatedList = [newTask, ...parsed]
        localStorage.setItem(cacheKey, JSON.stringify(updatedList))
      } catch (err) {
        console.warn('Error updating business task cache, refetching...', err)
        await this.fetchBusinessTasks()
        return
      }
    } else {
      updatedList = [newTask]
      localStorage.setItem(cacheKey, JSON.stringify(updatedList))
    }

    // ----------------------------
    // 3️⃣ Update Signal (UI reactivity)
    // ----------------------------
    this.sharedService.businessTasks.set(updatedList)
  }

  async fetchBusinessTasks(): Promise<void> {
    const businessId = this.coreUserData()?.businessId
    if (!businessId) return

    const ref = collection(this.firestore, `businesses/${businessId}/tasks`)
    const snapshot = await getDocs(ref)

    const list: any[] = []
    snapshot.forEach(doc => list.push(doc.data()))

    localStorage.setItem('businessTasksCache', JSON.stringify(list))
    this.sharedService.businessTasks.set(list)

    console.log('🔥 Business tasks reloaded from Firestore')
  }

  loadBusinessTasks(): void {
    const cached = localStorage.getItem('businessTasksCache')

    if (cached) {
      try {
        this.sharedService.businessTasks.set(JSON.parse(cached))
        console.log('📦 Loaded business tasks from cache')
        return
      } catch {
        console.warn('Business task cache corrupted, refetching...')
      }
    }

    this.fetchBusinessTasks()
  }

  async editBusinessTask(taskId: string, formData: any): Promise<void> {
    const businessId = this.coreUserData()?.businessId
    if (!businessId) return

    const taskRef = doc(
      this.firestore,
      `businesses/${businessId}/tasks/${taskId}`
    )

    const updatedTask = {
      ...formData,
      id: taskId,
      updatedAt: new Date().toISOString()
    }

    // 1️⃣ Update Firestore
    await updateDoc(taskRef, updatedTask)

    // ----------------------------
    // 2️⃣ Update Local Cache
    // ----------------------------
    const cacheKey = 'businessTasksCache'
    const cached = localStorage.getItem(cacheKey)

    if (cached) {
      try {
        const parsed = JSON.parse(cached)

        const updatedList = parsed.map((t: any) =>
          t.id === taskId ? { ...t, ...updatedTask } : t
        )

        localStorage.setItem(cacheKey, JSON.stringify(updatedList))

        // ----------------------------
        // 3️⃣ Update Signal
        // ----------------------------
        this.sharedService.businessTasks.set(updatedList)
        return
      } catch (err) {
        console.warn('Error updating business task cache on edit, refetching...', err)
        await this.fetchBusinessTasks()
        return
      }
    }

    // No cache → force reload
    await this.fetchBusinessTasks()
  }

  async deleteBusinessTask(taskId: string): Promise<void> {
    const businessId = this.coreUserData()?.businessId
    if (!businessId) throw new Error('No business ID found')

    const taskRef = doc(
      this.firestore,
      `businesses/${businessId}/tasks/${taskId}`
    )

    // --------------------------
    // 1️⃣ Delete from Firestore
    // --------------------------
    await deleteDoc(taskRef)

    // --------------------------
    // 2️⃣ Update Local Cache
    // --------------------------
    const cacheKey = 'businessTasksCache'
    const cached = localStorage.getItem(cacheKey)

    let updatedList: any[] = []

    if (cached) {
      try {
        const parsed = JSON.parse(cached)

        // Remove the deleted task
        updatedList = parsed.filter((t: any) => t.id !== taskId)

        localStorage.setItem(cacheKey, JSON.stringify(updatedList))
      } catch (err) {
        console.warn('Error updating business task cache after delete, refetching...', err)
        await this.fetchBusinessTasks()
        return
      }
    } else {
      // No cache? Just refetch
      await this.fetchBusinessTasks()
      return
    }

    // --------------------------
    // 3️⃣ Update Signal
    // --------------------------
    this.sharedService.businessTasks.set(updatedList)
  }

  async toggleBusinessTaskCompleted(taskId: string): Promise<void> {
    const businessId = this.coreUserData()?.businessId
    if (!businessId) return

    const cacheKey = 'businessTasksCache'
    const cached = localStorage.getItem(cacheKey)
    if (!cached) {
      await this.fetchBusinessTasks()
      return
    }

    try {
      const parsed = JSON.parse(cached)

      const targetTask = parsed.find((t: any) => t.id === taskId)
      if (!targetTask) return

      const newCompletedValue = !targetTask.completed
      const updatedAt = new Date().toISOString()

      const taskRef = doc(
        this.firestore,
        `businesses/${businessId}/tasks/${taskId}`
      )

      // 1️⃣ Update Firestore
      await updateDoc(taskRef, {
        completed: newCompletedValue,
        updatedAt
      })

      // 2️⃣ Update Local Cache (IMPORTANT PART)
      const updatedList = parsed.map((t: any) =>
        t.id === taskId
          ? { ...t, completed: newCompletedValue, updatedAt }
          : t
      )

      localStorage.setItem(cacheKey, JSON.stringify(updatedList))

      // 3️⃣ Update Signal
      this.sharedService.businessTasks.set(updatedList)

    } catch (err) {
      console.warn('Error toggling task completion, refetching...', err)
      await this.fetchBusinessTasks()
    }
  }

  async addPersonalTask(formData: any): Promise<void> {
    const uid = this.coreUserData()?.uid
    if (!uid) return

    const taskId = uuidv4()

    const taskRef = doc(
      this.firestore,
      `users/${uid}/tasks/${taskId}`
    )

    const newTask = {
      id: taskId,
      name: formData.name,
      task: formData.task,
      completed: false,
      createdAt: new Date().toISOString()
    }

    // 1️⃣ Write to Firestore
    await setDoc(taskRef, newTask)

    // ----------------------------
    // 2️⃣ Update Local Cache
    // ----------------------------
    const cacheKey = 'personalTasksCache'
    const cached = localStorage.getItem(cacheKey)

    let updatedList: any[] = []

    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        updatedList = [newTask, ...parsed]
        localStorage.setItem(cacheKey, JSON.stringify(updatedList))
      } catch (err) {
        console.warn('Error updating personal task cache, refetching...', err)
        await this.fetchPersonalTasks()
        return
      }
    } else {
      updatedList = [newTask]
      localStorage.setItem(cacheKey, JSON.stringify(updatedList))
    }

    // ----------------------------
    // 3️⃣ Update Signal (UI reactivity)
    // ----------------------------
    this.sharedService.personalTasks.set(updatedList)
  }

  async fetchPersonalTasks(): Promise<void> {
    const uid = this.coreUserData()?.uid
    if (!uid) return

    const ref = collection(this.firestore, `users/${uid}/tasks`)
    const snapshot = await getDocs(ref)

    const list: any[] = []
    snapshot.forEach(doc => list.push(doc.data()))

    localStorage.setItem('personalTasksCache', JSON.stringify(list))
    this.sharedService.personalTasks.set(list)

    console.log('🔥 Personal tasks reloaded from Firestore')
  }

  loadPersonalTasks(): void {
    const cached = localStorage.getItem('personalTasksCache')

    if (cached) {
      try {
        this.sharedService.personalTasks.set(JSON.parse(cached))
        console.log('📦 Loaded personal tasks from cache')
        return
      } catch {
        console.warn('Personal task cache corrupted, refetching...')
      }
    }

    this.fetchPersonalTasks()
  }

  async editPersonalTask(taskId: string, formData: any): Promise<void> {
    const uid = this.coreUserData()?.uid
    if (!uid) return

    const taskRef = doc(
      this.firestore,
      `users/${uid}/tasks/${taskId}`
    )

    const updatedTask = {
      ...formData,
      id: taskId,
      updatedAt: new Date().toISOString()
    }

    // 1️⃣ Update Firestore
    await updateDoc(taskRef, updatedTask)

    // ----------------------------
    // 2️⃣ Update Local Cache
    // ----------------------------
    const cacheKey = 'personalTasksCache'
    const cached = localStorage.getItem(cacheKey)

    if (cached) {
      try {
        const parsed = JSON.parse(cached)

        const updatedList = parsed.map((t: any) =>
          t.id === taskId ? { ...t, ...updatedTask } : t
        )

        localStorage.setItem(cacheKey, JSON.stringify(updatedList))

        // ----------------------------
        // 3️⃣ Update Signal
        // ----------------------------
        this.sharedService.personalTasks.set(updatedList)
        return
      } catch (err) {
        console.warn('Error updating personal task cache on edit, refetching...', err)
        await this.fetchPersonalTasks()
        return
      }
    }

    // No cache → force reload
    await this.fetchPersonalTasks()
  }

  async deletePersonalTask(taskId: string): Promise<void> {
    const uid = this.coreUserData()?.uid
    if (!uid) throw new Error('No user ID found')

    const taskRef = doc(
      this.firestore,
      `users/${uid}/tasks/${taskId}`
    )

    // --------------------------
    // 1️⃣ Delete from Firestore
    // --------------------------
    await deleteDoc(taskRef)

    // --------------------------
    // 2️⃣ Update Local Cache
    // --------------------------
    const cacheKey = 'personalTasksCache'
    const cached = localStorage.getItem(cacheKey)

    let updatedList: any[] = []

    if (cached) {
      try {
        const parsed = JSON.parse(cached)

        // Remove the deleted task
        updatedList = parsed.filter((t: any) => t.id !== taskId)

        localStorage.setItem(cacheKey, JSON.stringify(updatedList))
      } catch (err) {
        console.warn('Error updating personal task cache after delete, refetching...', err)
        await this.fetchPersonalTasks()
        return
      }
    } else {
      // No cache? Just refetch
      await this.fetchPersonalTasks()
      return
    }

    // --------------------------
    // 3️⃣ Update Signal
    // --------------------------
    this.sharedService.personalTasks.set(updatedList)
  }

  async togglePersonalTaskCompleted(taskId: string): Promise<void> {
    const uid = this.coreUserData()?.uid
    if (!uid) return

    const cacheKey = 'personalTasksCache'
    const cached = localStorage.getItem(cacheKey)
    if (!cached) {
      await this.fetchPersonalTasks()
      return
    }

    try {
      const parsed = JSON.parse(cached)

      const targetTask = parsed.find((t: any) => t.id === taskId)
      if (!targetTask) return

      const newCompletedValue = !targetTask.completed
      const updatedAt = new Date().toISOString()

      const taskRef = doc(
        this.firestore,
        `users/${uid}/tasks/${taskId}`
      )

      // 1️⃣ Update Firestore
      await updateDoc(taskRef, {
        completed: newCompletedValue,
        updatedAt
      })

      // 2️⃣ Update Local Cache
      const updatedList = parsed.map((t: any) =>
        t.id === taskId
          ? { ...t, completed: newCompletedValue, updatedAt }
          : t
      )

      localStorage.setItem(cacheKey, JSON.stringify(updatedList))

      // 3️⃣ Update Signal
      this.sharedService.personalTasks.set(updatedList)

    } catch (err) {
      console.warn('Error toggling personal task completion, refetching...', err)
      await this.fetchPersonalTasks()
    }
  }

  public async loadMonthlyIncomeExpenseArrays(): Promise<void> {
    // 🛑 Guard: already loaded this session
    // if (this.sharedService.personalIncomeMonthArray.length) {
    //   return
    // }

    const uid = this.coreUserData()?.uid
    if (!uid) return

    // Clear arrays to avoid duplicates
    this.sharedService.personalIncomeMonthArray = []
    this.sharedService.personalExpenseMonthArray = []
    this.sharedService.monthLabels = []

    const profitsRef = collection(this.firestore, `users/${uid}/monthlyProfits`)
    const q = query(profitsRef, orderBy('updatedAt', 'asc'))

    const snapshot = await getDocs(q)

    snapshot.forEach(docSnap => {
      const data = docSnap.data()

      if (typeof data['month'] === 'string') {
        const shortMonth = new Date(`${data['month']} 1`).toLocaleString('default', { month: 'short' })
        this.sharedService.monthLabels.push(shortMonth)
      }

      if (typeof data['income'] === 'number') {
        this.sharedService.personalIncomeMonthArray.push(data['income'])
      }

      if (typeof data['expense'] === 'number') {
        this.sharedService.personalExpenseMonthArray.push(data['expense'])
      }
    })

    // Get last (most recent) month values
    const lastIncome =
      this.sharedService.personalIncomeMonthArray[this.sharedService.personalIncomeMonthArray.length - 1]

    const lastExpense =
      this.sharedService.personalExpenseMonthArray[this.sharedService.personalExpenseMonthArray.length - 1]

    this.sharedService.lastPersonalMonthlyIncome = lastIncome ?? null
    this.sharedService.lastPersonalMonthlyExpense = lastExpense ?? null
  }
}