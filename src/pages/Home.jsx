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
import { getAnalytics, logEvent } from 'firebase/analytics';

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

    const analytics = getAnalytics(app)

    const handleClickLog = (whatClicked) => {
        logEvent(analytics, 'link_clicked', { link: whatClicked });
    }

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
            logEvent(analytics, 'resume_download', { method: 'pdf' });

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
                                <p id='dotted-line'> --------------------------------------------------------- </p>
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
                            <div className="list-cards-container" data-theme={props.theme}>

                                <div className="list-card" data-theme={props.theme}> 
                                    <h3 className='card-title'>Resume</h3>
                                    <ul className='card-list'>
                                        <li className='card-list-item'>
                                            <a onClick={() => {handleClickLog('driveresume')}} href="https://drive.google.com/file/d/1quHjHg3BrgchFJLni5EfpJGs_0WAhB38/view" target='__blank'>
                                                {"> "}<img src='https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Google_Drive_icon_%282020%29.svg/2295px-Google_Drive_icon_%282020%29.svg.png'/>View on Drive
                                            </a>
                                        </li>
                                        <li className='card-list-item'>
                                            <a onClick={downloadResume} target='__blank'>
                                                {"> "}<img src='https://www.iconpacks.net/icons/2/free-pdf-download-icon-2617-thumb.png'/>Download PDF
                                            </a>
                                        </li>
                                    </ul>
                                </div>

                                <div className="list-card" data-theme={props.theme}> 
                                    <h3 className='card-title'>Social Media</h3>
                                    <ul className='card-list'>
                                        <li className='card-list-item'>
                                            <a onClick={() => {handleClickLog('linkedin')}} href="https://www.linkedin.com/in/ashin-sabu-1059a6175/" target='__blank'>
                                                {"> "} <img src='https://cdn-icons-png.flaticon.com/512/174/174857.png'/>LinkedIn
                                            </a>
                                        </li>
                                        <li className='card-list-item'>
                                            <a onClick={() => {handleClickLog('twitter')}} href="https://twitter.com/ashinsabu3/" target='__blank'>
                                                {"> "}<img src='https://cdn-icons-png.flaticon.com/512/124/124021.png'/> Twitter
                                            </a>
                                        </li>
                                        <li className='card-list-item'>
                                            <a onClick={() => {handleClickLog('instagram')}} href="https://www.instagram.com/ashinsabu3/" target='__blank'>
                                                {"> "}<img src='https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/2048px-Instagram_icon.png'/>Instagram
                                            </a>
                                        </li>
                                    </ul>
                                </div>

                                <div className="list-card" data-theme={props.theme}> 
                                    <h3 className='card-title'>See what I'm building</h3>
                                    <ul className='card-list'>
                                        <li className='card-list-item'>
                                            <a onClick={() => {handleClickLog('github1')}} href="https://github.com/ashinsabu" target='__blank'>
                                                {"> "}<img src='https://cdn-icons-png.flaticon.com/512/25/25231.png' alt='github'/>ashinsabu
                                            </a>
                                        </li>
                                        <li className='card-list-item'>
                                            <a onClick={() => {handleClickLog('github2')}} href="https://github.com/ashinsabu3" target='__blank'>
                                                {"> "}<img src='https://cdn-icons-png.flaticon.com/512/25/25231.png' alt='github'/> ashinsabu3
                                            </a>
                                        </li>
                                    </ul>
                                </div>

                                <div className="list-card" data-theme={props.theme}> 
                                    <h3 className='card-title'>Other Coding Profiles</h3>
                                    <ul className='card-list'>
                                        <li className='card-list-item'>
                                            <a onClick={() => {handleClickLog('codeforces')}} href="https://codeforces.com/profile/ashin" target='__blank'>
                                                {"> "}<img src='https://cdn.iconscout.com/icon/free/png-256/free-code-forces-3629285-3031869.png?f=webp' alt='codeforces'/> Codeforces
                                            </a>
                                        </li>
                                        <li className='card-list-item'>
                                            <a onClick={() => {handleClickLog('leetcode')}} href="https://leetcode.com/ashinsabu/" target='__blank'>
                                                {"> "} <img src='https://cdn.iconscout.com/icon/free/png-256/free-leetcode-3521542-2944960.png'/> LeetCode
                                            </a>
                                        </li>
                                        <li className='card-list-item'>
                                            <a onClick={() => {handleClickLog('codechef')}} href="https://www.codechef.com/users/ashin_sabu" target='__blank'>
                                                {"> "}<img src='https://avatars1.githubusercontent.com/u/11960354?s=460&v=4'/> CodeChef
                                            </a>
                                        </li>
                                        <li className='card-list-item'>
                                            <a onClick={() => {handleClickLog('hackerrank')}} href="https://www.hackerrank.com/ashin_sabu3" target='__blank'>
                                                {"> "}<img src='https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/160_Hackerrank_logo_logos-512.png'/> Hackerrank
                                            </a>
                                        </li>
                                    </ul>
                                </div>

                            </div>
                        </div>
                    </section>
                    <section key='skills' id="skills" className="section">
                        <p className='quotations'>"Push Boundaries {bull} Break Things {bull} Fix Things"</p>
                        <div className="skills-title">
                            <h2>My Technical Skills</h2>
                        </div>
                        <div className="list-cards-container" data-theme={props.theme}>

                            <div className="list-card" data-theme={props.theme}> 
                                <h3 className='card-title'>Languages</h3>
                                <ul className='card-list'>
                                    <li className='card-list-item'>
                                        {"> "} <img src='https://static-00.iconduck.com/assets.00/golang-icon-398x512-eygvdisi.png'/> Go
                                    </li>
                                    <li className='card-list-item'>
                                        {"> "} <img src='https://cdn-icons-png.flaticon.com/512/5968/5968381.png'/> Typescript(Javascript)
                                    </li>
                                    <li className='card-list-item'>
                                        {"> "} <img src='https://cdn-icons-png.flaticon.com/512/6132/6132222.png'/> C/C++
                                    </li>
                                    <li className='card-list-item'>
                                        {"> "} <img src='https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python-logo-notext.svg/1869px-Python-logo-notext.svg.png'/> Python
                                    </li>
                                </ul>
                            </div>

                            <div className="list-card" data-theme={props.theme}> 
                                <h3 className='card-title'>Frameworks, Libraries and Databases</h3>
                                <ul className='card-list'>
                                    <li className='card-list-item'>
                                        {"> "} <img src='https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/2300px-React-icon.svg.png'/> React.js
                                    </li>
                                    <li className='card-list-item'>
                                        {"> "} <img src='https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/jest-js-icon.png'/> Jest
                                    </li>
                                    <li className='card-list-item'>
                                        {"> "} <img src='https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Tensorflow_logo.svg/1915px-Tensorflow_logo.svg.png'/> Tensorflow
                                    </li>
                                    <li className='card-list-item'>
                                        {"> "}<img src='https://cdn.icon-icons.com/icons2/2415/PNG/512/mongodb_original_logo_icon_146424.png'/> MongoDB (DB)
                                    </li>
                                    <li className='card-list-item'>
                                        {"> "}<img src='https://cdn4.iconfinder.com/data/icons/redis-2/1451/Untitled-2-512.png'/>Redis (DB)
                                    </li>
                                </ul>
                            </div>

                            <div className="list-card" data-theme={props.theme}> 
                                <h3 className='card-title'>DevOps & Other Tools</h3>
                                <ul className='card-list'>
                                    <li className='card-list-item'>
                                        {"> "} <img src='https://www.docker.com/wp-content/uploads/2022/03/vertical-logo-monochromatic.png'/> Docker
                                    </li>
                                    <li className='card-list-item'>
                                        {"> "} <img src='https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/kubernetes-icon.png'/> Kubernetes
                                    </li>
                                    <li className='card-list-item'>
                                        {"> "} <img src='https://icons-for-free.com/download-icon-argocd-1331550886883580947_512.png'/> Argo CD
                                    </li>
                                    <li className='card-list-item'>
                                        {"> "}<img src='https://static-00.iconduck.com/assets.00/google-gke-icon-512x457-q6s0e3iu.png'/> Google Kubernetes Engine
                                    </li>
                                    <li className='card-list-item'>
                                        {"> "}<img src='https://cdn4.iconfinder.com/data/icons/google-i-o-2016/512/google_firebase-2-512.png'/> Firebase
                                    </li>
                                    <li className='card-list-item'>
                                        {"> "}<img src='https://cdn.iconscout.com/icon/free/png-256/free-aws-1869025-1583149.png'/> AWS
                                    </li>
                                </ul>
                            </div>
                            <div className="list-card" data-theme={props.theme}> 
                                <h3 className='card-title'>Operating Systems</h3>
                                <ul className='card-list'>
                                    <li className='card-list-item'>
                                        {"> "} <img src='https://cdn-icons-png.flaticon.com/512/5969/5969282.png'/> Linux(Ubuntu)
                                    </li>
                                    <li className='card-list-item'>
                                        {"> "} <img src='https://cdn.icon-icons.com/icons2/2415/PNG/512/debian_original_logo_icon_146566.png'/> Linux(Debian)
                                    </li>
                                    <li className='card-list-item'>
                                        {"> "}<img src='https://cdn-icons-png.flaticon.com/512/2/2235.png'/> macOS
                                    </li>
                                    <li className='card-list-item'>
                                        {"> "}<img src='https://www.freeiconspng.com/thumbs/windows-icon-png/cute-ball-windows-icon-png-16.png'/> Windows
                                    </li>
                                </ul>
                            </div>
                        </div>
                        
                    </section>
                    <section key='reading' id="reading" className="section">
                        <div className="skills-title">
                            <h2>Books and Reading Recommendations</h2>
                        </div>
                        <div className="reading-subtitle">
                            <p>These are books and papers I am currently reading or plan to read soon and</p>
                            <p>recommend if you want to expand your general knowledge of various computer</p>
                            <p>science concepts and history.</p>
                        </div>
                        <div className="list-card read-list" data-theme={props.theme}>
                            <div className="read-papers">
                                <h3>Papers and Articles</h3>
                                <h4>Distributed Systems</h4>
                                <p>
                                    {"> "}
                                    <img src='https://cdn-icons-png.flaticon.com/512/8332/8332640.png'/>
                                    <a href='https://static.googleusercontent.com/media/research.google.com/en//archive/mapreduce-osdi04.pdf' target='__blank'> MapReduce <span className='paper-subtitle'>by Google</span></a>
                                </p>
                                <p>
                                    {"> "}
                                    <img src='https://cdn-icons-png.flaticon.com/512/8332/8332640.png'/>
                                    <a href='https://research.google/pubs/pub51/' target='__blank'>Google File System <span className='paper-subtitle'>by Google</span></a>
                                </p>
                                <p>
                                    {"> "}
                                    <img src='https://cdn-icons-png.flaticon.com/512/8332/8332640.png'/>
                                    <a href='https://research.google/pubs/pub27898/' target='__blank'> BigTable <span className='paper-subtitle'>by Google</span></a>
                                </p>
                                <p>
                                    {"> "}
                                    <img src='https://cdn-icons-png.flaticon.com/512/8332/8332640.png'/>
                                    <a href='https://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.41.7628' target='__blank'> A note on Distributed Systems <span className='paper-subtitle'>by Jim Waldo</span></a>
                                </p>
                                
                            </div>
                            <div className="read-books">
                                <h3>Books</h3>
                                <h4>Languages</h4>
                                <p>
                                    {"> "}
                                    <img src='https://cdn-icons-png.flaticon.com/512/2702/2702134.png'/>
                                    <a href='http://www.cs.uniroma2.it/upload/2017/TSC/The%20Go%20Programming%20Language.pdf' target='__blank'> The Go Programming Language <span className='paper-subtitle'>by Alan & Brian K.</span></a>
                                </p>
                                <h4>Concepts and Classics</h4>
                                <p>
                                    {"> "}
                                    <img src='https://cdn-icons-png.flaticon.com/512/8332/8332640.png'/>
                                    <a href='http://www.javier8a.com/itc/bd1/articulo.pdf' target='__blank'>Design Patterns</a>
                                </p>
                                <p>
                                    {"> "}
                                    <img src='https://cdn-icons-png.flaticon.com/512/8332/8332640.png'/>
                                    <a href='https://github.com/ms2ag16/Books/blob/master/Designing%20Data-Intensive%20Applications%20-%20Martin%20Kleppmann.pdf' target='__blank'>Designing Data Intensive Applications</a>
                                </p>
                                <p>
                                    {"> "}
                                    <img src='https://cdn-icons-png.flaticon.com/512/8332/8332640.png'/>
                                    <a href='https://csc-knu.github.io/sys-prog/books/Andrew%20S.%20Tanenbaum%20-%20Operating%20Systems.%20Design%20and%20Implementation.pdf' target='__blank'>Operating Systems: Design and Implementation</a>
                                </p>
                            </div>
                        </div>
                    </section>
                    <section key='contactme' id="contactme" className="section">
                        <div className="skills-title">
                            <h2>Contact Me</h2>
                        </div>
                        <div className="contactme-subtitle">
                            <p>Feel free to reach out to me on any of the following platforms</p>
                            <p>or send me an email at <b>
                                <a href='mailto:ashin.sabu3@gmail.com' target='__blank'>ashin.sabu3@gmail.com</a>
                            </b></p>
                        </div>
                        <div className="list-card" style={{paddingTop: '4px'}} data-theme={props.theme}>
                            <ul className='card-list'>
                                <li className='card-list-item'>
                                    {"> "} <img src='https://cdn-icons-png.flaticon.com/512/174/174857.png'/> <a href='https://www.linkedin.com/in/ashin-sabu-1059a6175/' target='__blank'>LinkedIn</a>
                                </li>
                                <li className='card-list-item'>
                                    {"> "} <img src='https://cdn-icons-png.flaticon.com/512/124/124021.png'/> <a href='https://twitter.com/ashinsabu3/' target='__blank'>Twitter</a>
                                </li>
                                <li className='card-list-item'>
                                    {"> "} <img src='https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/2048px-Instagram_icon.png'/> <a href='https://www.instagram.com/ashinsabu3/' target='__blank'>Instagram</a>
                                </li>
                            </ul>
                        </div>

                    </section>
                </div>
                <div className="footer" data-theme={props.theme}>
                    <p>Built with ❤️ by Ashin</p>
                    <p><img style={{height: '20px'}} src='https://cdn-icons-png.flaticon.com/512/25/25231.png'/><a href='https://github.com/ashinsabu/ashinsabu.com' target='__blank'>View Source Code</a></p>
                </div>
            </div>    
            :
            <HomeNoStyle setWithStyles={setWithStyles}/>
        }
        </>
    )
}

export default Home
