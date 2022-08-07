import { useState, useEffect, useRef } from 'react';
import { BP2Button, BP2Checkbox, BP2Input, version } from './bp2GUI';
import { Helmet } from 'react-helmet';
import { XMLParser } from 'fast-xml-parser';
import { Link } from 'react-router-dom';

export default function BP2Plan() {
    const [stations, setStations] = useState([]);
    const [lines, setLines] = useState([]);
    const [trains, setTrains] = useState([]);
    const [highlightName, setHighlightName] = useState('');
    const [filterName, setFilterName] = useState('');

    const [line1, setLine1] = useState(0);
    const [line2, setLine2] = useState(null);

    const [zoomFlip, setZoomFlip] = useState(false);
    const [zoomT, setZoomT] = useState(false);
    const [startS, setStartS] = useState(0);
    const [endS, setEndS] = useState(1);
    const [startT, setStartT] = useState(0);
    const [endT, setEndT] = useState(1);

    const [showTime, setShowTime] = useState(false);
    const [SHOWTIME, setSHOWTIME] = useState(false);
    const [showLines, setShowLines] = useState(false);

    const [settingsHeight, setSettingsHeight] = useState(0);
    const [windowHeight, setWindowHeight] = useState(0);
    const [windowWidth, setWindowWidth] = useState(0);

    const settings = useRef();

    const height = ((windowHeight - settingsHeight) || 600) - 10;

    const parseTime = (t) => parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]);
    const parseLine = (t) => parseInt(t.split(':')[0]);
    const parseKm = (t) => parseFloat(t.split(':')[1]);

    const startStation = (s) => [...s].sort((a, b) => a.km - b.km)[0];
    const endStation = (s) => [...s].sort((a, b) => b.km - a.km)[0];

    const timeStr = (t) => `${Math.floor(t / 60).toString().padStart(2, '0')}:${Math.floor(t % 60).toString().padStart(2, '0')}`;

    useEffect(() => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, windowWidth, height);
        const sta = stations.filter(s => s.line === line1).sort((a, b) => a.km - b.km);
        const trn = trains.filter(t => {
            try {
                return !filterName || t.name.match(filterName);
            } catch (e) {
                return true;
            }
        });
        const highlighted = train => {
            try {
                return highlightName && train.name.match(highlightName);
            } catch (e) {
                return false;
            }
        };

        if (line1 === 3)
            sta.reverse();
        if (line2 !== null && line2 !== line1) {
            const lastStations = stations.filter(s => s.line === line2).sort((a, b) => a.km - b.km);
            if (line2 !== 3)
                lastStations.reverse();
            if (!sta.find(s => s.name === 'Portmarnock Junction') && !stations.find(s => s.name === 'Portmarnock Junction' && s.line === line2))
                sta.push(stations.find(s => s.name === 'Portmarnock Junction'));
            sta.push(...lastStations);
        }

        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, windowWidth, height);
        ctx.font = '22px Calibri';
        const textWidth = sta.map(s => ctx.measureText(s.name, 0, 0).actualBoundingBoxRight).reduce((a, b) => Math.max(a, b), 0) + 10;
        const stationSpace = Math.round(windowWidth / (sta.length + 1));

        const lerpX = x => stationSpace + (x - stationSpace - windowWidth * startS) / (endS * 0.98 - startS);
        const lerpY = y => textWidth + 30 + (y - textWidth - 30 - height * startT) / (endT - startT);

        // time lines
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#ddd';
        for (var t2 = 0; t2 < 10; t2++) {
            ctx.beginPath();
            ctx.moveTo(50, lerpY(textWidth + 30 + t2 * 80));
            ctx.lineTo(windowWidth, lerpY(textWidth + 30 + t2 * 80));
            ctx.closePath();
            ctx.stroke();
        }
        ctx.restore();

        // trains
        const stopCoords = stop => {
            var x = sta.findIndex(p => p.id === stop.station.id);
            if (x !== -1) {
                x = (x + 1) * stationSpace;
                const time = stop.a === -60 ? stop.d : stop.a;
                if (x !== 0 && time >= 0) {
                    const y = textWidth + 30 + (time - 600) * 16 / 3;
                    return [lerpX(x), lerpY(y), time];
                }
                else
                    return [0, 0, 0];
            }
            else
                return [0, 0, 0];
        };
        ctx.save();
        ctx.font = '20px Calibri';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#222';
        ctx.lineWidth = 1;
        for (var k in trn) {
            ctx.beginPath();
            var lineStarted = false;
            for (var stopI in trn[k].times) {
                const [x, y] = stopCoords(trn[k].times[stopI]);
                if (x !== 0 && y !== 0) {
                    if (!lineStarted) {
                        ctx.moveTo(x, y);
                        lineStarted = true;
                    }
                    ctx.lineTo(x, y);
                }
            }
            ctx.strokeStyle = highlighted(trn[k]) ? '#cc2' : '#333';
            ctx.stroke();
        }
        ctx.restore();

        // station lines
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#bbb';
        ctx.rotate(-Math.PI / 2);
        for (var i in sta) {
            ctx.beginPath();
            ctx.moveTo(-textWidth - 20, lerpX((+i + 1) * stationSpace));
            ctx.lineTo(-height, lerpX((+i + 1) * stationSpace));
            ctx.closePath();
            ctx.stroke();
        }
        ctx.restore();

        // stops
        ctx.save();
        ctx.font = '13px Calibri';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        for (var k2 in trn) {
            for (var stopI2 in trn[k2].times) {
                const [x, y, time] = stopCoords(trn[k2].times[stopI2]);
                if (x > 0 && y > textWidth + 20) {
                    ctx.beginPath();
                    if (trn[k2].times[stopI2].d !== -60 || +stopI2 === trn[k2].times.length - 1)
                        ctx.arc(x, y, 2, 0, Math.PI * 2);
                    ctx.fillStyle = highlighted(trn[k2]) ? 'cc2' : '#333';
                    ctx.fill();

                    ctx.fillStyle = '#000';
                    const str = trn[k2].name + (showTime ? ` (${timeStr(time)})` : '');
                    if (+stopI2 === 0 || +stopI2 === trn[k2].times.length - 1)
                        ctx.fillText(str, x + 5, y);
                    else if (showTime && SHOWTIME)
                        ctx.fillText(timeStr(time), x + 5, y);
                }
            }
        }
        ctx.restore();

        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 45, height);

        // times
        ctx.save();
        ctx.font = '20px Calibri';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#222';
        for (var t = 0; t < 10; t++)
            ctx.fillText(timeStr(600 + t * 15), 0, lerpY(textWidth + 30 + t * 80));
        ctx.restore();

        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, windowWidth, textWidth + 20);

        // station names
        ctx.save();
        ctx.font = '22px Calibri';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#222';
        ctx.rotate(-Math.PI / 2);
        for (var i2 in sta)
            ctx.fillText(sta[i2].name, -textWidth, lerpX((+i2 + 1) * stationSpace));
        ctx.restore();

        // station km
        ctx.save();
        ctx.font = '18px Calibri';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#444';
        for (var j in sta)
            ctx.fillText(sta[j].km.toString().replace('.', ',') + 'km', lerpX((+j + 1) * stationSpace), textWidth);
        ctx.restore();
    }, [stations, trains, line1, line2, windowWidth, startS, endS, startT, endT, showTime, SHOWTIME, height, highlightName, filterName]);

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
                        station: station,
                        a: parseTime(e['@_a'] || '-1:00'),
                        d: parseTime(e['@_d'] || '-1:00'),
                        aT: e['@_at'] || '',
                        dT: e['@_dt'] || '',
                    };
                }),
            });
        }

        setStations(newSta);
        setLines([...new Set(newSta.map(s => s.line))]);
        setLine1(newSta[0].line);
        setTrains(newTra);
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
    }, [showLines]);

    useEffect(() => {
        const listener = e => {
            setZoomFlip(e.altKey);
            setZoomT(e.shiftKey);
            if (e.key.toLowerCase() === 'r') {
                setStartS(0);
                setEndS(1);
                setStartT(0);
                setEndT(1);
            }
        }
        window.addEventListener('keydown', listener);
        window.addEventListener('keyup', listener);
        return () => {
            window.removeEventListener('keydown', listener);
            window.removeEventListener('keyup', listener);
        }
    }, []);

    const zoom = (start, setStart, end, setEnd, deltaX, deltaY) => {
        const mid = (start + end) / 2;
        var offset = (zoomFlip ? deltaY : deltaX) * (end - start) * 0.0003;
        var factor = 1 + (zoomFlip ? deltaX : deltaY) * 0.0003;
        if (end - start <= 0.1)
            factor = Math.max(1, factor);
        const newStart = mid - factor * (mid - start);
        const newEnd = mid + factor * (end - mid);
        offset = Math.max(-newStart, Math.min(1 - newEnd, offset));
        setStart(Math.max(0, Math.min(1, newStart + offset)));
        setEnd(Math.max(0, Math.min(1, newEnd + offset)));
    };
    const onWheel = e => {
        if (zoomT)
            zoom(startT, setStartT, endT, setEndT, e.deltaX, e.deltaY);
        else
            zoom(startS, setStartS, endS, setEndS, e.deltaX, e.deltaY);
    };

    const inputFileRef = useRef();
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
                <title>V{version} Fahrplanviewer</title>
            </Helmet>

            <div ref={settings}>
                <BP2Button fullWidth onClick={() => inputFileRef.current.click()}>
                    Fahrplan laden
                </BP2Button>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {showTime && <BP2Checkbox label='Alle' value={SHOWTIME} onChange={setSHOWTIME} />}
                    <BP2Checkbox label='Zeiten anzeigen' value={showTime} onChange={setShowTime} />
                </div>
                <BP2Checkbox label='Streckenauswahl' value={showLines} onChange={setShowLines} />

                {(showLines ? lines : []).map(l =>
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-evenly' }}>
                        {startStation(stations.filter(s => s.line === l)).name}
                        -
                        {endStation(stations.filter(s => s.line === l)).name}
                        <div>
                            <BP2Button noWidth onClick={() => setLine1(l)}>
                                1.
                            </BP2Button>
                            <BP2Button noWidth onClick={() => setLine2(l)}>
                                2.
                            </BP2Button>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-evenly' }}>
                    <BP2Input label='Filter' fullWidth onChange={setFilterName} />
                    <BP2Input label='Hervorheben' fullWidth onChange={setHighlightName} />
                    <Link to='/copy'>
                        &copy;
                    </Link>
                </div>
            </div>

            <div onWheel={onWheel}>
                <canvas width={windowWidth} height={height} ref={canvasRef}>
                </canvas>
            </div>

            <input ref={inputFileRef} type='file' accept='.fpl' onChange={onFplSelect} style={{ display: 'none' }} />
        </div >
    );
}
