import { useState } from 'react'

import './App.css'
import Home from './pages/Home'

function App() {
  const [theme, setTheme] = useState("dark")

  return (
    <>
      <Home theme={theme}/>
    </>
  )
}

export default App
