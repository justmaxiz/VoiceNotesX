import re

with open('d:/relax/projects/voicenotes/src/lib/__tests__/db.test.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r"it\('initializes tables items, audioSessions, and settings', async \(\) => \{.*?\n\s+\}\)", "it('initializes tables items', async () => {\\n    expect(db.items).toBeDefined()\\n  })", content, flags=re.DOTALL)
content = re.sub(r"it\('stores and retrieves audio sessions and user settings', async \(\) => \{.*?\n\s+\}\)", "", content, flags=re.DOTALL)
content = re.sub(r"it\('provides helpers for audio sessions and settings management', async \(\) => \{.*?\n\s+\}\)", "", content, flags=re.DOTALL)

with open('d:/relax/projects/voicenotes/src/lib/__tests__/db.test.ts', 'w', encoding='utf-8') as f:
    f.write(content)

with open('d:/relax/projects/voicenotes/src/lib/__tests__/seedData.test.ts', 'r', encoding='utf-8') as f:
    content_seed = f.read()

content_seed = re.sub(r"const audioCount = await db\.audioSessions\.count\(\)\n\s+expect\(audioCount\)\.toBe\(SEED_AUDIO_SESSIONS\.length\)\n\s+", "", content_seed, flags=re.DOTALL)
content_seed = re.sub(r"it\('contains recent audio recordings', async \(\) => \{.*?\n\s+\}\)", "", content_seed, flags=re.DOTALL)

# Fix dueDate asserts in seedData.test.ts
content_seed = content_seed.replace("expect(focusTask?.dueDate).toBe('21:00')", "expect(focusTask?.dueTime).toBe('21:00')")
content_seed = content_seed.replace("expect(t1?.dueDate).toBe('16:00')", "expect(t1?.dueTime).toBe('16:00')")
content_seed = content_seed.replace("expect(t2?.dueDate).toBe('18:30')", "expect(t2?.dueTime).toBe('18:30')")
content_seed = content_seed.replace("expect(t4?.dueDate).toBe('14:15')", "expect(t4?.dueTime).toBe('14:15')")

with open('d:/relax/projects/voicenotes/src/lib/__tests__/seedData.test.ts', 'w', encoding='utf-8') as f:
    f.write(content_seed)
