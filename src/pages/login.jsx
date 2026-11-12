import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bus,
  ShieldCheck,
  MapPinned,
  Camera,
  Zap,
} from "lucide-react";

export default function Login() {
  const [role, setRole] = useState("Admin");

  const roles = [
    "Admin",
    "Public Driver",
    "Organization Driver",
    "User",
  ];

  return (
    <div className="min-h-screen bg-[#030712] overflow-hidden relative flex items-center justify-center p-6">

      {/* Animated Background */}
      <motion.div
        animate={{ y: [-20, 20, -20] }}
        transition={{ repeat: Infinity, duration: 8 }}
        className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-blue-600/30 blur-[120px]"
      />

      <motion.div
        animate={{ y: [20, -20, 20] }}
        transition={{ repeat: Infinity, duration: 10 }}
        className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-cyan-500/20 blur-[120px]"
      />

      <div className="w-full max-w-7xl grid lg:grid-cols-2 rounded-[40px] overflow-hidden border border-white/10 backdrop-blur-2xl bg-white/5 shadow-[0_30px_100px_rgba(0,0,0,.7)]">

        {/* Left Hero */}
        <div className="hidden lg:flex flex-col justify-between p-12 relative bg-gradient-to-br from-blue-900/50 via-slate-900 to-cyan-900/30">

          <div>
            <div className="flex items-center gap-3">
              <Bus className="text-cyan-300" size={42} />
              <h1 className="text-5xl font-black text-white">
                IntelliBus
              </h1>
            </div>

            <p className="text-blue-100 mt-6 text-lg leading-8">
              AI-powered Public Transportation Scheduling,
              Offline Navigation, Live Tracking and Smart Attendance.
            </p>
          </div>

          {/* 3D Bus Effect */}
          <motion.div
            animate={{ y: [-10, 10, -10], rotate: [-2, 2, -2] }}
            transition={{ repeat: Infinity, duration: 6 }}
            className="flex justify-center"
          >
            <div className="relative w-80 h-80">

              <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-3xl"></div>

              <div className="relative h-full rounded-[40px] bg-gradient-to-br from-blue-500 via-cyan-400 to-sky-300 shadow-[0_20px_80px_rgba(59,130,246,.45)] flex items-center justify-center">
                <Bus size={140} className="text-white drop-shadow-xl" />
              </div>

            </div>
          </motion.div>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-4">

            {[
              [MapPinned, "Live GPS"],
              [Camera, "QR Attendance"],
              [ShieldCheck, "Secure Login"],
              [Zap, "Offline Maps"],
            ].map(([Icon, text]) => (
              <motion.div
                whileHover={{ y: -6 }}
                key={text}
                className="bg-white/10 border border-white/10 rounded-2xl p-5 backdrop-blur-md"
              >
                <Icon className="text-cyan-300" size={28} />
                <p className="text-white mt-3">{text}</p>
              </motion.div>
            ))}

          </div>

        </div>

        {/* Login Panel */}
        <div className="bg-white p-10 lg:p-14 flex flex-col justify-center">

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
          >

            <div className="lg:hidden flex justify-center mb-6">
              <Bus size={60} className="text-blue-600" />
            </div>

            <h2 className="text-4xl font-black text-gray-900">
              Welcome Back
            </h2>

            <p className="text-gray-500 mt-3 mb-10">
              Login to continue to your transportation dashboard.
            </p>

            {/* Role Pills */}
            <div className="grid grid-cols-2 gap-3 mb-8">

              {roles.map((item) => (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ scale: 1.03 }}
                  key={item}
                  onClick={() => setRole(item)}
                  className={`rounded-2xl py-4 text-sm font-bold transition-all ${
                    role === item
                      ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_10px_30px_rgba(37,99,235,.35)]"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {item}
                </motion.button>
              ))}

            </div>

            {/* Inputs */}
            <div className="space-y-5">

              <input
                placeholder="User ID"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 outline-none focus:ring-4 focus:ring-blue-100 transition"
              />

              <input
                type="password"
                placeholder="Password"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 outline-none focus:ring-4 focus:ring-blue-100 transition"
              />

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full rounded-2xl bg-gradient-to-r from-blue-700 via-cyan-500 to-sky-400 py-5 text-lg font-bold text-white shadow-[0_15px_40px_rgba(37,99,235,.45)]"
              >
                Login →
              </motion.button>

            </div>

            <div className="flex justify-between text-sm text-gray-400 mt-8">
              <span>Offline Ready</span>
              <span>GPS Enabled</span>
            </div>

          </motion.div>

        </div>

      </div>

    </div>
  );
}