import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

function Login() {
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Mendapatkan sesi pengguna saat ini dan mengarahkan ke dashboard jika sudah login
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) navigate("/dashboard");
    });

    // Mendengarkan perubahan status autentikasi
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) navigate("/dashboard");
    });

    // Membersihkan listener saat komponen di-unmount
    return () => {
      if (typeof authListener === "function") authListener();
    };
  }, [navigate]);

  // Fungsi untuk logout pengguna
  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    navigate("/login");
  };

  if (!session) {
    // Render halaman login jika pengguna belum login
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6 text-center">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Login</h1>
          <Auth 
            supabaseClient={supabase} 
            appearance={{ theme: ThemeSupa }} 
            providers={['google']} // Hanya mendukung login via Google
          />
        </div>
      </div>
    );
  }

  // Render halaman selamat datang jika pengguna sudah login
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-semibold text-gray-800">Welcome, {session?.user?.email}</h2>
        <button 
          type="button" 
          onClick={signOut} 
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export default Login;
