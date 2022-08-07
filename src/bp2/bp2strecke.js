import { useState, useEffect } from 'react';
import { BP2Button, BP2Checkbox, BP2NUD } from "./bp2GUI";

function getNextS(strecke, i) {
    return (strecke.slice(0, i).reverse().find(p => p.s) || {}).s || 0;
}

function BP2Section(props) {
    const last = props.section === props.strecke.length - 1;

    const [data, setData] = useState(props.strecke[props.section]);
    const [stop, setStop] = useState(props.strecke[props.section].t !== undefined);

    useEffect(() => {
        setData(props.strecke[props.section]);
        setStop(props.strecke[props.section].t !== undefined);
    }, [props.strecke, props.section]);

    const boxStyle = {
        border: '2px solid black',
    };
    const removeStyle = {
        bottom: 0,
    };

    return (
        <div style={boxStyle}>
            <div style={removeStyle}>
                <BP2Button onClick={() => props.onChange(null)}>
                    -
                </BP2Button>
            </div>
            <BP2Checkbox label='Halt' value={stop} onChange={(s) => {
                setStop(s);
                props.onChange(s ? {
                    v: 0,
                    t: last ? 0 : data.t || 0,
                } : {
                    v: data.v || 160 / 3.6,
                    s: (data.s || getNextS(props.strecke, props.section)),
                });
            }} />
            {stop ?
                last ?
                    <div>
                    </div>
                    :
                    <BP2NUD label='Haltzeit' unit='s' range={[0, 600, 1]}
                        value={data.t} onChange={(t) => props.onChange({
                            v: 0,
                            t,
                        })} />
                :
                <>
                    <BP2NUD label='Geschw.' unit='km/h' range={[1, 300, 1]}
                        value={data.v * 3.6} onChange={(v) => props.onChange({
                            v: v / 3.6,
                            s: data.s || 0,
                        })} />
                    <BP2NUD label='Bis km' unit='km' range={[0, 1000000, 1]}
                        value={data.s / 1000} onChange={(s) => props.onChange({
                            v: data.v || 0,
                            s: s * 1000,
                        })} />
                </>
            }
        </div>
    );
}

function BP2SectionAdd(props) {
    const style = {
        marginTop: '42px',
    };

    return (
        <div style={style}>
            <BP2Button onClick={() => props.onAdd(props.i)}>
                +
            </BP2Button>
        </div>
    );
}

export default function BP2Strecke(props) {
    const style = {
        display: 'flex',
        flexDirection: 'row',
        overflowX: 'scroll',
    };
    const itemStyle = {
        display: 'flex',
    };

    const onAdd = (i) => {
        props.onChange([
            ...(i < 0 ? [] : props.strecke.slice(0, i + 1)),
            { v: 160 / 3.6, s: getNextS(props.strecke, i + 1) },
            ...props.strecke.slice(i + 1),
        ]);
    };

    return (
        <div style={style}>
            {props.strecke.map((s, i) =>
                <div key={i} style={itemStyle}>
                    {i === 0 &&
                        <BP2SectionAdd i={-1} onAdd={onAdd} />
                    }
                    <BP2Section strecke={props.strecke} data={s} section={i}
                        onChange={(data) => props.onChange([
                            ...props.strecke.slice(0, i),
                            ...(data ? [data] : []),
                            ...props.strecke.slice(i + 1),
                        ])} />
                    <BP2SectionAdd i={i} onAdd={onAdd} />
                </div>
            )}
        </div>
    );
}
