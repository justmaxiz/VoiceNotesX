import re

with open('d:/relax/projects/voicenotes/src/hooks/useAudioRecorder.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("export const useAudioRecorder = () => {", "export const useAudioRecorder = () => {\n  const isCancelledRef = useRef(false)\n  useEffect(() => {\n    return () => {\n      isCancelledRef.current = true\n    }\n  }, [])")
content = content.replace("const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })", "const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })\n      if (isCancelledRef.current) {\n        mediaStream.getTracks().forEach(track => track.stop())\n        return\n      }")

with open('d:/relax/projects/voicenotes/src/hooks/useAudioRecorder.ts', 'w', encoding='utf-8') as f:
    f.write(content)

with open('d:/relax/projects/voicenotes/src/hooks/useSpaceRecordShortcut.ts', 'r', encoding='utf-8') as f:
    content2 = f.read()

content2 = content2.replace("export function useSpaceRecordShortcut({ onToggle }: UseSpaceRecordShortcutProps) {", "export function useSpaceRecordShortcut({ onToggle }: UseSpaceRecordShortcutProps) {\n  const onToggleRef = useRef(onToggle)\n  useEffect(() => {\n    onToggleRef.current = onToggle\n  }, [onToggle])")
content2 = content2.replace("onToggle()", "onToggleRef.current()")
content2 = content2.replace("}, [onToggle])", "}, [])")

with open('d:/relax/projects/voicenotes/src/hooks/useSpaceRecordShortcut.ts', 'w', encoding='utf-8') as f:
    f.write(content2)
