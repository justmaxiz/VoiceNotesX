import re

with open('d:/relax/projects/voicenotes/src/lib/db.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove settings and audioSessions tables from db.ts
content = re.sub(r'export class VoiceNotesDB extends Dexie \{.*?\n\s+constructor\(\) \{', 
    '''export class VoiceNotesDB extends Dexie {
  items!: Table<Item, string>

  constructor() {''', content, flags=re.DOTALL)

content = re.sub(r'audioSessions:.*?settings:.*?\}', '}', content, flags=re.DOTALL)

# Delete audio session and settings methods
content = re.sub(r'async getAudioSession.*?async getSettings\(\).*?\}', '', content, flags=re.DOTALL)
content = re.sub(r'async saveSettings\(settings: Partial<UserSettings>\).*?\}', '', content, flags=re.DOTALL)

with open('d:/relax/projects/voicenotes/src/lib/db.ts', 'w', encoding='utf-8') as f:
    f.write(content)

with open('d:/relax/projects/voicenotes/src/lib/seedData.ts', 'r', encoding='utf-8') as f:
    content_seed = f.read()

content_seed = re.sub(r'export const SEED_AUDIO_SESSIONS.*?\]\n', '', content_seed, flags=re.DOTALL)
content_seed = re.sub(r'await db\.transaction\(\'rw\', \[db\.items, db\.audioSessions, db\.settings\], async \(\) => \{', "await db.transaction('rw', [db.items], async () => {", content_seed)
content_seed = re.sub(r'await db\.audioSessions\.clear\(\)\n\s+await db\.settings\.clear\(\)', '', content_seed)
content_seed = re.sub(r'await db\.audioSessions\.bulkPut\(SEED_AUDIO_SESSIONS\)\n\s+await db\.settings\.bulkPut\(\[DEFAULT_USER_SETTINGS\]\)', '', content_seed)

with open('d:/relax/projects/voicenotes/src/lib/seedData.ts', 'w', encoding='utf-8') as f:
    f.write(content_seed)
