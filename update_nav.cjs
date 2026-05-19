const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

const importStatement = "\nimport { BottomNavigation } from './components/BottomNavigation';\n";
c = c.replace(/import \{ saveAs \} from 'file-saver';/, "import { saveAs } from 'file-saver';" + importStatement);

const oldNav = `        {/* Mobile Nav */}
        {user && view !== 'finder' && view !== 'install_pwa' && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-3 flex justify-around items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <button
              onClick={() => {
                if (view === 'dashboard') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  setView('dashboard');
                  window.scrollTo(0, 0);
                }
              }}
              onDoubleClick={() => window.location.reload()}
              className={\`flex flex-col items-center gap-1 transition-colors flex-1 min-h-[44px] justify-center \${view === 'dashboard' ? 'text-orange-500' : 'text-gray-300'}\`}
            >
              <Home className="w-[22px] h-[22px]" />
              <span translate="no" className="text-[11px] font-bold uppercase">Início</span>
            </button>

            <button
              onClick={() => {
                setView('chat');
                setUnreadConvCount(0);
                loadConversations();
              }}
              className={\`flex flex-col items-center gap-1 transition-colors flex-1 min-h-[44px] justify-center relative \${view === 'chat' ? 'text-orange-500' : 'text-gray-300'}\`}
            >
              <MessageSquare className="w-[22px] h-[22px]" />
              <span translate="no" className="text-[11px] font-bold uppercase">Chat</span>
              {unreadConvCount > 0 && (
                <span className="absolute top-1 right-1/2 translate-x-4 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white text-white text-[9px] font-black flex items-center justify-center px-1">
                  {unreadConvCount > 9 ? '9+' : unreadConvCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setView('walk')}
              className="flex flex-col items-center -mt-12 flex-1 min-h-[44px] justify-center"
            >
              <div className="w-[60px] h-[60px] bg-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-200 border-4 border-white active:scale-90 transition-transform">
                <PawPrint className="w-7 h-7 text-white" />
              </div>
              <span translate="no" className="text-[11px] font-bold uppercase text-orange-500 mt-1">Passeio</span>
            </button>

            <button
              onClick={() => {
                setView('lost_pets');
                setHasNewUnreadSOS(false);
              }}
              className={\`flex flex-col items-center gap-1 transition-colors flex-1 min-h-[44px] justify-center relative \${view === 'lost_pets' ? 'text-orange-500' : 'text-gray-300'}\`}
            >
              <Megaphone className={\`w-[22px] h-[22px] \${hasNewUnreadSOS && view !== 'lost_pets' ? 'text-red-500 animate-pulse' : ''}\`} />
              <span translate="no" className="text-[11px] font-bold uppercase">Alertas</span>
              {hasNewUnreadSOS && view !== 'lost_pets' && (
                <span className="absolute top-1 right-1/2 translate-x-4 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-bounce" />
              )}
            </button>

            <button
              onClick={() => {
                setView('account');
                setAccountSubView('menu');
              }}
              className={\`flex flex-col items-center gap-1 transition-colors flex-1 min-h-[44px] justify-center \${view === 'account' && accountSubView !== 'notifications' ? 'text-orange-500' : 'text-gray-300'}\`}
            >
              <div className={\`w-7 h-7 rounded-full overflow-hidden border-2 transition-all \${view === 'account' && accountSubView !== 'notifications' ? 'border-orange-500' : 'border-gray-200'}\`}>
                {ownerProfile?.photoUrl ? (
                  <img src={ownerProfile.photoUrl} alt="Minha conta" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
              <span translate="no" className="text-[11px] font-bold uppercase">Conta</span>
            </button>
          </nav>
        )}`;

const newNav = `        <BottomNavigation 
          user={user} 
          view={view} 
          setView={setView} 
          accountSubView={accountSubView} 
          setAccountSubView={setAccountSubView} 
          unreadConvCount={unreadConvCount} 
          setUnreadConvCount={setUnreadConvCount}
          loadConversations={loadConversations} 
          hasNewUnreadSOS={hasNewUnreadSOS} 
          setHasNewUnreadSOS={setHasNewUnreadSOS} 
          ownerProfile={ownerProfile} 
        />`;

if (c.includes(oldNav)) {
  c = c.replace(oldNav, newNav);
  fs.writeFileSync('src/App.tsx', c);
  console.log("Successfully replaced BottomNav in App.tsx!");
} else {
  console.log("Could not find the exact oldNav string to replace.");
}
