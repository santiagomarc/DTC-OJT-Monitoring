'use client'

import { useState } from 'react'
import { Briefcase, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import type { StudentProject } from '@/types'
import { ProjectManageDialog } from '../dialogs/ProjectManageDialog'
import { deleteProjectAction } from '@/actions/projects'
import { toast } from 'sonner'

// Custom GitHub icon
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
}

export function ProjectCard({ projects }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  const hasProjects = projects.length > 0
  const currentProject = hasProjects ? projects[currentIndex] : null

  // Ensure index stays in bounds if a project is deleted
  if (hasProjects && currentIndex >= projects.length) {
    setCurrentIndex(Math.max(0, projects.length - 1))
  }

  const nextProject = () => {
    setCurrentIndex((prev) => (prev + 1) % projects.length)
  }

  const prevProject = () => {
    setCurrentIndex((prev) => (prev - 1 + projects.length) % projects.length)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this project?')) return
    setIsDeleting(true)
    const res = await deleteProjectAction(id)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Project removed')
    }
    setIsDeleting(false)
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-50/80 p-6 dark:border-white/10 dark:bg-stone-900/40 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex flex-col h-full justify-between gap-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200/50 pb-3 dark:border-white/10">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
            <Briefcase className="h-3.5 w-3.5 text-red-500" />
            <span>Assigned Projects</span>
            {hasProjects && (
              <span className="ml-1 rounded-full bg-stone-200 px-1.5 py-0.5 text-[9px] text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                {projects.length}/5
              </span>
            )}
          </div>
          
          {projects.length < 5 && (
            <ProjectManageDialog 
              mode="add" 
              trigger={
                <button className="flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-600 transition hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20">
                  <Plus className="h-3 w-3" /> Add
                </button>
              }
            />
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {hasProjects && currentProject ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              {currentProject.github_link ? (
                <a
                  href={currentProject.github_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-lg font-black text-red-600 dark:text-red-400 hover:underline leading-tight"
                >
                  <span className="truncate">{currentProject.name}</span>
                  <GithubIcon className="h-4 w-4 inline-block shrink-0" />
                </a>
              ) : (
                <p className="text-lg font-black text-stone-900 dark:text-white leading-tight truncate">
                  {currentProject.name}
                </p>
              )}
              
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-stone-550 dark:text-stone-400">
                  {currentProject.github_link ? 'Repository linked.' : 'No repository linked.'}
                </p>
                <div className="flex items-center gap-1">
                  <ProjectManageDialog mode="edit" project={currentProject} />
                  <button
                    onClick={() => handleDelete(currentProject.id)}
                    disabled={isDeleting}
                    className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 dark:text-stone-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition"
                    title="Remove Project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-4 text-center">
              <p className="text-lg font-bold text-stone-400 dark:text-stone-500 italic">
                No projects added yet
              </p>
              <p className="mt-1 text-xs text-stone-550 dark:text-stone-400">
                Click Add to list your assigned projects.
              </p>
            </div>
          )}
        </div>

        {/* Carousel Navigation Footer */}
        {projects.length > 1 && (
          <div className="mt-2 flex items-center justify-between pt-2">
            <button
              onClick={prevProject}
              className="rounded-full p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200 transition"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-1.5">
              {projects.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentIndex
                      ? 'w-4 bg-red-500'
                      : 'w-1.5 bg-stone-300 dark:bg-stone-700'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextProject}
              className="rounded-full p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200 transition"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
