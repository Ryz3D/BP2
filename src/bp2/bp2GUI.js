import { useState, useEffect } from 'react';

const version = '3.0';

function BP2Slider(props) {
    const range = props.range || [0, 100, 1];

    const setIfNum = (n) => {
        var num = parseFloat(n);
        if (!isNaN(num)) {
            if (props.forceRange) {
                num = Math.min(range[1], Math.max(range[0], num));
            }
            if (props.onChange) {
                props.onChange(num);
            }
        }
    }

    const rootStyle = {
        display: 'flex',
        margin: '5px',
    };
    const labelStyle = {
        marginRight: '10px',
    };
    const style = {
        width: '100%',
        margin: '0',
    };
    const numStyle = {
        width: '20%',
    };

    return (
        <div style={rootStyle}>
            {props.label &&
                <div style={labelStyle}>
                    {props.label}
                </div>
            }
            <input type="range" style={style} min={range[0]} max={range[1]} step={range[2]}
                value={props.value} onChange={(e) => setIfNum(e.target.value)} />
            <input type="number" style={numStyle} min={range[0]} max={range[1]} step={range[2]}
                value={props.value} onChange={(e) => setIfNum(e.target.value)} />
            {props.unit &&
                <div>
                    {props.unit}
                </div>
            }
        </div>
    )
}

function BP2NUD(props) {
    const range = props.range || [0, 100, 1];

    const [text, setText] = useState((props.value || 0).toString());

    useEffect(() => {
        setText((props.value || 0).toString());
    }, [props.value]);

    const setIfNum = (n) => {
        setText(n);
        var num = parseFloat(n);
        if (!isNaN(num)) {
            if (props.forceRange) {
                num = Math.min(range[1], Math.max(range[0], num));
            }
            if (props.onChange) {
                props.onChange(num);
            }
        }
    }

    const rootStyle = {
        display: 'flex',
        margin: '5px',
    };
    const labelStyle = {
        marginRight: '10px',
    };
    const numStyle = {
        width: '20%',
        minWidth: '40px',
    };

    return (
        <div style={rootStyle}>
            {props.label &&
                <div style={labelStyle}>
                    {props.label}
                </div>
            }
            <input type="number" style={numStyle} min={range[0]} max={range[1]} step={range[2]}
                value={text} onChange={(e) => setIfNum(e.target.value)} />
            {props.unit &&
                <div>
                    {props.unit}
                </div>
            }
        </div>
    )
}

function BP2Seconds(props) {
    const min = Math.floor(props.value / 60);
    const sec = Math.round((props.value / 60 - min) * 60).toString().padStart(2, '0');

    return (
        <div>
            {props.label} {min}:{sec} ({roundTo(props.value, 2)} s)
        </div>
    );
}

function BP2Button(props) {
    return (
        <button onClick={props.onClick} style={{ width: props.noWidth ? '' : '100%' }}>
            {props.children}
        </button>
    );
}

function BP2Checkbox(props) {
    const style = {
        cursor: 'pointer',
        userSelect: 'none',
    };

    return (
        <div style={style} onClick={() => props.onChange(!props.value)}>
            <input type='checkbox' style={{ cursor: 'pointer' }}
                checked={props.value} onChange={(e) => props.onChange(e.target.checked)} />
            {props.label}
        </div>
    );
}

function BP2Input(props) {
    const style = {
        display: 'flex',
        flexDirection: 'row',
    };

    return (
        <div style={style}>
            {props.label}
            <input type='text' value={props.value} onChange={(e) => props.onChange(e.target.value)} />
        </div>
    );
}

function BP2Tabs(props) {
    const [tab, setTab] = useState(0);

    return (
        <>
            <div style={{ display: 'flex' }}>
                {props.tabs.map((text, i) =>
                    <BP2Button key={i} onClick={() => setTab(i)}>
                        {text}
                    </BP2Button>
                )}
            </div>
            <div>
                {(props.children || [])[tab] || <div></div>}
            </div>
        </>
    );
}

function roundTo(n, places) {
    return Math.round(n * Math.pow(10, places)) / Math.pow(10, places);
}

function formatTime(s) {
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s - hours * 3600) / 60);
    const seconds = Math.floor(s - hours * 3600 - minutes * 60);
    return hours.toString().padStart(2, '0') +
        ':' + minutes.toString().padStart(2, '0') +
        ':' + seconds.toString().padStart(2, '0');
}

export { BP2Slider, BP2NUD, BP2Seconds, BP2Button, BP2Checkbox, BP2Input, BP2Tabs, roundTo, formatTime, version };
