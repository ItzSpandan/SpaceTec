'use client'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function Home() {
  const [launches, setLaunches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLaunches() {
      const { data, error } = await supabase.from('launches').select('*')
      if (error) {
        console.error('Error fetching launches:', error)
      } else {
        setLaunches(data || [])
      }
      setLoading(false)
    }

    fetchLaunches()
  }, [])

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif', background: '#0b0f19', color: '#fff', minHeight: '100vh' }}>
      <h1>🚀 SpaceTec Intelligence Platform</h1>
      <p>Real-time launch tracking and orbital data.</p>
      
      <h2>Upcoming Launches</h2>
      {loading ? (
        <p>Loading database launches...</p>
      ) : launches.length === 0 ? (
        <p>No launches found in database yet. Ready to add some space missions!</p>
      ) : (
        <ul>
          {launches.map((launch) => (
            <li key={launch.id} style={{ marginBottom: '10px' }}>
              <strong>{launch.name}</strong> - Status: {launch.status || 'Scheduled'}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
