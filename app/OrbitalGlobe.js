'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';
import * as satellite from 'satellite.js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const ReactGlobe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => <div className="orbital-loading-center">INITIALIZING 3D WEBGL ENGINE...</div>
});

const EARTH_RADIUS_KM = 6371;
const DB_BATCH = 1000;
const LIVE_MS = 1000;
const ORBIT_POINTS = 180;
const DEFAULT_ACTIVE_VISIBLE = 1000;

const globalLaunchPads = [
  {id:1,name:'Kennedy Space Center (LC-39A)',agency:'NASA / SpaceX',lat:28.5858,lng:-80.6511,type:'major',country:'USA'},
  {id:2,name:'Cape Canaveral Space Force Station (SLC-40)',agency:'SpaceX / USSF',lat:28.5619,lng:-80.5772,type:'major',country:'USA'},
  {id:3,name:'Vandenberg Space Force Base (SLC-4E)',agency:'SpaceX / USSF',lat:34.742,lng:-120.5724,type:'major',country:'USA'},
  {id:4,name:'Wallops Flight Facility',agency:'NASA / Northrop Grumman',lat:37.9332,lng:-75.4836,type:'minor',country:'USA'},
  {id:5,name:'Boca Chica Launch Site (Starbase)',agency:'SpaceX',lat:25.9973,lng:-97.156,type:'major',country:'USA'},
  {id:6,name:'Pacific Spaceport Complex (Alaska)',agency:'Astra / USSF',lat:57.4358,lng:-152.3477,type:'minor',country:'USA'},
  {id:7,name:'Guiana Space Centre (Ariane ELA-4)',agency:'ESA / Arianespace',lat:5.2372,lng:-52.7683,type:'major',country:'French Guiana'},
  {id:8,name:'Esrange Space Center',agency:'SSC',lat:67.8894,lng:21.105,type:'minor',country:'Sweden'},
  {id:9,name:'Andøya Spaceport',agency:'Andøya Space',lat:69.2933,lng:16.0167,type:'minor',country:'Norway'},
  {id:10,name:'Baikonur Cosmodrome',agency:'Roscosmos',lat:45.9646,lng:63.3052,type:'major',country:'Kazakhstan'},
  {id:11,name:'Plesetsk Cosmodrome',agency:'Roscosmos',lat:62.9298,lng:40.5735,type:'major',country:'Russia'},
  {id:12,name:'Vostochny Cosmodrome',agency:'Roscosmos',lat:51.8841,lng:128.3339,type:'major',country:'Russia'},
  {id:13,name:'Satish Dhawan Space Centre (SDSC)',agency:'ISRO',lat:13.7199,lng:80.2304,type:'major',country:'India'},
  {id:14,name:'Jiuquan Satellite Launch Center',agency:'CNSA',lat:40.9575,lng:100.2917,type:'major',country:'China'},
  {id:15,name:'Wenchang Space Launch Site',agency:'CNSA',lat:19.6145,lng:110.951,type:'major',country:'China'},
  {id:16,name:'Xichang Satellite Launch Center',agency:'CNSA',lat:28.2465,lng:102.0264,type:'minor',country:'China'},
  {id:17,name:'Taiyuan Satellite Launch Center',agency:'CNSA',lat:38.849,lng:111.608,type:'minor',country:'China'},
  {id:18,name:'Tanegashima Space Center',agency:'JAXA',lat:30.4,lng:130.97,type:'major',country:'Japan'},
  {id:19,name:'Uchinoura Space Center',agency:'JAXA',lat:31.2515,lng:131.0825,type:'minor',country:'Japan'},
  {id:20,name:'Naro Space Center',agency:'KARI',lat:34.4315,lng:127.535,type:'minor',country:'South Korea'},
  {id:21,name:'Mahia Launch Complex 1',agency:'Rocket Lab',lat:-39.2608,lng:177.8656,type:'minor',country:'New Zealand'},
  {id:22,name:'Arnhem Space Centre',agency:'Equatorial Launch Australia',lat:-12.378,lng:136.815,type:'minor',country:'Australia'},
  {id:23,name:'Imam Khomeini Spaceport',agency:'ISA',lat:35.2344,lng:53.9211,type:'minor',country:'Iran'},
  {id:24,name:'Al-Dahik Launch Site',agency:'NARSS',lat:28.489,lng:30.412,type:'minor',country:'Egypt'}
];

function safeNumber(v,f=null){const n=Number(v);return Number.isFinite(n)?n:f;}
function normalizeLng(v){let n=safeNumber(v,0);while(n>180)n-=360;while(n<-180)n+=360;return n;}

