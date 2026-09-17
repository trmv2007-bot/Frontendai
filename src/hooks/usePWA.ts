import { useEffect, useState } from 'react'

export function usePWA() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const [updateSW, setUpdateSW] = useState<() => Promise<void>>(() => async () => {})

  useEffect(() => {
    // Try to use virtual:pwa-register if available (vite-plugin-pwa)
    // @ts-ignore virtual module
    import('virtual:pwa-register')
      .then(({ registerSW }: any) => {
        const update = registerSW({
          onNeedRefresh() {
            setNeedRefresh(true)
          },
          onOfflineReady() {
            setOfflineReady(true)
          },
        })
        setUpdateSW(() => update)
      })
      .catch(() => {
        // Fallback: no virtual module in dev without plugin
      })
  }, [])

  return { needRefresh, offlineReady, updateSW }
}
