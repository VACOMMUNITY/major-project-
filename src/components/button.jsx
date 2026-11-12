export default function Button({ children, onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-400 py-4 text-lg font-bold text-white shadow-[0_15px_40px_rgba(37,99,235,.45)] hover:scale-[1.02] active:scale-95 transition-all duration-300 ${className}`}
    >
      {children}
    </button>
  );
}