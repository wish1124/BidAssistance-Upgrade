// src/app/ui/Toast.tsx
export function Toast({
  message,
  type,
}: {
  message: string;
  type: "success" | "error";
}) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded text-white shadow-lg
        ${type === "success" ? "bg-green-600" : "bg-red-600"}`}
    >
      {message}
    </div>
  );
}
