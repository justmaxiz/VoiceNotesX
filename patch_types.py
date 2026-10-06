import re

with open('d:/relax/projects/voicenotes/src/types/item.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'\s*isFocused\?: boolean;', '', content)
content = re.sub(r'export interface AudioSession \{.*?\}\n', '', content, flags=re.DOTALL)

with open('d:/relax/projects/voicenotes/src/types/item.ts', 'w', encoding='utf-8') as f:
    f.write(content)

with open('d:/relax/projects/voicenotes/src/types/index.ts', 'r', encoding='utf-8') as f:
    content_index = f.read()
    
content_index = content_index.replace('AudioSession,', '')

with open('d:/relax/projects/voicenotes/src/types/index.ts', 'w', encoding='utf-8') as f:
    f.write(content_index)

# Also fix useAppStore.ts to use isFocus instead of isFocused, and remove AudioSessions
with open('d:/relax/projects/voicenotes/src/store/useAppStore.ts', 'r', encoding='utf-8') as f:
    store = f.read()

store = store.replace('i.isFocused', 'i.isFocus')
store = store.replace('isFocused: id === item.id', 'isFocus: id === item.id')
# The duplicated activeTab and searchQuery logic from useAppStore
store = re.sub(r"activeTab: useNavigationStore\.getState\(\)\.activeTab,.*?\n\s*", "", store, flags=re.DOTALL|re.IGNORECASE)
store = re.sub(r"searchQuery: useNavigationStore\.getState\(\)\.searchQuery,.*?\n\s*", "", store, flags=re.DOTALL|re.IGNORECASE)

with open('d:/relax/projects/voicenotes/src/store/useAppStore.ts', 'w', encoding='utf-8') as f:
    f.write(store)
