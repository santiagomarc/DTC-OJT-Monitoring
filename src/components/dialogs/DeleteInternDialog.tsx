'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { X, Trash2 } from 'lucide-react'
import { deleteInternAction } from '@/actions/admin'
import { useRouter } from 'next/navigation'

interface Props {
  internId: string
  lastName: string
}

export function DeleteInternDialog({ internId, lastName }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const normalizedTarget = lastName.trim().toUpperCase()
  const normalizedInput = confirmText.trim().toUpperCase()
  const isMatch = normalizedInput === normalizedTarget

  async function onDelete() {
    if (!isMatch) return

    startTransition(async () => {
      const res = await deleteInternAction(internId)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success(`Intern ${lastName} successfully deleted`)
        setIsOpen(false)
        router.push('/dashboard/admin')
      }
    })
  }

  return (
    <>
      <button
        onClick={() => {
          setConfirmText('')
          setIsOpen(true)}
        }
        className="inline-flex items-center gap-2 rounded-xl bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-200 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30"
      >
        <Trash2 className="h-4 w-4" />
        Delete Intern
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-white/10 dark:bg-stone-900">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Delete Intern Account?</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/20 dark:text-red-300">
                <p className="font-semibold">⚠️ WARNING: This action cannot be undone.</p>
                <p className="mt-1">
                  This will permanently delete the profile, all recorded attendance logs, and their login credentials from the database. It will also delete their attendance tab and clean up the Master row in Google Sheets.
                </p>
              </div>

              <div>
                <label className="label">
                  To confirm, type the student's last name <span className="font-bold">"{lastName.toUpperCase()}"</span> below:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type last name here"
                  className="input"
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
                  onClick={onDelete}
                  disabled={!isMatch || isPending}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
                >
                  {isPending ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
