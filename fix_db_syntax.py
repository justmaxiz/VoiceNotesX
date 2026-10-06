import re
db_test_path = 'd:/relax/projects/voicenotes/src/lib/__tests__/db.test.ts'
with open(db_test_path, 'r', encoding='utf-8') as f:
    db_test = f.read()

db_test = re.sub(r"  \}\)\n\n  \n    \n        \n    \n    \n          \}\)\n\}\)\n", "  })\n})\n", db_test)
# Just to be safe:
db_test = re.sub(r"expect\(t2\?\.isFocus\)\.toBe\(true\)\n  \}\)\n.*?\}\)\n", "expect(t2?.isFocus).toBe(true)\n  })\n})\n", db_test, flags=re.DOTALL)

with open(db_test_path, 'w', encoding='utf-8') as f:
    f.write(db_test)
