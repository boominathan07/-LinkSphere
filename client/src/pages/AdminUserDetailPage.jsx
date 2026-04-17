import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Search, ChevronLeft, ChevronRight, UserCheck, UserX } from "lucide-react";
import GlassCard from "../components/ui/GlassCard";
import { useAdminUsers, useSetUserPlan, useToggleUserBlock, useDeleteUser } from "../hooks/useAdmin";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Fix: Get usersData and extract items array
  const { data: usersData, refetch, isLoading, error } = useAdminUsers();
  const setPlan = useSetUserPlan();
  const toggleBlock = useToggleUserBlock();
  const deleteUser = useDeleteUser();

  // Extract users array from the response
  const users = usersData?.items || [];

  // Handle error
  if (error) {
    return (
      <div className="p-6">
        <GlassCard className="p-6 text-center">
          <p className="text-red-400">Error loading users: {error.message}</p>
          <button 
            onClick={() => refetch()} 
            className="mt-4 px-4 py-2 bg-accent-violet rounded-lg text-white"
          >
            Retry
          </button>
        </GlassCard>
      </div>
    );
  }

  // Filter users
  const filteredUsers = users.filter(user => 
    search === "" ||
    user.name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase()) ||
    user.username?.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePlanChange = async (userId, plan) => {
    try {
      await setPlan.mutateAsync({ userId, plan });
      toast.success(`Plan changed to ${plan}`);
      refetch();
    } catch (error) {
      toast.error("Failed to change plan");
    }
  };

  const handleToggleBlock = async (userId) => {
    try {
      await toggleBlock.mutateAsync(userId);
      toast.success("User status updated");
      refetch();
    } catch (error) {
      toast.error("Failed to update user");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (confirm("Are you sure? This action cannot be undone!")) {
      try {
        await deleteUser.mutateAsync(userId);
        toast.success("User deleted");
        refetch();
      } catch (error) {
        toast.error("Failed to delete user");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            User Management
          </h1>
          <p className="text-text-muted mt-1">Manage all users on the platform</p>
        </div>
        <div className="rounded-full bg-accent-violet/20 px-3 py-1 text-sm text-accent-violet">
          Total: {users.length} users
        </div>
      </div>

      {/* Search */}
      <GlassCard className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name, email, or username..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-white/10 bg-bg-elevated/60 py-2 pl-10 pr-4 text-sm outline-none focus:border-accent-violet"
          />
        </div>
      </GlassCard>

      {/* Users Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Links</th>
                <th className="px-4 py-3">Clicks</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-text-muted">
                    No users found
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user._id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-accent-violet to-accent-cyan flex items-center justify-center">
                          <span className="text-sm font-bold text-white">
                            {user.name?.charAt(0) || user.email?.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium">{user.name || "No name"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.plan}
                        onChange={(e) => handlePlanChange(user._id, e.target.value)}
                        className={`rounded-lg px-2 py-1 text-xs font-semibold outline-none ${
                          user.plan === "pro" ? "bg-accent-cyan/20 text-accent-cyan" :
                          user.plan === "business" ? "bg-amber-500/20 text-amber-400" :
                          "bg-gray-500/20 text-gray-300"
                        }`}
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="business">Business</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">{user.linksCount || 0}</td>
                    <td className="px-4 py-3">{user.clicksCount || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs ${user.isBlocked ? 'text-red-400' : 'text-green-400'}`}>
                        {user.isBlocked ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                        {user.isBlocked ? "Blocked" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-center">
                        <Link
                          to={`/admin/users/${user._id}`}
                          className="rounded-lg bg-white/10 px-2 py-1 text-xs hover:bg-white/20 transition"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleToggleBlock(user._id)}
                          className={`rounded-lg px-2 py-1 text-xs transition ${
                            user.isBlocked 
                              ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" 
                              : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          }`}
                        >
                          {user.isBlocked ? "Unblock" : "Block"}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          className="rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-400 hover:bg-red-500/30 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
            <div className="text-xs text-text-muted">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-white/10 px-3 py-1 text-sm disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-1 text-sm">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-white/10 px-3 py-1 text-sm disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}