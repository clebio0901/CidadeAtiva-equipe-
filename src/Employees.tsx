import { useEffect, useState } from 'react'
import { Users, UserPlus } from 'lucide-react'
import { ApiError, fetchEmployees, registerEmployee, type Employee } from './api'

export default function Employees({ token, onExpired }: { token: string | null; onExpired: () => void }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(Boolean(token))
  const [saving, setSaving] = useState(false)
  const [listError, setListError] = useState('')
  const [formNotice, setFormNotice] = useState('')

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 12000)
    let active = true
    fetchEmployees(token, controller.signal).then(rows => {
      if (active) setEmployees(rows)
    }).catch(error => {
      if (!active) return
      if (error instanceof ApiError && error.status === 401) onExpired()
      else setListError(error instanceof Error ? error.message : 'Falha ao carregar funcionários.')
    }).finally(() => {
      clearTimeout(timer)
      if (active) setLoading(false)
    })
    return () => {
      active = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [token, onExpired])

  return <>
    <header className="page-header">
      <h1>Funcionários</h1>
      <p>Cadastre funcionários de campo e consulte as contas da Equipe.</p>
    </header>
    <div className="detail-grid employees-grid">
      <form className="panel detail" onSubmit={async event => {
        event.preventDefault()
        if (!token || loading || saving) return
        const form = event.currentTarget
        const data = new FormData(form)
        const nome = String(data.get('nome')).trim()
        const email = String(data.get('email')).trim()
        const telefone = String(data.get('telefone')).trim()
        const senha = String(data.get('senha'))
        if (nome.length < 3) {
          setFormNotice('Informe um nome com pelo menos 3 caracteres.')
          return
        }
        if (new TextEncoder().encode(senha).length > 72 ||
            !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(senha)) {
          setFormNotice('Use de 8 a 72 bytes, com maiúscula, minúscula, número e caractere especial.')
          return
        }
        if (senha !== String(data.get('confirmacao'))) {
          setFormNotice('A confirmação da senha precisa corresponder à senha.')
          return
        }
        setSaving(true)
        setFormNotice('')
        try {
          const employee = await registerEmployee(token, { nome, email, telefone, senha })
          setEmployees(current => [...current.filter(row => row.id !== employee.id), employee].sort(byName))
          setFormNotice('Funcionário cadastrado com sucesso.')
          form.reset()
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) onExpired()
          else setFormNotice(error instanceof Error ? error.message : 'Falha ao cadastrar funcionário.')
        } finally {
          setSaving(false)
        }
      }}>
        <h2><UserPlus size={20} /> Novo funcionário</h2>
        <p>Perfil atribuído: Servidor de campo.</p>
        {!token && <p>Prévia do formulário. O cadastro será habilitado com o backend integrado.</p>}
        <label>Nome completo<input name="nome" autoComplete="name" minLength={3} maxLength={150} required /></label>
        <label>E-mail<input name="email" autoComplete="email" type="email" maxLength={150} required /></label>
        <label>Telefone (opcional)<input name="telefone" autoComplete="tel" type="tel" maxLength={20} /></label>
        <label>Senha inicial<input name="senha" autoComplete="new-password" type="password" minLength={8} maxLength={72}
          aria-describedby="employee-password-hint" required /></label>
        <small id="employee-password-hint">Use ao menos 8 caracteres, com maiúscula, minúscula, número e símbolo.</small>
        <label>Confirmar senha<input name="confirmacao" autoComplete="new-password" type="password"
          minLength={8} maxLength={72} required /></label>
        <button className="button lime" disabled={!token || loading || saving}>{saving ? 'Cadastrando…' : 'Cadastrar funcionário'}</button>
        {formNotice && <p role="status">{formNotice}</p>}
      </form>
      <section className="panel detail">
        <h2><Users size={20} /> Funcionários cadastrados</h2>
        {loading && <p role="status">Carregando funcionários…</p>}
        {listError && <p role="status">{listError}</p>}
        {!loading && !listError && employees.length === 0 && <p>{token ? 'Nenhum funcionário cadastrado.' : 'A lista aparece ao conectar o backend.'}</p>}
        {employees.length > 0 && <ul className="employee-list">
          {employees.map(employee => <li key={employee.id}>
            <strong>{employee.nome}</strong>
            <span>{employee.email}</span>
            <small>{employee.ativo ? 'Conta ativa' : 'Conta inativa'}</small>
          </li>)}
        </ul>}
      </section>
    </div>
  </>
}

function byName(a: Employee, b: Employee) {
  return a.nome.localeCompare(b.nome, 'pt-BR')
}

