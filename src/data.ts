import { Construction, Droplets, Lightbulb, Trash2, Trees } from 'lucide-react'

export const priorities = ['Alta', 'Média', 'Baixa'] as const
export const statuses = ['Pendente', 'Em andamento', 'Concluída'] as const
export type Status = typeof statuses[number]

export const categories = {
  'Iluminação': Lightbulb,
  'Pavimentação': Construction,
  'Limpeza urbana': Trash2,
  'Drenagem': Droplets,
  'Áreas verdes': Trees,
}

export interface Activity {
  id: string
  title: string
  category: keyof typeof categories
  priority: typeof priorities[number]
  status: Status
  location: string
  coordinates: [number, number]
  description: string
}

export const activities: Activity[] = [
  { id: 'CA-1048', title: 'Poste sem iluminação', category: 'Iluminação', priority: 'Alta', status: 'Pendente', location: 'Centro · Sumé-PB', coordinates: [-7.6701, -36.8826], description: 'Verificar a luminária próxima à calçada e sinalizar a área durante o atendimento.' },
  { id: 'CA-1046', title: 'Buraco na via', category: 'Pavimentação', priority: 'Alta', status: 'Em andamento', location: 'Centro · Sumé-PB', coordinates: [-7.6693, -36.8843], description: 'Avaliar o trecho da pista, registrar a extensão do dano e sinalizar o local.' },
  { id: 'CA-1042', title: 'Recolhimento de resíduos', category: 'Limpeza urbana', priority: 'Média', status: 'Pendente', location: 'Área urbana · Sumé-PB', coordinates: [-7.6722, -36.8812], description: 'Recolher os resíduos acumulados junto ao meio-fio e liberar a passagem de pedestres.' },
  { id: 'CA-1039', title: 'Bueiro obstruído', category: 'Drenagem', priority: 'Média', status: 'Em andamento', location: 'Área urbana · Sumé-PB', coordinates: [-7.6679, -36.8803], description: 'Inspecionar a caixa de drenagem e remover resíduos da grelha.' },
  { id: 'CA-1035', title: 'Poda de galhos baixos', category: 'Áreas verdes', priority: 'Baixa', status: 'Pendente', location: 'Área urbana · Sumé-PB', coordinates: [-7.6713, -36.886], description: 'Avaliar os galhos que avançam sobre a calçada e organizar a poda.' },
  { id: 'CA-1028', title: 'Limpeza de calçada', category: 'Limpeza urbana', priority: 'Baixa', status: 'Concluída', location: 'Centro · Sumé-PB', coordinates: [-7.6688, -36.8817], description: 'A equipe concluiu a limpeza da passagem no trecho sinalizado.' },
]

