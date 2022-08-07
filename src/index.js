import React from 'react';
import * as ReactDOM from 'react-dom/client';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { Route, BrowserRouter as Router, Routes, Link } from 'react-router-dom';

import './index.css';

import NotFoundPage from './notFound';
import BP2Time from './bp2/bp2time';
import BP2Plan from './bp2/bp2plan';
import BP2UPlan from './bp2/bp2uplan';
import BP2Copy from './bp2/bp2copy';

const pages = [
  ['BP2 Fahrzeit', '/bp/time', <BP2Time />],
  ['BP2 Fahrplan', '/bp/plan', <BP2Plan />],
  ['BP2 Umlaufplan', '/bp/uplan', <BP2UPlan />],
];

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path='/' element={
          <div>
            {pages.map((p, i) =>
              <Link to={p[1]} key={i} style={{
                position: 'absolute',
                top: 22 + 13 * i + 'vh',
                right: '10vw',
                backgroundColor: '#3020f060',
                padding: '5vh',
                height: '3vh',
              }}>
                {p[0]}
              </Link>
            )}
          </div>
        } />
        {pages.map((v, i) =>
          <Route key={i} path={v[1]} element={v[2]} />
        )}
        <Route path='/copy' element={<BP2Copy />} />
        <Route path='*' element={<NotFoundPage />} />
      </Routes>
    </Router>
  </React.StrictMode>
);

serviceWorkerRegistration.register();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
