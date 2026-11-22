import { StrictMode, Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2, ChevronRight, ClipboardList, Clock3, LayoutDashboard, MapPin, Map as MapIcon, Radio, TriangleAlert } from 'lucide-react'
import { activities, categories, priorities, statuses, type Activity, type Status } from './data'
import { onlineMode, operationalStatuses, signIn } from './api'
import { useSharedOccurrences } from './useSharedOccurrences'
import './styles.css'

const OccurrenceMap = lazy(() => import('./OccurrenceMap'))
const storageKey = 'cidade-ativa-equipe/status/v1'
const demoStatuses: Status[] = ['Pendente', 'Em andamento', 'Concluída']
const navigation = [
  { path: '/', title: 'Visão geral', icon: LayoutDashboard },
  { path: '/atividades', title: 'Atividades', icon: ClipboardList },
  { path: '/mapa', title: 'Mapa', icon: MapIcon },
]

function loadStatuses(): Record<string, Status> {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    if (!saved || typeof saved !== 'object') return {}
    return Object.fromEntries(activities.flatMap(({ id }) => {
      const value = (saved as Record<string, Status>)[id]
      return statuses.includes(value) ? [[id, value]] : []
    }))
  } catch {
    return {}
  }
}

function Badge({ label }: { label: string }) {
  const variant = ['Urgente', 'Alta', 'Pendente'].includes(label) ? 'warm' :
    ['Em andamento', 'Média'].includes(label) ? 'gold' : 'green'
  return <span className={'badge ' + variant}><i />{label}</span>
}

function ActivityList({ items }: { items: Activity[] }) {
  return items.length ? <ul className="activity-list">{items.map(item => {
    const Icon = categories[item.category as keyof typeof categories] ?? ClipboardList
    return <li key={item.id}>
      <a className="activity" href={'#/ocorrencia/' + item.id}>
        <span className="activity-icon"><Icon size={21} /></span>
        <span className="activity-name">
          <strong>{item.title}</strong>
          <small>{item.id} · {item.location}</small>
        </span>
        <span className="activity-badges"><Badge label={item.priority} /><Badge label={item.status} /></span>
        <ChevronRight className="row-arrow" size={19} />
      </a>
    </li>
  })}</ul> : <p className="empty">Nenhuma ocorrência corresponde aos filtros.</p>
}

function Dashboard({ items }: { items: Activity[] }) {
  const metrics = [
    { label: 'Prioridade alta', value: items.filter(item => ['Urgente', 'Alta'].includes(item.priority) && !['Concluída', 'Cancelada'].includes(item.status)).length, icon: TriangleAlert, color: 'warm' },
    { label: 'Pendentes', value: items.filter(item => ['Pendente', 'Em análise', 'Validada', 'Encaminhada'].includes(item.status)).length, icon: ClipboardList, color: 'neutral' },
    { label: 'Em andamento', value: items.filter(item => item.status === 'Em andamento').length, icon: Clock3, color: 'gold' },
    { label: 'Concluídas', value: items.filter(item => item.status === 'Concluída').length, icon: CheckCircle2, color: 'green' },
  ]
  return <>
    <section className="hero dashboard-intro">
      <div className="hero-content">
        <p className="eyebrow"><Radio size={16} /> Operações urbanas</p>
        <h1>Painel da equipe</h1>
        <p>Acompanhe as ocorrências e organize o trabalho em campo.</p>
        <a className="button lime" href="#/atividades">Minhas atividades <ArrowRight size={18} /></a>
      </div>
      <span className="hero-art" aria-hidden="true"><MapPin strokeWidth={0.8} /></span>
    </section>
    <section className="metrics" aria-label="Resumo das ocorrências">
      {metrics.map(({ label, value, icon: Icon, color }) => <article className="metric" key={label}>
        <span className={'metric-icon ' + color}><Icon size={20} /></span>
        <div><strong>{value}</strong><span>{label}</span></div>
      </article>)}
    </section>
    <div className="dashboard-map-grid">
      <Suspense fallback={<p className="panel map-loading" role="status">Carregando mapa…</p>}>
        <OccurrenceMap activities={items} compact live={onlineMode} />
      </Suspense>
      <section className="panel dashboard-priorities">
        <div className="panel-header">
          <div><h2>Prioridades em campo</h2><p>Ocorrências abertas por ordem de prioridade</p></div>
          <a className="text-link" href="#/atividades">Ver todas <ArrowUpRight size={17} /></a>
        </div>
        <ActivityList items={items.filter(item => !['Concluída', 'Cancelada'].includes(item.status)).slice(0, 4)} />
      </section>
    </div>
  </>
}

