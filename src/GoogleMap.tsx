import { useEffect, useRef, useState } from 'react'
import { priorities, type Activity } from './data'

const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
export const hasGoogleMaps = Boolean(key)
const authenticationError = 'cidade-ativa-google-maps-auth-error'
const colors = ['#d95d17', '#c38c00', '#278051']

declare global {
  interface Window {
    cidadeAtivaGoogleMapsReady?: () => void
    gm_authFailure?: () => void
  }
}

let loading: Promise<void> | undefined
let authFailed = false

function loadMaps() {
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    const timeout = window.setTimeout(() => fail(), 12000)

    function fail() {
      clearTimeout(timeout)
      delete window.cidadeAtivaGoogleMapsReady
      script.remove()
      reject(new Error('Falha ao carregar o Google Maps'))
    }

    window.cidadeAtivaGoogleMapsReady = () => {
      clearTimeout(timeout)
      delete window.cidadeAtivaGoogleMapsReady
      resolve()
    }
    window.gm_authFailure = () => {
      authFailed = true
      window.dispatchEvent(new Event(authenticationError))
      fail()
    }

    const params = new URLSearchParams({
      key: key ?? '',
      loading: 'async',
      callback: 'cidadeAtivaGoogleMapsReady',
      v: 'weekly',
      language: 'pt-BR',
      region: 'BR',
    })
    script.src = 'https://maps.googleapis.com/maps/api/js?' + params
    script.async = true
    script.onerror = fail
    document.head.append(script)
  })
  return loading
}

type Props = {
  activities: Activity[]
  category: string
  center: [number, number]
  zoom: number
  layer: 'satellite' | 'streets'
  onUnavailable: () => void
  reset: { current: (() => void) | null }
}

export default function GoogleMap({ activities, category, center, zoom, layer, onUnavailable, reset }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [latitude, longitude] = center

  useEffect(() => {
    const element = container.current
    if (!element) return
    let active = true
    let instance: google.maps.Map | undefined
    const position = { lat: latitude, lng: longitude }

    window.addEventListener(authenticationError, onUnavailable)
    loadMaps().then(() => {
      if (!active) return
      if (authFailed) {
        onUnavailable()
        return
      }
      instance = new google.maps.Map(element, {
        center: position, zoom,
        mapTypeId: 'satellite',
        gestureHandling: 'greedy',
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
        fullscreenControl: false,
        mapTypeControl: false,
        streetViewControl: false,
      })
      const readyMap = instance
      reset.current = () => {
        readyMap.setCenter(position)
        readyMap.setZoom(zoom)
      }
      setMap(readyMap)
    }).catch(() => {
      if (active) onUnavailable()
    })

    return () => {
      active = false
      reset.current = null
      window.removeEventListener(authenticationError, onUnavailable)
      if (instance) google.maps.event.clearInstanceListeners(instance)
    }
  }, [latitude, longitude, zoom, onUnavailable, reset])

  useEffect(() => {
    map?.setMapTypeId(layer === 'satellite' ? 'satellite' : 'roadmap')
  }, [map, layer])

  useEffect(() => {
    if (!map) return
    const points = new google.maps.Data({ map })
    const popup = new google.maps.InfoWindow()
    for (const activity of activities) {
      if (category && activity.category !== category) continue
      const [lat, lng] = activity.coordinates
      points.add({
        geometry: new google.maps.Data.Point({ lat, lng }),
        properties: { id: activity.id, title: activity.title, color: colors[priorities.indexOf(activity.priority)] },
      })
    }
    points.setStyle(feature => ({
      title: String(feature.getProperty('title')),
      icon: {
        path: 'M0 0 C-4 -7 -12 -14 -12 -23 A12 12 0 0 1 12 -23 C12 -14 4 -7 0 0 Z',
        fillColor: String(feature.getProperty('color')),
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
        scale: 0.85,
        anchor: new google.maps.Point(0, 0),
      },
    }))
    const click = points.addListener('click', (event: google.maps.Data.MouseEvent) => {
      const link = document.createElement('a')
      link.href = '#/ocorrencia/' + String(event.feature.getProperty('id'))
      link.textContent = String(event.feature.getProperty('title')) + ' · Ver detalhes'
      popup.setContent(link)
      popup.setPosition(event.latLng)
      popup.open({ map })
    })
    return () => {
      click.remove()
      popup.close()
      points.setMap(null)
    }
  }, [activities, category, map])

  return <div className="map" ref={container} aria-label="Google Maps interativo de Sumé-PB" />
}

