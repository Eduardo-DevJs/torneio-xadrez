export default function Section({ title, children, right }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        {right}
      </div>
      <div className="bg-white/70 dark:bg-neutral-900/70 rounded-2xl shadow p-4 border border-neutral-200 dark:border-neutral-800">
        {children}
      </div>
    </div>
  );
}
