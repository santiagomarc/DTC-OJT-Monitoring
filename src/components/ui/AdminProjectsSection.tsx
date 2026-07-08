'use client'

import { useState } from 'react'
import type { StudentProject } from '@/types'
import { ProjectManageDialog } from '@/components/dialogs/ProjectManageDialog'
import { ExternalLink, Trash2, Loader2, Code2 } from 'lucide-react'
import { toast } from 'sonner'
import { adminDeleteProjectAction } from '@/actions/projects'

interface Props {
  internId: string
  projects: StudentProject[]
}

export function AdminProjectsSection({ internId, projects }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(projectId: string) {
    if (!confirm('Are you sure you want to delete this project?')) return
    setDeletingId(projectId)
    const res = await adminDeleteProjectAction(internId, projectId)
    setDeletingId(null)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Project deleted')
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-stone-100 p-6 dark:border-white/5">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-white flex items-center gap-2">
          <Code2 className="h-5 w-5 text-stone-500" /> Assigned Projects ({projects.length}/5)
        </h2>
        {projects.length < 5 && <ProjectManageDialog internId={internId} isAdmin />}
      </div>
      <div className="p-6">
        {projects.length === 0 ? (
          <div className="text-sm text-stone-500 dark:text-stone-400 py-6 text-center border border-dashed rounded-xl dark:border-stone-800 mt-2">
            No projects assigned yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div key={project.id} className="p-5 rounded-xl border border-stone-200 bg-stone-50/50 dark:border-white/10 dark:bg-stone-900/50 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 break-words">
                    {project.name}
                  </h3>
                  {project.github_link && (
                    <a
                      href={project.github_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:underline dark:text-blue-400"
                    >
                      <ExternalLink className="h-4 w-4" /> Repository
                    </a>
                  )}
                </div>
                <div className="flex justify-end gap-1 mt-5 pt-4 border-t border-stone-200 dark:border-white/10">
                  <ProjectManageDialog internId={internId} existingProject={project} isAdmin />
                  <button 
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 transition disabled:opacity-50"
                    disabled={deletingId === project.id}
                    onClick={() => handleDelete(project.id)}
                  >
                    {deletingId === project.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
