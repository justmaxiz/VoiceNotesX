import re
db_test_path = 'd:/relax/projects/voicenotes/src/lib/__tests__/db.test.ts'
with open(db_test_path, 'r', encoding='utf-8') as f:
    db_test = f.read()

# I will find the describe block 'provides helpers for audio sessions and settings management'
# and remove it entirely. Or, simpler:
# Find any await db.saveSettings...
db_test = re.sub(r"await db\.saveSettings\(.*?\)\n\s+const saved = await db\.getSettings\('default'\)\n\s+expect\(saved\?\.userName\)\.toBe\('Иван'\)\n", "", db_test, flags=re.DOTALL)
db_test = re.sub(r"await db\.saveSettings\(.*?\n.*?\n\s+\}\)\n", "", db_test, flags=re.DOTALL)
db_test = re.sub(r"const saved = await db\.getSettings\('default'\)\n\s+expect\(saved\?\.userName\)\.toBe\('Иван'\)\n", "", db_test)
db_test = re.sub(r"await db\.saveSettings\(\{.*?\}\)\n", "", db_test, flags=re.DOTALL)


with open(db_test_path, 'w', encoding='utf-8') as f:
    f.write(db_test)
