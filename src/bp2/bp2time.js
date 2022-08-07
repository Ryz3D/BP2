import { useState, useEffect, useCallback, useRef } from 'react';
import { BP2Slider, BP2Seconds, roundTo, BP2Button, BP2Checkbox, version, formatTime } from './bp2GUI';
import { AreaChart, LineChart, XAxis, YAxis, Area, Tooltip, CartesianGrid, Line, Legend } from 'recharts';
import { Helmet } from 'react-helmet';
import BP2Strecke from './bp2strecke';
import BP2Footer from './bp2Footer';

export default function BP2Time() {
    const [loading, setLoading] = useState(false);
    const [autoload, setAutoload] = useState(true);

    const [zeigZüge, setZeigZüge] = useState(false);

    const [startHours, setStartHours] = useState(12);
    const [startMinutes, setStartMinutes] = useState(0);

    const [timestep, setTimestep] = useState(1);
    const [lokmasse, setLokmasse] = useState(87);
    const [wagenmasse, setWagenmasse] = useState(63);
    const [wagen, setWagen] = useState(8);
    const [maxBrake, setMaxBrake] = useState(0.7);
    const [zugGeschw, setZugGeschw] = useState(230);

    const [reibwert, setReibwert] = useState(0.33);
    const [lokleistung, setLokleistung] = useState(6400);
    const [steigung, setSteigung] = useState(0);

    const [strecke, setStrecke] = useState([{ "v": 27.77777777777778, "s": 5000 }, { "v": 0, "t": 0 }, { "v": 27.77777777777778, "s": 10000 }, { "v": 44.44444444444444, "s": 20000 }, { "v": 55.55555555555556, "s": 30000 }, { "v": 0, "t": 0 }]);
    const [totalLength, setTotalLength] = useState(0);
    const [vCalc, setVCalc] = useState([]);
    const [fahrt, setFahrt] = useState([]);
    const [tIdeal, setTIdeal] = useState(0);
    const [tCalc, setTCalc] = useState(0);
    const [stopTimes, setStopTimes] = useState([]);
    const [zugkraft, setZugkraft] = useState([]);

    const [windowWidth, setWindowWidth] = useState(0);
    const [download, setDownload] = useState({ url: '', name: '' });

    const downloadRef = useRef();
    const inputFileRef = useRef();
    const inputFileRef2 = useRef();

    useEffect(() => {
        if (download.url) {
            downloadRef.current.click();
        }
    }, [download]);

    const fileFormat = [
        [timestep, reibwert, lokleistung, lokmasse, wagenmasse, wagen, maxBrake, zugGeschw],
        [setTimestep, setReibwert, setLokleistung, setLokmasse, setWagenmasse, setWagen, setMaxBrake, setZugGeschw],
    ];

    const readFile = (e, handler) => {
        const files = e.target.files;
        if (files.length > 0) {
            const fr = new FileReader();
            fr.onloadend = () => {
                handler(JSON.parse(fr.result));
            };
            fr.readAsText(files[0]);
        }
        e.target.value = null;
    };
    const writeFile = (name, data) => {
        setDownload({
            name,
            url: URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' })),
        });
    };

    const onZugSelect = (e) => readFile(e, values => fileFormat[1].map((f, i) => f(values[i])));
    const onStreckeSelect = (e) => readFile(e, setStrecke);
    const saveZug = () => writeFile('zug', fileFormat[0]);
    const saveStrecke = () => writeFile('strecke', strecke);
    const saveFahrt = () => writeFile('fahrt', fahrt);

    const zugmasse = lokmasse + wagen * wagenmasse;

    useEffect(() => {
        var t = 0;
        for (var i in strecke) {
            if (strecke[i].t !== undefined)
                t += strecke[i].t;
            else if (strecke[i].s !== undefined) {
                var dist = strecke[i].s;
                dist -= (strecke.slice(0, i).reverse().find(p => p.s) || {}).s || 0;
                t += dist / strecke[i].v;
            }
        }
        setTotalLength(([...strecke].reverse().find(p => p.s) || {}).s || 0);
        setTIdeal(t);
    }, [strecke]);

    const reverseStrecke = () => {
        const s = [];
        for (var i = strecke.length - 1; i >= 0; i--) {
            if (strecke[i].t !== undefined) {
                if (s.length === 0)
                    continue;
                else
                    s.push(strecke[i]);
            }
            else {
                s.push({
                    v: strecke[i].v,
                    s: totalLength - (strecke.slice(0, i).reverse().find(p => p.s) || { s: 0 }).s,
                });
            }
        }
        if (s[s.length - 1].t === undefined)
            s.push({ v: 0, t: 0 });
        setStrecke(s);
    };

    const calculate = useCallback(() => {
        return new Promise(resolve => {
            if (totalLength === 0)
                resolve();

            const vc = [];
            const fahrt = [];
            const stops = [];
            const a = [0]; // m/s^2
            const v = [0]; // m/s
            const s = [0]; // m

            var currentSection = 0, sectorClearedAt = 0, lastStopDone = false, stopCounter = 0;
            for (var i = 0; s[i] < totalLength - 5 || v[i] > 3 / 3.6; i++) {
                const widerstand = 9.81 * Math.sin(Math.atan(steigung)); // m/s^2
                const kraftschluss = lokmasse * 9.81 * reibwert; // kN
                const leistungsgrenze = v[i] > 0 ? lokleistung / v[i] : Infinity; // kN
                const zugbeschl = Math.min(kraftschluss, leistungsgrenze) / zugmasse; // m/s^2
                const vLimit = Math.min(strecke[currentSection].v, zugGeschw / 3.6); // km/h

                // bremsweg basierend auf bevorstehender geschwindigkeitsbegrenzung
                var brake = false;
                if (currentSection < strecke.length - 1) {
                    const nextSection = strecke[currentSection + 1];
                    if (v[i] > nextSection.v + 1 / 3.6) {
                        const brakeDist = (v[i] ** 2 - nextSection.v ** 2) / (2 * (maxBrake + widerstand)); // m
                        brake = strecke[currentSection].s - s[i] <= brakeDist + 100 && v[i] > 5 / 3.6;
                    }
                }

                // fahrphase bestimmen
                if (brake || v[i] > vLimit + 1 / 3.6) {
                    // bremskraft
                    a.push(-maxBrake - widerstand);
                } else if (v[i] < vLimit - 1 / 3.6) {
                    // zugkraft
                    a.push(zugbeschl - widerstand);
                } else {
                    // beharrungsfahrt
                    if (widerstand < -maxBrake)
                        a.push(-maxBrake - widerstand);
                    else if (widerstand > zugbeschl)
                        a.push(zugbeschl - widerstand);
                    else
                        a.push(0);
                }

                v.push(v[i] + a[i + 1] * timestep);

                // zug planmäßig gestoppt
                if (strecke[currentSection].v === 0 && v[i + 1] <= 5 / 3.6) {
                    stopCounter++;
                    if (stopCounter > 1 / timestep && strecke[currentSection].s !== undefined) {
                        console.error('Zug ist stehen geblieben?');
                        break;
                    }
                    if (v[i + 1] !== 0) {
                        v[i + 1] = 0;
                        if (strecke[currentSection].t !== undefined && currentSection < strecke.length - 1) {
                            stops.push({
                                s: s[i],
                                from: i * timestep,
                                to: i * timestep + strecke[currentSection].t,
                            });
                        }
                    }
                }
                else {
                    stopCounter = 0;
                }

                s.push(s[i] + v[i + 1] * timestep);

                vc.push({
                    s: roundTo(s[i + 1] / 1000, 3), // km
                    vCalc: roundTo(v[i + 1] * 3.6, 1), // km/h
                    vMax: Math.round(strecke[currentSection].v * 3.6), // km/h
                });
                fahrt.push({
                    s: Math.round(s[i + 1]), // m
                    t: roundTo(i * timestep, 1), // s
                    v: roundTo(v[i + 1], 2), // m/s
                    vMax: roundTo(strecke[currentSection].v, 2), // m/s
                });

                if (strecke[currentSection].s !== undefined) {
                    if (s[i + 1] > strecke[currentSection].s) {
                        sectorClearedAt = i;
                        currentSection++;
                    }
                    else if (strecke[currentSection].v === 0) {
                        console.error('vMax=0 in Streckabschnitt!');
                        break;
                    }
                }
                else {
                    if (i > sectorClearedAt + (strecke[currentSection].t + 5) / timestep) {
                        sectorClearedAt = i;
                        currentSection++;
                    }
                }

                if (currentSection >= strecke.length) {
                    stops.push({
                        s: totalLength,
                        from: i * timestep,
                        to: i * timestep,
                    });
                    lastStopDone = true;
                    break;
                }
            }
            if (!lastStopDone) {
                stops.push({
                    s: totalLength,
                    from: i * timestep,
                    to: i * timestep,
                });
            }

            setTCalc(i * timestep);
            setVCalc(vc);
            setFahrt(fahrt);
            setStopTimes(stops);
            resolve();
        });
    }, [lokleistung, maxBrake, reibwert, strecke, timestep, totalLength, lokmasse, zugmasse, zugGeschw, steigung]);

    useEffect(() => {
        if (autoload)
            calculate();
    }, [autoload, calculate]);

    useEffect(() => {
        const zg = [];
        for (var i = 0; i < zugGeschw / 3.6; i += 0.1) {
            const v = roundTo(i * 3.6, 1);
            const kN = roundTo(Math.min(lokmasse * 9.81 * reibwert, i > 0 ? lokleistung / i : Infinity), 1);
            zg.push({ v, kN });
        }
        setZugkraft(zg);
    }, [lokmasse, reibwert, lokleistung, zugGeschw]);

    useEffect(() => {
        setWindowWidth(window.innerWidth);
        const listener = () => {
            setWindowWidth(window.innerWidth);
        };
        window.addEventListener('resize', listener);
        return () => window.removeEventListener('resize', listener);
    }, []);

    const rootStyle = {
        overflowX: 'hidden',
        overflowY: 'scroll',
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
    };

    const züge = [
        { name: 'Siemens Vectron AC 6400kW', data: [1, 0.33, 6400, 87, 63, 8, 0.7, 230] },
        { name: 'Siemens Desiro City', data: [1, 0.33, 3300, 70, 29, 7, 0.7, 160] },
        { name: 'DART Class 8100', data: [1, 0.33, 548, 20, 10, 2, 0.7, 100] },
    ];

    return (
        <div style={rootStyle}>
            <Helmet>
                <title>V{version} Fahrzeitrechner</title>
            </Helmet>
            <BP2Strecke strecke={strecke} onChange={setStrecke} />
            <div style={{ display: 'flex' }}>
                <BP2Button onClick={saveStrecke}>
                    Strecke speichern
                </BP2Button>
                <BP2Button onClick={() => inputFileRef2.current.click()}>
                    Strecke laden
                </BP2Button>
                <BP2Button onClick={reverseStrecke}>
                    Strecke umdrehen
                </BP2Button>
            </div>
            {windowWidth < 600 ?
                <>
                    <BP2Seconds label='Ideale Zeit' value={tIdeal} />
                    <BP2Seconds label='Reale Zeit' value={tCalc} />
                    <BP2Seconds label={`${tCalc < 3600 ? 'Unter' : 'Über'} 1h um`} value={Math.abs(tCalc - 3600)} />
                    <BP2Seconds label='Brems-/Beschleunigungszuschlag' value={tCalc - tIdeal} />
                </>
                :
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 10px' }}>
                        <BP2Seconds label='Ideale Zeit' value={tIdeal} />
                        <BP2Seconds label='Reale Zeit' value={tCalc} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 10px' }}>
                        <BP2Seconds label={`${tCalc < 3600 ? 'Unter' : 'Über'} 1h um`} value={Math.abs(tCalc - 3600)} />
                        <BP2Seconds label='Brems-/Beschleunigungszuschlag' value={tCalc - tIdeal} />
                    </div>
                </>
            }
            <BP2Button disabled={loading} onClick={() => calculate().then(() => setLoading(false))}>
                Berechnen!
            </BP2Button>
            <BP2Checkbox label='Automatisch berechnen' value={autoload} onChange={setAutoload} />
            <br />
            <AreaChart
                width={windowWidth - 50}
                height={300}
                data={vCalc}
                margin={{ left: 20 }}
            >
                <XAxis unit='km' dataKey='s' type='number' />
                <YAxis unit='km/h' />
                <CartesianGrid strokeDasharray='4 4' />
                <Tooltip />
                <Legend />
                <Area dataKey='vMax' stroke='#d14f1f' fill='#f07548' />
                <Area dataKey='vCalc' stroke='#8884d8' fill='#8884d8' />
            </AreaChart>

            <BP2Slider label='Abfahrt (h)' unit='h' value={startHours} range={[0, 23, 1]} forceRange onChange={setStartHours} />
            <BP2Slider label='Abfahrt (min)' unit='min' value={startMinutes} range={[0, 59, 1]} forceRange onChange={setStartMinutes} />
            <div>
                {stopTimes.map((s, i) =>
                    <div key={i}>
                        Halt bei {roundTo(s.s / 1000, 1)}km von {formatTime(s.from + startHours * 3600 + startMinutes * 60)} bis {formatTime(s.to + startHours * 3600 + startMinutes * 60)}
                    </div>
                )}
            </div>
            <BP2Button onClick={saveFahrt}>
                Fahrt speichern
            </BP2Button>

            <br />
            <br />
            <BP2Slider label='Steigung' value={steigung} range={[-0.03, 0.03, 0.0005]} onChange={setSteigung} />
            <BP2Slider label='Reibwert' value={reibwert} range={[0.01, 1, 0.01]} onChange={setReibwert} />
            <BP2Slider label='Lokleistung' unit='kW' value={lokleistung} range={[100, 10000, 50]} onChange={setLokleistung} />
            <BP2Slider label='Vmax' unit='km/h' value={zugGeschw} range={[50, 350, 10]} forceRange onChange={setZugGeschw} />
            <BP2Slider label='Bremsverzögerung' unit='m/s^2' value={maxBrake} range={[0.01, 2, 0.01]} onChange={setMaxBrake} />
            <BP2Slider label='Lokmasse' unit='t' value={lokmasse} range={[5, 200, 5]} forceRange onChange={setLokmasse} />
            <BP2Slider label='Wagenmasse' unit='t' value={wagenmasse} range={[5, 200, 5]} onChange={setWagenmasse} />
            <BP2Slider label='Wagen' value={wagen} range={[0, 20, 1]} onChange={setWagen} />
            <BP2Slider label='Zeitschritt' unit='s' value={timestep} range={[0.1, 10, 0.1]} forceRange onChange={setTimestep} />
            <div>
                Zugmasse: {zugmasse}t
            </div>
            <br />
            <div style={{ display: 'flex', marginBottom: '20px' }}>
                <BP2Button onClick={saveZug}>
                    Zug speichern
                </BP2Button>
                <BP2Button onClick={() => inputFileRef.current.click()}>
                    Zug laden
                </BP2Button>
                <BP2Button noWidth onClick={() => setZeigZüge(b => !b)}>
                    {zeigZüge ? '⇧' : '⇩'}
                </BP2Button>
            </div>
            {zeigZüge &&
                <div>
                    {züge.map(t =>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                            <div style={{ marginRight: '10px' }}>
                                {t.name}
                            </div>
                            <BP2Button noWidth onClick={() => t.data.map((d, i) => fileFormat[1][i](d))}>
                                Laden
                            </BP2Button>
                        </div>
                    )}
                </div>
            }
            <br />
            <LineChart
                width={windowWidth - 50}
                height={300}
                data={zugkraft}
            >
                <XAxis unit='km/h' dataKey='v' />
                <YAxis unit='kN' />
                <CartesianGrid strokeDasharray='4 4' />
                <Tooltip />
                <Legend />
                <Line dataKey='kN' stroke='#00d10a' fill='#00e020' dot={false} />
            </LineChart>

            <BP2Footer />

            <a ref={downloadRef} href={download.url} download={download.name} style={{ display: 'none' }}>download</a>
            <input ref={inputFileRef} type='file' accept='application/json' onChange={onZugSelect} style={{ display: 'none' }} />
            <input ref={inputFileRef2} type='file' accept='application/json' onChange={onStreckeSelect} style={{ display: 'none' }} />
        </div >
    );
}
