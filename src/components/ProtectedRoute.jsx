import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

// ProtectedRoute memastikan bahwa hanya pengguna yang sudah login dapat mengakses komponen yang dibungkus.
// Jika pengguna belum login, mereka akan diarahkan ke halaman login.
const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Memeriksa sesi saat ini untuk menentukan apakah pengguna sudah login.
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };
    checkSession();
  }, []);

  // Menampilkan pesan loading saat memeriksa sesi.
  if (loading) return <p>Loading...</p>;

  // Jika sesi ada, render komponen anak; jika tidak, arahkan ke halaman login.
  return session ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
