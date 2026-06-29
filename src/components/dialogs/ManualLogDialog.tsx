'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { X, PlusCircle } from 'lucide-react'
import { addManualLogAction } from '@/actions/admin'

interface Props {
  internId: string
}

export function ManualLogDialog({ internId }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function onSubmit(formData: FormData) {
    formData.append('internId', internId)
    startTransition(async () => {
      const res = await addManualLogAction(formData)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success('Manual log added successfully')
        setIsOpen(false)
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30"
      >
        <PlusCircle className="h-4 w-4" />
        Manual Log
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-white/10 dark:bg-stone-900">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-stone-900 dark:text-white">Add Manual Log</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={onSubmit} className="space-y-4">
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  name="date"
                  required
                  className="input"
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Time In</label>
                  <input
                    type="time"
                    name="time_in"
                    required
                    className="input"
                    defaultValue="08:00"
                  />
                </div>
                <div>
                  <label className="label">Time Out</label>
                  <input
                    type="time"
                    name="time_out"
                    required
                    className="input"
                    defaultValue="17:00"
                  />
                </div>
              </div>

              <div>
                <label className="label">Task Description</label>
                <textarea
                  name="task_description"
                  required
                  rows={3}
                  placeholder="Describe tasks completed..."
                  className="input resize-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Add Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
