import { Routes, Route } from "react-router-dom";
import { RequireAuth } from "../shared/RequireAuth";
import ProjectsListPage from "./pages/ProjectsListPage";
import ProjectBoardPage from "./pages/ProjectBoardPage";
import "./projects.css";

/**
 * Self-contained, same pattern as portal/DirectorPortalApp.jsx. Mount
 * with one line in the co-director's App.jsx:
 *
 *   <Route path="/projects/*" element={<ProjectsApp />} />
 *
 * Unlike the Director Portal, there's no director-only gate here —
 * any authenticated approved member can view project boards (the
 * backend's own IsProjectManagerOrReadOnly still restricts actually
 * creating/editing a Project to directors; this module doesn't build
 * a create-project form since a plain member would never see it
 * succeed anyway). RequireAuth is the only gate: logged in at all.
 */
export default function ProjectsApp() {
  return (
    <div className="sac-projects">
      <Routes>
        <Route element={<RequireAuth />}>
          <Route index element={<ProjectsListPage />} />
          <Route path=":projectId" element={<ProjectBoardPage />} />
        </Route>
      </Routes>
    </div>
  );
}