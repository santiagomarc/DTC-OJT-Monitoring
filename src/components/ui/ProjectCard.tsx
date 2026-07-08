'use client'

import { useState } from 'react'
import type { StudentProject } from '@/types'
import { ProjectManageDialog } from '@/components/dialogs/ProjectManageDialog'
import { ChevronLeft, ChevronRight, ExternalLink, Trash2, Loader2, Code2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteProjectAction } from '@/actions/projects'

interface Props {
  projects: StudentProject[]
}

export function ProjectCard({ projects }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  const currentProject = projects[currentIndex]

  const next = () => setCurrentIndex((i) => (i + 1) % projects.length)
  const prev = () => setCurrentIndex((i) => (i - 1 + projects.length) % projects.length)

  async function handleDelete(projectId: string) {
    if (!confirm('Are you sure you want to delete this project?')) return
    setIsDeleting(true)
    const res = await deleteProjectAction(projectId)
    setIsDeleting(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Project deleted')
      setCurrentIndex(0)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-stone-100 p-6 dark:border-white/5">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-white flex items-center gap-2">
          <Code2 className="h-5 w-5 text-stone-500" /> Current Projects ({projects.length}/5)
        </h2>
        {projects.length < 5 && <ProjectManageDialog />}
      </div>
      <div className="p-6">
        {projects.length === 0 ? (
          <div className="text-sm text-stone-500 dark:text-stone-400 py-4 text-center border border-dashed rounded-xl dark:border-stone-800 mt-2">
            No projects added yet.
          </div>
        ) : (
          <div className="relative p-5 rounded-xl border border-stone-200 bg-stone-50/50 dark:border-white/10 dark:bg-stone-900/50">
            <div className="flex items-start justify-between min-h-[4rem]">
              <div className="pr-12">
                <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                  {currentProject.name}
                </h3>
                {currentProject.github_link && (
                  <a
                    href={currentProject.github_link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex items-center gap-1.5 text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <ExternalLink className="h-4 w-4" /> Repository
                  </a>
                )}
              </div>
              <div className="flex gap-1">
                <ProjectManageDialog existingProject={currentProject} />
                <button
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 disabled:opacity-50 transition"
                  disabled={isDeleting}
                  onClick={() => handleDelete(currentProject.id)}
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {projects.length > 1 && (
              <div className="mt-5 flex items-center justify-between border-t border-stone-200 pt-4 dark:border-white/10">
                <button onClick={prev} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/5 dark:hover:text-white transition">
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                <span className="text-xs font-medium text-stone-400">
                  {currentIndex + 1} of {projects.length}
                </span>
                <button onClick={next} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/5 dark:hover:text-white transition">
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
