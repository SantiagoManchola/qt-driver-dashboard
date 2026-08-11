'use client';

import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import reportJson from '../data/driver-report.json';

type Report = { startDate: string; endDate: string; timezone: string; carrierId: number; rows: Array<{ driverId: number; driverName: string; driverType: 'NORMAL' | 'APOYO'; day: string; hour: string; deliveries: number }> };

export default function Dashboard() {
  const report = reportJson as Report;
  const [type, setType] = useState<'TODOS' | 'NORMAL' | 'APOYO'>('TODOS');
  const [driver, setDriver] = useState('TODOS');
  const [granularity, setGranularity] = useState<'DAY' | 'HOUR'>('DAY');
  const [from, setFrom] = useState(report.startDate);
  const [to, setTo] = useState(report.endDate);

  const drivers = useMemo(() => [...new Map(report.rows.map((row) => [row.driverId, { id: row.driverId, name: row.driverName, type: row.driverType }])).values()].sort((a, b) => a.name.localeCompare(b.name)), [report.rows]);
  const filtered = useMemo(() => report.rows.filter((row) => (type === 'TODOS' || row.driverType === type) && (driver === 'TODOS' || String(row.driverId) === driver) && row.day >= from && row.day <= to), [report.rows, type, driver, from, to]);
  const chart = useMemo(() => { const grouped = new Map<string, number>(); filtered.forEach((row) => { const period = granularity === 'DAY' ? row.day : row.hour; grouped.set(period, (grouped.get(period) ?? 0) + row.deliveries); }); return [...grouped.entries()].map(([period, deliveries]) => ({ period: granularity === 'DAY' ? period.slice(5) : period.slice(5, 16), deliveries })); }, [filtered, granularity]);
  const total = filtered.reduce((sum, row) => sum + row.deliveries, 0);
  const activeDays = new Set(filtered.map((row) => row.day)).size;

  return <main className="shell">
    <header className="hero"><div><p className="eyebrow">QUICKTRACK / OPERACIONES</p><h1>Rendimiento de conductores</h1><p className="subtitle">Corte de datos desde el inicio del año, con calendario local UTC-5.</p></div><div className="live"><span /> ARCHIVO FIJO</div></header>
    <section className="toolbar"><label>Tipo<select value={type} onChange={(event) => { setType(event.target.value as typeof type); setDriver('TODOS'); }}><option value="TODOS">Todos</option><option value="NORMAL">Normales</option><option value="APOYO">Apoyo</option></select></label><label>Conductor<select value={driver} onChange={(event) => setDriver(event.target.value)}><option value="TODOS">Todos los conductores</option>{drivers.filter((item) => type === 'TODOS' || item.type === type).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Ver por<select value={granularity} onChange={(event) => setGranularity(event.target.value as typeof granularity)}><option value="DAY">Día</option><option value="HOUR">Hora</option></select></label><label>Desde<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>Hasta<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></section>
    <>
      <section className="stats"><div><span>ENTREGAS</span><strong>{total.toLocaleString('es-CO')}</strong></div><div><span>DÍAS CON ACTIVIDAD</span><strong>{activeDays}</strong></div><div><span>CONDUCTORES</span><strong>{new Set(filtered.map((row) => row.driverId)).size}</strong></div><div><span>PERIODO</span><strong>{from.slice(5)} — {to.slice(5)}</strong></div></section>
      <section className="panel"><div className="panel-heading"><div><p className="eyebrow">VOLUMEN {granularity === 'DAY' ? 'DIARIO' : 'POR HORA'}</p><h2>Entregas por {granularity === 'DAY' ? 'día' : 'hora'}</h2></div><span className="timezone">UTC-5 · CARRIER 46</span></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={chart} margin={{ top: 12, right: 18, left: -12, bottom: 4 }}><CartesianGrid stroke="#e7e2d8" vertical={false} /><XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fill: '#817d75', fontSize: 11 }} minTickGap={granularity === 'HOUR' ? 30 : 22} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#817d75', fontSize: 11 }} /><Tooltip contentStyle={{ border: '1px solid #ded8cc', borderRadius: 8, boxShadow: '0 8px 22px #342f2514' }} labelFormatter={(label) => `${granularity === 'DAY' ? 'Día' : 'Hora'} ${label}`} /><Line type="monotone" dataKey="deliveries" name="Entregas" stroke="#e45f35" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: '#e45f35' }} /></LineChart></ResponsiveContainer></div></section>
      <p className="footnote">Datos limitados al carrier_id 46. La categoría APOYO se identifica si el nombre o la identificación del conductor contiene “apoyo”. Las horas se convierten de UTC a UTC-5 antes de agrupar.</p>
    </>
  </main>;
}
