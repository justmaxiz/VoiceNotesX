import re

with open('d:/relax/projects/voicenotes/src/lib/db.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r"await this\.transaction\('rw', \[this\.items, this\.audioSessions, this\.settings\], async \(\) => \{\s+await this\.items\.clear\(\)\s+await this\.audioSessions\.clear\(\)\s+await this\.settings\.clear\(\)\s+\}\)", 
    "await this.transaction('rw', [this.items], async () => {\\n      await this.items.clear()\\n    })", 
    content
)

with open('d:/relax/projects/voicenotes/src/lib/db.ts', 'w', encoding='utf-8') as f:
    f.write(content)
