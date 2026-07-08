'use client'

import { useState, useTransition } from 'react'
import { PlusCircle, Edit2, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  addProjectAction,
  updateProjectAction,
  adminAddProjectAction,
  adminUpdateProjectAction,
} from '@/actions/projects'
import type { StudentProject } from '@/types'

interface Props {
  internId?: string
  existingProject?: StudentProject
  isAdmin?: boolean
}

export function ProjectManageDialog({ internId, existingProject, isAdmin }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  const isEdit = !!existingProject

  async function onSubmit(formData: FormData) {
    if (existingProject) {
      formData.append('projectId', existingProject.id)
    }

    startTransition(async () => {
      let result
      if (isAdmin && internId) {
        result = isEdit
          ? await adminUpdateProjectAction(internId, formData)
          : await adminAddProjectAction(internId, formData)
      } else {
        result = isEdit
          ? await updateProjectAction(formData)
          : await addProjectAction(formData)
      }

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Project ${isEdit ? 'updated' : 'added'} successfully!`)
        setIsOpen(false)
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={
          isEdit
            ? "rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/5 dark:hover:text-white"
            : "inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-1.5 text-sm font-medium hover:bg-stone-50 hover:text-stone-900 dark:border-white/10 dark:text-stone-300 dark:hover:bg-white/5 dark:hover:text-white transition"
        }
      >
        {isEdit ? <Edit2 className="h-4 w-4" /> : <><PlusCircle className="h-4 w-4" /> Add Project</>}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-white/10 dark:bg-stone-900">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-stone-900 dark:text-white">
                {isEdit ? 'Edit Project' : 'Add New Project'}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={onSubmit} className="space-y-4">
              <div>
                <label className="label">Project Name <span className="text-red-500">*</span></label>
                <input
                  name="name"
                  required
                  defaultValue={existingProject?.name || ''}
                  className="input"
                  placeholder="e.g. OJT Monitoring System"
                />
              </div>

              <div>
                <label className="label">GitHub Repository Link (Optional)</label>
                <input
                  name="github_link"
                  type="url"
                  defaultValue={existingProject?.github_link || ''}
                  className="input"
                  placeholder="https://github.com/..."
                />
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
                  {isEdit ? 'Save Changes' : 'Add Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
