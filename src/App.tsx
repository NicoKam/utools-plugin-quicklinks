import { useEffect, useState } from 'react'
import Hello from './Hello'
import Read from './Read'
import QuickLinksList from './QuickLinksList'

export default function App() {
  const [enterAction, setEnterAction] = useState({})
  const [route, setRoute] = useState('quicklinks')

  useEffect(() => {
    window.utools.onPluginEnter((action) => {
      setRoute(action.code)
      setEnterAction(action)
    })
    window.utools.onPluginOut((isKill) => {
      setRoute('')
    })
  }, [])

  if (route === 'quicklinks') {
    return <QuickLinksList />
  }

  if (route === 'read') {
    return <Read enterAction={enterAction} />
  }

  return false
}