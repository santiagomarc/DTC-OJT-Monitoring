'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { X, Pencil } from 'lucide-react'
import { updateStudentProfileAction } from '@/actions/students'

interface Props {
  initialValue?: string | null
}

export function EditProjectDialog({ initialValue }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await updateStudentProfileAction(formData)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success('Assigned project updated successfully')
        setIsOpen(false)
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:text-stone-500 dark:hover:bg-white/5 dark:hover:text-white transition"
        title="Edit Project"
      >
        <Pencil className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-center bg-white p-6 backdrop-blur-xl dark:bg-stone-900/95 animate-in fade-in zoom-in-95 duration-200">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900 dark:text-white">
              Edit Assigned Project
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-white/5 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form action={onSubmit} className="flex gap-3">
            <input
              type="text"
              name="assigned_project"
              defaultValue={initialValue || ''}
              placeholder="e.g. Chatbot AI / Mobile App"
              className="input flex-1 !h-10 !py-2"
              required
            />
            <button
              type="submit"
              disabled={isPending}
              className="shrink-0 rounded-xl bg-red-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save'}
            </button>
          </form>
        </div>
      )}
    </>
  )
}
