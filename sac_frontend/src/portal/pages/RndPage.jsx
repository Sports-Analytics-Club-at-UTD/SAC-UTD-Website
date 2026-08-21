import { useEffect, useState } from "react";
import { portalApi, asList } from "../apiClient";

export default function RndPage() {
  const [ideas, setIdeas] = useState(null);
  const [todos, setTodos] = useState(null);

  useEffect(() => {
    portalApi.listIdeas().then((data) => setIdeas(asList(data)));
    portalApi.listRndTodos().then((data) => setTodos(asList(data)));
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
      <div>
        <h2 className="sac-heading-md" style={{ marginBottom: 16 }}>
          Ideas
        </h2>
        {!ideas ? (
          <p className="sac-muted">Loading…</p>
        ) : ideas.length === 0 ? (
          <p className="sac-muted">No ideas logged yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ideas.map((idea) => (
              <div key={idea.id} className="sac-panel" style={{ padding: 14 }}>
                <div>{idea.title}</div>
                <div className="sac-muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {idea.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="sac-heading-md" style={{ marginBottom: 16 }}>
          To-dos
        </h2>
        {!todos ? (
          <p className="sac-muted">Loading…</p>
        ) : todos.length === 0 ? (
          <p className="sac-muted">Nothing on the to-do list.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todos.map((todo) => (
              <div key={todo.id} className="sac-panel" style={{ padding: 14 }}>
                <div>{todo.title}</div>
                <div className="sac-muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {todo.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
