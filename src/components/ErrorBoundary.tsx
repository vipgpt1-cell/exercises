import { Component, type ReactNode } from 'react'
import { settingsStore } from '../lib/store'

const TEXT = {
  en: { title: 'Something went wrong', text: 'Your saved results are safe. Please go back to the home screen and try again.', home: 'Back to home' },
  uz: { title: 'Nimadir xato ketdi', text: 'Saqlangan natijalaringiz joyida. Bosh sahifaga qaytib, qayta urinib ko‘ring.', home: 'Bosh sahifaga' },
  ru: { title: 'Что-то пошло не так', text: 'Ваши сохранённые результаты в безопасности. Вернитесь на главную и попробуйте снова.', home: 'На главную' },
}

/** Catches rendering errors so a failure in one test never blanks the whole app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    console.error(error)
  }
  render() {
    if (!this.state.error) return this.props.children
    const t = TEXT[settingsStore.get().lang] ?? TEXT.en
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-bg p-6 text-center">
        <div className="text-5xl">⚠️</div>
        <h1 className="mt-4 text-2xl font-bold text-ink">{t.title}</h1>
        <p className="mt-2 max-w-sm text-muted">{t.text}</p>
        <button
          type="button"
          className="mt-6 h-12 rounded-2xl bg-primary px-6 font-semibold text-on-primary"
          onClick={() => {
            window.location.hash = '/'
            this.setState({ error: null })
          }}
        >
          {t.home}
        </button>
      </div>
    )
  }
}
