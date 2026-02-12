const FormField = ({ label, children, hint }) => (
  <label className="flex flex-col gap-2">
    <span className="text-sm font-semibold text-slate-200">{label}</span>
    {children}
    {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
  </label>
);

export default FormField;
