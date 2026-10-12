/**
 * A4 PDF of the report. Loaded only when the user asks for it (jsPDF + fonts ≈ 400 KB).
 * Inter is embedded (Latin, Uzbek and Cyrillic letters), so the text stays selectable.
 */
import type { Level } from '../../lib/store'
import type { FieldId } from '../../catalog/types'
import { reportStrings } from '../../i18n/report'
import type { ReportModel, ReportRow } from './model'

const INK = '#0f172a'
const INK2 = '#334155'
const MUTED = '#64748b'
const LINE = '#e2e6ef'
const SOFT = '#f1f3f8'
const LEVEL_HEX: Record<Level, string> = {
  great: '#15803d',
  normal: '#0f766e',
  borderline: '#b45309',
  attention: '#c2410c',
  urgent: '#b91c1c',
  info: '#2563eb',
}
const FIELD_HEX: Record<FieldId, string> = { hearing: '#7c3aed', memory: '#ea580c', hands: '#059669', spine: '#0284c7' }

const W = 210
const H = 297
const M = 14
const BOTTOM = H - 15

export async function buildPdf(input: ReportModel): Promise<Blob> {
  // Number formatting may use narrow no-break spaces (1 200); the embedded font has the regular one.
  const model = JSON.parse(JSON.stringify(input).replace(/[\u202F\u2007]/g, '\u00A0')) as ReportModel
  const [{ jsPDF }, reg, bold] = await Promise.all([
    import('jspdf'),
    import('../../assets/fonts/pdf/Inter-Regular.ttf?inline'),
    import('../../assets/fonts/pdf/Inter-Bold.ttf?inline'),
  ])
  const s = reportStrings[model.lang]
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  doc.addFileToVFS('Inter-Regular.ttf', reg.default.split(',')[1])
  doc.addFont('Inter-Regular.ttf', 'Inter', 'normal')
  doc.addFileToVFS('Inter-Bold.ttf', bold.default.split(',')[1])
  doc.addFont('Inter-Bold.ttf', 'Inter', 'bold')
  doc.setProperties({ title: model.title, subject: model.title, creator: 'Tests and exercises' })
  doc.setLineHeightFactor(1.25)

  const font = (style: 'normal' | 'bold', size: number, color = INK) => {
    doc.setFont('Inter', style)
    doc.setFontSize(size)
    doc.setTextColor(color)
  }
  const lineH = (size: number) => size * 0.3528 * 1.25
  let y = M

  // Header
  font('bold', 16)
  doc.text(model.title, M, y + 5)
  font('normal', 8.5, MUTED)
  doc.text(`${s.generated}: ${model.generated}`, W - M, y + 5, { align: 'right' })
  y += 11

  if (model.person.length) {
    const colW = (W - 2 * M) / Math.max(model.person.length, 2)
    doc.setFillColor(SOFT)
    doc.roundedRect(M, y, W - 2 * M, 12, 2, 2, 'F')
    model.person.forEach((p, i) => {
      const x = M + 4 + i * colW
      font('normal', 7.5, MUTED)
      doc.text(p.label, x, y + 4.6)
      font('bold', 10, INK)
      doc.text(doc.splitTextToSize(p.value, colW - 6)[0], x, y + 9.4)
    })
    y += 16
  }

  font('normal', 9, INK2)
  doc.text(`${s.testsTaken}: ${model.taken} / ${model.total}     ${s.exercises30}: ${model.exTimes ? s.exSummary(model.exTimes, model.exMinutes) : s.noExercises}`, M, y + 3)
  y += 8

  // Table geometry
  const cols = { name: M, date: M + 52, result: M + 71, change: M + 106, label: M + 130, trend: M + 165 }
  const widths = { name: 50, date: 18, result: 34, change: 23, label: 34, trend: 17 }

  const newPage = () => {
    doc.addPage()
    y = M
  }
  const tableHead = () => {
    font('bold', 7, MUTED)
    doc.text(s.colTest.toUpperCase(), cols.name, y + 3)
    doc.text(s.colDate.toUpperCase(), cols.date, y + 3)
    doc.text(s.colResult.toUpperCase(), cols.result, y + 3)
    doc.text(s.colChange.toUpperCase(), cols.change, y + 3)
    doc.text(s.colAssessment.toUpperCase(), cols.label, y + 3)
    doc.text(s.colTrend.toUpperCase(), cols.trend, y + 3)
    y += 5
    doc.setDrawColor(LINE)
    doc.setLineWidth(0.25)
    doc.line(M, y, W - M, y)
    y += 1.5
  }

  const sparkline = (row: ReportRow, x: number, top: number, w: number, h: number, color: string) => {
    const v = row.series
    if (v.length < 2) return
    const lo = Math.min(...v)
    const hi = Math.max(...v)
    const span = hi - lo || 1
    const px = (i: number) => x + (i / (v.length - 1)) * w
    const py = (val: number) => top + h - ((val - lo) / span) * h
    doc.setDrawColor(color)
    doc.setLineWidth(0.45)
    for (let i = 1; i < v.length; i++) doc.line(px(i - 1), py(v[i - 1]), px(i), py(v[i]))
    doc.setFillColor('#ffffff')
    doc.circle(px(v.length - 1), py(v[v.length - 1]), 1.05, 'F')
    doc.setFillColor(color)
    doc.circle(px(v.length - 1), py(v[v.length - 1]), 0.75, 'F')
  }

  for (const sec of model.sections) {
    if (y + 22 > BOTTOM) newPage()
    doc.setFillColor(FIELD_HEX[sec.field])
    doc.roundedRect(M, y + 0.6, 3.2, 3.2, 0.8, 0.8, 'F')
    font('bold', 11.5, INK)
    doc.text(sec.name, M + 5.5, y + 3.6)
    y += 7
    tableHead()

    for (const row of sec.rows) {
      // Measure each column in the font it is drawn with.
      font(row.taken ? 'bold' : 'normal', 8.5)
      const nameLines = doc.splitTextToSize(row.name, widths.name - 2) as string[]
      font('bold', 8.5)
      const resLines = row.taken ? (doc.splitTextToSize(`${row.value}${row.unit ? ' ' + row.unit : ''}`, widths.result - 2) as string[]) : []
      const labLines = doc.splitTextToSize(row.label, widths.label - 4) as string[]
      font('normal', 8.5)
      const chLines = row.change ? (doc.splitTextToSize(row.change.text, widths.change - 2) as string[]) : (doc.splitTextToSize(s.firstTime, widths.change - 2) as string[])
      const n = Math.max(nameLines.length, resLines.length, row.taken ? labLines.length : 1, row.taken ? chLines.length : 1, 1)
      const rowH = n * lineH(8.5) + 2.3
      if (y + rowH > BOTTOM) {
        newPage()
        tableHead()
      }
      const ty = y + 3.4
      font(row.taken ? 'bold' : 'normal', 8.5, row.taken ? INK : MUTED)
      doc.text(nameLines, cols.name, ty)
      if (row.taken) {
        font('normal', 8.5, INK2)
        doc.text(row.dateShort, cols.date, ty)
        font('bold', 8.5, INK)
        doc.text(resLines, cols.result, ty)
        if (row.change) {
          font('normal', 8.5, row.change.better === null ? MUTED : row.change.better ? LEVEL_HEX.great : LEVEL_HEX.attention)
          doc.text(chLines, cols.change, ty)
        } else {
          font('normal', 8.5, MUTED)
          doc.text(chLines, cols.change, ty)
        }
        const lc = row.level ? LEVEL_HEX[row.level] : MUTED
        doc.setFillColor(lc)
        doc.circle(cols.label + 1.1, ty - 1.05, 1.05, 'F')
        font('bold', 8.5, lc)
        doc.text(labLines, cols.label + 3.4, ty)
        sparkline(row, cols.trend, y + 1.2, widths.trend - 2, Math.min(rowH - 2.6, 6), FIELD_HEX[sec.field])
      } else {
        font('normal', 8.5, MUTED)
        doc.text('—', cols.date, ty)
      }
      y += rowH
      doc.setDrawColor(LINE)
      doc.setLineWidth(0.2)
      doc.line(M, y, W - M, y)
    }

    if (sec.exercises.length) {
      const txt = `${s.exercises30}: ${sec.exercises.map((e) => `${e.name} — ${s.exSummary(e.times, e.minutes)}`).join('; ')}`
      font('normal', 8, INK2)
      const lines = doc.splitTextToSize(txt, W - 2 * M) as string[]
      if (y + lines.length * lineH(8) + 3 > BOTTOM) newPage()
      doc.text(lines, M, y + 4)
      y += lines.length * lineH(8) + 2
    }
    y += 5
  }

  // Footer on every page
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setDrawColor(LINE)
    doc.setLineWidth(0.25)
    doc.line(M, H - 11, W - M, H - 11)
    font('normal', 7.5, MUTED)
    doc.text(doc.splitTextToSize(s.footer, 140), M, H - 7)
    doc.text(s.page(i, pages), W - M, H - 7, { align: 'right' })
  }
  return doc.output('blob')
}
