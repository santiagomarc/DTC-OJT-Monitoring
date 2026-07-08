'use client'

import { useState } from 'react'
import { Briefcase, Plus, Trash2 } from 'lucide-react'
import type { StudentProject } from '@/types'
import { ProjectManageDialog } from '../dialogs/ProjectManageDialog'
import { adminDeleteProjectAction } from '@/actions/projects'
import { toast } from 'sonner'

interface Props {
  internId: string
  projects: StudentProject[]
}

export function AdminProjectsSection({ internId, projects }: Props) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to remove this project from this intern?')) return
    setIsDeleting(projectId)
    const res = await adminDeleteProjectAction(internId, projectId)
    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success('Project removed successfully')
    }
    setIsDeleting(null)
  }

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-stone-500 dark:text-stone-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Assigned Projects
          </h2>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
            {projects.length}/5
          </span>
        </div>
        {projects.length < 5 && (
          <ProjectManageDialog
            mode="add"
            internId={internId}
            trigger={
              <button className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20">
                <Plus className="h-3.5 w-3.5" /> Add Project
              </button>
            }
          />
        )}
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center dark:border-white/10">
          <p className="text-sm text-stone-500 dark:text-stone-400">No projects assigned yet.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group relative overflow-hidden rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-red-200 dark:border-white/10 dark:bg-stone-900/50 dark:hover:border-red-500/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-stone-900 dark:text-white" title={project.name}>
                    {project.name}
                  </p>
                  {project.github_link ? (
                    <a
                      href={project.github_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block truncate text-xs text-red-600 hover:underline dark:text-red-400"
                    >
                      {project.github_link.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
                    </a>
                  ) : (
                    <p className="mt-1 text-xs italic text-stone-400">No GitHub link</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <ProjectManageDialog mode="edit" internId={internId} project={project} />
                  <button
                    onClick={() => handleDelete(project.id)}
                    disabled={isDeleting === project.id}
                    className="rounded p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    title="Remove Project"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
