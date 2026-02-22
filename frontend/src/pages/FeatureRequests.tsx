import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlusIcon,
  HandThumbUpIcon,
  TrashIcon,
  ChatBubbleLeftEllipsisIcon,
  SparklesIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { HandThumbUpIcon as HandThumbUpSolidIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../context/AuthContext'

interface FeatureRequest {
  id: string
  title: string
  description: string
  submitted_by: string
  created_at: string
  votes: number
  status: string
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  submitted: { label: 'Submitted', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: ClockIcon },
  in_review: { label: 'In Review', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: SparklesIcon },
  planned: { label: 'Planned', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: SparklesIcon },
  completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircleIcon },
}

export function FeatureRequests() {
  const [requests, setRequests] = useState<FeatureRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set())
  const { user } = useAuth()

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/feature-requests')
      if (res.ok) {
        const data = await res.json()
        setRequests(data)
      }
    } catch (e) {
      console.error('Failed to load feature requests:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim() || submitting) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/feature-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), submitted_by: user?.name || 'Anonymous' }),
      })
      if (res.ok) {
        setTitle('')
        setDescription('')
        setShowForm(false)
        await fetchRequests()
      }
    } catch (e) {
      console.error('Failed to submit:', e)
    } finally {
      setSubmitting(false)
    }
  }

  const handleVote = async (id: string) => {
    if (votedIds.has(id)) return
    try {
      const res = await fetch(`/api/feature-requests/${id}/vote`, { method: 'POST' })
      if (res.ok) {
        setVotedIds(prev => new Set(prev).add(id))
        setRequests(prev =>
          prev.map(r => (r.id === id ? { ...r, votes: r.votes + 1 } : r))
        )
      }
    } catch (e) {
      console.error('Failed to vote:', e)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/feature-requests/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== id))
      }
    } catch (e) {
      console.error('Failed to delete:', e)
    }
  }

  const sorted = [...requests].sort((a, b) => b.votes - a.votes)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ChatBubbleLeftEllipsisIcon className="h-8 w-8 text-purple-400" />
            User Development Requests
          </h1>
          <p className="text-slate-400 mt-1">
            Share ideas for future features and improvements. Vote on requests you'd like to see.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg text-white font-medium transition-all shadow-lg shadow-purple-500/20"
        >
          {showForm ? <XMarkIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
          {showForm ? 'Cancel' : 'New Request'}
        </motion.button>
      </div>

      {/* Submit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl border border-purple-500/20 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">Submit a Feature Request</h3>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Brief title for your request..."
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  maxLength={120}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the feature or improvement you'd like to see..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-slate-500 mt-1">{description.length}/500 characters</p>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!title.trim() || !description.trim() || submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SparklesIcon className="h-5 w-5" />
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 text-center">
          <p className="text-2xl font-bold text-white">{requests.length}</p>
          <p className="text-xs text-slate-400 mt-1">Total Requests</p>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 text-center">
          <p className="text-2xl font-bold text-purple-400">{requests.reduce((s, r) => s + r.votes, 0)}</p>
          <p className="text-xs text-slate-400 mt-1">Total Votes</p>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 text-center">
          <p className="text-2xl font-bold text-green-400">{requests.filter(r => r.status === 'completed').length}</p>
          <p className="text-xs text-slate-400 mt-1">Completed</p>
        </div>
      </div>

      {/* Request List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading requests...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/30 rounded-2xl">
          <ChatBubbleLeftEllipsisIcon className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Requests Yet</h3>
          <p className="text-slate-400 mb-6">Be the first to suggest a feature or improvement!</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-medium transition-colors"
          >
            Submit a Request
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((req, i) => {
            const cfg = statusConfig[req.status] || statusConfig.submitted
            const StatusIcon = cfg.icon
            const hasVoted = votedIds.has(req.id)

            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-slate-800/60 rounded-xl border border-slate-700/50 hover:border-slate-600/50 transition-all overflow-hidden"
              >
                <div className="flex items-stretch">
                  {/* Vote Column */}
                  <button
                    onClick={() => handleVote(req.id)}
                    disabled={hasVoted}
                    className={`flex flex-col items-center justify-center px-5 border-r border-slate-700/50 transition-colors min-w-[70px] ${
                      hasVoted
                        ? 'bg-purple-500/10 cursor-default'
                        : 'hover:bg-purple-500/10 cursor-pointer'
                    }`}
                  >
                    {hasVoted ? (
                      <HandThumbUpSolidIcon className="h-5 w-5 text-purple-400 mb-1" />
                    ) : (
                      <HandThumbUpIcon className="h-5 w-5 text-slate-400 hover:text-purple-400 mb-1 transition-colors" />
                    )}
                    <span className={`text-lg font-bold ${hasVoted ? 'text-purple-400' : 'text-white'}`}>
                      {req.votes}
                    </span>
                  </button>

                  {/* Content */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold">{req.title}</h3>
                        <p className="text-slate-400 text-sm mt-1 leading-relaxed">{req.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3 inline mr-1" />
                          {cfg.label}
                        </span>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(req.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                            title="Delete request"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span>{req.submitted_by}</span>
                      <span>•</span>
                      <span>{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
