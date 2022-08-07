import { useState, useEffect, useRef } from 'react';
import { BP2Button, version } from './bp2GUI';
import { Helmet } from 'react-helmet';
import { XMLParser } from 'fast-xml-parser';
import { Link } from 'react-router-dom';

export default function BP2UPlan() {
    const [stations, setStations] = useState([]);
    const [stationNames, setStationNames] = useState({});
    const [trains, setTrains] = useState([]);
    const [uPlan, setUPlan] = useState([]);

    const [start, setStart] = useState(0);
    const [end, setEnd] = useState(1);

    const [settingsHeight, setSettingsHeight] = useState(0);
    const [windowHeight, setWindowHeight] = useState(0);
    const [windowWidth, setWindowWidth] = useState(0);

    const settings = useRef();

    const height = ((windowHeight - settingsHeight) || 600) - 10;

    const parseTime = (t) => parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]);
    const parseLine = (t) => parseInt(t.split(':')[0]);
    const parseKm = (t) => parseFloat(t.split(':')[1]);

    const timeStr = t => `${Math.floor(t / 60).toString().padStart(2, '0')}:${Math.floor(t % 60).toString().padStart(2, '0')}`;

    useEffect(() => {
        const startT = 640 + start * 100;
        const endT = 640 + end * 100;
        const lerpX = x => windowWidth * (x - startT) / (endT - startT);

        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, windowWidth, height);

        ctx.save();
        ctx.strokeStyle = '#000c';
        ctx.font = '13px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#000e';
        for (var t = 600; t <= endT; t += 15) {
            ctx.beginPath();
            ctx.moveTo(lerpX(t), 0);
            ctx.lineTo(lerpX(t), height);
            ctx.lineWidth = t % 30 === 0 ? 2 : 1;
            ctx.stroke();
            ctx.fillText(timeStr(t), lerpX(t) + 2, 2);
        }
        ctx.restore();

        for (var ti in uPlan) {
            for (var ti2 in uPlan[ti]) {
                if (!uPlan[ti][ti2])
                    continue;

                ctx.fillStyle = {
                    'D': '#0f49',
                    'C': '#06f9',
                    'H': '#f109',
                }[uPlan[ti][ti2].name[0]];

                const startX = lerpX(uPlan[ti][ti2].times[0].d);
                const endX = lerpX(uPlan[ti][ti2].times[uPlan[ti][ti2].times.length - 1].a);

                const staName = uPlan[ti][ti2].times[0].station.name;
                const staName2 = uPlan[ti][ti2].times[uPlan[ti][ti2].times.length - 1].station.name;
                const dep = uPlan[ti][ti2].times[0].d;
                const arr = uPlan[ti][ti2].times[uPlan[ti][ti2].times.length - 1].a;

                ctx.fillRect(startX, (+ti + 0.9) * 40, endX - startX, 18);

                ctx.save();
                ctx.font = '15px Calibri';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillStyle = '#444';
                ctx.fillText(uPlan[ti][ti2].name, startX, (+ti + 0.96) * 40);
                ctx.restore();

                ctx.save();
                ctx.rotate(-Math.PI / 2);
                ctx.font = '12px Arial';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'top';
                ctx.fillStyle = '#444';
                ctx.fillText(stationNames[staName] || staName, - +ti * 40 - 18, startX);
                ctx.textBaseline = 'bottom';
                ctx.fillText(stationNames[staName2] || staName, - +ti * 40 - 18, endX);

                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(timeStr(dep), - (+ti + 1.1) * 40, startX - 1);
                ctx.textBaseline = 'top';
                ctx.fillText(timeStr(arr), - (+ti + 1.1) * 40, endX + 1);
                ctx.restore();

                var km = 0;
                for (var si in uPlan[ti][ti2].times) {
                    if (+si === 0)
                        continue;

                    const sta1 = uPlan[ti][ti2].times[+si - 1].station;
                    const sta2 = uPlan[ti][ti2].times[si].station;
                    km += Math.abs(sta1.km - sta2.km);
                }
                ctx.save();
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillStyle = '#444';
                ctx.fillText(Math.round(km).toString() + 'km', (startX + endX) / 2, (+ti + 1) * 40);
                ctx.restore();
            }
        }
    }, [windowWidth, height, trains, stations, uPlan, stationNames, start, end]);

    const readFile = (e, handler) => {
        const files = e.target.files;
        if (files.length > 0) {
            const fr = new FileReader();
            fr.onloadend = () => {
                handler(fr.result);
            };
            fr.readAsText(files[0]);
        }
        e.target.value = null;
    };

    const onFplSelect = (e) => readFile(e, xml => {
        const parser = new XMLParser({ ignoreAttributes: false });
        const timetable = parser.parse(xml).jTrainGraph_timetable;

        const newSta = (timetable.stations.sta || []).map(s => ({
            id: s['@_fpl-id'] || '',
            name: s['@_name'] || '',
            line: parseLine(s['@_km'] || '0:0.0'),
            km: parseKm(s['@_km'] || '0:0.0'),
            tracks: s.track ? (s.track.length ? s.track : [s.track]).map(t => t['@_name']) : [],
        }));

        const newTra = [];
        for (var t of timetable.trains.tr || []) {
            const tId = t['@_id'];
            newTra.push({
                id: t['@_id'] || '',
                name: t['@_name'] || '',
                times: t.t.map((e, ei) => {
                    var station;
                    if (e['@_fpl-id'])
                        station = newSta.find(s => s.id === e['@_fpl-id']);
                    else
                        station = newTra.find(t2 => t2.id === tId).times[ei].station;

                    return {
                        station,
                        a: parseTime(e['@_a'] || '-1:00'),
                        d: parseTime(e['@_d'] || '-1:00'),
                        aT: e['@_at'] || '',
                        dT: e['@_dt'] || '',
                    };
                }),
            });
        }

        setStations(newSta);
        setTrains(newTra);
    });

    const onUPlanSelect = (e) => readFile(e, data => {
        const u = JSON.parse(data);
        const remainingTrains = [...trains];
        setStationNames(u.stations);
        setUPlan(u.trains.map(u => {
            return u.map(u2 => {
                const index = remainingTrains.findIndex(p => p.name === u2);
                if (index !== -1)
                    return remainingTrains.splice(index, 1)[0];
                else
                    console.warn('Unbekannte Fahrt: ', u2);
                return null;
            });
        }));
        console.log('Übrige Fahrten: ', remainingTrains.map(t => t.name));
    });

    useEffect(() => {
        setSettingsHeight(settings.current.clientHeight);
        setWindowWidth(window.innerWidth);
        setWindowHeight(window.innerHeight);
        const listener = () => {
            setSettingsHeight(settings.current.clientHeight);
            setWindowWidth(window.innerWidth);
            setWindowHeight(window.innerHeight);
        };
        window.addEventListener('resize', listener);
        return () => window.removeEventListener('resize', listener);
    }, []);

    useEffect(() => {
        const listener = e => {
            if (e.key.toLowerCase() === 'r') {
                setStart(0);
                setEnd(1);
            }
        }
        window.addEventListener('keydown', listener);
        window.addEventListener('keyup', listener);
        return () => {
            window.removeEventListener('keydown', listener);
            window.removeEventListener('keyup', listener);
        }
    }, []);

    const onWheel = e => {
        const mid = (start + end) / 2;
        var offset = e.deltaX * (end - start) * 0.0003;
        var factor = 1 + e.deltaY * 0.0003;
        if (end - start <= 0.1)
            factor = Math.max(1, factor);
        const newStart = mid - factor * (mid - start);
        const newEnd = mid + factor * (end - mid);
        offset = Math.max(-newStart, Math.min(1 - newEnd, offset));
        setStart(Math.max(0, Math.min(1, newStart + offset)));
        setEnd(Math.max(0, Math.min(1, newEnd + offset)));
    };

    const inputFileRef = useRef();
    const inputFileRef2 = useRef();
    const canvasRef = useRef();

    const rootStyle = {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
    };

    return (
        <div style={rootStyle}>
            <Helmet>
                <title>V{version} Umlaufplan</title>
            </Helmet>

            <div style={{ display: 'flex' }}>
                <div ref={settings} style={{ width: '100%' }}>
                    <BP2Button fullWidth onClick={() => inputFileRef.current.click()}>
                        Fahrplan laden
                    </BP2Button>
                    <BP2Button fullWidth onClick={() => inputFileRef2.current.click()}>
                        Umlaufplan laden
                    </BP2Button>
                </div>
                <Link to='/copy'>
                    &copy;
                </Link>
            </div>

            <div onWheel={onWheel}>
                <canvas width={windowWidth} height={height} ref={canvasRef}>
                </canvas>
            </div>

            <input ref={inputFileRef} type='file' accept='.fpl' onChange={onFplSelect} style={{ display: 'none' }} />
            <input ref={inputFileRef2} type='file' accept='application/json' onChange={onUPlanSelect} style={{ display: 'none' }} />
        </div >
    );
}
