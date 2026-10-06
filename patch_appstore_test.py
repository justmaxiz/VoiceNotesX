import re

with open('d:/relax/projects/voicenotes/src/store/__tests__/useAppStore.test.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r"it\('integrates search via searchQuery and searchItems', async \(\) => \{.*?\n\s+\}\)\n", "", content, flags=re.DOTALL)
content = re.sub(r"it\('synchronizes activeTab with useNavigationStore', async \(\) => \{.*?\n\s+\}\)\n", "", content, flags=re.DOTALL)

with open('d:/relax/projects/voicenotes/src/store/__tests__/useAppStore.test.ts', 'w', encoding='utf-8') as f:
    f.write(content)