function getTle(row){
  const a=row?.tle_line1??row?.tle1??row?.line1??row?.TLE_LINE1??null;
  const b=row?.tle_line2??row?.tle2??row?.line2??row?.TLE_LINE2??null;
  if(typeof a!=='string'||typeof b!=='string')return null;
  if(a.trim().length<10||b.trim().length<10)return null;
  return {line1:a.trim(),line2:b.trim()};
}

function makeSatrec(row){
  const t=getTle(row);
  if(!t)return null;
  try{return satellite.twoline2satrec(t.line1,t.line2);}
  catch{return null;}
}

function propagate(sat,date=new Date()){
  if(!sat?.satrec)return null;
  try{
    const pv=satellite.propagate(sat.satrec,date);
    if(!pv?.position||!pv?.velocity)return null;

    const geo=satellite.eciToGeodetic(
      pv.position,
      satellite.gstime(date)
    );

    const lat=satellite.degreesLat(geo.latitude);
    const lng=normalizeLng(
      satellite.degreesLong(geo.longitude)
    );
    const altitudeKm=Number(geo.height);

    const velocityKmS=Math.sqrt(
      pv.velocity.x**2+
      pv.velocity.y**2+
      pv.velocity.z**2
    );

    if(
      !Number.isFinite(lat)||
      !Number.isFinite(lng)||
      !Number.isFinite(altitudeKm)||
      !Number.isFinite(velocityKmS)||
      velocityKmS<=0
    ){
      return null;
    }

    return {
      ...sat,
      lat,
      lng,
      altitudeKm,
      altitude:Math.max(
        0.002,
        altitudeKm/EARTH_RADIUS_KM
      ),
      velocityKmS,
      velocity:velocityKmS,
      positionEci:pv.position,
      velocityEci:pv.velocity,
      telemetryTime:date.toISOString(),
      live:true
    };
  }catch{
    return null;
  }
}

function formatSatellite(row){
  const satrec=makeSatrec(row);
  const tle=getTle(row);

  const base={
    ...row,
    id:row.id,
    name:row.name||'UNKNOWN OBJECT',
    organization:row.organization||'UNKNOWN',
    satrec,
    tle_line1:tle?.line1||row.tle_line1||null,
    tle_line2:tle?.line2||row.tle_line2||null,
    trackable:Boolean(satrec)
  };

  const live=propagate(base,new Date());

  if(live)return live;

  return {
    ...base,
    lat:safeNumber(row.lat,0),
    lng:normalizeLng(row.lng),
    altitudeKm:safeNumber(row.altitude,0),
    altitude:Math.max(
      0.002,
      safeNumber(row.altitude,400)/
        EARTH_RADIUS_KM
    ),
    velocityKmS:safeNumber(row.velocity,null),
    velocity:safeNumber(row.velocity,null),
    telemetryTime:row.updated_at||null,
    live:false
  };
}

function periodMinutes(sat){
  if(sat?.satrec?.no>0){
    return (2*Math.PI)/sat.satrec.no;
  }

  const mm=safeNumber(sat?.mean_motion);

  return mm>0
    ? 1440/mm
    : 90;
}

function orbitPath(sat){
  if(!sat?.satrec)return[];

  const p=Math.max(
    20,
    Math.min(
      1440,
      periodMinutes(sat)
    )
  );

  const pts=[];

  for(
    let i=0;
    i<=ORBIT_POINTS;
    i++
  ){
    const mins=
      -p/2+
      (i/ORBIT_POINTS)*p;

    const x=propagate(
      sat,
      new Date(
        Date.now()+
        mins*60000
      )
    );

    if(x){
      pts.push({
        lat:x.lat,
        lng:x.lng,
        altitude:Math.max(
          .003,
          x.altitude*1.01
        )
      });
    }
  }

  return pts;
}

function filterRows(rows,filter){
  const name=r=>
    String(r?.name||'').toUpperCase();

  if(filter==='active'){
    return rows.filter(
      r=>getTle(r)
    );
  }

  if(filter==='starlink'){
    return rows.filter(
      r=>name(r).includes('STARLINK')
    );
  }

  if(filter==='weather'){
    return rows.filter(
      r=>/NOAA|GOES|METEOR|METOP|JPSS|EUMETSAT|HIMAWARI/.test(name(r))
    );
  }

  if(filter==='stations'){
    return rows.filter(
      r=>/ISS|CSS|TIANGONG|STATION/.test(name(r))
    );
  }

  return rows;
}

