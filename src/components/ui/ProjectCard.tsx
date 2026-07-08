'use client'

import { useState } from 'react'
import type { StudentProject } from '@/types'
import { ProjectManageDialog } from '@/components/dialogs/ProjectManageDialog'
import { EditGithubLinkDialog } from '@/components/dialogs/EditGithubLinkDialog'
import { ExternalLink, Trash2, Loader2, Code2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteProjectAction } from '@/actions/projects'

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

interface Props {
  projects: StudentProject[]
  personalGithubLink?: string | null
}

export function ProjectCard({ projects, personalGithubLink }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(projectId: string) {
    if (!confirm('Are you sure you want to delete this project?')) return
    setDeletingId(projectId)
    const res = await deleteProjectAction(projectId)
    setDeletingId(null)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Project deleted')
    }
  }

  return (
    <div className="card overflow-hidden">
      {/* Header section with Unified Portfolio Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 p-6 dark:border-white/5">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-white flex items-center gap-2">
            <Code2 className="h-5 w-5 text-stone-500" /> Projects & Portfolio
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Manage your assigned projects and GitHub portfolio ({projects.length}/5)
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Personal GitHub Link Badge */}
          <div className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-1.5 dark:bg-white/5 text-stone-700 dark:text-stone-300 text-xs font-medium border border-stone-200/50 dark:border-white/5">
            <GithubIcon className="h-3.5 w-3.5 text-stone-500" />
            <span className="text-stone-400 dark:text-stone-500 uppercase tracking-wider text-[9px] font-bold">Profile:</span>
            {personalGithubLink ? (
              <a
                href={personalGithubLink}
                target="_blank"
                rel="noreferrer"
                className="hover:underline text-blue-600 dark:text-blue-400 truncate max-w-[120px] font-semibold"
              >
                {personalGithubLink.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
              </a>
            ) : (
              <span className="text-stone-400 dark:text-stone-500 italic">Not Linked</span>
            )}
            <EditGithubLinkDialog initialValue={personalGithubLink} />
          </div>

          {projects.length < 5 && <ProjectManageDialog />}
        </div>
      </div>

      {/* Projects List body */}
      <div className="p-6">
        {projects.length === 0 ? (
          <div className="text-sm text-stone-500 dark:text-stone-400 py-6 text-center border border-dashed rounded-xl dark:border-stone-850">
            No projects added yet. Add your first project above!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <div 
                key={project.id} 
                className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 dark:border-white/5 dark:bg-stone-900/50 flex flex-col justify-between hover:border-stone-300 dark:hover:border-white/10 transition duration-250"
              >
                <div className="min-w-0">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-stone-200/50 dark:bg-white/5 text-stone-600 dark:text-stone-400 shrink-0">
                      <Code2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-stone-900 dark:text-stone-100 break-words text-sm">
                        {project.name}
                      </h3>
                      {project.github_link && (
                        <a
                          href={project.github_link}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400 font-medium"
                        >
                          <ExternalLink className="h-3 w-3" /> Repository
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-1 mt-4 pt-3 border-t border-stone-200/60 dark:border-white/5">
                  <ProjectManageDialog existingProject={project} />
                  <button 
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-650 dark:hover:bg-red-950/30 transition disabled:opacity-50"
                    disabled={deletingId === project.id}
                    onClick={() => handleDelete(project.id)}
                  >
                    {deletingId === project.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
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
