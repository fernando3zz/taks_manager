import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";
import { Plus, X, LogOut, ChevronLeft, ChevronRight } from "lucide-react";

function Dashboard() {
  const [tasks, setTasks] = useState({
    open: [],
    in_progress: [],
    done: [],
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [currentPage, setCurrentPage] = useState({
    open: 1,
    in_progress: 1,
    done: 1,
  });
  const tasksPerPage = 10;
  const navigate = useNavigate();

  // Fungsi untuk mengambil data pengguna yang sedang login
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);
        } else {
          navigate("/login");
        }
      } catch (error) {
        console.error("Error fetching session:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);

  // Fungsi untuk mengatur overflow halaman saat form tugas ditampilkan
  useEffect(() => {
    if (showTaskForm) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
  }, [showTaskForm]);

  // Fungsi untuk mengambil daftar tugas dari backend
  const fetchTasks = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const response = await axios.get(`http://localhost:5000/tasks/${user.id}`);
      console.log("🔹 Data dari backend:", response.data);

      const groupedTasks = {
        open: [],
        in_progress: [],
        done: [],
      };

      response.data.forEach((task) => {
        if (["open", "in_progress", "done"].includes(task.status)) {
          groupedTasks[task.status].push(task); // Ensure `creation_time` is included in each task
        }
      });

      setTasks(groupedTasks);
    } catch (error) {
      console.error("❌ Error fetching tasks:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  // Panggil fetchTasks setiap kali data pengguna tersedia
  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  // Fungsi untuk menangani penambahan tugas baru
  const handleTaskAdded = async () => {
    fetchTasks();
    setShowTaskForm(false);
  };

  // Fungsi untuk menghapus tugas
  const handleDeleteTask = async (taskId) => {
    if (!user?.id) return;

    try {
      console.log("🗑 Menghapus task ID:", taskId);
      await axios.delete(`http://localhost:5000/tasks/${taskId}`, {
        headers: { "Content-Type": "application/json" },
        data: { user_id: user.id },
      });
      fetchTasks();
    } catch (error) {
      console.error("❌ Gagal menghapus tugas:", error.response?.data || error.message);
    }
  };

  // Fungsi untuk memperbarui status tugas
  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    if (!user?.id) return;

    try {
      console.log(`🔄 Mengubah status task ${taskId} menjadi ${newStatus}`);
      await axios.put(`http://localhost:5000/tasks/${taskId}`, {
        status: newStatus,
        user_id: user.id,
      });

      setTasks((prevTasks) => {
        const updatedTasks = { ...prevTasks };
        let updatedTask;
        Object.keys(updatedTasks).forEach((status) => {
          updatedTasks[status] = updatedTasks[status].filter((task) => {
            if (task.id === taskId) {
              updatedTask = { ...task, status: newStatus };
              return false;
            }
            return true;
          });
        });
        if (updatedTask) {
          updatedTasks[newStatus].push(updatedTask);
        }
        return updatedTasks;
      });

      fetchTasks();
    } catch (error) {
      console.error("❌ Gagal memperbarui status tugas:", error.response?.data || error.message);
    }
  };

  // Fungsi untuk mengedit tugas
  const handleEditTask = async (taskId, updatedData) => {
    if (!user?.id) return;

    try {
      console.log(`✏️ Mengedit task ID: ${taskId}`, updatedData);

      const response = await axios.put(`http://localhost:5000/tasks/${taskId}`, {
        title: updatedData.title,
        description: updatedData.description,
        status: updatedData.status,
        deadline: updatedData.deadline, // Menambahkan deadline ke data yang dikirim
        user_id: user.id,
      });

      console.log("✅ Respon dari server:", response.data);

      const updatedTask = response.data;
      setTasks((prevTasks) => {
        const updatedTasks = { ...prevTasks };
        Object.keys(updatedTasks).forEach((status) => {
          updatedTasks[status] = updatedTasks[status].map((task) =>
            task.id === taskId ? { ...task, ...updatedTask } : task
          );
        });
        return updatedTasks;
      });

      setTimeout(fetchTasks, 200);
    } catch (error) {
      console.error("❌ Gagal mengedit tugas:", error.response?.data || error.message);
    }
  };

  // Fungsi untuk mengganti file pada tugas
  const handleReplaceFile = async (taskId, file) => {
    if (!file || !user?.id) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", user.id);

    try {
      const response = await fetch(`http://localhost:5000/tasks/${taskId}/file`, {
        method: "PUT",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal mengganti file");
      }

      console.log("✅ File berhasil diganti:", data);
      fetchTasks();
    } catch (error) {
      console.error("❌ Error saat mengganti file:", error);
    }
  };

  // Fungsi untuk logout pengguna
  const handleLogout = async () => {
    const confirmLogout = window.confirm("Apakah Anda yakin ingin keluar?");
    if (!confirmLogout) return;

    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("❌ Gagal logout:", error.message);
    }
  };

  // Fungsi untuk berpindah ke halaman berikutnya
  const handleNextPage = (status) => {
    setCurrentPage((prev) => ({
      ...prev,
      [status]: prev[status] + 1,
    }));
  };

  // Fungsi untuk berpindah ke halaman sebelumnya
  const handlePreviousPage = (status) => {
    setCurrentPage((prev) => ({
      ...prev,
      [status]: Math.max(prev[status] - 1, 1),
    }));
  };

  // Fungsi untuk mendapatkan tugas yang dipaginasi
  const paginatedTasks = (status) => {
    const startIndex = (currentPage[status] - 1) * tasksPerPage;
    const endIndex = startIndex + tasksPerPage;
    return tasks[status].slice(startIndex, endIndex);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 p-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-black">
          personal<span className="text-blue-500">task</span>
        </h1>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setShowTaskForm(true)}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            <Plus size={20} /> Tambah Tugas
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
          >
            <LogOut size={20} /> Logout
          </button>
        </div>
      </header>

      {showTaskForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-md z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96 relative z-100">
            <button
              type="button"
              onClick={() => setShowTaskForm(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 bg-white p-1 rounded"
            >
              <X size={20} />
            </button>
            <TaskForm user={user} onTaskAdded={handleTaskAdded} resetForm={true} />
          </div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-auto">
        {["open", "in_progress", "done"].map((status) => (
          <div key={status} className="bg-white rounded-lg shadow p-4">
            <h2
              className={`text-lg font-semibold text-white p-3 rounded-t-lg ${
                status === "open"
                  ? "bg-teal-500"
                  : status === "in_progress"
                  ? "bg-blue-500"
                  : "bg-purple-500"
              }`}
            >
              {status.replace("_", " ")} ({tasks[status]?.length || 0})
            </h2>
            <TaskList
              tasks={paginatedTasks(status)}
              onDelete={handleDeleteTask}
              onUpdateStatus={handleUpdateTaskStatus}
              onEdit={handleEditTask}
              onReplaceFile={handleReplaceFile}
            />
            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                onClick={() => handlePreviousPage(status)}
                disabled={currentPage[status] === 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                  currentPage[status] === 1
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600 shadow-md"
                }`}
              >
                <ChevronLeft size={18} />
                Previous
              </button>
              <span className="text-gray-700 font-medium">
                Page {currentPage[status]}
              </span>
              <button
                type="button"
                onClick={() => handleNextPage(status)}
                disabled={currentPage[status] * tasksPerPage >= tasks[status].length}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                  currentPage[status] * tasksPerPage >= tasks[status].length
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600 shadow-md"
                }`}
              >
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;