const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
let lines = content.split('\n');

const startIdx = lines.findIndex(l => l.includes('{/* Add Adoption Pet Modal */}'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('</AnimatePresence>'));

if (startIdx === -1 || endIdx === -1) {
    console.error('Modal not found', startIdx, endIdx);
    process.exit(1);
}

const modalLines = lines.splice(startIdx, endIdx - startIdx + 1);

const adminSubViewRowEnd = lines.findIndex(l => l.includes('Nenhum parceiro cadastrado.</p>')) + 4;
// We insert the Adoption Management block here:
const adminListBlock = `
                      {/* Adoption Management */}
                      <div className=\"space-y-4\">
                        <div className=\"flex items-center justify-between mb-4\">
                          <h4 className=\"font-bold text-gray-800 flex items-center gap-2\">
                            <Heart className=\"w-5 h-5 text-gray-400\" /> Pets para Adoção ({adoptionPets.length})
                          </h4>
                          <Button
                            onClick={() => setIsAddingAdoptionPet(true)}
                            variant=\"secondary\"
                            className=\"!px-4 !py-2 text-xs\"
                          >
                            <Plus className=\"w-4 h-4\" /> Divulgar Pet
                          </Button>
                        </div>
                        <div className=\"bg-gray-50/50 border border-gray-100 rounded-[2rem] p-4\">
                           <div className=\"flex flex-col gap-3\">
                             {adoptionPets.map(pet => (
                               <div key={pet.id} className=\"bg-white p-4 rounded-3xl border border-gray-200 flex justify-between items-center shadow-sm\">
                                 <div className=\"flex items-center gap-3 w-full pr-2 overflow-hidden\">
                                   {pet.gallery && pet.gallery.length > 0 ? (
                                      <img src={pet.gallery[0]} className=\"w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0\" />
                                   ) : (
                                      <div className=\"w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0\">
                                        <Heart className=\"w-4 h-4 text-gray-300\" />
                                      </div>
                                   )}
                                   <div className=\"min-w-0 flex-1\">
                                     <h5 className=\"font-bold text-gray-900 truncate text-sm\">{pet.name}</h5>
                                     <p className=\"text-[10px] text-gray-500 font-bold truncate\">
                                       {pet.animalType} • {pet.breed} {pet.city && '\\u2022 ' + pet.city}
                                     </p>
                                   </div>
                                 </div>
                                 <div className=\"flex gap-2 shrink-0\">
                                   <button 
                                     onClick={() => {
                                        setEditingAdoptionPetId(pet.id);
                                        setNewAdoptionPet(pet);
                                        setIsAddingAdoptionPet(true);
                                     }} 
                                     className=\"p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors\"
                                   >
                                     <Edit2 className=\"w-4 h-4\" />
                                   </button>
                                   <button 
                                     onClick={async () => {
                                        if(window.confirm('Excluir ' + pet.name + ' para adoção?')) {
                                            await supabase.from('adoption_pets').delete().eq('id', pet.id);
                                            setAdoptionPets(prev => prev.filter(p => p.id !== pet.id));
                                        }
                                     }} 
                                     className=\"p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors\"
                                   >
                                     <Trash2 className=\"w-4 h-4\" />
                                   </button>
                                 </div>
                               </div>
                             ))}
                             {adoptionPets.length === 0 && <p className=\"text-center text-xs text-gray-400 font-medium py-4\">Nenhum pet para adoção.</p>}
                           </div>
                        </div>
                      </div>
`;
lines.splice(adminSubViewRowEnd, 0, ...adminListBlock.split('\n'));

// Now place modal right before the closing of account views (line 4670 approx)
// Let's find: `{/* Activate Tag */}`
const activateRow = lines.findIndex(l => l.includes('{/* Activate Tag */}'));
lines.splice(activateRow - 2, 0, ...modalLines);

fs.writeFileSync('src/App.tsx', lines.join('\n'));
console.log('App.tsx rewrite completed!');
