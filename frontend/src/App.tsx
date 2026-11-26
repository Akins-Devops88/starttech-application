import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

type User = {
  id?: string
  firstName: string
  lastName: string
  username: string
}

type Todo = {
  id: string | number
  userId?: string
  title: string
  description?: string
  completed: boolean
  createdAt?: string
  updatedAt?: string
}

type AuthResponse = {
  message?: string
  token: string
  user: User
}

async function api<T>(
  path: string,
  token?: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  if (options.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  const text = await response.text()
  let data: any = {}

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed (${response.status})`)
  }

  return data as T
}

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('muchtodo_token') || '')
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('muchtodo_user')
    return saved ? JSON.parse(saved) as User : null
  })

  const [todos, setTodos] = useState<Todo[]>([])
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [todosLoading, setTodosLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const loadTodos = useCallback(async (authToken: string) => {
    setTodosLoading(true)
    try {
      const result = await api<Todo[]>('/todos/', authToken)
      setTodos(Array.isArray(result) ? result : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your tasks')
    } finally {
      setTodosLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) {
      void loadTodos(token)
    }
  }, [token, loadTodos])

  const completedCount = useMemo(
    () => todos.filter((todo) => todo.completed).length,
    [todos],
  )

  const pendingCount = todos.length - completedCount
  const progress = todos.length ? Math.round((completedCount / todos.length) * 100) : 0

  function clearMessages() {
    setError('')
    setNotice('')
  }

  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clearMessages()
    setLoading(true)

    try {
      if (mode === 'register') {
        await api('/auth/register', undefined, {
          method: 'POST',
          body: JSON.stringify({ firstName, lastName, username, password }),
        })
        setNotice('Your account has been created. Please sign in.')
        setMode('login')
        setPassword('')
      } else {
        const result = await api<AuthResponse>('/auth/login', undefined, {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        })

        if (!result.token || !result.user) {
          throw new Error('The server did not return a valid login token and user.')
        }

        sessionStorage.setItem('muchtodo_token', result.token)
        sessionStorage.setItem('muchtodo_user', JSON.stringify(result.user))
        setToken(result.token)
        setUser(result.user)
        setPassword('')
        setNotice('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    sessionStorage.removeItem('muchtodo_token')
    sessionStorage.removeItem('muchtodo_user')
    setToken('')
    setUser(null)
    setTodos([])
    setPassword('')
    clearMessages()
  }

  async function addTodo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || !token) return

    clearMessages()
    setLoading(true)

    try {
      await api('/todos/', token, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      })
      setTitle('')
      setDescription('')
      await loadTodos(token)
      setNotice('Task added successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add task')
    } finally {
      setLoading(false)
    }
  }

  async function toggleTodo(todo: Todo) {
    if (!token) return
    clearMessages()

    try {
      await api(`/todos/${encodeURIComponent(todo.id)}`, token, {
        method: 'PUT',
        body: JSON.stringify({ completed: !todo.completed }),
      })
      await loadTodos(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update task')
    }
  }

  function beginEdit(todo: Todo) {
    setEditingId(todo.id)
    setEditTitle(todo.title)
    setEditDescription(todo.description || '')
    clearMessages()
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || editingId === null || !editTitle.trim()) return

    setLoading(true)
    clearMessages()

    try {
      await api(`/todos/${encodeURIComponent(editingId)}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
        }),
      })
      setEditingId(null)
      await loadTodos(token)
      setNotice('Task updated successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update task')
    } finally {
      setLoading(false)
    }
  }

  async function deleteTodo(todo: Todo) {
    if (!token) return
    if (!window.confirm(`Delete "${todo.title}"?`)) return

    clearMessages()

    try {
      await api(`/todos/${encodeURIComponent(todo.id)}`, token, {
        method: 'DELETE',
      })
      await loadTodos(token)
      setNotice('Task deleted.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete task')
    }
  }

  if (!token) {
    return (
      <main className="auth-page">
        <section className="auth-showcase">
          <div className="brand brand-light">
            <span className="brand-mark">M</span>
            <span>MuchTodo</span>
          </div>

          <div className="showcase-copy">
            <span className="eyebrow">MAKE EVERY DAY COUNT</span>
            <h1>Less clutter.<br />More <span>done.</span></h1>
            <p>A simple, focused space to organise your work, track your progress and get things done.</p>
            <div className="showcase-checks">
              <span>✓ Organise your priorities</span>
              <span>✓ Track every accomplishment</span>
              <span>✓ Stay focused on what matters</span>
            </div>
          </div>

          <div className="showcase-footer">Your day, your pace, your progress.</div>
        </section>

        <section className="auth-panel">
          <div className="auth-form-wrap">
            <div className="mobile-brand brand">
              <span className="brand-mark">M</span>
              <span>MuchTodo</span>
            </div>

            <span className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}</span>
            <h2>{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</h2>
            <p className="muted">
              {mode === 'login'
                ? 'Enter your details to continue where you left off.'
                : 'Create an account and start organising your day.'}
            </p>

            <div className="auth-tabs">
              <button
                type="button"
                className={mode === 'login' ? 'active' : ''}
                onClick={() => { setMode('login'); clearMessages() }}
              >
                Sign in
              </button>
              <button
                type="button"
                className={mode === 'register' ? 'active' : ''}
                onClick={() => { setMode('register'); clearMessages() }}
              >
                Create account
              </button>
            </div>

            {error && <div className="alert alert-error" role="alert">{error}</div>}
            {notice && <div className="alert alert-success" role="status">{notice}</div>}

            <form onSubmit={handleAuth} className="auth-form">
              {mode === 'register' && (
                <div className="name-fields">
                  <label>
                    First name
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" required />
                  </label>
                  <label>
                    Last name
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" required />
                  </label>
                </div>
              )}

              <label>
                Username
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  minLength={3}
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={6}
                  required
                />
              </label>

              <button className="primary-button full-button" type="submit" disabled={loading}>
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
                {!loading && <span>→</span>}
              </button>
            </form>

            <p className="auth-note">Secure access to your personal task space.</p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <span>MuchTodo</span>
        </div>

        <div className="sidebar-label">WORKSPACE</div>
        <div className="nav-item selected"><span>▦</span> My tasks</div>

        <div className="sidebar-bottom">
          <div className="profile-avatar">
            {(user?.firstName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
          </div>
          <div className="profile-details">
            <strong>{user?.firstName || user?.username}</strong>
            <span>@{user?.username}</span>
          </div>
          <button className="logout-button" onClick={logout} title="Sign out" aria-label="Sign out">↗</button>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">YOUR PERSONAL WORKSPACE</span>
            <h1>My tasks</h1>
          </div>
          <div className="topbar-date">{new Date().toLocaleDateString(undefined, {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}</div>
        </header>

        <div className="welcome-row">
          <div>
            <h2>Good to see you, {user?.firstName || user?.username} <span>✦</span></h2>
            <p>Small steps every day lead to big results.</p>
          </div>
        </div>

        <div className="stats-grid">
          <article className="stat-card">
            <span className="stat-icon purple">▤</span>
            <span className="stat-label">Total tasks</span>
            <strong>{todos.length}</strong>
            <span className="stat-foot">All your tasks</span>
          </article>
          <article className="stat-card">
            <span className="stat-icon orange">◷</span>
            <span className="stat-label">Pending</span>
            <strong>{pendingCount}</strong>
            <span className="stat-foot">Still to complete</span>
          </article>
          <article className="stat-card">
            <span className="stat-icon green">✓</span>
            <span className="stat-label">Completed</span>
            <strong>{completedCount}</strong>
            <span className="stat-foot">Tasks you've finished</span>
          </article>
        </div>

        <section className="progress-card">
          <div className="progress-heading">
            <div>
              <strong>Your daily progress</strong>
              <p>Keep going. You're making progress.</p>
            </div>
            <strong className="progress-percent">{progress}%</strong>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-caption">{completedCount} of {todos.length} tasks completed</span>
        </section>

        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {notice && <div className="alert alert-success" role="status">{notice}</div>}

        <section className="task-section">
          <div className="section-heading">
            <div>
              <h2>My to-do list</h2>
              <p>Capture your tasks and keep moving forward.</p>
            </div>
            <span className="task-count">{todos.length} {todos.length === 1 ? 'task' : 'tasks'}</span>
          </div>

          <form className="add-task-form" onSubmit={addTodo}>
            <div className="add-task-fields">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to get done?"
                aria-label="Task title"
                required
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description (optional)"
                aria-label="Task description"
              />
            </div>
            <button className="primary-button add-button" type="submit" disabled={loading || !title.trim()}>
              + Add task
            </button>
          </form>

          <div className="task-list">
            {todosLoading ? (
              <div className="empty-state"><span className="loader" />Loading your tasks…</div>
            ) : todos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✦</div>
                <strong>No tasks yet</strong>
                <p>Add your first task above and make today count.</p>
              </div>
            ) : (
              todos.map((todo) => (
                <article className={`task-item ${todo.completed ? 'is-complete' : ''}`} key={todo.id}>
                  {editingId === todo.id ? (
                    <form className="edit-form" onSubmit={saveEdit}>
                      <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required aria-label="Edit task title" />
                      <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" aria-label="Edit task description" />
                      <div className="task-actions">
                        <button className="text-action save-action" type="submit" disabled={loading}>Save</button>
                        <button className="text-action" type="button" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <button
                        className={`check-button ${todo.completed ? 'checked' : ''}`}
                        onClick={() => void toggleTodo(todo)}
                        aria-label={todo.completed ? 'Mark task as pending' : 'Mark task as completed'}
                        title={todo.completed ? 'Mark as pending' : 'Mark as completed'}
                      >
                        {todo.completed ? '✓' : ''}
                      </button>
                      <div className="task-copy">
                        <strong>{todo.title}</strong>
                        {todo.description && <p>{todo.description}</p>}
                      </div>
                      <span className={`status-pill ${todo.completed ? 'done' : 'pending'}`}>
                        {todo.completed ? 'Completed' : 'Pending'}
                      </span>
                      <div className="task-actions">
                        <button className="icon-action" onClick={() => beginEdit(todo)} title="Edit task" aria-label="Edit task">✎</button>
                        <button className="icon-action delete-action" onClick={() => void deleteTodo(todo)} title="Delete task" aria-label="Delete task">×</button>
                      </div>
                    </>
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        <footer className="app-footer">Made for focus. Built for progress.</footer>
      </section>
    </main>
  )
}

export default App
