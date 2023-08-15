import { useState, useEffect } from 'react'

import './Home.css'
import '../App.css'

import Header from '../components/Header'
import HomeNoStyle from './HomeNoStyle'


function Home(props) {

    const [activeSection, setActiveSection] = useState("links")
    const [withStyles, setWithStyles] = useState(true)

    return (
        <>
            {withStyles?
            <div className='home-page-container'>
                <Header theme={props.theme} setTheme={props.setTheme} setWithStyles={setWithStyles}/>
                <div className="home-page-content" data-theme={props.theme}>
                    <section key='home-links-section' id="home-links-section" className="section">
                        <h2>Test</h2>
                    </section>
                </div>
            </div>    
            :
            <HomeNoStyle setWithStyles={setWithStyles}/>
        }
        </>
    )
}

export default Home
