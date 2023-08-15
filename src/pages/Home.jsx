import { useState, useEffect } from 'react'
import ashin1 from '../assets/ashin.jpeg'
import ashin2 from '../assets/ashin2.jpeg'

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
                        <div className="home-bio">
                            <div className="bio-image-container">
                                <img className='bio-image' src={ashin2} alt='ashin sabu'/>
                            </div>
                            <div className="home-bio-text" data-theme={props.theme}>
                                <h1>Hi, I am <b>Ashin Sabu</b></h1>
                                <p>I'm a Software Developer and work primarily with Golang, Javascript(Typescript) - React and Vue, </p>
                                <p>Python, Kubernetes, Docker and ArgoCD(GitOps). </p>
                                <p> --------------------------------------------------------- </p>
                                <p>I have industry experience in C/C++(Embedded), Python & MicroPython, Java, Operating Systems</p>
                                <p>programming and Jenkins CI/CD. I have also tinkered with <a href='https://monkeypoxdetect.web.app/' target='__blank'>deploying Neural Networks to the web</a></p>
                                <p>and actively use and contribute to <a href='https://github.com/argoproj/argo-cd/' target='__blank'>ArgoCD, the best Kubernetes Controller for GitOps to exist</a>.</p>
                            </div>
                        </div>
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