function Activities({ items }: { items: Activity[] }) {
  const [priority, setPriority] = useState('Todas')
  const [status, setStatus] = useState('Todos')
  const filtered = items.filter(item =>
    (priority === 'Todas' || item.priority === priority) && (status === 'Todos' || item.status === status))
  return <>
    <header className="page-header"><h1>Minhas atividades</h1><p>Consulte as ocorrências e acompanhe o atendimento em campo.</p></header>
    <section className="panel">
      <div className="filters">
        <label>Prioridade<select value={priority} onChange={event => setPriority(event.target.value)}>
          {['Todas', ...priorities].map(option => <option key={option}>{option}</option>)}
        </select></label>
        <label>Status<select value={status} onChange={event => setStatus(event.target.value)}>
          {['Todos', ...(onlineMode ? statuses : demoStatuses)].map(option => <option key={option}>{option}</option>)}
        </select></label>
        <span className="result-count"><ArrowDown size={14} /> {filtered.length} de {items.length} ocorrências</span>
      </div>
      <ActivityList items={filtered} />
    </section>
  </>
}

function Details({ item, onChange }: { item: Activity; onChange: (item: Activity, status: Status) => Promise<string> }) {
  const [feedback, setFeedback] = useState('')
  const [draft, setDraft] = useState<{ status: Status; base: Status } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const status = draft?.base === item.status ? draft.status : item.status
  const options = onlineMode ? [...new Set([item.status, ...operationalStatuses])] : demoStatuses
  const editable = !onlineMode || !['Concluída', 'Cancelada', 'Status não reconhecido'].includes(item.status)
  const Icon = categories[item.category as keyof typeof categories] ?? ClipboardList
  return <>
    <a className="text-link back" href="#/atividades"><ArrowLeft size={18} /> Atividades</a>
    <header className="page-header"><p className="eyebrow">{item.id}</p><h1>{item.title}</h1><p>{item.location}</p></header>
    <div className="detail-grid">
      <section className="panel detail">
        <span className="activity-icon"><Icon size={21} /></span>
        <h2>Dados da ocorrência</h2>
        <div className="detail-badges"><Badge label={item.priority} /><Badge label={item.status} /></div>
        <h3>{item.category}</h3>
        <p>{item.description}</p>
        {item.coordinates && <a className="text-link" target="_blank" rel="noopener noreferrer"
          href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(item.coordinates.join(','))}>
          <MapPin size={17} /> Abrir no Google Maps <ArrowUpRight size={15} />
        </a>}
      </section>
      <form className="panel detail" onSubmit={async event => {
        event.preventDefault()
        if (submitting || !editable || status === item.status) return
        setSubmitting(true)
        try {
          setFeedback(await onChange(item, status))
          setDraft(null)
        } catch (error) {
          setFeedback(error instanceof Error ? error.message : 'Falha ao salvar o status.')
          setDraft(null)
        } finally {
          setSubmitting(false)
        }
      }}>
        <h2>Atualizar atendimento</h2>
        <label>Status<select value={status} disabled={!editable || submitting} onChange={event => {
          const selected = options.find(option => option === event.target.value)
          if (selected) setDraft({ status: selected, base: item.status })
          setFeedback('')
        }}>
          {options.map(option => <option key={option}>{option}</option>)}
        </select></label>
        <button className="button lime" disabled={!editable || submitting || status === item.status}>{submitting ? 'Salvando…' : 'Salvar status'}</button>
        {feedback && <p role="status">{feedback}</p>}
      </form>
    </div>
  </>
}

