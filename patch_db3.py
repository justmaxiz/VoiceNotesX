import re

with open('d:/relax/projects/voicenotes/src/lib/db.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("modify({ isFocus: false, isFocused: false })", "modify({ isFocus: false })")
content = re.sub(r"await this\.items\.where\('isFocused'\)\.equals\(1\)\.modify\(\{ isFocus: false \}\)\n", "", content)
content = content.replace("update(id, { isFocus: true, isFocused: true })", "update(id, { isFocus: true })")
# isFocused in db index?
content = content.replace("isFocused", "isFocus") # this might replace other things if we aren't careful, but it's safe for db.ts

with open('d:/relax/projects/voicenotes/src/lib/db.ts', 'w', encoding='utf-8') as f:
    f.write(content)
