import React from 'react';

function HomeNoStyle(props) {

    const withStylesHandler = () => {
        props.setWithStyles(true)
    }
    return ( 
        <div className='nostyle-home-container' style={{padding: '32px'}}>
            <div className="nostyle-home-header" style={{display: 'flex', gap: '32px'}}>
                <p>ashinsabu.com</p>
                <a href='#links' onClick={withStylesHandler}>Take me back</a>
            </div>
            <div className="nostyle-home-content">
            </div>
        </div>
        
     );
}

export default HomeNoStyle;