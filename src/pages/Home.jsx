import { useState, useEffect } from 'react'
import ashin1 from '../assets/ashin.jpeg'
import ashin2 from '../assets/ashin2.jpeg'

import { Card, Box, Typography, CardContent } from '@mui/material';

import './Home.css'
import '../App.css'

import Header from '../components/Header'
import HomeNoStyle from './HomeNoStyle'
import { app } from '../firebase'
import { getStorage, ref, getDownloadURL, getBlob } from "firebase/storage";

const bull = (
    <Box
      component="span"
      sx={{ display: 'inline-block', mx: '2px', transform: 'scale(0.8)' }}
    >
      •
    </Box>
  );

function Home(props) {

    const [activeSection, setActiveSection] = useState("links")
    const [withStyles, setWithStyles] = useState(true)


    const downloadResume = () => {
        const storage = getStorage();
        const storageRef = ref(storage, 'gs://ashinsabu-258b6.appspot.com/Ashin Sabu Resume 2023 February.pdf');
    
        getBlob(storageRef)
        .then((blob) => {
            // Create a URL for the blob data
            const url = URL.createObjectURL(blob);
    
            // Create a link for the user to download the file
            const link = document.createElement('a');
            link.href = url;
            link.download = 'Ashin Sabu Resume.pdf';
            link.textContent = 'Download Resume';
    
            // Append the link to the document
            document.body.appendChild(link);
    
            // Programmatically click the link to trigger the download
            link.click();
    
            // Clean up: remove the link and revoke the URL
            link.remove();
            URL.revokeObjectURL(url);
        })
        .catch((error) => {
            console.error('Error downloading resume:', error);
        });
    };
    
    return (
        <>
            {withStyles?
            <div className='home-page-container'>
                <Header theme={props.theme} setTheme={props.setTheme} setWithStyles={setWithStyles}/>
                <div className="home-page-content" data-theme={props.theme}>
                    <section key='links' id="links" className="section">
                        <div className="home-bio">
                            <div className="bio-image-container" data-theme={props.theme}>
                                <img className='bio-image' src={ashin2} alt='ashin sabu'/>
                            </div>
                            <div className="home-bio-text" data-theme={props.theme}>
                                <h1>Hi, I am <b>Ashin</b></h1>
                                <div className='home-bio-text-info1'>
                                    <h3>{">"} 🧑‍💻 Software Developer</h3>
                                    <h3>{">"} CS Major</h3>
                                    <h3>{">"} Pronouns: he/him</h3>
                                </div>
                                
                                <p>I'm a Software Developer and work primarily with <b>Golang, Javascript(Typescript) - React and Vue, </b></p>
                                <p><b>Python, Kubernetes, Docker and ArgoCD(GitOps). </b></p>
                                <p> --------------------------------------------------------- </p>
                                <p>I have experience with C/C++(Embedded), Python & MicroPython, Java, Operating Systems</p>
                                <p>programming and Jenkins CI/CD. I have also tinkered with <a href='https://monkeypoxdetect.web.app/' target='__blank'>deploying Neural Networks to the web</a></p>
                                <p>and actively use and contribute to <a href='https://github.com/argoproj/argo-cd/' target='__blank'>ArgoCD, the best Kubernetes Controller for GitOps to exist</a>.</p>
                            </div>
                        </div>
                        {/* <p className='quotations'>Push Boundaries {bull} Break Things {bull} Fix Things</p> */}
                        <div className="home-links">
                            <div className="links-title">
                                <p></p>
                                <h2>A Collection of Links</h2>
                                {/* <hr/> */}
                            </div>
                            <div className="link-cards-container" data-theme={props.theme}>
                                <div className="list-card" data-theme={props.theme}> 
                                    <h3 className='card-title'>Resume</h3>
                                    <ul className='card-list'>
                                        <li className='card-list-item'>
                                            <a href="https://drive.google.com/file/d/1quHjHg3BrgchFJLni5EfpJGs_0WAhB38/view" target='__blank'>
                                                {"> "}View on Google Drive<img src='https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Google_Drive_icon_%282020%29.svg/2295px-Google_Drive_icon_%282020%29.svg.png'/>
                                            </a>
                                        </li>
                                        <li className='card-list-item'>
                                            <a onClick={downloadResume} target='__blank'>
                                                {"> "}Download PDF<img src='https://www.iconpacks.net/icons/2/free-pdf-download-icon-2617-thumb.png'/>
                                            </a>
                                        </li>
                                    </ul>
                                </div>
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
