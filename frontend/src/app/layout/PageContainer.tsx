import { ReactNode } from "react";

export function PageContainer({
  children,
  title,
  description,
  right,
}: {
  children: ReactNode;
  title?: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-5 py-5">
        {(title || description || right) && (
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              {title && <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h1>}
              {description && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
              )}
            </div>
            {right && <div className="shrink-0">{right}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

