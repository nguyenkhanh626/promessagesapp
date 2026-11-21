const API_BASE_URL = 'http://localhost:8080/api'

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<{ data: T }> {
    const url = new URL(`${this.baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`)
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value))
      })
    }

    const token = localStorage.getItem('token')
    const headers = new Headers(options.headers || {})
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json')
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const response = await fetch(url.toString(), {
      ...options,
      headers,
    })

    if (response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login'
      }
    }

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const error: any = new Error(data.message || 'Request failed')
      error.response = { status: response.status, data }
      throw error
    }

    return { data }
  }

  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  post<T>(endpoint: string, body?: any, options?: RequestOptions) {
    const isFormData = body instanceof FormData
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    })
  }

  async postSse(
    endpoint: string,
    body: unknown,
    onEvent: (event: string, data: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const url = new URL(`${this.baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`)
    const headers = new Headers({
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    })
    const token = localStorage.getItem('token')
    if (token) headers.set('Authorization', `Bearer ${token}`)

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    })
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      if (response.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login'
        }
      }
      throw new Error(errorBody.message || 'Không thể kết nối trợ lý AI.')
    }
    if (!response.body) throw new Error('Trình duyệt không hỗ trợ SSE streaming.')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const dispatch = (frame: string) => {
      let event = 'message'
      const data: string[] = []
      for (const line of frame.split(/\r?\n/)) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
      }
      if (data.length) onEvent(event, data.join('\n'))
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        buffer += decoder.decode(value, { stream: !done })
        while (true) {
          const separator = /\r?\n\r?\n/.exec(buffer)
          if (!separator || separator.index === undefined) break
          dispatch(buffer.slice(0, separator.index))
          buffer = buffer.slice(separator.index + separator[0].length)
        }
        if (done) break
      }
      if (buffer.trim()) dispatch(buffer)
    } catch (error) {
      await reader.cancel()
      throw error
    } finally {
      reader.releaseLock()
    }
  }

  put<T>(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
