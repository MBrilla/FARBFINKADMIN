import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Bars3Icon, 
  XMarkIcon, 
  HomeIcon, 
  PlusIcon
} from '@heroicons/react/24/outline';

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  
  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Neues Projekt', href: '/add', icon: PlusIcon },
  ];
  
  const isActivePath = (path: string) => {
    if (path === '/') return location.pathname === path;
    return location.pathname.startsWith(path);
  };
  
  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 flex flex-col z-50 w-64 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Sidebar header */}
        <div className="px-4 py-5 bg-primary-700 flex items-center justify-between">
          <div className="text-white font-bold text-lg">FarbFink Admin</div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        {/* Sidebar navigation */}
        <div className="flex-1 bg-primary-800 overflow-y-auto">
          <nav className="px-2 py-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  isActivePath(item.href)
                    ? 'bg-primary-900 text-white'
                    : 'text-primary-100 hover:bg-primary-700'
                } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navigation */}
        <header className="bg-white shadow-sm">
          <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
            {/* Mobile menu button */}
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-gray-500 hover:text-gray-900 focus:outline-none"
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
            
            <div className="flex-1 flex justify-between md:justify-end">
              {/* Add header content here if needed */}
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout; 