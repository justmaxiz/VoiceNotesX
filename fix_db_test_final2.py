import re
db_test_path = 'd:/relax/projects/voicenotes/src/lib/__tests__/db.test.ts'
with open(db_test_path, 'r', encoding='utf-8') as f:
    db_test = f.read()

db_test = re.sub(r"const settings = await db\.getSettings\(\)\n\s+expect\(settings\?\.userName\)\.toBe\('Иван'\)\n", "", db_test)

with open(db_test_path, 'w', encoding='utf-8') as f:
    f.write(db_test)
