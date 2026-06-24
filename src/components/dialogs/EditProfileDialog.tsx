'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { X, Edit2 } from 'lucide-react'
import { updateStudentProfileAction } from '@/actions/students'

interface Props {
  initialData: {
    assigned_project?: string | null
    github_link?: string | null
  }
}

export function EditProfileDialog({ initialData }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await updateStudentProfileAction(formData)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success('Profile details updated successfully')
        setIsOpen(false)
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-violet-100 px-4 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:hover:bg-violet-500/30"
      >
        <Edit2 className="h-4 w-4" />
        Edit Details
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-white/10 dark:bg-gray-900">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Internship Details</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={onSubmit} className="space-y-4">
              <div>
                <label className="label">Assigned Project</label>
                <input
                  type="text"
                  name="assigned_project"
                  defaultValue={initialData.assigned_project || ''}
                  placeholder="e.g. Chatbot AI / Mobile App"
                  className="input"
                />
              </div>

              <div>
                <label className="label">GitHub Link</label>
                <input
                  type="url"
                  name="github_link"
                  defaultValue={initialData.github_link || ''}
                  placeholder="https://github.com/username/repo"
                  className="input"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
