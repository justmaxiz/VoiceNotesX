import re

with open('d:/relax/projects/voicenotes/src/components/dashboard/__tests__/DashboardOverview.test.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

mock_code = """useDashboardConfigStore.setState({
      modules: { ...useDashboardConfigStore.getState().modules, recentAudio: true, focusTask: true, taskList: true },
    })
    
    // Mock the toggleTask so it doesn't call IndexedDB
    useAppStore.setState({
      toggleTask: async (id) => {
        useAppStore.setState((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, status: item.status === 'completed' ? 'todo' : 'completed' }
              : item
          ),
        }))
      }
    })"""

content = content.replace("""useDashboardConfigStore.setState({
      modules: { ...useDashboardConfigStore.getState().modules, recentAudio: true, focusTask: true, taskList: true },
    })""", mock_code)

with open('d:/relax/projects/voicenotes/src/components/dashboard/__tests__/DashboardOverview.test.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
