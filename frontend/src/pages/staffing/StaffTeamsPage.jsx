import { useEffect, useState } from 'react'
import api from '../../api/client'
import Modal from '../../components/Modal'
import { useAuth } from '../../auth/AuthContext'
import * as roles from '../../roles'
import { SkeletonTable } from '../../components/Skeleton'

const EMPTY_STAFF = { name: '', role: '', contact: '', active: true }

export default function StaffTeamsPage() {
  const { hasRole } = useAuth()
  const canManage = hasRole(roles.ADMIN, roles.EVENT_PLANNER)

  const [staff, setStaff] = useState(null)
  const [teams, setTeams] = useState(null)
  const [error, setError] = useState('')
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [addMemberTeam, setAddMemberTeam] = useState(null)

  const load = () => {
    Promise.all([api.get('/staff/'), api.get('/teams/')])
      .then(([staffRes, teamRes]) => {
        setStaff(staffRes.data.results ?? staffRes.data)
        setTeams(teamRes.data.results ?? teamRes.data)
      })
      .catch(() => setError('Could not load staff/teams.'))
  }

  useEffect(load, [])

  const staffName = (id) => staff?.find((s) => s.id === id)?.name ?? `Staff #${id}`

  if (error) return <p className="text-red-600">{error}</p>
  if (!staff || !teams) return <SkeletonTable />

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          {canManage && (
            <button
              onClick={() => setShowAddStaff(true)}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Add Staff
            </button>
          )}
        </div>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Role</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Contact</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2 text-gray-700">{s.role}</td>
                  <td className="px-4 py-2 text-gray-700">{s.contact || '—'}</td>
                  <td className="px-4 py-2 text-gray-700">{s.active ? 'Yes' : 'No'}</td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No staff yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          {canManage && (
            <button
              onClick={() => setShowAddTeam(true)}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Add Team
            </button>
          )}
        </div>
        <div className="space-y-3">
          {teams.map((team) => (
            <div key={team.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">{team.name}</span>
                  <span className="ml-2 text-sm text-gray-500">Leader: {staffName(team.leader)}</span>
                </div>
                {canManage && (
                  <button
                    onClick={() => setAddMemberTeam(team)}
                    className="text-sm font-medium text-brand-700 hover:underline"
                  >
                    Add Member
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {team.members.length === 0 && <span className="text-sm text-gray-400">No members yet.</span>}
                {team.members.map((m) => (
                  <span key={m.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                    {staffName(m.staff)}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {teams.length === 0 && <p className="text-gray-500">No teams yet.</p>}
        </div>
      </div>

      {showAddStaff && (
        <AddStaffModal onClose={() => setShowAddStaff(false)} onCreated={() => { setShowAddStaff(false); load() }} />
      )}
      {showAddTeam && (
        <AddTeamModal staff={staff} onClose={() => setShowAddTeam(false)} onCreated={() => { setShowAddTeam(false); load() }} />
      )}
      {addMemberTeam && (
        <AddMemberModal
          team={addMemberTeam}
          staff={staff}
          onClose={() => setAddMemberTeam(null)}
          onAdded={() => { setAddMemberTeam(null); load() }}
        />
      )}
    </div>
  )
}

function AddStaffModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_STAFF)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/staff/', form)
      onCreated()
    } catch {
      setError('Could not add this staff member.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Add Staff" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Name</span>
          <input required className="input" value={form.name} onChange={set('name')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Role</span>
          <input required className="input" value={form.role} onChange={set('role')} placeholder="e.g. Driver, Rigger" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Contact</span>
          <input className="input" value={form.contact} onChange={set('contact')} />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Adding…' : 'Add Staff'}
        </button>
      </form>
    </Modal>
  )
}

function AddTeamModal({ staff, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [leader, setLeader] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/teams/', { name, leader })
      onCreated()
    } catch {
      setError('Could not create this team.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Add Team" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Team name</span>
          <input required className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Leader</span>
          <select required className="input" value={leader} onChange={(e) => setLeader(e.target.value)}>
            <option value="">Select a staff member…</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Add Team'}
        </button>
      </form>
    </Modal>
  )
}

function AddMemberModal({ team, staff, onClose, onAdded }) {
  const [staffId, setStaffId] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const available = staff.filter((s) => !team.members.some((m) => m.staff === s.id))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/team-members/', { team: team.id, staff: staffId })
      onAdded()
    } catch {
      setError('Could not add this member.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={`Add Member — ${team.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Staff member</span>
          <select required className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">Select…</option>
            {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Adding…' : 'Add Member'}
        </button>
      </form>
    </Modal>
  )
}
