'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { X, Pencil, Plus } from 'lucide-react'
import { addProjectAction, updateProjectAction, adminAddProjectAction, adminUpdateProjectAction } from '@/actions/projects'
import type { StudentProject } from '@/types'

interface Props {
  mode: 'add' | 'edit'
  internId?: string // if provided, uses admin actions
  project?: StudentProject
  trigger?: React.ReactNode // Custom trigger button
}

export function ProjectManageDialog({ mode, internId, project, trigger }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function onSubmit(formData: FormData) {
    startTransition(async () => {
      let res
      
      if (mode === 'add') {
        if (internId) {
          res = await adminAddProjectAction(internId, formData)
        } else {
          res = await addProjectAction(formData)
        }
      } else {
        formData.append('projectId', project!.id)
        if (internId) {
          res = await adminUpdateProjectAction(internId, formData)
        } else {
          res = await updateProjectAction(formData)
        }
      }

      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success(mode === 'add' ? 'Project added successfully' : 'Project updated successfully')
        setIsOpen(false)
      }
    })
  }

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {trigger || (
          <button
            className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:text-stone-500 dark:hover:bg-white/5 dark:hover:text-white transition"
            title={mode === 'add' ? 'Add Project' : 'Edit Project'}
          >
            {mode === 'add' ? <Plus className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-center bg-white/90 p-6 backdrop-blur-xl dark:bg-stone-900/90 animate-in fade-in zoom-in-95 duration-200">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900 dark:text-white">
              {mode === 'add' ? 'Add New Project' : 'Edit Project'}
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-white/5 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form action={onSubmit} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              name="name"
              defaultValue={project?.name || ''}
              placeholder="Project Title"
              className="input flex-1 !h-10 !py-2"
              required
            />
            <input
              type="url"
              name="github_link"
              defaultValue={project?.github_link || ''}
              placeholder="GitHub Repo URL (Optional)"
              className="input flex-1 !h-10 !py-2"
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
