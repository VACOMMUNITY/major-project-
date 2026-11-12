export default function Card({ title, value, color = "blue", icon }) {
  const colors = {
    blue: "from-blue-600 to-cyan-500",
    green: "from-green-500 to-emerald-400",
    orange: "from-orange-500 to-yellow-400",
    red: "from-red-500 to-pink-500",
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#0F172A] border border-white/10 p-6 shadow-xl hover:scale-[1.02] transition-all duration-300">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${colors[color]}`} />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <h2 className="text-4xl font-black text-white mt-2">{value}</h2>
        </div>

        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white text-2xl shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}