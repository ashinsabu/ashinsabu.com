import { useState } from 'react'

import './Home.css'
import '../App.css'


function Home(props) {
    const [activeSection, setActiveSection] = useState("links")
    const [withStyles, setWithStyles] = useState(true)
    return (
        <div data-theme = {props.theme} className='home-page-container'>
            <section key={section} id={section} className="section">
            <h2>{section}</h2>
            {/* Add your content here */}
          </section>
        </div>
    )
}

export default Home
