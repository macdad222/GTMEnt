/**
 * Toast component for displaying job progress.
 * Shows a progress bar and status message for async LLM operations.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { ArrowPathIcon } from '@heroicons/react/24/solid'

interface JobProgressToastProps {
  isVisible: boolean
  title: string
  progress: number
  progressMessage: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | null
  error?: string | null
  onDismiss?: () => void
  onComplete?: () => void
}

export function JobProgressToast({
  isVisible,
  title,
  progress,
  progressMessage,
  status,
  error,
  onDismiss,
  onComplete,
}: JobProgressToastProps) {
  const isCompleted = status === 'completed'
  const isFailed = status === 'failed'
  const isActive = status === 'pending' || status === 'in_progress'

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-50 w-96"
        >
          <div className={`
            rounded-xl border shadow-2xl backdrop-blur-xl
            ${isCompleted 
              ? 'bg-emerald-900/90 border-emerald-500/30' 
              : isFailed 
                ? 'bg-red-900/90 border-red-500/30'
                : 'bg-slate-800/90 border-slate-600/30'
            }
          `}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                {isActive && (
                  <ArrowPathIcon className="h-5 w-5 text-accent-400 animate-spin" />
                )}
                {isCompleted && (
                  <CheckCircleIcon className="h-5 w-5 text-emerald-400" />
                )}
                {isFailed && (
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                )}
                <span className="font-medium text-white text-sm">{title}</span>
              </div>
              {(isCompleted || isFailed) && onDismiss && (
                <button
                  onClick={onDismiss}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="px-4 py-3">
              {/* Progress message */}
              <p className="text-sm text-slate-300 mb-3">
                {error || progressMessage || 'Processing...'}
              </p>

              {/* Progress bar */}
              {!isFailed && (
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      isCompleted 
                        ? 'bg-emerald-500' 
                        : 'bg-gradient-to-r from-accent-500 to-accent-400'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}

              {/* Progress percentage */}
              {!isFailed && (
                <div className="flex justify-between mt-2 text-xs text-slate-400">
                  <span>{progress}% complete</span>
                  {isCompleted && (
                    <span className="text-emerald-400">Done!</span>
                  )}
                </div>
              )}

              {/* Action button on complete */}
              {isCompleted && onComplete && (
                <button
                  onClick={() => {
                    onComplete()
                    onDismiss?.()
                  }}
                  className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  View Results
                </button>
              )}

              {/* Retry button on failure */}
              {isFailed && onDismiss && (
                <button
                  onClick={onDismiss}
                  className="mt-3 w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Component for showing multiple job toasts stacked.
 */
interface MultiJobProgressProps {
  jobs: Array<{
    id: string
    title: string
    progress: number
    progressMessage: string
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | null
    error?: string | null
  }>
  onDismissJob?: (jobId: string) => void
}

export function MultiJobProgress({ jobs, onDismissJob }: MultiJobProgressProps) {
  const activeJobs = jobs.filter(j => j.status === 'pending' || j.status === 'in_progress')
  const completedJobs = jobs.filter(j => j.status === 'completed')
  const failedJobs = jobs.filter(j => j.status === 'failed')

  return (
    <AnimatePresence>
      {jobs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-6 right-6 z-50 w-96 space-y-2"
        >
          {/* Summary card if multiple jobs */}
          {jobs.length > 1 && (
            <div className="bg-slate-800/90 border border-slate-600/30 rounded-xl p-4 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">
                  Background Tasks
                </span>
                <span className="text-xs text-slate-400">
                  {activeJobs.length} running
                </span>
              </div>
              
              <div className="space-y-1 text-xs">
                {activeJobs.length > 0 && (
                  <div className="flex items-center gap-2 text-accent-400">
                    <ArrowPathIcon className="h-3 w-3 animate-spin" />
                    <span>{activeJobs.length} in progress</span>
                  </div>
                )}
                {completedJobs.length > 0 && (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircleIcon className="h-3 w-3" />
                    <span>{completedJobs.length} completed</span>
                  </div>
                )}
                {failedJobs.length > 0 && (
                  <div className="flex items-center gap-2 text-red-400">
                    <ExclamationTriangleIcon className="h-3 w-3" />
                    <span>{failedJobs.length} failed</span>
                  </div>
                )}
              </div>

              {/* Overall progress */}
              {activeJobs.length > 0 && (
                <div className="mt-3">
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-accent-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${activeJobs.reduce((sum, j) => sum + j.progress, 0) / activeJobs.length}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Individual job cards (show only first 3) */}
          {jobs.slice(0, 3).map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              className={`
                rounded-lg border p-3 shadow-lg backdrop-blur-xl
                ${job.status === 'completed' 
                  ? 'bg-emerald-900/80 border-emerald-500/30' 
                  : job.status === 'failed'
                    ? 'bg-red-900/80 border-red-500/30'
                    : 'bg-slate-800/80 border-slate-600/30'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {(job.status === 'pending' || job.status === 'in_progress') && (
                    <ArrowPathIcon className="h-4 w-4 text-accent-400 animate-spin flex-shrink-0" />
                  )}
                  {job.status === 'completed' && (
                    <CheckCircleIcon className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  )}
                  {job.status === 'failed' && (
                    <ExclamationTriangleIcon className="h-4 w-4 text-red-400 flex-shrink-0" />
                  )}
                  <span className="text-xs text-white truncate">{job.title}</span>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-slate-400">{job.progress}%</span>
                  {(job.status === 'completed' || job.status === 'failed') && onDismissJob && (
                    <button
                      onClick={() => onDismissJob(job.id)}
                      className="p-0.5 rounded hover:bg-white/10"
                    >
                      <XMarkIcon className="h-3 w-3 text-slate-400" />
                    </button>
                  )}
                </div>
              </div>
              
              {job.progressMessage && (
                <p className="text-xs text-slate-400 mt-1 truncate">
                  {job.progressMessage}
                </p>
              )}
            </motion.div>
          ))}

          {/* Show more indicator */}
          {jobs.length > 3 && (
            <div className="text-xs text-slate-400 text-center">
              +{jobs.length - 3} more tasks
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

