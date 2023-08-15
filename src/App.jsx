import { useState } from 'react';

import './App.css'
import Home from './pages/Home'

function App() {
  const [theme, setTheme] = useState("dark")
  return (
    <div>
      <Home theme={theme} setTheme={setTheme}/>
    </div>
  )
}

export default App
