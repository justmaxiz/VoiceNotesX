import re

with open('d:/relax/projects/voicenotes/src/components/dashboard/components/FocusHeroCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's completely replace the component declaration to be safe
decl_start = "export const FocusHeroCard: React.FC<FocusHeroCardProps> = ({"
decl_end = "}) => {"

new_decl = """export const FocusHeroCard: React.FC<FocusHeroCardProps> = ({
  title: propTitle,
  description: propDescription,
  deadlineText: propDeadLine,
  categoryTag: propCategoryTag,
  priority: propPriority,
  audioUrl: propAudioUrl,
  checklist: propChecklist,
  onComplete,
  isCompleted: initialCompleted = false,
  isPlaying,
  onTogglePlay,
  onSummary,
}) => {"""

# Replace from decl_start to decl_end
content = re.sub(r"export const FocusHeroCard: React\.FC<FocusHeroCardProps> = \(\{.*?\}\) => \{", new_decl, content, flags=re.DOTALL)

with open('d:/relax/projects/voicenotes/src/components/dashboard/components/FocusHeroCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
