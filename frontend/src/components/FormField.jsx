const FormField = ({ id, label, children, hint, required = false }) => (
  <div className="flex flex-col gap-2">
    <label htmlFor={id} className="text-sm font-semibold text-slate-800 dark:text-slate-100">
      {label}
      {required ? <span className="ml-1 text-rose-500">*</span> : null}
    </label>
    {children}
    {hint ? <span className="text-xs text-slate-500 dark:text-slate-400">{hint}</span> : null}
  </div>
);

export default FormField;
