'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { X, Pencil, Loader2 } from 'lucide-react'
import { updateStudentProfileAction } from '@/actions/students'

interface Props {
  initialValue?: string | null
}

export function EditGithubLinkDialog({ initialValue }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      const res = await updateStudentProfileAction(formData)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success('GitHub link updated successfully')
        setIsOpen(false)
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg p-1 text-stone-500 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-white/10 transition"
        title="Edit GitHub Link"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-white/10 dark:bg-stone-900 animate-in zoom-in-95 duration-200">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-stone-900 dark:text-white">
                Edit GitHub Profile Link
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="label">GitHub Profile URL</label>
                <input
                  type="url"
                  name="github_link"
                  required
                  defaultValue={initialValue || ''}
                  placeholder="https://github.com/your-username"
                  className="input"
                />
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
                  Provide the link to your personal GitHub profile (e.g. https://github.com/octocat).
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50 gap-2"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
