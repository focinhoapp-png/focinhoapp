import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COUNTRIES, Country } from '../utils/countries';
import { Search, X } from 'lucide-react';

interface PhoneInputProps {
  ddi: string;
  phone: string;
  onDDIChange: (ddi: string) => void;
  onPhoneChange: (phone: string) => void;
  placeholder?: string;
}

export function PhoneInputWithDDI({ ddi, phone, onDDIChange, onPhoneChange, placeholder = "Telefone" }: PhoneInputProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const currentCountry = COUNTRIES.find(c => c.code === ddi) || COUNTRIES.find(c => c.code === '+55')!;

  const filteredCountries = useMemo(() => {
    if (!search) return COUNTRIES;
    const lower = search.toLowerCase();
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(lower) || c.code.includes(lower));
  }, [search]);

  // Group by first letter, plus "Current" / "Common"
  const commonCodes = ['+55', '+1', '+52', '+351'];
  
  return (
    <>
      <div className="flex items-center w-full clay-input bg-white overflow-hidden focus-within:ring-2 focus-within:ring-orange-500/50 transition-all cursor-pointer">
        <div 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 h-14 border-r border-slate-200/50 hover:bg-slate-50 transition-colors shrink-0"
        >
          <span className="text-xl leading-none">{currentCountry?.flag}</span>
          <span className="text-sm font-semibold text-slate-800">{currentCountry?.code}</span>
        </div>
        <input
          type="tel"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 h-14 px-4 bg-transparent outline-none text-base text-slate-800 w-full"
        />
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#fcf8f2] w-full sm:max-w-md h-[90vh] sm:h-[80vh] sm:rounded-[32px] rounded-t-[32px] flex flex-col shadow-xl overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-5 flex items-center justify-between border-b border-orange-900/5 shrink-0 bg-white">
                <h3 className="text-lg font-bold text-slate-800">Choose your country</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-orange-500 text-sm font-bold active:scale-95 transition-transform"
                >
                  Cancelar
                </button>
              </div>

              {/* Search */}
              <div className="px-6 py-3 bg-white border-b border-orange-900/5 shrink-0">
                <div className="relative flex items-center">
                  <Search className="w-5 h-5 absolute left-3 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search Country Codes"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 bg-slate-100/50 border-none rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto no-scrollbar pb-6 bg-[#fcf8f2]">
                
                {!search && (
                  <>
                    <div className="px-6 py-3">
                      <span className="text-sm font-bold text-slate-800">Current</span>
                    </div>
                    <div className="bg-white mx-4 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => { onDDIChange(currentCountry.code); setIsModalOpen(false); }}
                        className="w-full flex items-center px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <span className="w-12 text-left text-sm font-medium text-blue-500">{currentCountry.code}</span>
                        <span className="text-xl mr-3">{currentCountry.flag}</span>
                        <span className="text-sm font-medium text-slate-700">{currentCountry.name}</span>
                      </button>
                    </div>

                    <div className="px-6 pt-5 pb-3">
                      <span className="text-sm font-bold text-slate-800">Common</span>
                    </div>
                    <div className="bg-white mx-4 rounded-2xl overflow-hidden divide-y divide-slate-100">
                      {COUNTRIES.filter(c => commonCodes.includes(c.code)).map(c => (
                        <button
                          key={c.code}
                          onClick={() => { onDDIChange(c.code); setIsModalOpen(false); }}
                          className="w-full flex items-center px-4 py-3 hover:bg-slate-50 transition-colors"
                        >
                          <span className="w-12 text-left text-sm font-medium text-blue-500">{c.code}</span>
                          <span className="text-xl mr-3">{c.flag}</span>
                          <span className="text-sm font-medium text-slate-700">{c.name}</span>
                        </button>
                      ))}
                    </div>

                    <div className="px-6 pt-5 pb-3">
                      <span className="text-sm font-bold text-slate-800">A - Z</span>
                    </div>
                  </>
                )}

                <div className="bg-white mx-4 rounded-2xl overflow-hidden divide-y divide-slate-100 mb-6">
                  {filteredCountries.map((c, i) => (
                    <button
                      key={`${c.code}-${i}`}
                      onClick={() => { onDDIChange(c.code); setIsModalOpen(false); }}
                      className="w-full flex items-center px-4 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <span className="w-12 text-left text-sm font-medium text-blue-500">{c.code}</span>
                      <span className="text-xl mr-3">{c.flag}</span>
                      <span className="text-sm font-medium text-slate-700 truncate text-left">{c.name}</span>
                    </button>
                  ))}
                  {filteredCountries.length === 0 && (
                    <div className="px-4 py-8 text-center text-slate-500 text-sm">
                      Nenhum país encontrado
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
