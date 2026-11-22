import type { Activity, Status } from './data'

const configuredUrl = import.meta.env.VITE_CIDADE_ATIVA_API_URL?.trim().replace(/\/+$/, '')
export const onlineMode = Boolean(configuredUrl)
export const operationalStatuses: Status[] = ['Encaminhada', 'Em andamento', 'Concluída']

const statusByCode = {
  RECEBIDO: 'Pendente', EM_ANALISE: 'Em análise', VALIDADO: 'Validada',
  ENCAMINHADO: 'Encaminhada', EM_EXECUCAO: 'Em andamento',
  RESOLVIDO: 'Concluída', CANCELADO: 'Cancelada',
} as const
const codeByStatus = { Encaminhada: 'ENCAMINHADO', 'Em andamento': 'EM_EXECUCAO', Concluída: 'RESOLVIDO' } as const
const priorityByCode = { URGENTE: 'Urgente', ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa' } as const

type ApiOccurrence = {
  id: number
  protocolo: string
  titulo: string
  descricao: string | null
  categoriaNome: string | null
  bairroNome: string | null
  cidade: string | null
  estado: string | null
  status: keyof typeof statusByCode
  prioridade: keyof typeof priorityByCode | null
  latitude: number | null
  longitude: number | null
}

export type Session = { token: string; role: 'ADMINISTRADOR' | 'GESTOR' }
export type Employee = { id: number; nome: string; email: string; tipo: string; ativo: boolean }

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  if (!configuredUrl) throw new Error('Endereço da API ainda não configurado.')
  const base = new URL(configuredUrl)
  if (base.username || base.password || base.search || base.hash ||
      (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname)))) {
    throw new Error('Use HTTPS para acessar o backend de produção.')
  }
  const headers = new Headers({ Accept: 'application/json' })
  if (init.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', 'Bearer ' + token)
  let result: Response
  try {
    result = await fetch(configuredUrl + path, {
      ...init, headers, cache: 'no-store', redirect: 'error',
      signal: init.signal ?? AbortSignal.timeout(12000),
    })
  } catch {
    throw new Error('Não foi possível acessar a API. Confira a conexão e a configuração do servidor.')
  }
  if (!result.ok) {
    const messages: Record<number, string> = {
      401: 'Acesso inválido ou sessão expirada.',
      403: 'A conta não tem permissão para esta operação.',
      404: 'O registro ou a rota de atualização não está disponível no servidor.',
      409: 'O status mudou desde a última consulta. Confira o status atual e tente novamente.',
      429: 'Muitas solicitações. Aguarde um momento e tente novamente.',
    }
    throw new ApiError(result.status, messages[result.status] ?? 'O servidor não conseguiu concluir a operação.')
  }
  return result.json() as Promise<T>
}

function toActivity(row: ApiOccurrence): Activity {
  const { latitude, longitude } = row
  const coordinates: Activity['coordinates'] =
    typeof latitude === 'number' && typeof longitude === 'number' &&
    Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? [latitude, longitude] : null
  return {
    id: row.protocolo,
    apiId: row.id,
    apiStatus: row.status,
    title: row.titulo,
    description: row.descricao || 'Sem descrição.',
    category: row.categoriaNome || 'Sem categoria',
    location: [row.bairroNome, [row.cidade, row.estado].filter(Boolean).join('-')].filter(Boolean).join(' · ') || 'Local não informado',
    status: statusByCode[row.status] ?? 'Status não reconhecido',
    priority: row.prioridade ? priorityByCode[row.prioridade] ?? 'Sem prioridade' : 'Sem prioridade',
    coordinates,
  }
}

export async function signIn(email: string, senha: string): Promise<Session> {
  const session = await request<{ token: string; tipo: string }>('/api/auth/login', {
    method: 'POST', body: JSON.stringify({ email, senha }),
  })
  if (session.tipo !== 'GESTOR' && session.tipo !== 'ADMINISTRADOR') {
    throw new Error('Use uma conta Gestor ou Administrador autorizada para demandas operacionais.')
  }
  return { token: session.token, role: session.tipo }
}

const employeeEndpoint = '/api/usuarios/funcionarios'

export async function fetchEmployees(token: string, signal: AbortSignal) {
  const rows = await request<Employee[]>('/api/usuarios', { signal }, token)
  return rows.filter(row => row.tipo === 'SERVIDOR').sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

export async function registerEmployee(token: string, employee: { nome: string; email: string; telefone: string; senha: string }) {
  try {
    return await request<Employee>(employeeEndpoint, { method: 'POST', body: JSON.stringify(employee) }, token)
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new ApiError(409, 'Já existe uma conta com esse e-mail.')
    }
    throw error
  }
}

export async function fetchOccurrences(token: string, signal: AbortSignal) {
  const rows = await request<ApiOccurrence[]>('/api/ocorrencias', { signal }, token)
  return rows.map(toActivity)
}

export async function saveOccurrenceStatus(token: string, item: Activity, status: Status) {
  const nextStatus = codeByStatus[status as keyof typeof codeByStatus]
  if (!item.apiId || !item.apiStatus || !nextStatus) throw new Error('Status indisponível para atualização.')
  const row = await request<ApiOccurrence>('/api/ocorrencias/' + item.apiId + '/status', {
    method: 'PATCH', body: JSON.stringify({ status: nextStatus, statusEsperado: item.apiStatus }),
  }, token)
  return toActivity(row)
}

