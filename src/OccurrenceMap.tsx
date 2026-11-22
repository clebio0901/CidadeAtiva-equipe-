import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Activity } from './data'

export default function OccurrenceMap({ activities }: { activities: Activity[] }) {
  const container = useRef<HTMLDivElement>(null)
  const [tileError, setTileError] = useState(false)

  useEffect(() => {
    if (!container.current || !activities.length) return
    const map = L.map(container.current, { scrollWheelZoom: false })
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    })
    tiles.on('tileerror', () => setTileError(true)).on('tileload', () => setTileError(false))
    tiles.addTo(map)

    for (const activity of activities) {
      const popup = document.createElement('a')
      popup.href = '#/ocorrencia/' + activity.id
      popup.textContent = activity.title + ' · Ver detalhes'
      L.marker(activity.coordinates, {
        title: activity.title,
        icon: L.divIcon({ className: 'map-pin', html: '<span></span>', iconSize: [24, 24] }),
      }).addTo(map).bindPopup(popup)
    }

    map.fitBounds(L.latLngBounds(activities.map(activity => activity.coordinates)), {
      padding: [30, 30], maxZoom: 15,
    })
    return () => { map.remove() }
  }, [activities])

  return <>
    <div className="map" ref={container} aria-label="Mapa de ocorrências em Fortaleza" />
    {tileError && <p role="status">O mapa-base está indisponível. Os locais continuam na lista de ocorrências.</p>}
  </>
}

