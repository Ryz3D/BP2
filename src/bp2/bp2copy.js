import { Link } from 'react-router-dom';

function BP2Copy() {
    const rootStyle = {
        width: '100%',
        marginTop: '25px',
        textAlign: 'center',
    };

    return (
        <div style={rootStyle}>
            &copy; Mirco Heitmann 2022
            <br />
            <br />
            Für jegliche Weitergabe und Bearbeitungen im nicht privaten Rahmen ist die Einverständnis des Eigentümers notwendig.
            <br />
            <br />
            <Link to='/'>
                &lt;-
            </Link>
        </div>
    );
}

export default BP2Copy;
