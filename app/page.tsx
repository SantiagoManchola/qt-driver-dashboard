'use client';

import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import reportJson from '../data/driver-report.json';

type Driver = { carrierId: number; carrierName: string; driverId: number; driverName: string; identification?: string; driverType: 'NORMAL' | 'APOYO' };
type Report = { startDate: string; endDate: string; timezone: string; carriers: Array<{ id: number; name: string }>; drivers: Driver[]; rows: Array<Driver & { day: string; hour: string; deliveries: number }> };
const CRITICAL_DELIVERIES = 3;

function buildPeriods(from: string, to: string, granularity: 'DAY' | 'HOUR') {
  const periods: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T${granularity === 'DAY' ? '00' : '23'}:00:00Z`);
  const step = granularity === 'DAY' ? 'setUTCDate' : 'setUTCHours';
  while (cursor <= end) {
    periods.push(granularity === 'DAY' ? cursor.toISOString().slice(0, 10) : cursor.toISOString().slice(0, 13).replace('T', ' ') + ':00:00');
    if (step === 'setUTCDate') cursor.setUTCDate(cursor.getUTCDate() + 1);
    else cursor.setUTCHours(cursor.getUTCHours() + 1);
  }
  return periods;
}

export default function Dashboard() {
  const report = reportJson as Report;
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>(['46', '51']);
  const [type, setType] = useState<'TODOS' | 'NORMAL' | 'APOYO'>('TODOS');
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [granularity, setGranularity] = useState<'DAY' | 'HOUR'>('DAY');
  const [from, setFrom] = useState(report.startDate);
  const [to, setTo] = useState(report.endDate);

  const catalogDrivers = useMemo(() => report.drivers.filter((driver) => (selectedCarriers.length === 0 || selectedCarriers.includes(String(driver.carrierId))) && (type === 'TODOS' || driver.driverType === type)), [report.drivers, selectedCarriers, type]);
  const drivers = useMemo(() => catalogDrivers.map((driver) => ({ id: `${driver.carrierId}-${driver.driverId}`, name: driver.driverName, identification: driver.identification, carrierName: driver.carrierName, type: driver.driverType })).sort((a, b) => a.name.localeCompare(b.name)), [catalogDrivers]);
  const filtered = useMemo(() => report.rows.filter((row) => (selectedCarriers.length === 0 || selectedCarriers.includes(String(row.carrierId))) && (type === 'TODOS' || row.driverType === type) && (selectedDrivers.length === 0 || selectedDrivers.includes(`${row.carrierId}-${row.driverId}`)) && row.day >= from && row.day <= to), [report.rows, selectedCarriers, type, selectedDrivers, from, to]);
  const chart = useMemo(() => { const grouped = new Map<string, number>(); filtered.forEach((row) => { const period = granularity === 'DAY' ? row.day : row.hour; grouped.set(period, (grouped.get(period) ?? 0) + row.deliveries); }); return buildPeriods(from, to, granularity).map((period) => ({ period: granularity === 'DAY' ? period.slice(5) : period.slice(5, 16), deliveries: grouped.get(period) ?? 0 })); }, [filtered, from, to, granularity]);
  const total = filtered.reduce((sum, row) => sum + row.deliveries, 0);
  const activeDays = new Set(filtered.map((row) => row.day)).size;
  const criticalDrivers = useMemo(() => {
    const usage = new Map<string, { deliveries: number; days: Set<string> }>();
    filtered.forEach((row) => {
      const key = `${row.carrierId}-${row.driverId}`;
      const current = usage.get(key) ?? { deliveries: 0, days: new Set<string>() };
      current.deliveries += row.deliveries;
      current.days.add(row.day);
      usage.set(key, current);
    });
    return catalogDrivers
      .filter((driver) => selectedDrivers.length === 0 || selectedDrivers.includes(`${driver.carrierId}-${driver.driverId}`))
      .map((driver) => {
        const current = usage.get(`${driver.carrierId}-${driver.driverId}`) ?? { deliveries: 0, days: new Set<string>() };
        return { ...driver, deliveries: current.deliveries, activeDays: current.days.size };
      })
      .filter((driver) => driver.deliveries <= CRITICAL_DELIVERIES)
      .sort((a, b) => a.deliveries - b.deliveries || a.driverName.localeCompare(b.driverName));
  }, [catalogDrivers, filtered, selectedDrivers]);

  return <main className="shell">
    <header className="hero"><div><p className="eyebrow">QUICKTRACK / OPERACIONES</p><h1>Rendimiento de conductores</h1><p className="subtitle">Corte de datos desde el inicio del año, con calendario local UTC-5.</p></div><div className="live"><span /> ARCHIVO FIJO</div></header>
    <section className="toolbar"><label>Carriers<details className="driver-picker"><summary>{selectedCarriers.length === 0 ? 'Todos los carriers' : `${selectedCarriers.length} seleccionados`}</summary><div className="driver-options">{report.carriers.map((carrier) => <label className="driver-option" key={carrier.id}><input type="checkbox" checked={selectedCarriers.includes(String(carrier.id))} onChange={() => { setSelectedCarriers((current) => current.includes(String(carrier.id)) ? current.filter((id) => id !== String(carrier.id)) : [...current, String(carrier.id)]); setSelectedDrivers([]); }} /><span>{carrier.id} · {carrier.name}</span></label>)}<button type="button" className="clear-drivers" onClick={() => { setSelectedCarriers([]); setSelectedDrivers([]); }}>Todos los carriers</button></div></details></label><label>Tipo<select value={type} onChange={(event) => { setType(event.target.value as typeof type); setSelectedDrivers([]); }}><option value="TODOS">Todos</option><option value="NORMAL">Normales</option><option value="APOYO">Apoyo</option></select></label><label>Conductores<details className="driver-picker"><summary>{selectedDrivers.length === 0 ? 'Todos los conductores' : `${selectedDrivers.length} seleccionados`}</summary><div className="driver-options">{drivers.filter((item) => type === 'TODOS' || item.type === type).map((item) => <label className="driver-option" key={item.id}><input type="checkbox" checked={selectedDrivers.includes(item.id)} onChange={() => setSelectedDrivers((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} /><span>{item.identification ? `${item.identification} · ${item.name}` : item.name} <small>({item.carrierName})</small></span></label>)}<button type="button" className="clear-drivers" onClick={() => setSelectedDrivers([])}>Limpiar selección</button></div></details></label><label>Ver por<select value={granularity} onChange={(event) => setGranularity(event.target.value as typeof granularity)}><option value="DAY">Día</option><option value="HOUR">Hora</option></select></label><label>Desde<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>Hasta<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></section>
    <>
      <section className="stats"><div><span>ENTREGAS</span><strong>{total.toLocaleString('es-CO')}</strong></div><div><span>DÍAS CON ACTIVIDAD</span><strong>{activeDays}</strong></div><div><span>CONDUCTORES</span><strong>{catalogDrivers.length}</strong></div><div><span>PERIODO</span><strong>{from.slice(5)} — {to.slice(5)}</strong></div></section>
      <section className="panel"><div className="panel-heading"><div><p className="eyebrow">VOLUMEN {granularity === 'DAY' ? 'DIARIO' : 'POR HORA'}</p><h2>Entregas por {granularity === 'DAY' ? 'día' : 'hora'}</h2></div><span className="timezone">UTC-5 · {selectedCarriers.length === 1 ? `CARRIER ${selectedCarriers[0]}` : '2 CARRIERS'}</span></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={chart} margin={{ top: 12, right: 18, left: -12, bottom: 4 }}><CartesianGrid stroke="#e7e2d8" vertical={false} /><XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fill: '#817d75', fontSize: 11 }} minTickGap={granularity === 'HOUR' ? 30 : 22} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#817d75', fontSize: 11 }} /><Tooltip contentStyle={{ border: '1px solid #ded8cc', borderRadius: 8, boxShadow: '0 8px 22px #342f2514' }} labelFormatter={(label) => `${granularity === 'DAY' ? 'Día' : 'Hora'} ${label}`} /><Line type="monotone" dataKey="deliveries" name="Entregas" stroke="#e45f35" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: '#e45f35' }} /></LineChart></ResponsiveContainer></div></section>
      <section className="panel alert-panel"><div className="panel-heading"><div><p className="eyebrow">REVISIÓN DE USO</p><h2>Conductores con uso crítico</h2><p className="table-description">Hasta {CRITICAL_DELIVERIES} entregas en el rango seleccionado, incluyendo conductores sin uso.</p></div><span className="alert-count">{criticalDrivers.length} casos</span></div>{criticalDrivers.length === 0 ? <p className="empty-table">No hay conductores con uso crítico en este rango.</p> : <div className="table-scroll"><table><thead><tr><th>Carrier</th><th>Conductor</th><th>Entregas</th><th>Días activos</th><th>Estado</th></tr></thead><tbody>{criticalDrivers.map((driver) => <tr key={`${driver.carrierId}-${driver.driverId}`}><td><span className="carrier-badge">{driver.carrierId}</span> {driver.carrierName}</td><td><strong>{driver.identification || 'Sin identificación'}</strong><br /><span>{driver.driverName}</span></td><td className="number-cell">{driver.deliveries}</td><td className="number-cell">{driver.activeDays}</td><td><span className={driver.deliveries === 0 ? 'status status-zero' : 'status'}>{driver.deliveries === 0 ? 'SIN USO' : 'USO CRÍTICO'}</span></td></tr>)}</tbody></table></div>}</section>
      <p className="footnote">Datos disponibles para NVO Cruz Verde (46) y NVO Animals (51). La categoría APOYO se identifica si el nombre o la identificación del conductor contiene “apoyo”. Las horas se convierten de UTC a UTC-5 antes de agrupar.</p>
    </>
  </main>;
}