export default function OrbitalGlobe({
  requestedView
}){
  const globeRef=useRef(null);
  const satRef=useRef([]);
  const displayRef=useRef([]);
  const selectedIdRef=useRef(null);
  const hoveredIdRef=useRef(null);
  const timerRef=useRef(null);
  const rawCache=useRef({});

  const [viewMode,setViewMode]=useState('pads');
  const [padFilter,setPadFilter]=useState('all');
  const [satFilter,setSatFilter]=useState('stations');

  const [
    activeVisible,
    setActiveVisible
  ]=useState(
    DEFAULT_ACTIVE_VISIBLE
  );

  const [selectedPad,setSelectedPad]=
    useState(globalLaunchPads[0]);

  const [selectedSat,setSelectedSat]=
    useState(null);

  const [hoveredSat,setHoveredSat]=
    useState(null);

  const [satellites,setSatellites]=
    useState([]);

  const [loading,setLoading]=
    useState(false);

  const [wikiData,setWikiData]=
    useState([]);

  const [wikiSearch,setWikiSearch]=
    useState('');

  const [wikiPage,setWikiPage]=
    useState(0);

  const [totalWiki,setTotalWiki]=
    useState(0);

  const pageSize=50;

  useEffect(()=>{
    if(requestedView?.mode){
      setViewMode(
        requestedView.mode
      );
    }
  },[requestedView]);

  const pads=useMemo(
    ()=>globalLaunchPads.filter(
      p=>padFilter==='all'||
        p.type===padFilter
    ),
    [padFilter]
  );

  const clearFocus=useCallback(()=>{
    selectedIdRef.current=null;
    hoveredIdRef.current=null;
    setSelectedSat(null);
    setHoveredSat(null);
  },[]);

  const fetchRows=useCallback(
    async filter=>{
      const key=`rows:${filter}`;

      if(rawCache.current[key]){
        return rawCache.current[key];
      }

      const rows=[];
      let from=0;

      while(true){
        let q=supabase
          .from('satellites')
          .select('*')
          .order(
            'id',
            {ascending:true}
          )
          .range(
            from,
            from+DB_BATCH-1
          );

        if(filter==='stations'){
          q=q.or(
            'name.ilike.%ISS%,name.ilike.%CSS%,name.ilike.%TIANGONG%,name.ilike.%STATION%'
          );
        }else if(filter==='starlink'){
          q=q.ilike(
            'name',
            '%STARLINK%'
          );
        }else if(filter==='weather'){
          q=q.or(
            'name.ilike.%NOAA%,name.ilike.%GOES%,name.ilike.%METEOR%,name.ilike.%METOP%,name.ilike.%JPSS%,name.ilike.%EUMETSAT%,name.ilike.%HIMAWARI%'
          );
        }else if(filter==='active'){
          q=q
            .not(
              'tle_line1',
              'is',
              null
            )
            .not(
              'tle_line2',
              'is',
              null
            );
        }

        const {data,error}=await q;

        if(error){
          throw error;
        }

        if(
          !data||
          data.length===0
        ){
          break;
        }

        rows.push(...data);

        if(
          data.length<
          DB_BATCH
        ){
          break;
        }

        from+=DB_BATCH;
      }

      rawCache.current[key]=rows;
      return rows;
    },
    []
  );

  useEffect(()=>{
    if(viewMode!=='satellites'){
      return undefined;
    }

    let cancelled=false;

    async function load(){
      setLoading(true);
      clearFocus();

      try{
        const rows=
          await fetchRows(
            satFilter
          );

        if(cancelled)return;

        const formatted=
          rows
            .map(formatSatellite)
            .filter(
              s=>
                Number.isFinite(
                  Number(s.lat)
                )&&
                Number.isFinite(
                  Number(s.lng)
                )
            );

        if(cancelled)return;

        satRef.current=
          formatted;

        setSatellites(
          formatted
        );

        if(
          satFilter==='active'&&
          activeVisible>
            formatted.length
        ){
          setActiveVisible(
            Math.max(
              DEFAULT_ACTIVE_VISIBLE,
              formatted.length
            )
          );
        }
      }catch(error){
        console.error(
          'Satellite load error:',
          error
        );

        if(!cancelled){
          satRef.current=[];
          setSatellites([]);
        }
      }finally{
        if(!cancelled){
          setLoading(false);
        }
      }
    }

    load();

    return()=>{
      cancelled=true;
    };
  },[
    viewMode,
    satFilter,
    fetchRows,
    clearFocus,
    activeVisible
  ]);
    useEffect(()=>{
    if(
      viewMode!=='satellites'||
      satRef.current.length===0
    ){
      return undefined;
    }

    const tick=()=>{
      const now=new Date();
      const list=satRef.current;

      for(
        const sat of list
      ){
        if(!sat.satrec){
          continue;
        }

        const next=
          propagate(
            sat,
            now
          );

        if(next){
          Object.assign(
            sat,
            next
          );
        }
      }

      if(
        selectedIdRef.current!==null
      ){
        const selected=
          list.find(
            s=>
              String(s.id)===
              String(
                selectedIdRef.current
              )
          );

        if(selected){
          setSelectedSat({
            ...selected
          });
        }
      }

      if(
        globeRef.current?.pointsData
      ){
        globeRef.current.pointsData(
          displayRef.current
        );
      }

      timerRef.current=
        window.setTimeout(
          tick,
          LIVE_MS
        );
    };

    tick();

    return()=>{
      if(
        timerRef.current
      ){
        window.clearTimeout(
          timerRef.current
        );
      }

      timerRef.current=
        null;
    };
  },[
    viewMode,
    satFilter,
    satellites.length
  ]);

  const shownSatellites=
    useMemo(()=>{
      let source=
        satellites;

      if(
        satFilter==='active'&&
        satellites.length>
          activeVisible
      ){
        const selected=[];
        const step=
          satellites.length/
          activeVisible;

        for(
          let i=0;
          i<activeVisible;
          i++
        ){
          selected.push(
            satellites[
              Math.min(
                satellites.length-1,
                Math.floor(
                  i*step
                )
              )
            ]
          );
        }

        source=selected;
      }

      if(selectedSat){
        const selected=
          source.find(
            s=>
              String(s.id)===
              String(
                selectedSat.id
              )
          );

        if(!selected){
          return[];
        }

        selected.displayColor=
          '#ffffff';

        selected.displayRadius=
          0.65;

        return[
          selected
        ];
      }

      const hovering=
        Boolean(
          hoveredSat
        );

      return source.map(
        sat=>{
          const hovered=
            hovering&&
            String(
              hoveredSat.id
            )===
            String(
              sat.id
            );

          sat.displayColor=
            hovering
              ? hovered
                ? '#ffffff'
                : 'rgba(255,255,255,0.14)'
              : '#ffffff';

          sat.displayRadius=
            hovered
              ? 0.48
              : 0.22;

          return sat;
        }
      );
    },[
      satellites,
      satFilter,
      activeVisible,
      selectedSat,
      hoveredSat
    ]);

  useEffect(()=>{
    displayRef.current=
      shownSatellites;
  },[
    shownSatellites
  ]);

  const selectedOrbit=
    useMemo(()=>{
      if(
        !selectedSat?.satrec||
        viewMode!=='satellites'
      ){
        return[];
      }

      const path=
        orbitPath(
          selectedSat
        );

      return path.length>1
        ?[path]
        :[];
    },[
      selectedSat,
      viewMode
    ]);

  const maxActive=Math.max(
    DEFAULT_ACTIVE_VISIBLE,
    satellites.length
  );

  useEffect(()=>{
    if(
      viewMode!=='wiki'
    ){
      return;
    }

    let cancelled=false;

    const timer=
      window.setTimeout(
        async()=>{
          setLoading(true);

          try{
            const from=
              wikiPage*
              pageSize;

            const to=
              from+
              pageSize-
              1;

            let q=
              supabase
                .from(
                  'satellites'
                )
                .select(
                  '*',
                  {
                    count:
                      'exact'
                  }
                );

            const search=
              wikiSearch.trim();

            if(search){
              if(
                /^\d+$/.test(
                  search
                )
              ){
                q=q.or(
                  `name.ilike.%${search}%,id.eq.${search}`
                );
              }else{
                q=q.ilike(
                  'name',
                  `%${search}%`
                );
              }
            }

            const {
              data,
              count,
              error
            }=await q
              .order(
                'id',
                {
                  ascending:true
                }
              )
              .range(
                from,
                to
              );

            if(error){
              throw error;
            }

            if(cancelled){
              return;
            }

            setWikiData(
              data||[]
            );

            setTotalWiki(
              count||0
            );
          }catch(error){
            console.error(
              'Wiki error:',
              error
            );
          }finally{
            if(!cancelled){
              setLoading(false);
            }
          }
        },
        250
      );

    return()=>{
      cancelled=true;
      window.clearTimeout(
        timer
      );
    };
  },[
    viewMode,
    wikiSearch,
    wikiPage
  ]);

  const maxPages=
    Math.max(
      1,
      Math.ceil(
        totalWiki/
        pageSize
      )
    );

  const handleClick=
    useCallback(
      point=>{
        if(
          !globeRef.current
        ){
          return;
        }

        if(
          viewMode==='pads'
        ){
          setSelectedPad(
            point
          );

          globeRef.current.pointOfView(
            {
              lat:point.lat,
              lng:point.lng,
              altitude:1.35
            },
            700
          );

          return;
        }

        selectedIdRef.current=
          point.id;

        hoveredIdRef.current=
          null;

        setHoveredSat(
          null
        );

        setSelectedSat(
          {...point}
        );

        globeRef.current.pointOfView(
          {
            lat:point.lat,
            lng:point.lng,
            altitude:1.7
          },
          700
        );
      },
      [viewMode]
    );

  return(
    <div className="orbital-shell">
      <style>{`
        @keyframes starMove{
          from{
            background-position:
              0 0,
              0 0,
              0 0;
          }
          to{
            background-position:
              -420px 210px,
              260px -140px,
              -180px 320px;
          }
        }

        .orbital-shell{
          width:100%;
          max-width:1400px;
          margin:0 auto;
          display:flex;
          flex-direction:column;
          gap:1.15rem;
        }

        .orbital-space{
          position:relative;
          width:100%;
          height:560px;
          overflow:hidden;
          background:#000;
          background-image:
            radial-gradient(
              circle at 8% 12%,
              rgba(255,255,255,.82) 0 1px,
              transparent 1.5px
            ),
            radial-gradient(
              circle at 32% 68%,
              rgba(255,255,255,.50) 0 .8px,
              transparent 1.3px
            ),
            radial-gradient(
              circle at 62% 24%,
              rgba(255,255,255,.68) 0 1px,
              transparent 1.5px
            ),
            radial-gradient(
              circle at 88% 78%,
              rgba(255,255,255,.52) 0 1px,
              transparent 1.5px
            );
          background-size:
            260px 260px,
            360px 320px,
            470px 400px;
          animation:
            starMove 110s linear infinite;
          border:
            1px solid rgba(255,255,255,.12);
        }

        .orbital-loading-center{
          width:100%;
          height:100%;
          display:grid;
          place-items:center;
          background:#000;
          color:#fff;
          font:12px monospace;
        }

        .orbital-btn{
          padding:
            .48rem .8rem;
          background:
            rgba(255,255,255,.035);
          border:
            1px solid rgba(255,255,255,.18);
          color:#fff;
          font:
            700 .62rem monospace;
          letter-spacing:
            1px;
          text-transform:
            uppercase;
          cursor:pointer;
          transition:
            background .15s ease,
            border-color .15s ease;
        }

        .orbital-btn:hover{
          background:
            rgba(255,255,255,.10);
        }

        .orbital-btn.active{
          background:#fff;
          color:#000;
          border-color:#fff;
        }

        .density-panel{
          position:absolute;
          left:12px;
          top:50%;
          transform:
            translateY(-50%);
          z-index:20;
          width:58px;
          padding:
            10px 7px;
          box-sizing:border-box;
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:8px;
          background:
            rgba(0,0,0,.90);
          border:
            1px solid rgba(255,255,255,.18);
          color:#fff;
          font:
            9px monospace;
        }

        .density-range{
          appearance:none;
          -webkit-appearance:none;
          writing-mode:
            vertical-lr;
          direction:rtl;
          width:18px;
          height:180px;
          background:transparent;
          cursor:pointer;
          accent-color:#fff;
        }

        .density-range::-webkit-slider-runnable-track{
          width:3px;
          background:
            rgba(255,255,255,.24);
          border-radius:4px;
        }

        .density-range::-webkit-slider-thumb{
          appearance:none;
          -webkit-appearance:none;
          width:12px;
          height:12px;
          margin-left:-4px;
          border-radius:50%;
          background:#fff;
          border:1px solid #fff;
        }

        .orbital-panel{
          padding:
            1.2rem;
          border:
            1px solid rgba(255,255,255,.13);
          background:
            rgba(7,7,7,.94);
        }

        .orbital-grid{
          display:grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(180px,1fr)
            );
          gap:1rem;
          margin-top:.9rem;
        }

        .orbital-label{
          margin:0;
          color:#666;
          font:
            9px monospace;
        }

        .orbital-value{
          margin:
            .2rem 0 0;
          color:#fff;
          font-size:.82rem;
        }

        .orbital-value-big{
          font-weight:700;
          font-size:1rem;
        }

        .orbital-mono{
          font-family:monospace;
        }

        .orbital-db{
          max-height:420px;
          overflow:auto;
        }

        .orbital-db::-webkit-scrollbar{
          width:6px;
        }

        .orbital-db::-webkit-scrollbar-track{
          background:#050505;
        }

        .orbital-db::-webkit-scrollbar-thumb{
          background:
            rgba(255,255,255,.22);
        }

        .orbital-db table{
          width:100%;
          border-collapse:collapse;
          color:#ccc;
          font:
            10px monospace;
        }

        .orbital-db th,
        .orbital-db td{
          padding:8px;
          text-align:left;
          border-bottom:
            1px solid rgba(255,255,255,.06);
        }

        .orbital-db th{
          position:sticky;
          top:0;
          background:#050505;
          color:#fff;
        }
      `}</style>

      <div
        style={{
          display:'flex',
          justifyContent:
            'space-between',
          alignItems:'center',
          gap:'1rem',
          flexWrap:'wrap'
        }}
      >
        <div
          style={{
            display:'flex',
            gap:'.5rem',
            alignItems:'center',
            flexWrap:'wrap'
          }}
        >
          <span
            style={{
              color:'#71717a',
              font:
                '700 .62rem monospace',
              letterSpacing:
                '1.5px'
            }}
          >
            // DISPLAY MODE:
          </span>

          {[
            ['pads','Launch Pads'],
            ['satellites','Satellites'],
            ['wiki','Satellite Database']
          ].map(
            ([key,label])=>(
              <button
                key={key}
                className={`orbital-btn ${
                  viewMode===key
                    ? 'active'
                    : ''
                }`}
                onClick={()=>{
                  setViewMode(
                    key
                  );
                  clearFocus();
                }}
              >
                {label}
              </button>
            )
          )}
        </div>

        {viewMode==='pads'&&(
          <div
            style={{
              display:'flex',
              gap:'.35rem'
            }}
          >
            {[
              'all',
              'major',
              'minor'
            ].map(
              f=>(
                <button
                  key={f}
                  className={`orbital-btn ${
                    padFilter===f
                      ? 'active'
                      : ''
                  }`}
                  onClick={()=>
                    setPadFilter(f)
                  }
                >
                  {f}
                </button>
              )
            )}
          </div>
        )}

        {viewMode==='satellites'&&(
          <div
            style={{
              display:'flex',
              gap:'.35rem',
              flexWrap:'wrap'
            }}
          >
            {[
              ['stations','Stations'],
              ['starlink','Starlink'],
              ['weather','Weather'],
              ['active','All Active']
            ].map(
              ([k,l])=>(
                <button
                  key={k}
                  className={`orbital-btn ${
                    satFilter===k
                      ? 'active'
                      : ''
                  }`}
                  onClick={()=>{
                    setSatFilter(k);
                    clearFocus();
                  }}
                >
                  {l}
                </button>
              )
            )}
          </div>
        )}
      </div>

      {viewMode!=='wiki'
        ?(
          <div
            className="orbital-space"
          >
            {viewMode==='satellites'&&
              satFilter==='active'&&(
                <div className="density-panel">
                  <div
                    style={{
                      writingMode:
                        'vertical-rl',
                      transform:
                        'rotate(180deg)',
                      letterSpacing:
                        '1px'
                    }}
                  >
                    VISIBLE
                  </div>

                  <input
                    className="density-range"
                    type="range"
                    min={
                      DEFAULT_ACTIVE_VISIBLE
                    }
                    max={
                      maxActive
                    }
                    step={500}
                    value={Math.min(
                      activeVisible,
                      maxActive
                    )}
                    onChange={e=>
                      setActiveVisible(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    aria-label="Number of active satellites shown"
                  />

                  <div
                    style={{
                      fontWeight:700
                    }}
                  >
                    {activeVisible>=10000
                      ?`${(
                          activeVisible/
                          1000
                        ).toFixed(1)}K`
                      :activeVisible.toLocaleString()}
                  </div>
                </div>
              )}

            <ReactGlobe
              ref={globeRef}
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
              backgroundColor="rgba(0,0,0,0)"
              animateIn={false}
              pointsData={
                viewMode==='pads'
                  ?pads
                  :shownSatellites
              }
              pointLat="lat"
              pointLng="lng"
              pointAltitude={
                viewMode==='pads'
                  ?0.014
                  :d=>
                    d.altitude||0.002
              }
              pointColor={
                viewMode==='pads'
                  ?()=>'#fff'
                  :d=>
                    d.displayColor||
                    '#fff'
              }
              pointRadius={
                viewMode==='pads'
                  ?0.7
                  :d=>
                    d.displayRadius||
                    0.22
              }
              pointResolution={6}
              pointsTransitionDuration={0}
              pathsData={
                viewMode==='satellites'
                  ?selectedOrbit
                  :[]
              }
              pathPoints="points"
              pathPointLat="lat"
              pathPointLng="lng"
              pathPointAlt="altitude"
              pathColor={()=>
                'rgba(255,255,255,.68)'
              }
              pathStroke={1.1}
              pathDashLength={.025}
              pathDashGap={.012}
              pathDashAnimateTime={5000}
              ringsData={
                viewMode==='satellites'&&
                selectedSat
                  ?[
                      selectedSat
                    ]
                  :viewMode==='pads'&&
                    selectedPad
                    ?[
                        selectedPad
                      ]
                    :[]
              }
              ringColor={()=>'#fff'}
              ringMaxRadius={2.3}
              ringPropagationSpeed={1.3}
              ringRepeatPeriod={1100}
              onPointClick={
                handleClick
              }
              onPointHover={d=>{
                if(
                  viewMode===
                  'satellites'
                ){
                  hoveredIdRef.current=
                    d?.id??null;

                  setHoveredSat(
                    d||
                    null
                  );
                }
              }}
              onGlobeClick={()=>{
                if(
                  viewMode===
                  'satellites'
                ){
                  clearFocus();
                }
              }}
              pointLabel={d=>
                viewMode==='pads'
                  ?`
                    <div style="background:#050505;border:1px solid #555;padding:8px;color:#fff;font:10px monospace">
                      <b>${d.name}</b><br/>
                      ${d.agency}<br/>
                      LAT ${Number(d.lat).toFixed(4)}°<br/>
                      LNG ${Number(d.lng).toFixed(4)}°
                    </div>
                  `
                  :`
                    <div style="background:#050505;border:1px solid #555;padding:8px;color:#fff;font:10px monospace">
                      <b>${d.name||'UNKNOWN'}</b><br/>
                      NORAD ${d.id??'N/A'}<br/>
                      LAT ${Number(d.lat).toFixed(4)}°<br/>
                      LNG ${Number(d.lng).toFixed(4)}°<br/>
                      ALT ${Number(d.altitudeKm).toFixed(1)} km<br/>
                      VELOCITY ${
                        Number.isFinite(
                          Number(
                            d.velocityKmS
                          )
                        )
                          ?Number(
                              d.velocityKmS
                            ).toFixed(2)+' km/s'
                          :'N/A'
                      }
                    </div>
                  `
              }
            />

            {loading&&(
              <div
                style={{
                  position:
                    'absolute',
                  top:12,
                  right:12,
                  zIndex:30,
                  background:
                    'rgba(0,0,0,.9)',
                  border:
                    '1px solid #333',
                  padding:
                    '.5rem .7rem',
                  color:'#fff',
                  font:
                    '9px monospace'
                }}
              >
                LOADING ORBITAL DATA...
              </div>
            )}
          </div>
        )
        :(
          <div className="orbital-panel">
            <div
              style={{
                display:'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center',
                gap:'1rem',
                flexWrap:'wrap',
                marginBottom:
                  '1rem'
              }}
            >
              <span
                style={{
                  color:'#fff',
                  font:
                    '700 10px monospace',
                  letterSpacing:
                    '2px'
                }}
              >
                // SATELLITE DATABASE — {totalWiki.toLocaleString()} MATCHES
              </span>

              <input
                value={
                  wikiSearch
                }
                onChange={e=>{
                  setWikiSearch(
                    e.target.value
                  );
                  setWikiPage(0);
                }}
                placeholder="Search name or NORAD ID..."
                style={{
                  width:320,
                  maxWidth:
                    '100%',
                  background:
                    '#050505',
                  border:
                    '1px solid #222',
                  color:'#fff',
                  padding:
                    '.55rem .7rem',
                  font:
                    '10px monospace',
                  outline:'none'
                }}
              />
            </div>

            <div className="orbital-db">
              <table>
                <thead>
                  <tr>
                    <th>NORAD ID</th>
                    <th>OBJECT NAME</th>
                    <th>ORGANIZATION</th>
                    <th>LAT</th>
                    <th>LNG</th>
                    <th>ALT</th>
                  </tr>
                </thead>

                <tbody>
                  {wikiData.map(
                    item=>(
                      <tr
                        key={
                          item.id
                        }
                      >
                        <td>
                          {item.id}
                        </td>

                        <td
                          style={{
                            color:'#fff',
                            fontWeight:700
                          }}
                        >
                          {item.name}
                        </td>

                        <td>
                          {item.organization||
                            'Unknown'}
                        </td>

                        <td>
                          {Number.isFinite(
                            Number(
                              item.lat
                            )
                          )
                            ?Number(
                                item.lat
                              ).toFixed(4)
                            :'—'}
                        </td>

                        <td>
                          {Number.isFinite(
                            Number(
                              item.lng
                            )
                          )
                            ?Number(
                                item.lng
                              ).toFixed(4)
                            :'—'}
                        </td>

                        <td>
                          {Number.isFinite(
                            Number(
                              item.altitude
                            )
                          )
                            ?`${Number(
                                item.altitude
                              ).toFixed(1)} km`
                            :'—'}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div
              style={{
                display:
                  'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center',
                marginTop:
                  '1rem',
                color:'#777',
                font:
                  '9px monospace'
              }}
            >
              <span>
                PAGE {wikiPage+1} OF {maxPages}
              </span>

              <div
                style={{
                  display:
                    'flex',
                  gap:'.4rem'
                }}
              >
                <button
                  className="orbital-btn"
                  disabled={
                    wikiPage===0
                  }
                  onClick={()=>
                    setWikiPage(
                      p=>
                        Math.max(
                          0,
                          p-1
                        )
                    )
                  }
                >
                  PREV
                </button>

                <button
                  className="orbital-btn"
                  disabled={
                    wikiPage+1>=
                    maxPages
                  }
                  onClick={()=>
                    setWikiPage(
                      p=>p+1
                    )
                  }
                >
                  NEXT
                </button>
              </div>
            </div>
          </div>
        )}

      {viewMode==='pads'&&
        selectedPad&&(
        <div className="orbital-panel">
          <div
            style={{
              color:'#fff',
              font:
                '700 10px monospace',
              letterSpacing:
                '2px'
            }}
          >
            // LAUNCH FACILITY
          </div>

          <div className="orbital-grid">
            <Field
              label="FACILITY"
              value={
                selectedPad.name
              }
              big
            />

            <Field
              label="AGENCY"
              value={
                selectedPad.agency
              }
            />

            <Field
              label="COUNTRY / REGION"
              value={
                selectedPad.country
              }
            />

            <Field
              label="EXACT COORDINATES"
              value={`${selectedPad.lat.toFixed(5)}°, ${selectedPad.lng.toFixed(5)}°`}
              mono
            />
          </div>
        </div>
      )}

      {viewMode==='satellites'&&
        selectedSat&&(
        <div className="orbital-panel">
          <div
            style={{
              display:
                'flex',
              justifyContent:
                'space-between',
              alignItems:
                'center'
            }}
          >
            <span
              style={{
                color:'#fff',
                font:
                  '700 10px monospace',
                letterSpacing:
                  '2px'
              }}
            >
              // ORBITAL INSPECTOR
            </span>

            <button
              className="orbital-btn"
              onClick={
                clearFocus
              }
            >
              [CLOSE]
            </button>
          </div>

          <div className="orbital-grid">
            <Field
              label="OBJECT NAME"
              value={
                selectedSat.name
              }
              big
            />

            <Field
              label="NORAD ID"
              value={
                selectedSat.id
              }
              mono
            />

            <Field
              label="ORGANIZATION"
              value={
                selectedSat.organization||
                'N/A'
              }
            />

            <Field
              label="LATITUDE"
              value={`${Number(selectedSat.lat).toFixed(5)}°`}
              mono
            />

            <Field
              label="LONGITUDE"
              value={`${Number(selectedSat.lng).toFixed(5)}°`}
              mono
            />

            <Field
              label="ALTITUDE"
              value={
                Number.isFinite(
                  Number(
                    selectedSat.altitudeKm
                  )
                )
                  ?`${Number(
                      selectedSat.altitudeKm
                    ).toFixed(1)} km`
                  :'N/A'
              }
              mono
            />

            <Field
              label="VELOCITY"
              value={
                Number.isFinite(
                  Number(
                    selectedSat.velocityKmS
                  )
                )
                  ?`${Number(
                      selectedSat.velocityKmS
                    ).toFixed(2)} km/s`
                  :'N/A'
              }
              mono
            />

            <Field
              label="POSITION SOURCE"
              value={
                selectedSat.live
                  ?'TLE / SGP4 CURRENT-TIME'
                  :'DATABASE FALLBACK'
              }
            />

            <Field
              label="POSITION TIME"
              value={
                selectedSat.telemetryTime
                  ?new Date(
                      selectedSat.telemetryTime
                    ).toLocaleString()
                  :'N/A'
              }
              mono
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  mono=false,
  big=false
}){
  return(
    <div>
      <p className="orbital-label">
        {label}
      </p>

      <p
        className={`orbital-value ${
          mono
            ?'orbital-mono'
            :''
        } ${
          big
            ?'orbital-value-big'
            :''
        }`}
      >
        {value}
      </p>
    </div>
  );
}
