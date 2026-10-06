import re

with open('d:/relax/projects/voicenotes/src/components/dashboard/components/FocusHeroCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

buttons_html = """<div className="flex items-center gap-2">
          {onTogglePlay && (
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Приостановить' : 'Воспроизвести'}
              className="w-10 h-10 rounded-xl bg-surface-container hover:bg-surface-container-highest text-primary flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>
          )}
          {onSummary && (
            <button
              type="button"
              onClick={onSummary}
              className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface font-label-md transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-body-md text-secondary">auto_awesome</span>
              <span className="hidden sm:inline">AI Сводка</span>
            </button>
          )}
        </div>"""

content = content.replace('<div className="flex items-center gap-2"></div>', buttons_html)

with open('d:/relax/projects/voicenotes/src/components/dashboard/components/FocusHeroCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
