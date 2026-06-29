import { redirect } from 'next/navigation'
import { getMyProfile } from '@/actions/students'
import { getMyAttendanceLogs } from '@/actions/attendance'
import { DTRControls } from '@/components/ui/DTRControls'

interface Props {
  searchParams: Promise<{ month?: string }>
}

export const metadata = {
  title: 'Daily Time Record — BatSU OJT Monitor',
}

function formatTimePH(timeStr: string | null): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12.toString().padStart(2, '0')}:${m} ${ampm}`
}

export default async function DTRPage({ searchParams }: Props) {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  const logs = await getMyAttendanceLogs()
  const parsedParams = await searchParams
  
  // Group logs by year-month (e.g. "2026-06")
  const monthsMap: Record<string, typeof logs> = {}
  logs.forEach((log) => {
    const yyyymm = log.date.substring(0, 7) // "YYYY-MM"
    if (!monthsMap[yyyymm]) monthsMap[yyyymm] = []
    monthsMap[yyyymm].push(log)
  })

  const availableMonths = Object.keys(monthsMap).sort((a, b) => b.localeCompare(a))
  const selectedMonth = parsedParams.month || availableMonths[0] || new Date().toISOString().substring(0, 7)

  // Filter logs for the selected month
  const selectedLogs = monthsMap[selectedMonth] || []
  const logsByDay: Record<number, typeof logs[0]> = {}
  selectedLogs.forEach((log) => {
    const dayNum = parseInt(log.date.split('-')[2], 10)
    logsByDay[dayNum] = log
  })

  // Get days in selected month
  const [yearStr, monthStr] = selectedMonth.split('-')
  const year = parseInt(yearStr, 10)
  const monthIdx = parseInt(monthStr, 10) - 1
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate()

  // Format month name for display
  const monthName = new Date(year, monthIdx).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  // Calculate sum of total rendered hours
  const totalHoursRendered = selectedLogs.reduce((sum, log) => sum + (log.total_hours || 0), 0)

  return (
    <div className="min-h-screen bg-stone-100 p-4 dark:bg-stone-950 print:bg-white print:p-0">
      {/* Control Panel (Hidden during Print) */}
      <DTRControls selectedMonth={selectedMonth} availableMonths={availableMonths} />

      {/* DTR Sheet (Philippine CSC Standard Format) */}
      <div className="mx-auto max-w-[21cm] bg-white p-8 shadow-lg dark:bg-stone-900 print:shadow-none print:p-0 print:dark:bg-white print:text-black">
        <div className="text-center font-serif">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-500 print:text-stone-700">Civil Service Form No. 48</p>
          <h1 className="mt-2 text-xl font-black uppercase tracking-tight text-stone-900 print:text-black">Daily Time Record</h1>
          <hr className="my-2 border-t-2 border-stone-900 print:border-black" />
          
          <div className="mt-4 text-left">
            <div className="border-b border-stone-900 pb-1 print:border-black">
              <span className="text-xs uppercase text-stone-550">Name:</span>
              <span className="ml-4 font-sans font-bold text-sm text-stone-900 dark:text-white print:text-black">
                {profile.last_name.toUpperCase()}, {profile.first_name.toUpperCase()}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4 border-b border-stone-900 pb-1 print:border-black">
              <div>
                <span className="text-xs uppercase text-stone-550">Program:</span>
                <span className="ml-2 font-sans font-bold text-sm text-stone-900 dark:text-white print:text-black">{profile.program}</span>
              </div>
              <div>
                <span className="text-xs uppercase text-stone-550">SR-Code:</span>
                <span className="ml-2 font-sans font-bold text-sm text-stone-900 dark:text-white print:text-black">{profile.sr_code || '—'}</span>
              </div>
            </div>
            <div className="mt-2 border-b border-stone-900 pb-1 print:border-black">
              <span className="text-xs uppercase text-stone-550">For the Month of:</span>
              <span className="ml-4 font-sans font-bold text-sm text-stone-900 dark:text-white print:text-black">{monthName}</span>
            </div>
          </div>

          {/* DTR Table */}
          <table className="mt-6 w-full border-collapse border border-stone-900 font-sans text-xs print:border-black print:text-black">
            <thead>
              <tr className="bg-stone-50 print:bg-transparent">
                <th rowSpan={2} className="border border-stone-900 px-1 py-2 text-center print:border-black w-10">Day</th>
                <th colSpan={2} className="border border-stone-900 py-1 text-center print:border-black">Morning</th>
                <th colSpan={2} className="border border-stone-900 py-1 text-center print:border-black">Afternoon</th>
                <th colSpan={2} className="border border-stone-900 py-1 text-center print:border-black">Total Hours</th>
              </tr>
              <tr className="bg-stone-50 print:bg-transparent">
                <th className="border border-stone-900 py-1 text-center print:border-black">Arrival</th>
                <th className="border border-stone-900 py-1 text-center print:border-black">Departure</th>
                <th className="border border-stone-900 py-1 text-center print:border-black">Arrival</th>
                <th className="border border-stone-900 py-1 text-center print:border-black">Departure</th>
                <th className="border border-stone-900 py-1 text-center print:border-black">Rendered</th>
                <th className="border border-stone-900 py-1 text-center print:border-black">Overtime</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1
                const log = logsByDay[day]

                // Split continuous OJT logs into standard AM/PM blocks for Philippine formatting
                let amIn = ''
                let amOut = ''
                let pmIn = ''
                let pmOut = ''

                if (log) {
                  const tIn = log.time_in
                  const tOut = log.time_out

                  if (tIn < '12:00:00') {
                    amIn = formatTimePH(tIn)
                    if (tOut) {
                      if (tOut <= '12:00:00') {
                        amOut = formatTimePH(tOut)
                      } else {
                        amOut = '12:00 PM'
                        pmIn = '01:00 PM'
                        pmOut = formatTimePH(tOut)
                      }
                    }
                  } else if (tIn >= '12:00:00') {
                    pmIn = formatTimePH(tIn)
                    if (tOut) {
                      pmOut = formatTimePH(tOut)
                    }
                  }
                }

                return (
                  <tr key={day} className="hover:bg-stone-50/50 print:hover:bg-transparent">
                    <td className="border border-stone-900 py-1 text-center font-bold print:border-black">{day}</td>
                    <td className="border border-stone-900 py-1 text-center print:border-black h-6">{amIn}</td>
                    <td className="border border-stone-900 py-1 text-center print:border-black h-6">{amOut}</td>
                    <td className="border border-stone-900 py-1 text-center print:border-black h-6">{pmIn}</td>
                    <td className="border border-stone-900 py-1 text-center print:border-black h-6">{pmOut}</td>
                    <td className="border border-stone-900 py-1 text-center font-bold print:border-black">
                      {log?.total_hours != null ? Number(log.total_hours).toFixed(2) : ''}
                    </td>
                    <td className="border border-stone-900 py-1 text-center print:border-black"></td>
                  </tr>
                )
              })}
              <tr className="bg-stone-50 print:bg-transparent font-bold">
                <td colSpan={5} className="border border-stone-900 py-2 text-right pr-4 uppercase tracking-wider print:border-black text-[10px]">Total Rendered Hours</td>
                <td className="border border-stone-900 py-2 text-center print:border-black text-sm">{totalHoursRendered.toFixed(2)}h</td>
                <td className="border border-stone-900 py-2 text-center print:border-black"></td>
              </tr>
            </tbody>
          </table>

          {/* Certification Text */}
          <div className="mt-8 text-left font-serif text-[11px] leading-relaxed text-stone-700 print:text-black">
            <p className="italic">
              I CERTIFY on my honor that the above is a true and correct report of the hours of work performed, record of which was made daily at the time of arrival and departure from office.
            </p>
            
            <div className="mt-10 grid grid-cols-2 gap-8 text-center">
              <div>
                <div className="mx-auto w-48 border-b border-stone-900 print:border-black h-5"></div>
                <p className="mt-1 font-sans text-[10px] uppercase font-bold text-stone-500 print:text-black">Student Intern Signature</p>
              </div>
              <div>
                <div className="mx-auto w-48 border-b border-stone-900 print:border-black h-5"></div>
                <p className="mt-1 font-sans text-[10px] uppercase font-bold text-stone-500 print:text-black">Supervisor / Coordinator</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
