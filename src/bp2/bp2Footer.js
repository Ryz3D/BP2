import { Link } from "react-router-dom";

function BP2Footer() {
    const rootStyle = {
        width: '100%',
        marginTop: '25px',
        marginBottom: '7px',
        textAlign: 'center',
    };

    return (
        <div style={rootStyle}>
            <Link to='/copy'>
                &copy; Mirco Heitmann 2022
            </Link>
        </div>
    );
}

export default BP2Footer;
