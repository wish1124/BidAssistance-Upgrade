import { useState } from "react";
import { register } from "../api/auth";
import { Button } from "./ui/button";

export function Register({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    try {
      setLoading(true);
      setError("");
      await register({ email, name, password });
      onSuccess();
    } catch {
      setError("회원가입 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <h2 className="text-xl font-bold">회원가입</h2>

      <input
        className="border p-2 w-full"
        placeholder="이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="border p-2 w-full"
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        className="border p-2 w-full"
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <Button onClick={submit} disabled={loading} className="w-full">
        {loading ? "가입 중..." : "회원가입"}
      </Button>
    </div>
  );
}
