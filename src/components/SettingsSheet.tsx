import { useState, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { LangSwitch } from './Layout'
import { Button, Callout, ConfirmDialog, Modal, Segmented, Toggle } from './ui'
import { useLang, useStrings } from '../lib/i18n'
import { clearAllData, storageHadError, updateSettings, useResults, useLogs, useSettings } from '../lib/store'
import { launchParams } from '../lib/launch'
import { voiceAvailable } from '../lib/speech'
import { common } from '../i18n/common'
import { pages } from '../i18n/pages'
import { APP } from '../config'

const canVibrate = () => typeof navigator !== 'undefined' && 'vibrate' in navigator
const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-sm font-semibold text-ink-2">{label}</div>
      {children}
    </div>
  )
}

/** Small settings panel opened from the start page. */
export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = useLang()
  const t = useStrings(common)
  const p = useStrings(pages).settings
  const s = useSettings()
  const results = useResults()
  const logs = useLogs()
  const [askClear, setAskClear] = useState(false)
  const [cleared, setCleared] = useState(false)
  // When the host app passes the language or theme, it owns that setting.
  const q = launchParams()
  const hostLang = !!q.get('lang')
  const hostTheme = !!q.get('theme')

  return (
    <>
      <Modal open={open && !askClear} onClose={onClose} title={p.title}>
        <div className="mt-3 max-h-[70dvh] space-y-5 overflow-y-auto pb-1">
          {storageHadError() && <Callout tone="danger">{p.storageWarn}</Callout>}
          {!hostLang && (
            <Row label={p.language}>
              <div className="flex">
                <LangSwitch />
              </div>
            </Row>
          )}
          <Row label={p.textSize}>
            <Segmented
              value={s.textSize}
              onChange={(v) => updateSettings({ textSize: v })}
              options={[
                { value: 'normal', label: <span className="text-sm">A</span> },
                { value: 'large', label: <span className="text-base">A</span> },
                { value: 'xl', label: <span className="text-lg">A</span> },
              ]}
            />
          </Row>
          {!hostTheme && (
            <Row label={p.theme}>
              <Segmented
                value={s.theme}
                onChange={(v) => updateSettings({ theme: v })}
                options={[
                  { value: 'system', label: p.auto },
                  { value: 'light', label: p.light },
                  { value: 'dark', label: p.dark },
                ]}
              />
            </Row>
          )}
          <div className="divide-y divide-line border-y border-line">
            <Toggle checked={s.sounds} onChange={(v) => updateSettings({ sounds: v })} label={p.sounds} description={p.soundsText} />
            {canVibrate() && <Toggle checked={s.haptics} onChange={(v) => updateSettings({ haptics: v })} label={p.vibration} />}
            {canSpeak() && (
              <Toggle
                checked={s.voice}
                onChange={(v) => updateSettings({ voice: v })}
                label={p.voice}
                description={
                  <>
                    {p.voiceText}
                    {s.voice && !voiceAvailable(lang) && <span className="mt-1 block text-borderline">{p.voiceMissing}</span>}
                  </>
                }
              />
            )}
          </div>
          <Row label={p.data}>
            <p className="mb-3 text-sm text-muted">{p.dataText}</p>
            {cleared ? (
              <Callout tone="success">{p.deleted}</Callout>
            ) : (
              <Button variant="secondary" block icon={<Trash2 className="h-4 w-4" />} onClick={() => setAskClear(true)} disabled={!results.length && !logs.length} className="text-urgent">
                {p.deleteAll}
              </Button>
            )}
          </Row>
          <p className="text-center text-xs text-muted">
            {p.version} {APP.version}
          </p>
        </div>
      </Modal>
      <ConfirmDialog
        open={askClear}
        title={p.deleteAll}
        text={p.deleteAllText}
        confirmLabel={t.btn.delete}
        danger
        onCancel={() => setAskClear(false)}
        onConfirm={() => {
          clearAllData()
          setAskClear(false)
          setCleared(true)
        }}
      />
    </>
  )
}