function Login({ onLogin, notice }: { onLogin: (token: string) => void; notice: string }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return <form className="panel detail login-panel" onSubmit={async event => {
    event.preventDefault()
    if (busy) return
    const form = event.currentTarget
    const data = new FormData(form)
    setBusy(true)
    setError('')
    try {
      onLogin(await signIn(String(data.get('email')).trim(), String(data.get('senha'))))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível entrar.')
    } finally {
      form.reset()
      setBusy(false)
    }
  }}>
    <h1>Cidade Ativa — Equipe</h1>
    <p>Entre com sua conta de trabalho do Cidade Ativa.</p>
    <label>E-mail<input type="email" name="email" autoComplete="username" required /></label>
    <label>Senha<input type="password" name="senha" autoComplete="current-password" required /></label>
    <button className="button lime" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
    {(error || notice) && <p role="status">{error || notice}</p>}
  </form>
}

function App() {
  const [route, setRoute] = useState(() => location.hash.slice(1) || '/')
  const [saved, setSaved] = useState(loadStatuses)
  const [token, setToken] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const expire = useCallback(() => {
    setNotice('Sua sessão expirou. Entre novamente.')
    setToken(null)
  }, [])
  const shared = useSharedOccurrences(token, expire)
  useEffect(() => {
    function onNavigate() {
      setRoute(location.hash.slice(1) || '/')
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onNavigate)
    return () => window.removeEventListener('hashchange', onNavigate)
  }, [])
  const items = useMemo(() => {
    const source = onlineMode ? shared.items ?? [] : activities.map(item => ({ ...item, status: saved[item.id] ?? item.status }))
    return [...source].sort((a, b) => priorities.indexOf(a.priority) - priorities.indexOf(b.priority))
  }, [saved, shared.items])
  const selected = route.startsWith('/ocorrencia/') ? items.find(item => route === '/ocorrencia/' + item.id) : undefined

  async function updateStatus(item: Activity, status: Status) {
    if (onlineMode) return shared.save(item, status)
    const next = { ...saved, [item.id]: status }
    setSaved(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      return 'Status salvo neste dispositivo.'
    } catch {
      return 'Status alterado nesta sessão. O armazenamento local está indisponível.'
    }
  }

  if (onlineMode && !token) return <main><Login onLogin={setToken} notice={notice} /></main>

  let page
  if (onlineMode && !shared.items) page = <p className="panel sync-notice" role="status">{shared.message || 'Consultando demandas…'}</p>
  else if (route === '/') page = <Dashboard items={items} />
  else if (route === '/atividades') page = <Activities items={items} />
  else if (route === '/mapa') page = <>
    <Suspense fallback={<p role="status">Carregando mapa…</p>}>
      <OccurrenceMap activities={items} live={onlineMode} />
    </Suspense>
    <section className="panel"><div className="panel-header"><h2>Todas as ocorrências</h2></div><ActivityList items={items} /></section>
  </>
  else if (selected) page = <Details key={selected.id} item={selected} onChange={updateStatus} />
  else page = <header className="page-header"><h1>Página indisponível</h1><a className="text-link" href="#/">Voltar ao painel</a></header>

  return <div className="shell">
    <aside className="sidebar">
      <a className="brand" href="#/"><span className="brand-icon"><MapPin size={23} /></span>
        <span>Cidade Ativa<small>Equipe de campo</small></span>
      </a>
      <nav aria-label="Navegação principal">{navigation.map(({ path, title, icon: Icon }) => {
        const active = route === path || (path === '/atividades' && !!selected)
        return <a key={path} href={'#' + path} className={active ? 'active' : undefined}
          aria-current={route === path ? 'page' : undefined}><Icon size={20} />{title}</a>
      })}</nav>
      <div className="sidebar-footer"><span>CA</span><div>Equipe de campo<small>{onlineMode ? 'Sistema integrado' : 'Ambiente de demonstração'}</small></div></div>
    </aside>
    <div className="workspace">
      <header className={'topbar' + (onlineMode ? ' topbar-live' : '')}>
        <span>Central de operações</span>
        {onlineMode ? <div className="account-controls">
          <button className="button" type="button" onClick={() => void shared.refresh()}>Atualizar</button>
          <button className="button" type="button" onClick={() => { setNotice(''); setToken(null) }}>Sair</button>
        </div> : <span className="demo"><i /> Dados fictícios</span>}
      </header>
      <main>{onlineMode && shared.items && shared.message && <p className="panel sync-notice" role="status">{shared.message}</p>}{page}</main>
    </div>
  </div>
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)

