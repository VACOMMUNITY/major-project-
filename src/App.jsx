import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/admin/Dashboard";
import Buses from "./pages/admin/buses";
import Drivers from "./pages/admin/drivers";
import AdminGate from "./components/AdminGate";
import "./admin.css";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<AdminGate><Dashboard /></AdminGate>} />
      <Route path="/buses" element={<AdminGate><Buses /></AdminGate>} />
      <Route path="/drivers" element={<AdminGate><Drivers /></AdminGate>} />
    </Routes>
  );
}