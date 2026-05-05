import { Navigate, Route, Routes } from "react-router-dom";
import { HeaderBar } from "./components/HeaderBar";
import { AdvancedSimulationPage } from "./pages/AdvancedSimulationPage";
import { HomePage } from "./pages/HomePage";
import { SimulationPage } from "./pages/SimulationPage";
import "./index.css";

function App() {
  return (
    <main className="sim-page">
      <HeaderBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/simulate" element={<SimulationPage />} />
        <Route path="/simulate/advanced" element={<AdvancedSimulationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}

export default App;
