import { AppLayout } from '../components/Layout'
import { Button } from '../components/ui'
import { navigate } from '../lib/router'
import { useStrings } from '../lib/i18n'
import { pages } from '../i18n/pages'

export function NotFound() {
  const p = useStrings(pages)
  return (
    <AppLayout>
      <div className="flex flex-col items-center py-24 text-center">
        <div className="text-6xl font-black text-surface-3">404</div>
        <p className="mt-3 text-lg font-semibold text-ink">{p.notFound}</p>
        <Button className="mt-6" onClick={() => navigate('/')}>
          {p.toStart}
        </Button>
      </div>
    </AppLayout>
  )
}
