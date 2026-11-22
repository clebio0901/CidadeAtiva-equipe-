import { useEffect, useRef, useState } from 'react'
import { LocateFixed, Maximize2, Minimize2 } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { categories, priorities, type Activity } from './data'

const center: L.LatLngTuple = [-7.6703, -36.8828]
const layers = {
  satellite: {
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, Maxar, Earthstar Geographics e comunidade GIS',
  },
  streets: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
} as const

export default function OccurrenceMap({ activities, compact = false }: { activities: Activity[]; compact?: boolean }) {
  const initialZoom = compact ? 14 : 15
  const Heading = compact ? 'h2' : 'h1'
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const [layer, setLayer] = useState<keyof typeof layers>('satellite')
  const [category, setCategory] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [failedLayer, setFailedLayer] = useState<keyof typeof layers | null>(null)
  const count = activities.filter(item => !category || item.category === category).length

  useEffect(() => {
    const element = container.current
    if (!element) return
    const instance = L.map(element, { scrollWheelZoom: false, zoomControl: false }).setView(center, initialZoom)
    L.control.zoom({ position: 'bottomright', zoomInTitle: 'Aproximar', zoomOutTitle: 'Afastar' }).addTo(instance)
    instance.attributionControl.setPrefix(false)
    map.current = instance
    const resize = new ResizeObserver(() => instance.invalidateSize())
    resize.observe(element)
    return () => {
      resize.disconnect()
      instance.remove()
      map.current = null
    }
  }, [initialZoom])

  useEffect(() => {
    const instance = map.current
    if (!instance) return
    const config = layers[layer]
    const tiles = L.tileLayer(config.url, { attribution: config.attribution, maxZoom: 19 })
    let loadedTile = false
    tiles.on('loading', () => { loadedTile = false })
    tiles.on('tileload', () => { loadedTile = true })
    tiles.on('load', () => setFailedLayer(loadedTile ? null : layer))
    tiles.addTo(instance)
    return () => {
      tiles.off()
      tiles.remove()
    }
  }, [layer])

  useEffect(() => {
    const instance = map.current
    if (!instance) return
    const markers = L.layerGroup().addTo(instance)
    for (const activity of activities) {
      if (category && activity.category !== category) continue
      const popup = document.createElement('a')
      popup.href = '#/ocorrencia/' + activity.id
      popup.textContent = activity.title + ' · Ver detalhes'
      const priority = priorities.indexOf(activity.priority)
      L.marker(activity.coordinates, {
        title: activity.title + ' · Prioridade ' + activity.priority,
        icon: L.divIcon({
          className: 'map-pin map-pin-' + priority,
          html: '<span></span>',
          iconSize: [30, 38],
          iconAnchor: [15, 37],
          popupAnchor: [0, -33],
        }),
      }).bindPopup(popup).addTo(markers)
    }
    return () => { markers.remove() }
  }, [activities, category])

  useEffect(() => {
    if (!expanded) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [expanded])

  return <section aria-labelledby="map-title" className={'panel map-panel' + (compact ? ' map-panel-compact' : '') + (expanded ? ' map-panel-expanded' : '')}>
    <div className="map-toolbar">
      <div>
        <Heading className="map-title" id="map-title">Mapa de ocorrências · Sumé-PB</Heading>
        <p aria-live="polite">{count} {count === 1 ? 'ponto fictício' : 'pontos fictícios'}</p>
      </div>
      <div className="map-actions">
        <select aria-label="Filtrar por categoria" value={category} onChange={event => setCategory(event.target.value)}>
          <option value="">Todas as categorias</option>
          {Object.keys(categories).map(name => <option key={name}>{name}</option>)}
        </select>
        <button type="button" title="Centralizar em Sumé" aria-label="Centralizar em Sumé"
          onClick={() => map.current?.setView(center, initialZoom)}><LocateFixed size={19} /></button>
        <button type="button" title={expanded ? 'Reduzir mapa' : 'Ampliar mapa'}
          aria-label={expanded ? 'Reduzir mapa' : 'Ampliar mapa'} aria-expanded={expanded}
          onClick={() => setExpanded(value => !value)}>
          {expanded ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
        </button>
      </div>
    </div>
    <div className="map-frame">
      <div className="map" ref={container} aria-label="Mapa interativo de Sumé-PB" />
      <select className="map-layer" aria-label="Visualização do mapa" value={layer} onChange={event => {
        setFailedLayer(null)
        setLayer(event.target.value === 'streets' ? 'streets' : 'satellite')
      }}>
        <option value="satellite">Satélite</option>
        <option value="streets">Ruas</option>
      </select>
    </div>
    <div className="map-legend" aria-label="Prioridade dos marcadores">
      {priorities.map((name, index) => <span key={name}><i className={'map-pin-' + index} />{name}</span>)}
    </div>
    {failedLayer === layer && <p role="status">A camada {layer === 'satellite' ? 'Satélite' : 'Ruas'} está indisponível. Experimente a outra visualização.</p>}
  </section>
}

