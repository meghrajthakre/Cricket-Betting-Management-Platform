import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!username || !password) { setError("Please enter username and password."); return; }

    setLoading(true);
    try {
      await login(username, password);
      navigate("/support/matches", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-(--color-bg-main) flex items-center justify-center px-4">
      <div className="bg-(--color-primary) rounded-2xl p-10 w-full max-w-sm shadow-2xl">
        <h1 className="text-center text-white text-2xl font-medium tracking-[4px] mb-8">
          LOG IN
        </h1>

        {error && (
          <p className="text-white text-sm bg-red-700/30 rounded-lg px-4 py-2 mb-4 text-center">
            {error}
          </p>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white text-gray-600 text-sm placeholder-gray-400 outline-none focus:ring-2 focus:ring-white/50"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white text-gray-600 text-sm placeholder-gray-400 outline-none focus:ring-2 focus:ring-white/50"
          />
          <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-(--color-banner) hover:bg-(--color-primary-light) active:scale-95 text-white text-sm font-medium tracking-[2px] px-12 py-3 rounded-lg transition-all disabled:opacity-60"
            >
              {loading ? "Logging in..." : "LOG IN"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
