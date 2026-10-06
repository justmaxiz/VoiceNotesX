with open('d:/relax/projects/voicenotes/src/store/useAppStore.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const { items, activeFilter, sortOrder, searchQuery } = get()", "const { items, activeFilter, sortOrder } = get()\n    const { searchQuery } = useNavigationStore.getState()")

with open('d:/relax/projects/voicenotes/src/store/useAppStore.ts', 'w', encoding='utf-8') as f:
    f.write(content)
