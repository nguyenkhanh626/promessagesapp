import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary bắt được lỗi:', error, errorInfo)
    this.setState({ errorInfo })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/chat'
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-[#181818] p-6 text-white select-none">
          <div className="w-full max-w-lg rounded-2xl border border-rose-900/50 bg-[#201f1f] p-8 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-white">Đã xảy ra sự cố hiển thị</h2>
            <p className="mt-2 text-sm text-gray-400">
              Hệ thống đã ghi nhận lỗi giao diện. Bạn có thể thử tải lại hoặc quay về trang Trò chuyện.
            </p>

            {this.state.error && (
              <div className="mt-4 max-h-40 overflow-y-auto rounded-lg bg-[#111] p-3 text-left font-mono text-xs text-rose-300 border border-[#333]">
                {this.state.error.toString()}
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-lg bg-[#2b2b2b] px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-[#383838] transition-colors"
              >
                Tải lại trang (F5)
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="rounded-lg bg-[#5B5FC7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4f53af] transition-colors"
              >
                Về trang Trò chuyện
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
