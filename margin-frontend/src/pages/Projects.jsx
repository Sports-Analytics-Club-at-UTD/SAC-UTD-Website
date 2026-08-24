import { useState, useEffect } from 'react';
import { BASE_URL } from '../config';

export default function Projects() {
  const [userProfile, setUserProfile] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Initial Kanban state with dummy club tasks
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Scrape NCAA schedules', status: 'todo', assignee: 'Data Team', tag: 'Data Pipeline' },
    { id: 2, title: 'Spatial Tracking API', status: 'in-progress', assignee: 'Computer Vision', tag: 'Model' },
    { id: 3, title: 'Draft NFL Week 2 Report', status: 'in-progress', assignee: 'Writers', tag: 'Content' },
    { id: 4, title: 'AWS Server Budget Request', status: 'review', assignee: 'Finance', tag: 'Admin' },
    { id: 5, title: 'Build React Authentication', status: 'done', assignee: 'Web Team', tag: 'Frontend' }
  ]);

  useEffect(() => {
    const token = localStorage.getItem('sac_auth_token');
    if (token) {
      fetch(`${BASE_URL}/auth/whoami/`, {
        headers: { 'Authorization': `Token ${token}` }
      })
      .then(res => res.json())
      .then(data => setUserProfile(data))
      .catch(err => console.error(err));
    }
  }, []);

  // Update a task's status to move it between columns
  const updateTaskStatus = (taskId, newStatus) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
  };

  // Determine if user has permission (Officer, Director, or Exec)
  const hasAccess = userProfile && (userProfile.is_officer || userProfile.is_director || userProfile.role === 'exec');

  // Helper to render a specific column of the Kanban board
  const renderColumn = (columnId, columnTitle) => {
    const columnTasks = tasks.filter(task => task.status === columnId);
    
    return (
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '4px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '260px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>{columnTitle}</h3>
          <span style={{ background: 'var(--panel-2)', color: 'var(--text-dim)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            {columnTasks.length}
          </span>
        </div>

        {columnTasks.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', margin: '20px 0' }}>No tasks here.</p>
        ) : (
          columnTasks.map(task => (
            <div key={task.id} style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', padding: '16px', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>
                  {task.tag}
                </span>
              </div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>{task.title}</h4>
              <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-dim)' }}>Assigned to: {task.assignee}</p>
              
              <select 
                value={task.status} 
                onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                style={{ width: '100%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--line)', padding: '6px', borderRadius: '3px', fontSize: '12px' }}
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <main className="portal-container" style={{ alignItems: 'flex-start', padding: '40px 20px' }}>
      <div className="card" style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', boxShadow: 'none' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <h2>Projects Portal</h2>
            <p style={{ margin: 0 }}>Track active models, data pipelines, and club initiatives.</p>
          </div>
          {hasAccess && (
            <button className="btn-primary">
              + New Task
            </button>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '0 0 30px 0' }} />

        {/* ACCESS GATE */}
        {!hasAccess && userProfile ? (
          <div style={{ padding: '60px 40px', textAlign: 'center', background: 'var(--panel-2)', borderRadius: '4px', border: '1px solid var(--line)' }}>
            <h3 style={{ color: 'var(--red)', marginTop: 0 }}>Restricted Access</h3>
            <p style={{ color: 'var(--text-dim)', marginBottom: 0 }}>Only active Officers and Directors can view or modify the internal project pipelines.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
            {renderColumn('todo', 'To Do')}
            {renderColumn('in-progress', 'In Progress')}
            {renderColumn('review', 'Review')}
            {renderColumn('done', 'Done')}
          </div>
        )}
        
      </div>
    </main>
  );
}