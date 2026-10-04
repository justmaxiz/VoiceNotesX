import React from 'react'

export interface WorkspaceSyncCardProps {
  deviceInfoText?: string
}

export const WorkspaceSyncCard: React.FC<WorkspaceSyncCardProps> = ({
  deviceInfoText = 'MacBook Pro + iPhone 16 Pro Connected',
}) => {
  return (
    <section className="rounded-2xl bg-surface-container-low p-space-md shadow-sm overflow-hidden flex flex-col gap-space-sm border border-surface-container-high/30">
      <div className="flex items-center justify-between text-outline font-label-sm text-label-sm">
        <span>Синхронизированное рабочее пространство</span>
        <span className="material-symbols-outlined text-label-lg">devices</span>
      </div>
      <div className="relative h-28 w-full rounded-xl overflow-hidden bg-surface-container-highest flex items-center justify-center border border-surface-container-high/30">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-container/20 to-secondary-container/20" />
        <div className="z-10 flex items-center gap-3 text-on-surface-variant font-label-sm">
          <span className="material-symbols-outlined text-2xl text-secondary">laptop_mac</span>
          <span>+</span>
          <span className="material-symbols-outlined text-2xl text-primary">smartphone</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-transparent to-transparent flex items-end p-space-sm">
          <span className="font-label-sm text-label-sm text-on-surface bg-surface-container-lowest/80 backdrop-blur-md px-2 py-0.5 rounded border border-white/5">
            {deviceInfoText}
          </span>
        </div>
      </div>
    </section>
  )
}
