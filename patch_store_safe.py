with open('d:/relax/projects/voicenotes/src/store/useAppStore.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove isFocused from store item updates
content = content.replace('i.isFocused', 'i.isFocus')
content = content.replace('isFocused: id === item.id', 'isFocus: id === item.id')

# Remove duplicate state in AppState
content = content.replace("  activeTab: string\n  searchQuery: string\n", "")
content = content.replace("  setActiveTab: (tab: string) => void\n  setSearchQuery: (query: string) => void\n", "")

# Remove from initial state
content = content.replace("  activeTab: 'overview',\n  searchQuery: '',\n", "")

# Remove setters implementation
setter_tab = """  setActiveTab: (tab: string) => {
    set({ activeTab: tab })
    const navStore = useNavigationStore.getState()
    if (navStore.activeTab !== tab) {
      navStore.setActiveTab(tab as any)
    }
  },"""
content = content.replace(setter_tab, "")

setter_search = """  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
    const navStore = useNavigationStore.getState()
    if (navStore.searchQuery !== query) {
      navStore.setSearchQuery(query)
    }
  },"""
content = content.replace(setter_search, "")

# Remove subscribe
subscribe_block = """// Synchronize changes from navigation store to app store
if (typeof window !== 'undefined') {
  useNavigationStore.subscribe((navState) => {
    const current = useAppStore.getState()
    if (current.activeTab !== navState.activeTab) {
      useAppStore.setState({ activeTab: navState.activeTab })
    }
    if (current.searchQuery !== navState.searchQuery) {
      useAppStore.setState({ searchQuery: navState.searchQuery })
    }
  })
}"""
content = content.replace(subscribe_block, "")

with open('d:/relax/projects/voicenotes/src/store/useAppStore.ts', 'w', encoding='utf-8') as f:
    f.write(content)
