import React from 'react';
import darkModeButton from '../assets/darkModeButton.svg'
import lightModeButton from '../assets/lightModeButton.svg'

import './Header.css'
import '../App.css'


function Header(props) {

    const themeSwitchHandler = () => {
        if (props.theme === "dark") {
            props.setTheme("light")
        } else {
            props.setTheme("dark")
        }
    }
    const withStylesHandler = () => {
        props.setWithStyles(false)
    }

    return ( 
        <div className = "header-container" data-theme={props.theme}>
            <div className="header-logo-container">
                <h1 className="header-logo">ashinsabu.com</h1>
            </div>
            <div className="header-links-container">
                <a href="#links" className="header-link">Links</a>
                <a href="#skills" className="header-link">Skills</a>
                <a href="#reading" className="header-link">Reading</a>
                <a href="#contactme" className="header-link">Contact Me</a>
            </div>
            <div className="header-theme-container">
                <button className="header-theme-button" onClick={themeSwitchHandler}><
                    img src={props.theme === 'dark'?darkModeButton:lightModeButton} alt='switch theme to dark'/>
                </button>
            </div>
            <div className="header-switch-styling-container">
                <p onClick={withStylesHandler}>I hate CSS</p>
            </div>
        </div>
    );
}

export default Header;