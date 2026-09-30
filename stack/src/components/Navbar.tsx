import { useAuth } from "@/lib/AuthContext";
import { MembershipBadge } from "@/components/MembershipBadge";
import { Menu, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const Navbar = ({ handleslidein }: any) => {
  const { user, Logout } = useAuth();
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  const handlelogout = () => {
    Logout();
  };
  return (
    <div className=" top-0 z-50 w-full min-h-[53px] bg-white border-t-[3px] border-[#ef8236] shadow-[0_1px_5px_#00000033] flex items-center justify-center">
      <div className="w-[90%] max-w-[1440px] flex items-center justify-between mx-auto py-1">
        <button
          aria-label="Toggle sidebar"
          className="sm:block md:hidden p-2 rounded hover:bg-gray-100 transition"
          onClick={handleslidein}
        >
          <Menu className="w-5 h-5 text-gray-800" />
        </button>
        <div className="flex items-center gap-2 flex-grow">
          <Link href="/" className="px-3 py-1">
            <img src="/logo.png" alt="Logo" className="h-6 w-auto" />
          </Link>

          <div className="hidden sm:flex gap-1 items-center">
            {["About", "Products"].map((item) => (
              <Link
                key={item}
                href="/"
                className="text-sm text-[#454545] font-medium px-3 py-1.5 rounded hover:bg-gray-200 transition"
              >
                {item}
              </Link>
            ))}
            <Link
              href="/membership"
              className="text-sm text-orange-600 font-bold px-3 py-1.5 rounded hover:bg-orange-50 border border-orange-200 transition flex items-center gap-1"
            >
              <span>Plans & Pricing</span>
            </Link>
            {user?.role === "admin" && (
              <Link
                href="/admin"
                className="text-sm text-purple-700 font-bold px-3 py-1.5 rounded hover:bg-purple-50 border border-purple-200 transition"
              >
                Admin Panel
              </Link>
            )}
          </div>
          <form className="hidden lg:block flex-grow relative px-3">
            <input
              type="text"
              placeholder="Search..."
              className="w-full max-w-[600px] pl-9 pr-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            <Search className="absolute left-4 top-2.5 h-4 w-4 text-gray-600" />
          </form>
        </div>
        <div className="flex items-center gap-2">
          {!hasMounted ? null : !user ? (
            <Link
              href="/auth"
              className="text-sm font-medium text-[#454545] bg-[#e7f8fe] hover:bg-[#d3e4eb] border border-blue-500 px-4 py-1.5 rounded transition"
            >
              Log in
            </Link>
          ) : (
            <>
              <Link
                href={`/membership`}
                className="hidden md:flex items-center gap-1"
              >
                <MembershipBadge badge={user.planBadge || user.currentPlan || "Free"} />
              </Link>

              <Link
                href={`/users/${user._id}`}
                className="flex items-center justify-center bg-orange-600 text-white text-sm font-semibold w-9 h-9 rounded-full hover:opacity-90 transition"
              >
                {user.name?.charAt(0).toUpperCase()}
              </Link>

              <button
                onClick={handlelogout}
                className="text-sm font-medium text-[#454545] bg-[#e7f8fe] hover:bg-[#d3e4eb] border border-blue-500 px-4 py-1.5 rounded transition"
              >
                Log out
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;