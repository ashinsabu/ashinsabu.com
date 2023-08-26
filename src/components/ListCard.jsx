
import '../pages/Home.css'
export default function ListCard(props) {

    const { cardTitle, cardList  } = props
    return (
        <div className="list-card" data-theme={props.theme}> 
            <h3 className='card-title'>{cardTitle}</h3>
            <ul className='card-list'>
                {cardList.map((item, index) => {
                    return (
                    <li key={index} className='card-list-item'>
                        <a onClick = {item.clickHandler} href={item.link} target='__blank' className='list-item-link'>
                            {"> "}<img src={item.icon} alt='list item'/>{item.name}
                        </a>
                    </li>)
                })}
            </ul>
        </div>
    )
}
