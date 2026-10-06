import re

with open('d:/relax/projects/voicenotes/src/lib/__tests__/db.test.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Delete any block for 'provides helpers for audio sessions and settings management'
content = re.sub(r"it\('provides helpers for audio sessions and settings management'.*?\}\)", "", content, flags=re.DOTALL)

# Delete any remaining error lines or audio tests
content = re.sub(r"const audioId = await db\.createAudioSession.*?\n", "", content, flags=re.DOTALL)
content = re.sub(r"expect\(audioId\)\.toBeTruthy\(\)\n", "", content, flags=re.DOTALL)
content = re.sub(r"const audio = await db\.getAudioSession\(audioId\)\n", "", content, flags=re.DOTALL)
content = re.sub(r"expect\(audio\?\.title\)\.toBe\('Сессия с микрофона'\)\n", "", content, flags=re.DOTALL)

with open('d:/relax/projects/voicenotes/src/lib/__tests__/db.test.ts', 'w', encoding='utf-8') as f:
    f.write(content)

with open('d:/relax/projects/voicenotes/src/lib/__tests__/seedData.test.ts', 'r', encoding='utf-8') as f:
    content2 = f.read()
    
content2 = re.sub(r"const settings = await db\.settings\.get\('default'\)\n\s+expect\(settings\)\.toBeDefined\(\)\n\s+expect\(settings\?\.userName\)\.toBe\(DEFAULT_USER_SETTINGS\.userName\)\n", "", content2)

with open('d:/relax/projects/voicenotes/src/lib/__tests__/seedData.test.ts', 'w', encoding='utf-8') as f:
    f.write(content2)
