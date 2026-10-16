import { useEffect, useState } from 'react'
import { LOADING_WORDS } from '../state/copy'

const SHOW_AFTER_MS = 400

export default function LoadingNotice({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!active) return
    const id = setTimeout(() => setVisible(true), SHOW_AFTER_MS)
    return () => {
      clearTimeout(id)
      setVisible(false)
    }
  }, [active])
  if (!active || !visible) return null
  return (
    <div className="toast-layer">
      <div className="toast" role="status">
        {LOADING_WORDS}
      </div>
    </div>
  )
}
