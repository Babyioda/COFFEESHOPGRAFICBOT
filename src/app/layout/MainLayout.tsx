import { Outlet, NavLink, useLocation, useNavigate } from "react-router";
import { Calendar, UserCircle, ChevronLeft } from "lucide-react";

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Show bottom nav only on main screens
  const isMainScreen = location.pathname === "/" || location.pathname === "/profile";
  
  // Check if it's a subpage (e.g. /profile/employees)
  const isSubPage = location.pathname.startsWith("/profile/") && location.pathname !== "/profile";

  return (
    <div className="flex flex-col h-screen w-full relative bg-gray-50 dark:bg-[#1C1C1E] overflow-hidden">
      {/* Top Header for Subpages */}
      {isSubPage && (
        <div className="flex items-center p-4 bg-gray-50 dark:bg-[#1C1C1E] border-b border-gray-200 dark:border-gray-800 z-10 sticky top-0 backdrop-blur-md">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-blue-500 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft size={24} />
            <span className="text-[17px]">Назад</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 overflow-y-auto ${isMainScreen ? "pb-[80px]" : "pb-4"}`}>
        <Outlet />
      </div>

      {/* Bottom Navigation (Dock) */}
      {isMainScreen && (
        <div className="absolute bottom-0 left-0 right-0 h-[80px] bg-white/80 dark:bg-[#2C2C2E]/80 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 flex items-center justify-around pb-5 px-4 z-50">
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              `flex flex-col items-center justify-center w-20 h-full space-y-1 transition-colors ${
                isActive ? "text-blue-500" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              }`
            }
          >
            <Calendar size={24} strokeWidth={2.5} />
            <span className="text-[10px] font-medium tracking-wide">Календарь</span>
          </NavLink>

          <NavLink 
            to="/profile" 
            className={({ isActive }) => 
              `flex flex-col items-center justify-center w-20 h-full space-y-1 transition-colors ${
                isActive ? "text-blue-500" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              }`
            }
          >
            <UserCircle size={24} strokeWidth={2.5} />
            <span className="text-[10px] font-medium tracking-wide">Профиль</span>
          </NavLink>
        </div>
      )}
    </div>
  );
}
